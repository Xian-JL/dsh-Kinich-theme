// src/shared/settings.js
var KINICH_SETTINGS_NAMESPACE = "dsh-kinich-theme";
var VISUAL_STYLES = Object.freeze(["jungle", "phlogiston", "sunlit"]);
var VISUAL_INTENSITIES = Object.freeze(["minimal", "balanced", "immersive"]);
var CHARACTER_POSITIONS = Object.freeze(["corner", "edge"]);
var DECORATION_INTENSITIES = Object.freeze(["soft", "standard"]);
var CHARACTER_OPACITIES = Object.freeze(["low", "medium", "high"]);
var AJAW_DEFAULT_POSITION = Object.freeze({ x: 96.5, y: 16 });
var KINICH_SETTING_DEFINITIONS = Object.freeze({
  visualStyle: Object.freeze({ kind: "choice", default: "jungle", options: VISUAL_STYLES }),
  visualIntensity: Object.freeze({ kind: "choice", default: "balanced", options: VISUAL_INTENSITIES }),
  ambientMotion: Object.freeze({ kind: "boolean", default: true }),
  animateAjaw: Object.freeze({ kind: "boolean", default: true }),
  ajawFlipped: Object.freeze({ kind: "boolean", default: false }),
  ajawPosition: Object.freeze({ kind: "position", default: AJAW_DEFAULT_POSITION, min: 0, max: 100 }),
  ajawRotation: Object.freeze({ kind: "number", default: 0, min: 0, max: 360, step: 1 }),
  characterOpacity: Object.freeze({ kind: "choice", default: "medium", options: CHARACTER_OPACITIES }),
  characterPosition: Object.freeze({ kind: "choice", default: "corner", options: CHARACTER_POSITIONS }),
  ornamentIntensity: Object.freeze({ kind: "choice", default: "standard", options: DECORATION_INTENSITIES }),
  showCharacter: Object.freeze({ kind: "boolean", default: false }),
  showOrnament: Object.freeze({ kind: "boolean", default: true }),
  showTexture: Object.freeze({ kind: "boolean", default: true }),
  textureIntensity: Object.freeze({ kind: "choice", default: "standard", options: DECORATION_INTENSITIES })
});
var KINICH_SETTING_KEYS = Object.freeze(Object.keys(KINICH_SETTING_DEFINITIONS));
function cloneDefaultValue(value) {
  if (typeof value === "object" && value !== null) return Object.freeze({ ...value });
  return value;
}
var DEFAULT_KINICH_SETTINGS = Object.freeze(Object.fromEntries(
  Object.entries(KINICH_SETTING_DEFINITIONS).map(([key, definition]) => [key, cloneDefaultValue(definition.default)])
));
var KINICH_VISUAL_PRESETS = Object.freeze({
  jungle: Object.freeze({
    visualStyle: "jungle",
    showCharacter: false,
    showOrnament: true,
    ornamentIntensity: "standard",
    showTexture: true,
    textureIntensity: "standard",
    animateAjaw: true
  }),
  phlogiston: Object.freeze({
    visualStyle: "phlogiston",
    showCharacter: true,
    characterPosition: "edge",
    characterOpacity: "high",
    showOrnament: true,
    ornamentIntensity: "standard",
    showTexture: true,
    textureIntensity: "standard",
    animateAjaw: true
  }),
  sunlit: Object.freeze({
    visualStyle: "sunlit",
    showCharacter: false,
    showOrnament: true,
    ornamentIntensity: "soft",
    showTexture: true,
    textureIntensity: "soft",
    animateAjaw: true
  })
});

// src/host/settings-schema.js
import z from "@deepseek-ai/schemastery";
function schemaFor(definition) {
  switch (definition.kind) {
    case "boolean":
      return z.boolean().default(definition.default);
    case "number":
      return z.number().min(definition.min).max(definition.max).step(definition.step ?? 1).default(definition.default);
    case "choice":
      return z.union([...definition.options]).default(definition.default);
    case "position":
      return z.object({
        x: z.number().min(definition.min).max(definition.max).default(definition.default.x),
        y: z.number().min(definition.min).max(definition.max).default(definition.default.y)
      }).default(definition.default);
    default:
      throw new TypeError(`Unsupported Kinich setting kind: ${definition.kind}`);
  }
}
var KinichThemeSettingsSchema = z.object(Object.fromEntries(
  Object.entries(KINICH_SETTING_DEFINITIONS).map(([key, definition]) => [key, schemaFor(definition)])
));

// src/host/index.js
var name = "dsh-kinich-theme";
function apply(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(KINICH_SETTINGS_NAMESPACE, KinichThemeSettingsSchema, { applies: "live" });
  });
}
export {
  apply,
  name
};
