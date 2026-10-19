import * as react from "react";
import { getBalanceSnapshot, retainBalancePolling, subscribeBalance } from "./balance-store.js";

const DISABLED = Object.freeze({ status: "disabled", stale: false, overheated: false });

export function useBalance(enabled = true) {
	const value = (0, react.useSyncExternalStore)(subscribeBalance, getBalanceSnapshot, getBalanceSnapshot);
	(0, react.useEffect)(() => enabled ? retainBalancePolling() : undefined, [enabled]);
	return enabled ? value : DISABLED;
}
