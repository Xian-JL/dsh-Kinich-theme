import assert from "node:assert/strict";
import { Config, apply as applyHost } from "../src/host/index.js";
import { KinichThemeSettingsSchema } from "../src/host/settings-schema.js";
import { resolveKinichSettings } from "../src/client/settings/resolve.js";
import { KINICH_SETTINGS_NAMESPACE } from "../src/shared/settings.js";

const currentConfig = Config({});
assert.equal(currentConfig.animateAjaw.get(), true);
assert.deepEqual(currentConfig.ajawPosition.get(), { x: 94, y: 84 });
assert.equal(currentConfig.customBackgroundImage.get(), "");
assert.equal(currentConfig.customBackgroundAccent.get(), "");
assert.equal(currentConfig.backgroundAutoPalette.get(), true);
assert.equal(currentConfig.backgroundVisibility.get(), 75);
assert.equal(KinichThemeSettingsSchema({}).animateAjaw, true);

const currentForm = { getSnapshot: () => ({ status: "ready" }) };
assert.equal(resolveKinichSettings({
	get: name => name === "configForms" ? {
		get: namespace => { assert.equal(namespace, KINICH_SETTINGS_NAMESPACE); return currentForm; }
	} : undefined
}), currentForm);

const legacyForm = { getSnapshot: () => ({ status: "ready" }) };
assert.equal(resolveKinichSettings({
	get: name => name === "settingsScope" ? {
		bind: spec => { assert.equal(spec.namespace, KINICH_SETTINGS_NAMESPACE); return legacyForm; }
	} : undefined
}), legacyForm);
assert.throws(() => resolveKinichSettings({ get: () => undefined }), /requires a DSH settings service/);

function hostSettingsRegistration(settings) {
	applyHost({
		fiber: { id: "kinich" },
		inject: (services, activate) => {
			if (services.length === 1 && services[0] === "settings") activate({
				settings,
				effect: register => register()
			});
		}
	});
}

let legacyRegistered = false;
hostSettingsRegistration({ register: (namespace, schema) => {
	assert.equal(namespace, KINICH_SETTINGS_NAMESPACE);
	assert.equal(schema, KinichThemeSettingsSchema);
	legacyRegistered = true;
} });
assert.equal(legacyRegistered, true);

let currentConfigured = false;
hostSettingsRegistration({ configure: policy => {
	assert.deepEqual(policy, { auto: false });
	currentConfigured = true;
	return () => {};
} });
assert.equal(currentConfigured, true);

const { installBalanceRoute } = await import("../src/host/balance-route.js?dsh017");
let route;
const service = {
	settings: { describe: options => {
		assert.deepEqual(options, { redactSecrets: true });
		return [{ ns: "llm-deepseek-api-key", value: {
			apiKeyEnv: "KINICH_TEST_API_KEY", baseURL: "https://api.deepseek.com/anthropic"
		} }];
	} },
	credentials: { resolve: async reference => {
		assert.equal(reference, "KINICH_TEST_API_KEY");
		return { value: "sk-test", source: "test" };
	} },
	connection: { fetch: { register: value => { route = value; return () => {}; } } },
	effect: register => register()
};
installBalanceRoute({ inject: (_services, activate) => activate(service) });
const originalFetch = globalThis.fetch;
try {
	globalThis.fetch = async (url, init) => {
		assert.equal(url, "https://api.deepseek.com/user/balance");
		assert.equal(init.headers.authorization, "Bearer sk-test");
		return new Response(JSON.stringify({
			is_available: true,
			balance_infos: [{ currency: "CNY", total_balance: "9.50" }]
		}), { status: 200, headers: { "content-type": "application/json" } });
	};
	const balance = await (await route.fetch(new Request("http://dsh.test/api/kinich-balance"))).json();
	assert.equal(balance.status, "ready");
	assert.equal(balance.totalBalance, "9.50");
} finally {
	globalThis.fetch = originalFetch;
}

console.log("DSH 0.1.7 settings and balance compatibility tests passed.");
