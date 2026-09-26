import { KINICH_SETTINGS_NAMESPACE } from "../../shared/settings.js";
import { decodeKinichSettings } from "./decode.js";

/** Resolve the settings form behind the theme service on both DSH generations. */
export function resolveKinichSettings(ctx) {
	const forms = ctx.get("configForms");
	if (forms) return forms.get(KINICH_SETTINGS_NAMESPACE);
	const legacyScope = ctx.get("settingsScope");
	if (legacyScope) return legacyScope.bind({ namespace: KINICH_SETTINGS_NAMESPACE, decode: decodeKinichSettings });
	throw new Error("Kinich requires a DSH settings service");
}
