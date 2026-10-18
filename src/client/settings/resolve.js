import { KINICH_SETTINGS_NAMESPACE } from "../../shared/settings.js";
import { decodeKinichSettings } from "./decode.js";
import { exclusiveSettings } from "./exclusive.js";

/** Resolve the settings form behind the theme service on both DSH generations. */
export function resolveKinichSettings(ctx) {
	const forms = ctx.get("configForms");
	if (forms) return exclusiveSettings(forms.get(KINICH_SETTINGS_NAMESPACE), forms.get("dsh-xiao-theme"), { winsTie: true });
	const legacyScope = ctx.get("settingsScope");
	if (legacyScope) return exclusiveSettings(legacyScope.bind({ namespace: KINICH_SETTINGS_NAMESPACE, decode: decodeKinichSettings }), legacyScope.bind({ namespace: "dsh-xiao-theme", decode: value => value }), { winsTie: true });
	throw new Error("Kinich requires a DSH settings service");
}
