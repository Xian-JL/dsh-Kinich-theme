import { KINICH_SETTINGS_NAMESPACE } from "../shared/settings.js";
import { KinichThemeConfigSchema, KinichThemeSettingsSchema } from "./settings-schema.js";
import { installBalanceRoute } from "./balance-route.js";

/** Stable package id shared by the Host, Client, and bundle row. */
export const name = "dsh-kinich-theme";
export const Config = KinichThemeConfigSchema;
/**
* Registers the durable enhanced-layer switches whenever the settings provider
* is present in the active Web profile.
*/
export function apply(ctx) {
	installBalanceRoute(ctx);
	ctx.inject(["settings"], (settingsCtx) => {
		if (typeof settingsCtx.settings.register === "function") {
			settingsCtx.settings.register(KINICH_SETTINGS_NAMESPACE, KinichThemeSettingsSchema, { applies: "live" });
		} else if (typeof settingsCtx.settings.configure === "function") {
			settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
		}
	});
}
