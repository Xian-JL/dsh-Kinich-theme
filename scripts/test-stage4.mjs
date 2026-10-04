import assert from "node:assert/strict";
import { getBalanceRetryMinutes, isBelowCnyThreshold } from "../src/client/balance/policy.js";
import { MAX_BALANCE_RESPONSE_BYTES } from "../src/host/balance-route.js";

for (const amount of ["0", "0.00", "9", "9.9999", "09.50"]) {
	assert.equal(isBelowCnyThreshold({ currency: "CNY", totalBalance: amount }), true, `${amount} must overheat`);
}
for (const amount of ["10", "10.00", "10.0001", "128.60"]) {
	assert.equal(isBelowCnyThreshold({ currency: "CNY", totalBalance: amount }), false, `${amount} must not overheat`);
}
assert.equal(isBelowCnyThreshold({ currency: "USD", totalBalance: "1.00" }), false, "Non-CNY balances have no ¥10 threshold");
assert.equal(isBelowCnyThreshold({ currency: "CNY", totalBalance: "invalid" }), false, "Malformed balances fail closed without a false alert");
assert.equal(getBalanceRetryMinutes({ status: "rate-limited", retryAt: new Date(120_000).toISOString() }, 0), 2);
assert.equal(getBalanceRetryMinutes({ status: "ready", retryAt: new Date(120_000).toISOString() }, 0), null);

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
		assert.equal(init.redirect, "error", "The credentialed official API request must reject redirects");
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
	const nonstandardPortRoute = await mountedRoute("nonstandard-port", { settings: { baseURL: "https://api.deepseek.com:8443" } });
	const nonstandardPort = await (await nonstandardPortRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(nonstandardPort.status, "unsupported", "The API key must not be sent to a nonstandard port");
	const credentialedBaseRoute = await mountedRoute("userinfo-base", { settings: { baseURL: "https://user@api.deepseek.com" } });
	const credentialedBase = await (await credentialedBaseRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(credentialedBase.status, "unsupported", "Provider base URLs with user information must be rejected");

	const changingCredential = { value: "sk-first", source: "test" };
	const changingRoute = await mountedRoute("binding-change", { credential: changingCredential });
	const seenKeys = [];
	globalThis.fetch = async (_url, init) => {
		seenKeys.push(init.headers.authorization);
		const total = init.headers.authorization === "Bearer sk-first" ? "12.00" : "27.00";
		return new Response(JSON.stringify({
			is_available: true,
			balance_infos: [{ currency: "CNY", total_balance: total }]
		}), { status: 200, headers: { "content-type": "application/json" } });
	};
	const firstAccount = await (await changingRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	changingCredential.value = "sk-second";
	const secondAccount = await (await changingRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(firstAccount.totalBalance, "12.00");
	assert.equal(secondAccount.totalBalance, "27.00", "A new credential must not reuse the old account's cached balance");
	assert.deepEqual(seenKeys, ["Bearer sk-first", "Bearer sk-second"]);

	const malformedRoute = await mountedRoute("malformed-json");
	globalThis.fetch = async () => new Response(JSON.stringify({
		is_available: true,
		balance_infos: [{ currency: "CNY", total_balance: { unexpected: true } }]
	}), { status: 200, headers: { "content-type": "application/json" } });
	const malformed = await (await malformedRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(malformed.status, "unavailable", "Malformed provider balance values must fail closed");
	const unsupportedCurrencyRoute = await mountedRoute("unsupported-currency");
	globalThis.fetch = async () => new Response(JSON.stringify({
		is_available: true,
		balance_infos: [{ currency: "EUR", total_balance: "10.00" }]
	}), { status: 200, headers: { "content-type": "application/json" } });
	const unsupportedCurrency = await (await unsupportedCurrencyRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(unsupportedCurrency.status, "unavailable", "Only currencies documented by the official balance endpoint are accepted");

	const wrongTypeRoute = await mountedRoute("wrong-content-type");
	globalThis.fetch = async () => new Response("not json", { status: 200, headers: { "content-type": "text/plain" } });
	const wrongType = await (await wrongTypeRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(wrongType.status, "unavailable", "The host must reject non-JSON balance responses");

	const oversizedRoute = await mountedRoute("oversized-json");
	globalThis.fetch = async () => new Response("{}", { status: 200, headers: {
		"content-type": "application/json", "content-length": String(MAX_BALANCE_RESPONSE_BYTES + 1)
	} });
	const oversized = await (await oversizedRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(oversized.status, "unavailable", "Oversized declared response bodies must be rejected before reading");

	const streamedOversizedRoute = await mountedRoute("oversized-stream");
	globalThis.fetch = async () => new Response("x".repeat(MAX_BALANCE_RESPONSE_BYTES + 1), {
		status: 200, headers: { "content-type": "application/json" }
	});
	const streamedOversized = await (await streamedOversizedRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(streamedOversized.status, "unavailable", "The stream reader must enforce the response cap without Content-Length");

	const redirectedRoute = await mountedRoute("redirect-blocked");
	let redirectPolicy;
	globalThis.fetch = async (_url, init) => {
		redirectPolicy = init.redirect;
		throw new TypeError("redirect rejected");
	};
	const redirected = await (await redirectedRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(redirectPolicy, "error");
	assert.equal(redirected.status, "unavailable", "An unexpected upstream redirect must fail closed");

	const limitedRoute = await mountedRoute("rate-limit");
	let limitedCalls = 0;
	globalThis.fetch = async () => {
		limitedCalls += 1;
		return new Response("", { status: 429, headers: { "retry-after": "120" } });
	};
	const limited = await (await limitedRoute.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(limited.status, "rate-limited");
	assert.ok(Date.parse(limited.retryAt) > Date.now() + 60_000);
	await limitedRoute.fetch(new Request("http://dsh.test/api/kinich-balance?force=1"));
	assert.equal(limitedCalls, 1, "Manual refresh must honor provider Retry-After");
} finally {
	globalThis.fetch = originalFetch;
}

console.log("Stage 4 balance policy tests passed.");
