import { isBelowCnyThreshold } from "./policy.js";

const EMPTY = Object.freeze({ status: "loading", stale: false });
let snapshot = EMPTY;
let request;
let pollTimer;
let consumers = 0;
const listeners = new Set();

function publish(next) {
	snapshot = Object.freeze(next);
	for (const listener of listeners) listener();
}

export function getBalanceSnapshot() { return snapshot; }
export function subscribeBalance(listener) { listeners.add(listener); return () => listeners.delete(listener); }

export async function refreshBalance({ force = false } = {}) {
	if (request !== void 0) return request;
	if (snapshot.status === "loading") publish({ ...snapshot, refreshing: true });
	request = fetch(`/api/kinich-balance${force ? "?force=1" : ""}`, {
		credentials: "same-origin",
		headers: { accept: "application/json" }
	}).then(async response => {
		if (!response.ok) throw new Error(`balance endpoint ${response.status}`);
		const next = await response.json();
		publish({ ...next, refreshing: false, overheated: isBelowCnyThreshold(next) });
		return next;
	}).catch(() => {
		publish({ ...snapshot, status: snapshot.totalBalance === void 0 ? "unavailable" : snapshot.status, stale: true, refreshing: false });
		return snapshot;
	}).finally(() => { request = void 0; });
	return request;
}

function schedulePoll() {
	if (pollTimer !== void 0 || consumers === 0) return;
	pollTimer = setInterval(() => {
		if (document.visibilityState === "visible") void refreshBalance();
	}, 60_000);
}

export function retainBalancePolling() {
	consumers += 1;
	if (consumers === 1) {
		void refreshBalance();
		document.addEventListener("visibilitychange", handleVisibility);
		window.addEventListener("focus", handleFocus);
	}
	schedulePoll();
	return () => {
		consumers = Math.max(0, consumers - 1);
		if (consumers !== 0) return;
		if (pollTimer !== void 0) clearInterval(pollTimer);
		pollTimer = void 0;
		document.removeEventListener("visibilitychange", handleVisibility);
		window.removeEventListener("focus", handleFocus);
	};
}

function handleVisibility() { if (document.visibilityState === "visible") void refreshBalance(); }
function handleFocus() { void refreshBalance(); }
