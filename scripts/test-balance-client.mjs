import assert from "node:assert/strict";
import { getBalanceSnapshot, refreshBalance, refreshBalanceForCredentialChange, retainBalancePolling } from "../src/client/balance/balance-store.js";
import { watchDeepSeekBalanceProvider } from "../src/client/balance/provider-watch.js";

let revision = 1;
let notify;
let refreshed = 0;
const stop = watchDeepSeekBalanceProvider({
	get: name => name === "configForms" ? { get: namespace => {
		assert.equal(namespace, "llm-deepseek-api-key");
		return { getSnapshot: () => ({ revision, status: "ready" }), subscribe: listener => { notify = listener; return () => { notify = undefined; }; } };
	} } : undefined
}, () => { refreshed += 1; });
revision = 2;
notify();
notify();
assert.equal(refreshed, 1, "A credential-form revision must cause one refresh");
stop();
assert.equal(notify, undefined);

let providerSnapshot = { status: "loading", revision: undefined };
let providerNotify;
let newProviderRefreshes = 0;
watchDeepSeekBalanceProvider({ get: () => ({ get: () => ({
	getSnapshot: () => providerSnapshot,
	subscribe: listener => { providerNotify = listener; return () => {}; }
}) }) }, () => { newProviderRefreshes += 1; });
providerSnapshot = { status: "unavailable", revision: undefined };
providerNotify();
assert.equal(newProviderRefreshes, 0, "Initial mirror settlement is not a credential change");
providerSnapshot = { status: "ready", revision: 1 };
providerNotify();
assert.equal(newProviderRefreshes, 1, "Adding the first provider configuration must refresh balance");

const originalFetch = globalThis.fetch;
try {
	let oldSignal;
	let calls = 0;
	const response = amount => new Response(JSON.stringify({ status: "ready", currency: "CNY", totalBalance: amount }), { status: 200 });
	globalThis.fetch = (_url, options) => {
		calls += 1;
		if (calls !== 1) return Promise.resolve(response("27.00"));
		oldSignal = options.signal;
		return new Promise((resolve, reject) => {
			const abort = () => reject(Object.assign(new Error("request aborted"), { name: "AbortError" }));
			if (oldSignal.aborted) abort();
			else oldSignal.addEventListener("abort", abort, { once: true });
		});
	};
	const oldRequest = refreshBalance();
	const credentialChange = refreshBalanceForCredentialChange();
	assert.equal(getBalanceSnapshot().status, "loading");
	assert.equal(oldSignal.aborted, true, "A credential change must cancel the prior account's request");
	await oldRequest;
	assert.equal(getBalanceSnapshot().status, "loading", "The old account result must not replace the pending new-account state");
	await credentialChange;
	assert.equal(getBalanceSnapshot().totalBalance, "27.00");
	assert.equal(calls, 2);

	let completeIgnoredRequest;
	let ignoredSignal;
	let ignoredCalls = 0;
	globalThis.fetch = (_url, options) => {
		ignoredCalls += 1;
		if (ignoredCalls > 1) return Promise.resolve(response("34.00"));
		ignoredSignal = options.signal;
		return new Promise(resolve => { completeIgnoredRequest = () => resolve(response("31.00")); });
	};
	const ignoredOldRequest = refreshBalance();
	const ignoredCredentialChange = refreshBalanceForCredentialChange();
	assert.equal(ignoredSignal.aborted, true);
	completeIgnoredRequest();
	await ignoredOldRequest;
	assert.equal(getBalanceSnapshot().status, "loading", "A late response must not restore data from the previous credential");
	await ignoredCredentialChange;
	assert.equal(getBalanceSnapshot().totalBalance, "34.00");

	const oldDocument = globalThis.document;
	const oldWindow = globalThis.window;
	const documentListeners = new Map();
	const windowListeners = new Map();
	globalThis.document = {
		visibilityState: "visible",
		addEventListener: (type, listener) => documentListeners.set(type, listener),
		removeEventListener: type => documentListeners.delete(type)
	};
	globalThis.window = {
		addEventListener: (type, listener) => windowListeners.set(type, listener),
		removeEventListener: type => windowListeners.delete(type)
	};
	let unmountedSignal;
	globalThis.fetch = (_url, options) => {
		unmountedSignal = options.signal;
		return new Promise((resolve, reject) => options.signal.addEventListener("abort",
			() => reject(Object.assign(new Error("request aborted"), { name: "AbortError" })), { once: true }));
	};
	const release = retainBalancePolling();
	assert.ok(unmountedSignal, "Retaining balance polling should begin a request");
	release();
	assert.equal(unmountedSignal.aborted, true, "Releasing the last consumer must cancel an in-flight request");
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.equal(documentListeners.size, 0);
	assert.equal(windowListeners.size, 0);
	if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
	if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
} finally {
	globalThis.fetch = originalFetch;
}

console.log("Kinich balance credential-change tests passed.");
