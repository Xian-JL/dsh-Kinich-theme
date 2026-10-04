import { isBelowCnyThreshold } from "./policy.js";

const CLIENT_REQUEST_TIMEOUT_MS = 15_000;
const EMPTY = Object.freeze({ status: "loading", stale: false });
let snapshot = EMPTY;
let request;
let requestController;
let pollTimer;
let consumers = 0;
let requestGeneration = 0;
const listeners = new Set();

function publish(next) {
	snapshot = Object.freeze(next);
	for (const listener of listeners) listener();
}

export function getBalanceSnapshot() { return snapshot; }
export function subscribeBalance(listener) { listeners.add(listener); return () => listeners.delete(listener); }

export async function refreshBalance({ force = false } = {}) {
	if (request !== void 0 && !requestController?.signal.aborted) return request;
	const generation = ++requestGeneration;
	const controller = new AbortController();
	requestController = controller;
	const timeout = setTimeout(() => controller.abort(), CLIENT_REQUEST_TIMEOUT_MS);
	if (snapshot.status === "loading") publish({ ...snapshot, refreshing: true });
	const nextRequest = fetch(`/api/kinich-balance${force ? "?force=1" : ""}`, {
		credentials: "same-origin",
		headers: { accept: "application/json" },
		signal: controller.signal
	}).then(async response => {
		if (!response.ok) throw new Error(`balance endpoint ${response.status}`);
		const next = await response.json();
		if (generation === requestGeneration) publish({ ...next, refreshing: false, overheated: isBelowCnyThreshold(next) });
		return next;
	}).catch(() => {
		if (generation === requestGeneration) publish({ ...snapshot, status: snapshot.totalBalance === void 0 ? "unavailable" : snapshot.status, stale: true, refreshing: false });
		return snapshot;
	});
	let trackedRequest;
	trackedRequest = nextRequest.finally(() => {
		clearTimeout(timeout);
		if (request === trackedRequest) {
			request = void 0;
			if (requestController === controller) requestController = void 0;
		}
	});
	request = trackedRequest;
	return trackedRequest;
}

export async function refreshBalanceForCredentialChange() {
	requestGeneration += 1;
	const previous = request;
	requestController?.abort();
	publish({ status: "loading", stale: false });
	if (previous !== undefined) await previous;
	return refreshBalance({ force: true });
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
		if (requestController !== void 0) {
			requestGeneration += 1;
			requestController.abort();
		}
	};
}

function handleVisibility() { if (document.visibilityState === "visible") void refreshBalance(); }
function handleFocus() { void refreshBalance(); }
