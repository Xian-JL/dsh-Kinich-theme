import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	deriveKinichSessionPhase,
	resolveSessionId,
	selectMainViewSessionId
} from "../src/client/session/compat.js";
import {
	clearKinichSessionState,
	getKinichSessionState,
	setKinichSessionState
} from "../src/client/session/status-store.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8"));

assert.equal(deriveKinichSessionPhase(undefined), "idle");
assert.equal(deriveKinichSessionPhase({ running: true }), "running");
assert.equal(deriveKinichSessionPhase({ running: true, awaitingFirstTurn: true }), "sending");
assert.equal(deriveKinichSessionPhase({ pendingSubmissions: [{}], running: false }), "sending");
assert.equal(deriveKinichSessionPhase({ promptError: { code: "send-failed" }, running: false }), "error");
assert.equal(deriveKinichSessionPhase({ openError: { code: "open-failed" }, running: false }), "error");
assert.equal(deriveKinichSessionPhase({ lastAgentError: "agent failed", running: false }), "error");
assert.equal(deriveKinichSessionPhase({ error: new Error("legacy"), running: false }), "error");
assert.equal(resolveSessionId("slot-session", { sessionId: "snapshot-session" }), "slot-session");
assert.equal(resolveSessionId(undefined, { sessionId: "snapshot-session" }), "snapshot-session");

assert.equal(selectMainViewSessionId({ current: "legacy-current" }), "legacy-current");
assert.equal(selectMainViewSessionId({
	ids: ["secondary", "main"],
	byId: {
		secondary: { retainedBy: { rightbar: 1 } },
		main: { retainedBy: { mainView: 1 } }
	}
}), "main");
assert.equal(selectMainViewSessionId({
	ids: [],
	byId: { blank: { retainedBy: { mainView: 1 } } }
}), "blank");

setKinichSessionState("main", "running");
setKinichSessionState("subagent", "error");
assert.equal(getKinichSessionState("main"), "running");
assert.equal(getKinichSessionState("subagent"), "error");
assert.equal(getKinichSessionState("not-mounted"), "idle");
clearKinichSessionState("subagent");
assert.equal(getKinichSessionState("main"), "running");
clearKinichSessionState("main");
assert.equal(getKinichSessionState("main"), "idle");

assert.equal(packageJson.version, "1.2.2");
assert.equal(packageJson.dsh.manifestVersion, 1);
assert.equal(packageJson.engines.dsh, "^0.1.5-rc.1 || ^0.1.6-alpha.1");
assert.equal(packageJson.dsh.client.inject.includes("@deepseek-ai/dsh-client-runtime"), false);
assert.equal(packageJson.peerDependencies["@deepseek-ai/dsh-settings"], "^0.1.5-rc.1 || ^0.1.6-alpha.1");

console.log("DSH 0.1.6 compatibility tests passed.");
