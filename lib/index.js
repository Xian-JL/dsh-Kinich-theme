import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
//#region src/shared/settings.ts
/** Host/client settings namespace owned by this plugin. */
const KINICH_SETTINGS_NAMESPACE = "dsh-kinich-theme";
const CHARACTER_POSITIONS = ["corner", "edge"];
const DECORATION_INTENSITIES = ["soft", "standard"];
const CHARACTER_OPACITIES = [
	"low",
	"medium",
	"high"
];
/** Large character art stays opt-in; lightweight decorations remain enabled. */
const DEFAULT_KINICH_SETTINGS = Object.freeze({
	animateAjaw: true,
	ajawFlipped: false,
	ajawPosition: Object.freeze({
		x: 96.5,
		y: 16
	}),
	ajawRotation: 0,
	characterOpacity: "medium",
	characterPosition: "corner",
	ornamentIntensity: "standard",
	showCharacter: false,
	showOrnament: true,
	showTexture: true,
	textureIntensity: "standard"
});
//#endregion
//#region src/host/settings-schema.ts
/** Host-side schema supplies defaults even before a user settings section exists. */
const KinichThemeSettingsSchema = z.object({
	animateAjaw: z.boolean().default(DEFAULT_KINICH_SETTINGS.animateAjaw),
	ajawFlipped: z.boolean().default(DEFAULT_KINICH_SETTINGS.ajawFlipped),
	ajawPosition: z.object({
		x: z.number().min(0).max(100).default(DEFAULT_KINICH_SETTINGS.ajawPosition.x),
		y: z.number().min(0).max(100).default(DEFAULT_KINICH_SETTINGS.ajawPosition.y)
	}).default(DEFAULT_KINICH_SETTINGS.ajawPosition),
	ajawRotation: z.number().min(0).max(360).step(1).default(DEFAULT_KINICH_SETTINGS.ajawRotation),
	characterOpacity: z.union([...CHARACTER_OPACITIES]).default(DEFAULT_KINICH_SETTINGS.characterOpacity),
	characterPosition: z.union([...CHARACTER_POSITIONS]).default(DEFAULT_KINICH_SETTINGS.characterPosition),
	ornamentIntensity: z.union([...DECORATION_INTENSITIES]).default(DEFAULT_KINICH_SETTINGS.ornamentIntensity),
	showCharacter: z.boolean().default(DEFAULT_KINICH_SETTINGS.showCharacter),
	showOrnament: z.boolean().default(DEFAULT_KINICH_SETTINGS.showOrnament),
	showTexture: z.boolean().default(DEFAULT_KINICH_SETTINGS.showTexture),
	textureIntensity: z.union([...DECORATION_INTENSITIES]).default(DEFAULT_KINICH_SETTINGS.textureIntensity)
});
//#endregion
//#region src/host/index.ts
/** Stable package id shared by the Host, Client, and bundle row. */
const name = "dsh-kinich-theme";
/**
* Registers the durable enhanced-layer switches whenever the settings provider
* is present in the active Web profile.
*/
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(settingsNamespace(KINICH_SETTINGS_NAMESPACE), KinichThemeSettingsSchema, { applies: "live" });
	});
}
//#endregion
export { apply, name };
