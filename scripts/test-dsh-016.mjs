import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	deriveKinichSessionPhase,
	isKinichPendingInteraction,
	resolveSessionId,
	selectKinichPendingInteraction,
	selectMainViewSessionId,
	shouldAnnounceKinichCompletion
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
assert.equal(deriveKinichSessionPhase({ running: true }, { kind: "approval" }), "waiting", "Waiting interaction takes priority over running");
assert.equal(deriveKinichSessionPhase({ running: true }, { kind: "question" }), "waiting");
assert.equal(deriveKinichSessionPhase({ running: true }, { kind: "plan-review" }), "waiting");
assert.equal(deriveKinichSessionPhase({ running: true }, { kind: "unknown" }), "running", "Unknown interaction kinds do not invent a waiting state");
assert.equal(deriveKinichSessionPhase({ error: new Error("failed") }, { kind: "approval" }), "error", "Errors retain priority over waiting interactions");
assert.equal(isKinichPendingInteraction({ kind: "approval" }), true);
assert.equal(isKinichPendingInteraction({ kind: "answer-record" }), false);
const mainPending = { kind: "question", sessionId: "main" };
const interactionSnapshot = new Map([[
	"main", { running: true, pendingInteraction: mainPending }
], ["secondary", { running: true, pendingInteraction: { kind: "approval", sessionId: "secondary" } }]]);
assert.equal(selectKinichPendingInteraction(interactionSnapshot, "main"), mainPending);
assert.equal(selectKinichPendingInteraction(interactionSnapshot, "secondary").kind, "approval");
assert.equal(selectKinichPendingInteraction(interactionSnapshot, "missing"), undefined);
assert.equal(selectKinichPendingInteraction(undefined, "main"), undefined);
assert.equal(shouldAnnounceKinichCompletion(false, "idle"), false, "Leaving a waiting interaction must not announce a false completion");
assert.equal(shouldAnnounceKinichCompletion(true, "idle"), true, "A real run that settles still announces completion");
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

assert.equal(packageJson.version, (await import("../src/client/version.generated.js")).PLUGIN_VERSION);
assert.equal(packageJson.dsh.manifestVersion, 1);
assert.equal(packageJson.engines.dsh, "^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2 || ^0.2.0-rc.2");
assert.equal(packageJson.dsh.client.inject.includes("@deepseek-ai/dsh-client-runtime"), false);
assert.equal(packageJson.peerDependencies["@deepseek-ai/dsh-settings"], "^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2 || ^0.2.0-rc.2");

console.log("DSH 0.1.5-0.2.0 compatibility tests passed.");
