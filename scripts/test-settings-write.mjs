import assert from "node:assert/strict";
import { writeKinichSettings } from "../src/client/settings/write.js";
import { decodeKinichSettings } from "../src/client/settings/decode.js";
import { KinichThemeSettingsSchema } from "../src/host/settings-schema.js";

assert.equal(decodeKinichSettings({}).balanceEnabled, true, "Old profiles preserve enabled balance monitoring");
assert.equal(decodeKinichSettings({ balanceEnabled: false }).balanceEnabled, false, "An explicit balance off setting survives decoding");
assert.equal(KinichThemeSettingsSchema({}).balanceEnabled, true);
assert.equal(KinichThemeSettingsSchema({ balanceEnabled: false }).balanceEnabled, false);

const patch = { ajawPosition: { x: 30, y: 40 }, ajawRotation: 45 };
let atomicCalls = 0;
await writeKinichSettings({
	mutate: async operations => {
		atomicCalls += 1;
		assert.deepEqual(operations, [
			{ op: "set", path: ["ajawPosition"], value: patch.ajawPosition },
			{ op: "set", path: ["ajawRotation"], value: 45 }
		]);
		return true;
	}
}, patch);
assert.equal(atomicCalls, 1, "Current DSH must receive one atomic settings mutation");
await assert.rejects(writeKinichSettings({ mutate: async () => false }, patch), /refused/);

const writes = [];
const previous = { ajawPosition: { x: 94, y: 84 }, ajawRotation: 0 };
await assert.rejects(writeKinichSettings({
	set: async (field, value) => {
		writes.push([field, value]);
		return field !== "ajawRotation";
	}
}, patch, previous), error => error.partial === false);
assert.deepEqual(writes, [
	["ajawPosition", patch.ajawPosition],
	["ajawRotation", 45],
	["ajawPosition", previous.ajawPosition]
], "Legacy DSH must undo an accepted field after a later failure");

let attempts = 0;
await assert.rejects(writeKinichSettings({
	set: async () => ++attempts === 1
}, patch, previous), error => error.partial === true);

console.log("Kinich atomic and legacy settings-write tests passed.");
