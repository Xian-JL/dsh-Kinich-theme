import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8"));
const host = await readFile(resolve(ROOT, "lib/index.js"), "utf8");
const client = await readFile(resolve(ROOT, "lib/client.js"), "utf8");
const sharedSettings = await readFile(resolve(ROOT, "src/shared/settings.js"), "utf8");
const schemaSource = await readFile(resolve(ROOT, "src/host/settings-schema.js"), "utf8");
const decodeSource = await readFile(resolve(ROOT, "src/client/settings/decode.js"), "utf8");
const overlaySource = await readFile(resolve(ROOT, "src/client/overlay/kinich-overlay.js"), "utf8");
const settingsUiSource = await readFile(resolve(ROOT, "src/client/settings/kinich-settings-row.js"), "utf8");
const brandSource = await readFile(resolve(ROOT, "src/client/components/brand.js"), "utf8");
const themeSource = await readFile(resolve(ROOT, "src/client/theme/tokens.js"), "utf8");

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const sourceFiles = [
  "src/shared/settings.js",
  "src/host/settings-schema.js",
  "src/host/index.js",
  "src/client/assets.generated.js",
  "src/client/locales.js",
  "src/client/settings/decode.js",
  "src/client/components/brand.js",
  "src/client/hooks/use-kinich-settings.js",
  "src/client/overlay/kinich-overlay.js",
  "src/client/session/status-store.js",
  "src/client/session/session-state-bridge.js",
  "src/client/settings/controls.js",
  "src/client/settings/kinich-settings-row.js",
  "src/client/styles.generated.js",
  "src/client/styles.js",
  "src/client/theme/tokens.js",
  "src/client/index.js",
];

for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ["--check", resolve(ROOT, file)], { encoding: "utf8" });
  assert(result.status === 0, `${file}: source syntax check failed\n${result.stderr}`);
}

for (const file of ["lib/index.js", "lib/client.js"]) {
  const result = spawnSync(process.execPath, ["--check", resolve(ROOT, file)], { encoding: "utf8" });
  assert(result.status === 0, `${file}: syntax check failed\n${result.stderr}`);
}

assert(packageJson.version === "1.0.0", "package.json must be version 1.0.0");
assert(packageJson.dsh?.client?.platform === "web", "DSH client platform must remain web");
assert(packageJson.dsh?.bundle?.patch === "./cordis.patch.yml", "Bundle patch path changed unexpectedly");
assert(packageJson.dependencies?.["@deepseek-ai/schemastery"] === "3.18.1", "@deepseek-ai/schemastery must remain a runtime dependency for local link mode");
assert(packageJson.devDependencies?.esbuild === "0.28.2", "esbuild 0.28.2 must remain the development bundler");

assert(packageJson.repository?.url === "git+https://github.com/Xian-JL/dsh-Kinich-theme.git", "Public GitHub repository metadata missing");
assert(packageJson.homepage === "https://github.com/Xian-JL/dsh-Kinich-theme#readme", "Public homepage metadata missing");
assert(packageJson.publishConfig?.access === "public", "npm package must be configured for public publication");
assert(packageJson.keywords?.includes("dsh-plugin"), "dsh-plugin discovery keyword missing");

try {
  await import("@deepseek-ai/schemastery");
} catch (error) {
  errors.push(`Runtime dependency @deepseek-ai/schemastery is not installed. Run npm install in ${ROOT}.\n${error}`);
}

for (const removedApi of [/\bsettingsNamespace\s*\(/, /\binstallSettingsSection\s*\(/]) {
  assert(!removedApi.test(host), `Host still calls removed DSH API: ${removedApi}`);
  assert(!removedApi.test(client), `Client still calls removed DSH API: ${removedApi}`);
}

assert(host.includes("settingsCtx.settings.register(KINICH_SETTINGS_NAMESPACE"), "Host settings namespace registration changed");
assert(client.includes("ctx.settingsScope.bind({"), "Client settingsScope binding missing");
assert(client.includes("namespace: KINICH_SETTINGS_NAMESPACE"), "Client settings namespace changed");
assert(client.includes("theme: ctx.theme"), "Theme service is not projected into the live Kinich overlay");
assert(overlaySource.includes("theme.overrideTokens(KINICH_THEME_SOURCE"), "Live visual-mode theme bridge missing");
assert(overlaySource.includes("document.body"), "Visual-mode body presentation attribute missing");

for (const slot of ["sidebar.brand.mark", "conversation.hero.brand.mark", "shell.overlay", "settings.general.item"]) {
  assert(client.includes(`ctx.slots.inject(${JSON.stringify(slot)}`), `Required slot missing: ${slot}`);
}

for (const service of ["theme", "slots", "locale", "connection", "remote", "settingsScope"]) {
  assert(client.includes(JSON.stringify(service)), `Required client service missing: ${service}`);
}

for (const asset of ["AJAW_MARK_DATA_URI", "AJAW_IDLE_DATA_URI", "KINICH_CHARACTER_DATA_URI", "NATLAN_CORNER_DATA_URI"]) {
  assert(client.includes(asset), `Runtime asset missing from client bundle: ${asset}`);
}

for (const field of [
  "visualStyle", "visualIntensity", "ambientMotion", "animateAjaw", "ajawFlipped", "ajawPosition", "ajawRotation",
  "characterOpacity", "characterPosition", "ornamentIntensity",
  "showCharacter", "showOrnament", "showTexture", "textureIntensity",
]) {
  assert(sharedSettings.includes(`${field}:`), `Shared setting definition missing: ${field}`);
  assert(host.includes(field) && client.includes(field), `Settings field missing from one runtime side: ${field}`);
}

for (const style of ["jungle", "phlogiston", "sunlit"]) {
  assert(sharedSettings.includes(`${style}: Object.freeze(`), `Product visual preset missing: ${style}`);
  assert(themeSource.includes(`${style}:`), `Theme token preset missing: ${style}`);
}

assert(schemaSource.includes("Object.entries(KINICH_SETTING_DEFINITIONS)"), "Host schema is no longer derived from shared setting definitions");
assert(decodeSource.includes("DEFAULT_KINICH_SETTINGS"), "Client decoder no longer supports missing-field defaults");
assert(overlaySource.includes("requestAnimationFrame"), "Ajaw drag/reaction rendering does not use requestAnimationFrame");
assert(overlaySource.includes('data-state'), "Ajaw product interaction states missing");
assert(overlaySource.includes('triggerReaction'), "Ajaw click reaction missing");
assert(settingsUiSource.includes("PresetCards"), "Visual-mode card UI missing");
assert(settingsUiSource.includes("ThemePreview"), "Settings live preview missing");
assert(settingsUiSource.includes('updateMany("ajaw-reset"'), "Ajaw reset action missing");
assert(brandSource.includes("dsh-kinich-brand-shell__orbit"), "Layered brand emblem missing");
assert(client.includes("sidebar.brand.name"), "Sidebar brand name slot missing");
assert(client.includes("conversation.composer.dock"), "Session-state bridge slot missing");
assert(overlaySource.includes("getKinichSessionState"), "Ajaw session-state feedback missing");
assert(overlaySource.includes("onDoubleClick"), "Ajaw Companion 2.0 double-click interaction missing");
assert(overlaySource.includes("dsh-kinich-ambient-motion"), "Dynamic ambient motion layer missing");

if (errors.length) {
  console.error(`Kinich verification failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Kinich verification passed.");
console.log(`- version: ${packageJson.version}`);
console.log("- build: esbuild Host/Client contract preserved");
console.log("- settings: shared schema + backwards-compatible decode");
console.log("- product UI: Jungle / Phlogiston / Sunlit live token modes");
console.log("- product UI: session feedback + branded sidebar + visual intensity");
console.log("- Ajaw: Companion 2.0 with DSH session state, idle moods, click/double-click + rAF drag");
console.log("- DSH slots/settings/theme/assets contract preserved");
