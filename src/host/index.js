import { KINICH_SETTINGS_NAMESPACE } from "../shared/settings.js";
import { KinichThemeConfigSchema, KinichThemeSettingsSchema } from "./settings-schema.js";
import { installBalanceRoute } from "./balance-route.js";
import { installWallpaperRoutes } from "./wallpaper/routes.js";
import { loadKinichWallpaperBuiltin } from "./wallpaper/builtin.js";
import { PLUGIN_VERSION } from "../client/version.generated.js";

/** Stable package id shared by the Host, Client, and bundle row. */
export const name = "dsh-kinich-theme";
export const Config = KinichThemeConfigSchema;
/**
* Registers the durable enhanced-layer switches whenever the settings provider
* is present in the active Web profile.
*/
export function apply(ctx) {
	installBalanceRoute(ctx);
	ctx.inject(["connection", "settings"], hostCtx => {
		const profile = hostCtx.get("profileContext");
		if (!profile?.dir) return;
		const legacy = typeof hostCtx.settings.get === "function" ? hostCtx.settings.get(KINICH_SETTINGS_NAMESPACE) ?? {} : {};
		hostCtx.effect(() => installWallpaperRoutes(hostCtx, { profileDir: profile.dir, profileName: profile.name, pluginVersion: PLUGIN_VERSION, legacy, builtin: loadKinichWallpaperBuiltin }));
	});
	ctx.inject(["settings"], (settingsCtx) => {
		if (typeof settingsCtx.settings.register === "function") {
			settingsCtx.settings.register(KINICH_SETTINGS_NAMESPACE, KinichThemeSettingsSchema, { applies: "live" });
		} else if (typeof settingsCtx.settings.configure === "function") {
			settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
		}
	});
}
