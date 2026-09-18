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
const balanceRouteSource = await readFile(resolve(ROOT, "src/host/balance-route.js"), "utf8");
const balanceStoreSource = await readFile(resolve(ROOT, "src/client/balance/balance-store.js"), "utf8");
const balancePolicySource = await readFile(resolve(ROOT, "src/client/balance/policy.js"), "utf8");
const interactionSource = await readFile(resolve(ROOT, "src/client/interaction/interaction-bridge.js"), "utf8");
const sessionBridgeSource = await readFile(resolve(ROOT, "src/client/session/session-state-bridge.js"), "utf8");
const stylesSource = await readFile(resolve(ROOT, "src/client/styles.css"), "utf8");

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const sourceFiles = [
  "src/shared/settings.js",
  "src/host/settings-schema.js",
  "src/host/index.js",
  "src/host/balance-route.js",
  "src/client/assets.generated.js",
  "src/client/locales.js",
  "src/client/settings/decode.js",
  "src/client/components/brand.js",
  "src/client/balance/balance-store.js",
  "src/client/balance/policy.js",
  "src/client/balance/use-balance.js",
  "src/client/hooks/use-kinich-settings.js",
  "src/client/interaction/interaction-bridge.js",
  "src/client/overlay/kinich-overlay.js",
  "src/client/session/status-store.js",
  "src/client/session/session-state-bridge.js",
  "src/client/settings/controls.js",
  "src/client/settings/kinich-settings-row.js",
  "src/client/styles.generated.js",
  "src/client/styles.js",
  "src/client/theme/tokens.js",
  "src/client/version.generated.js",
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

assert(packageJson.version === "1.2.1", "package.json must be version 1.2.1");
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
assert(settingsUiSource.includes("ThemePreview"), "Settings live preview missing");
assert(!settingsUiSource.includes("PresetCards"), "Stage 3 settings must expose the Jungle design only");
assert(settingsUiSource.includes("BalanceMonitorPreview"), "Balance monitor settings shell missing");
assert(settingsUiSource.includes('value.visualStyle !== "jungle"'), "Legacy visual-mode compatibility prompt missing");
assert(settingsUiSource.includes('updateMany("ajaw-reset"'), "Ajaw reset action missing");
assert(brandSource.includes("dsh-kinich-brand-shell__orbit"), "Layered brand emblem missing");
assert(client.includes("sidebar.brand.name"), "Sidebar brand name slot missing");
assert(client.includes("conversation.composer.dock"), "Session-state bridge slot missing");
assert(overlaySource.includes("getKinichSessionState"), "Ajaw session-state feedback missing");
assert(overlaySource.includes('"aria-controls": balanceDialogId'), "Accessible Ajaw balance trigger missing");
assert(balanceRouteSource.includes('path: BALANCE_PATH'), "Authenticated balance route registration missing");
assert(balanceRouteSource.includes('authorization: `Bearer ${credential.value}`'), "Host-side DeepSeek authorization missing");
assert(balanceRouteSource.includes('new URL("/user/balance"'), "Official DeepSeek balance endpoint missing");
assert(balanceRouteSource.includes('CACHE_TTL_MS = 60_000'), "Host balance cache must remain 60 seconds");
assert(balanceRouteSource.includes('REQUEST_TIMEOUT_MS = 10_000'), "Host balance timeout must remain 10 seconds");
assert(balanceStoreSource.includes('setInterval'), "Client 60-second balance polling missing");
assert(balancePolicySource.includes('currency !== "CNY"'), "CNY-only red-alert threshold missing");
assert(overlaySource.includes('data-overheated'), "Ajaw red-alert state missing");
assert(!overlaySource.includes("dsh-kinich-welcome__motto"), "Removed welcome motto returned");
assert(!overlaySource.includes("overheated || !snapshot.writable"), "Low balance must not disable Ajaw dragging");
assert(!overlaySource.includes("!value.animateAjaw || overheated"), "Low balance must not disable Ajaw moods");
assert(!stylesSource.includes("data-overheated='true'] .dsh-kinich-ajaw-idle__spark { animation: none"), "Low balance must not freeze Ajaw animation");
assert(stylesSource.includes("red tint + 2x animation speed"), "Low-balance two-change contract missing");
assert(stylesSource.includes("animation-duration: .3s"), "Low-balance idle animation must run at 2x speed");
assert(overlaySource.includes('refreshBalance({ force: true })'), "Ajaw click/manual balance refresh missing");
assert(overlaySource.includes('dsh-kinich-welcome'), "Preview-aligned Jungle welcome composition missing");
assert(overlaySource.includes('dsh-kinich-character-frame'), "Preview-aligned Kinich character frame missing");
assert(overlaySource.includes('role: "dialog"'), "Ajaw balance popover semantics missing");
assert(!overlaySource.includes('"aria-hidden": "true", className: "dsh-kinich-overlay"'), "Interactive overlay must not be hidden from assistive technology");
assert(overlaySource.includes("dsh-kinich-ambient-motion"), "Dynamic ambient motion layer missing");
assert(overlaySource.includes("dsh-kinich-ambient-motion__canopy"), "Jungle canopy motion layer missing");
assert(overlaySource.includes("dsh-kinich-ambient-motion__ribbon"), "Jungle energy ribbon layer missing");
assert(overlaySource.includes("dsh-kinich-ambient-motion__glint"), "Jungle glint motion layer missing");
assert(stylesSource.includes("dsh-kinich-character-hero-drift"), "Kinich character loop animation missing");
assert(overlaySource.includes("length: 24"), "Jungle firefly layer must render 24 particles");
assert(!stylesSource.includes("dsh-kinich-ornament-drift"), "Natlan ornament drift must remain removed");
assert(client.includes("installInteractionBridge"), "Host interaction bridge is not installed");
assert(interactionSource.includes("kinich:interaction-feedback"), "Interaction feedback event contract missing");
assert(interactionSource.includes("data.kinichPressed") || interactionSource.includes("dataset.kinichPressed"), "Tactile action feedback missing");
assert(sessionBridgeSource.includes('setKinichSessionState("error")'), "Session error feedback missing");
assert(overlaySource.includes("dsh-kinich-interaction-status"), "Accessible interaction status missing");
assert(overlaySource.includes('aria-live'), "Interaction feedback must announce state changes");
assert(!overlaySource.includes("dsh-kinich-interaction-rail"), "Rejected composer progress rail must remain removed");
assert(overlaySource.includes('interactionFeedback === "sending" ? "sending"'), "Ajaw sending state priority missing");
assert(stylesSource.includes("task feedback is allowed to override"), "Red-alert task-state overrides missing");
assert(stylesSource.includes("v1.2 — Kinich interaction feedback"), "Kinich interaction feedback styles missing");
assert(interactionSource.includes("kinich:click-burst"), "Pointer burst event contract missing");
assert(interactionSource.includes('document.addEventListener("click", click);'), "Host click feedback must run after DSH handlers");
assert(!interactionSource.includes('document.addEventListener("click", click, true);'), "Host click feedback must not intercept capture phase");
assert(interactionSource.includes("setTimeout(() =>"), "Decorative click mutations must be deferred");
assert(overlaySource.includes("dsh-kinich-click-layer"), "Stable pointer-burst layer missing");
assert(overlaySource.includes("dsh-kinich-click-burst__fragment"), "Pointer burst fragment layer missing");
assert(overlaySource.includes("length: 10"), "Pointer burst must render exactly ten fragments");
assert(stylesSource.includes("72px maximum"), "Pointer burst size contract missing");
assert(stylesSource.includes("dsh-kinich-click-fragment 265ms"), "Pointer burst timing contract missing");
assert(!stylesSource.includes("single-art cinematic depth"), "Rejected v1.3 cinematic depth layer leaked into v1.2");

if (errors.length) {
  console.error(`Kinich verification failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Kinich verification passed.");
console.log(`- version: ${packageJson.version}`);
console.log("- build: esbuild Host/Client contract preserved");
console.log("- settings: shared schema + backwards-compatible decode");
console.log("- product UI: Jungle workspace with legacy mode data compatibility");
console.log("- product UI: modern settings hierarchy + branded sidebar + visual intensity");
console.log("- Ajaw: live official balance, CNY<10 red tint + 2x motion, full interaction, and rAF drag");
console.log("- DSH slots/settings/theme/assets contract preserved");
