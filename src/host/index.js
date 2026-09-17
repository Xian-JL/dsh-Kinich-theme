import { KINICH_SETTINGS_NAMESPACE } from "../shared/settings.js";
import { KinichThemeSettingsSchema } from "./settings-schema.js";
import { installBalanceRoute } from "./balance-route.js";

/** Stable package id shared by the Host, Client, and bundle row. */
export const name = "dsh-kinich-theme";
/**
* Registers the durable enhanced-layer switches whenever the settings provider
* is present in the active Web profile.
*/
export function apply(ctx) {
	installBalanceRoute(ctx);
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(KINICH_SETTINGS_NAMESPACE, KinichThemeSettingsSchema, { applies: "live" });
	});
}
