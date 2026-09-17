import * as react from "react";
import { getBalanceSnapshot, retainBalancePolling, subscribeBalance } from "./balance-store.js";

export function useBalance() {
	const value = (0, react.useSyncExternalStore)(subscribeBalance, getBalanceSnapshot, getBalanceSnapshot);
	(0, react.useEffect)(retainBalancePolling, []);
	return value;
}
