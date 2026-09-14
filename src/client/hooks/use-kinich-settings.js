import * as react from "react";

export function useKinichSettings(scope) {
	const subscribe = (0, react.useCallback)((listener) => scope.subscribe(listener), [scope]);
	const getSnapshot = (0, react.useCallback)(() => scope.getSnapshot(), [scope]);
	return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
}
