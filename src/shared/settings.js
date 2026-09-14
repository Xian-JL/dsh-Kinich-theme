/** Host/client settings namespace owned by this plugin. */
export const KINICH_SETTINGS_NAMESPACE = "dsh-kinich-theme";

export const VISUAL_STYLES = Object.freeze(["jungle", "phlogiston", "sunlit"]);
export const VISUAL_INTENSITIES = Object.freeze(["minimal", "balanced", "immersive"]);
export const CHARACTER_POSITIONS = Object.freeze(["corner", "edge"]);
export const DECORATION_INTENSITIES = Object.freeze(["soft", "standard"]);
export const CHARACTER_OPACITIES = Object.freeze(["low", "medium", "high"]);

const AJAW_DEFAULT_POSITION = Object.freeze({ x: 96.5, y: 16 });

/** Single source of truth for every persisted setting. */
export const KINICH_SETTING_DEFINITIONS = Object.freeze({
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

export const KINICH_SETTING_KEYS = Object.freeze(Object.keys(KINICH_SETTING_DEFINITIONS));

function cloneDefaultValue(value) {
	if (typeof value === "object" && value !== null) return Object.freeze({ ...value });
	return value;
}

export const DEFAULT_KINICH_SETTINGS = Object.freeze(Object.fromEntries(
	Object.entries(KINICH_SETTING_DEFINITIONS).map(([key, definition]) => [key, cloneDefaultValue(definition.default)])
));

/** Visual modes keep intensity independent so users can combine any theme with any density. */
export const KINICH_VISUAL_PRESETS = Object.freeze({
	jungle: Object.freeze({
		visualStyle: "jungle", showCharacter: false, showOrnament: true,
		ornamentIntensity: "standard", showTexture: true, textureIntensity: "standard", animateAjaw: true
	}),
	phlogiston: Object.freeze({
		visualStyle: "phlogiston", showCharacter: true, characterPosition: "edge", characterOpacity: "high",
		showOrnament: true, ornamentIntensity: "standard", showTexture: true, textureIntensity: "standard", animateAjaw: true
	}),
	sunlit: Object.freeze({
		visualStyle: "sunlit", showCharacter: false, showOrnament: true,
		ornamentIntensity: "soft", showTexture: true, textureIntensity: "soft", animateAjaw: true
	})
});

function isFiniteRange(value, min, max) {
	return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function isKinichSettingValue(definition, value) {
	switch (definition.kind) {
		case "boolean": return typeof value === "boolean";
		case "number": return isFiniteRange(value, definition.min, definition.max);
		case "choice": return typeof value === "string" && definition.options.includes(value);
		case "position": return typeof value === "object" && value !== null &&
			isFiniteRange(value.x, definition.min, definition.max) && isFiniteRange(value.y, definition.min, definition.max);
		default: return false;
	}
}

export function cloneKinichSettingValue(definition, value) {
	if (definition.kind === "position") return { x: value.x, y: value.y };
	return value;
}
