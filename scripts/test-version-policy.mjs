import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertKinichVersionPolicy } from "../src/shared/version-policy.js";

for (const version of ["1.8.1", "1.9.99", "2.0.0-alpha.1", "2.0.0-beta.10", "2.0.0-rc.1+local"]) {
  assert.equal(assertKinichVersionPolicy(version), version);
}
for (const version of ["2.0.4", "2.0.4-alpha.1", "2.1.0-rc.1", "3.0.0-alpha.1"]) {
  assert.throws(() => assertKinichVersionPolicy(version), /exceeds/);
}
for (const version of ["2.0.0", "2.0.0+local", "2.0.1"]) assert.throws(() => assertKinichVersionPolicy(version), /reserved/);
for (const version of ["2.0", "02.0.0", "2.0.0-alpha.01", "2.0.0-", "invalid"]) {
  assert.throws(() => assertKinichVersionPolicy(version), /Invalid/);
}
assert.equal(assertKinichVersionPolicy("2.0.0", "confirmed"), "2.0.0");
assert.equal(assertKinichVersionPolicy("2.0.1", "confirmed"), "2.0.1");
assert.equal(assertKinichVersionPolicy("2.0.2", "confirmed"), "2.0.2");
assert.equal(assertKinichVersionPolicy("2.0.3-rc.1", "candidate"), "2.0.3-rc.1");
assert.throws(() => assertKinichVersionPolicy("2.0.3", "candidate"), /reserved/);
assert.throws(() => assertKinichVersionPolicy("2.0.3", "confirmed"), /exactly/);
assert.equal(assertKinichVersionPolicy("2.0.1-alpha.1"), "2.0.1-alpha.1");
assert.throws(() => assertKinichVersionPolicy("2.0.0-rc.1", "confirmed"), /exactly/);
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
assertKinichVersionPolicy(pkg.version, pkg.kinich?.wallpaperReleaseStage);
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[""].version, pkg.version);
console.log(`Version policy passed: ${pkg.version}; ${pkg.kinich?.wallpaperReleaseStage === "confirmed" ? "user-authorized release" : "candidate"}; ceiling 2.0.3; final confirmation remains reserved.`);
