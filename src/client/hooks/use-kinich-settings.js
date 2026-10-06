import * as react from "react";
import { DEFAULT_KINICH_SETTINGS, KINICH_SETTING_DEFINITIONS, isKinichSettingValue } from "../../shared/settings.js";

export function useKinichSettings(scope) {
	const subscribe = (0, react.useCallback)((listener) => scope.subscribe(listener), [scope]);
	const getSnapshot = (0, react.useCallback)(() => scope.getSnapshot(), [scope]);
	const snapshot = (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
	return (0, react.useMemo)(() => {
		if (!snapshot?.value || typeof snapshot.value !== "object") return snapshot;
		const customBackgroundImage = isKinichSettingValue(KINICH_SETTING_DEFINITIONS.customBackgroundImage, snapshot.value.customBackgroundImage)
			? snapshot.value.customBackgroundImage : DEFAULT_KINICH_SETTINGS.customBackgroundImage;
		const customBackgroundAccent = isKinichSettingValue(KINICH_SETTING_DEFINITIONS.customBackgroundAccent, snapshot.value.customBackgroundAccent)
			? snapshot.value.customBackgroundAccent : DEFAULT_KINICH_SETTINGS.customBackgroundAccent;
		const backgroundAutoPalette = isKinichSettingValue(KINICH_SETTING_DEFINITIONS.backgroundAutoPalette, snapshot.value.backgroundAutoPalette)
			? snapshot.value.backgroundAutoPalette : DEFAULT_KINICH_SETTINGS.backgroundAutoPalette;
		if (customBackgroundImage === snapshot.value.customBackgroundImage &&
			customBackgroundAccent === snapshot.value.customBackgroundAccent &&
			backgroundAutoPalette === snapshot.value.backgroundAutoPalette) return snapshot;
		return { ...snapshot, value: { ...snapshot.value, customBackgroundImage, customBackgroundAccent, backgroundAutoPalette } };
	}, [snapshot]);
}
