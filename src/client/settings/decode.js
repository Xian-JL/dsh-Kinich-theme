import {
	DEFAULT_KINICH_SETTINGS,
	KINICH_SETTING_DEFINITIONS,
	cloneKinichSettingValue,
	isKinichSettingValue
} from "../../shared/settings.js";

/**
 * Decode the mirrored settings section while remaining backwards-compatible
 * with pre-v0.8 sections that do not contain newly introduced fields yet.
 */
export function decodeKinichSettings(section) {
	if (typeof section !== "object" || section === null) return void 0;
	const decoded = {};
	for (const [key, definition] of Object.entries(KINICH_SETTING_DEFINITIONS)) {
		const candidate = section[key] ?? DEFAULT_KINICH_SETTINGS[key];
		if (!isKinichSettingValue(definition, candidate)) return void 0;
		decoded[key] = cloneKinichSettingValue(definition, candidate);
	}
	return decoded;
}
