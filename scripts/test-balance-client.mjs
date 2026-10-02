import assert from "node:assert/strict";
import { getBalanceSnapshot, refreshBalance, refreshBalanceForCredentialChange } from "../src/client/balance/balance-store.js";
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
	let completeOld;
	let calls = 0;
	const response = amount => new Response(JSON.stringify({ status: "ready", currency: "CNY", totalBalance: amount }), { status: 200 });
	globalThis.fetch = () => {
		calls += 1;
		return calls === 1 ? new Promise(resolve => { completeOld = () => resolve(response("12.00")); }) : Promise.resolve(response("27.00"));
	};
	const oldRequest = refreshBalance();
	const credentialChange = refreshBalanceForCredentialChange();
	assert.equal(getBalanceSnapshot().status, "loading");
	completeOld();
	await oldRequest;
	assert.equal(getBalanceSnapshot().status, "loading", "The old account result must not replace the pending new-account state");
	await credentialChange;
	assert.equal(getBalanceSnapshot().totalBalance, "27.00");
	assert.equal(calls, 2);
} finally {
	globalThis.fetch = originalFetch;
}

console.log("Kinich balance credential-change tests passed.");
