import { HeroBrandMark, SidebarBrandMark, SidebarBrandName } from "./components/brand.js";
import { KinichOverlay } from "./overlay/kinich-overlay.js";
import { KinichSettingsRow } from "./settings/kinich-settings-row.js";
import { SessionStateBridge } from "./session/session-state-bridge.js";
import { KINICH_LOCALE_NAMESPACE, KINICH_LOCALES } from "./locales.js";
import { installKinichStyles } from "./styles.js";
import { KINICH_SETTINGS_NAMESPACE } from "../shared/settings.js";
import { decodeKinichSettings } from "./settings/decode.js";

export const inject = ["theme", "slots", "locale", "connection", "remote", "settingsScope"];
export const BRAND_PRIORITY = -20;

export function apply(ctx) {
	installKinichStyles(ctx);
	const settings = ctx.settingsScope.bind({ namespace: KINICH_SETTINGS_NAMESPACE, decode: decodeKinichSettings });
	ctx.effect(() => ctx.locale.register(KINICH_LOCALE_NAMESPACE, KINICH_LOCALES), "dsh-kinich-theme: settings dictionaries");
	ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.register({ name: "sidebar.brand.mark", priority: BRAND_PRIORITY }, SidebarBrandMark));
	ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({ name: "sidebar.brand.name", priority: BRAND_PRIORITY }, SidebarBrandName));
	ctx.slots.inject("conversation.hero.brand.mark", () => ctx.slots.register({ name: "conversation.hero.brand.mark", priority: BRAND_PRIORITY }, HeroBrandMark));
	ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({ name: "conversation.composer.dock", id: "kinich-session-state", order: 9999 }, SessionStateBridge));
	ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "kinich-theme-decoration", order: -100,
		locale: KINICH_LOCALE_NAMESPACE, inject: () => ({ settings, theme: ctx.theme }) }, KinichOverlay));
	ctx.slots.inject("settings.general.item", () => ctx.slots.register({ name: "settings.general.item", id: "kinich-theme", order: 15,
		locale: KINICH_LOCALE_NAMESPACE, inject: () => ({ settings }) }, KinichSettingsRow));
}
