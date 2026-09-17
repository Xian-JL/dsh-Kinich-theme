import assert from "node:assert/strict";
import { isBelowCnyThreshold } from "../src/client/balance/policy.js";

for (const amount of ["0", "0.00", "9", "9.9999", "09.50"]) {
	assert.equal(isBelowCnyThreshold({ currency: "CNY", totalBalance: amount }), true, `${amount} must overheat`);
}
for (const amount of ["10", "10.00", "10.0001", "128.60"]) {
	assert.equal(isBelowCnyThreshold({ currency: "CNY", totalBalance: amount }), false, `${amount} must not overheat`);
}
assert.equal(isBelowCnyThreshold({ currency: "USD", totalBalance: "1.00" }), false, "Non-CNY balances have no ¥10 threshold");
assert.equal(isBelowCnyThreshold({ currency: "CNY", totalBalance: "invalid" }), false, "Malformed balances fail closed without a false alert");

async function mountedRoute(label, { settings = {}, credential = { value: "sk-test", source: "test" } } = {}) {
	const { installBalanceRoute } = await import(`../src/host/balance-route.js?test=${label}`);
	let route;
	const service = {
		settings: { get: () => settings },
		credentials: { resolve: async () => credential },
		connection: { fetch: { register: value => { route = value; return () => {}; } } },
		effect: activate => activate()
	};
	installBalanceRoute({ inject: (_services, activate) => activate(service) });
	return route;
}

const originalFetch = globalThis.fetch;
try {
	let providerCalls = 0;
	globalThis.fetch = async (url, init) => {
		providerCalls += 1;
		assert.equal(url, "https://api.deepseek.com/user/balance");
		assert.equal(init.headers.authorization, "Bearer sk-test");
		return new Response(JSON.stringify({
			is_available: true,
			balance_infos: [{ currency: "CNY", total_balance: "9.50", granted_balance: "1.00", topped_up_balance: "8.50" }]
		}), { status: 200, headers: { "content-type": "application/json" } });
	};
	const route = await mountedRoute("success");
	const first = await (await route.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(first.status, "ready");
	assert.equal(first.totalBalance, "9.50");
	assert.match(first.bindingId, /^deepseek-[a-f0-9]{16}$/);
	await route.fetch(new Request("http://dsh.test/api/kinich-balance"));
	assert.equal(providerCalls, 1, "Host cache must deduplicate balance reads inside 60 seconds");

	const unboundRoute = await mountedRoute("unbound", { credential: { value: "", source: "test" } });
	const unbound = await (await unboundRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(unbound.status, "unbound");

	const unsupportedRoute = await mountedRoute("unsupported", { settings: { baseURL: "https://gateway.example.com" } });
	const unsupported = await (await unsupportedRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(unsupported.status, "unsupported");
} finally {
	globalThis.fetch = originalFetch;
}

console.log("Stage 4 balance policy tests passed.");
