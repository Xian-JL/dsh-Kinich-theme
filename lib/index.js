// src/shared/settings.js
var KINICH_SETTINGS_NAMESPACE = "dsh-kinich-theme";
var VISUAL_STYLES = Object.freeze(["jungle", "phlogiston", "sunlit"]);
var VISUAL_INTENSITIES = Object.freeze(["minimal", "balanced", "immersive"]);
var CHARACTER_POSITIONS = Object.freeze(["corner", "edge"]);
var DECORATION_INTENSITIES = Object.freeze(["soft", "standard"]);
var CHARACTER_OPACITIES = Object.freeze(["low", "medium", "high"]);
var MAX_BACKGROUND_DATA_URL_LENGTH = 512 * 1024;
var BACKGROUND_DATA_URL_PATTERN = /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/;
var HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
var AJAW_DEFAULT_POSITION = Object.freeze({ x: 94, y: 84 });
var KINICH_SETTING_DEFINITIONS = Object.freeze({
  visualStyle: Object.freeze({ kind: "choice", default: "jungle", options: VISUAL_STYLES }),
  visualIntensity: Object.freeze({ kind: "choice", default: "balanced", options: VISUAL_INTENSITIES }),
  ambientMotion: Object.freeze({ kind: "boolean", default: true }),
  animateAjaw: Object.freeze({ kind: "boolean", default: true }),
  ajawFlipped: Object.freeze({ kind: "boolean", default: false }),
  ajawPosition: Object.freeze({ kind: "position", default: AJAW_DEFAULT_POSITION, min: 0, max: 100 }),
  ajawRotation: Object.freeze({ kind: "number", default: 0, min: 0, max: 360, step: 1 }),
  characterOpacity: Object.freeze({ kind: "choice", default: "medium", options: CHARACTER_OPACITIES }),
  characterPosition: Object.freeze({ kind: "choice", default: "corner", options: CHARACTER_POSITIONS }),
  ornamentIntensity: Object.freeze({ kind: "choice", default: "standard", options: DECORATION_INTENSITIES }),
  showCharacter: Object.freeze({ kind: "boolean", default: true }),
  showOrnament: Object.freeze({ kind: "boolean", default: true }),
  showTexture: Object.freeze({ kind: "boolean", default: true }),
  textureIntensity: Object.freeze({ kind: "choice", default: "standard", options: DECORATION_INTENSITIES }),
  customBackgroundImage: Object.freeze({
    kind: "string",
    default: "",
    maxLength: MAX_BACKGROUND_DATA_URL_LENGTH,
    pattern: BACKGROUND_DATA_URL_PATTERN,
    recoverInvalid: true
  }),
  customBackgroundAccent: Object.freeze({
    kind: "string",
    default: "",
    maxLength: 7,
    pattern: HEX_COLOR_PATTERN,
    recoverInvalid: true
  }),
  backgroundAutoPalette: Object.freeze({ kind: "boolean", default: true }),
  backgroundBrightness: Object.freeze({ kind: "number", default: 130, min: 50, max: 180, step: 5, recoverInvalid: true })
});
var KINICH_SETTING_KEYS = Object.freeze(Object.keys(KINICH_SETTING_DEFINITIONS));
function cloneDefaultValue(value) {
  if (typeof value === "object" && value !== null) return Object.freeze({ ...value });
  return value;
}
var DEFAULT_KINICH_SETTINGS = Object.freeze(Object.fromEntries(
  Object.entries(KINICH_SETTING_DEFINITIONS).map(([key, definition]) => [key, cloneDefaultValue(definition.default)])
));
var KINICH_VISUAL_PRESETS = Object.freeze({
  jungle: Object.freeze({
    visualStyle: "jungle",
    showCharacter: false,
    showOrnament: true,
    ornamentIntensity: "standard",
    showTexture: true,
    textureIntensity: "standard",
    animateAjaw: true
  }),
  phlogiston: Object.freeze({
    visualStyle: "phlogiston",
    showCharacter: true,
    characterPosition: "edge",
    characterOpacity: "high",
    showOrnament: true,
    ornamentIntensity: "standard",
    showTexture: true,
    textureIntensity: "standard",
    animateAjaw: true
  }),
  sunlit: Object.freeze({
    visualStyle: "sunlit",
    showCharacter: false,
    showOrnament: true,
    ornamentIntensity: "soft",
    showTexture: true,
    textureIntensity: "soft",
    animateAjaw: true
  })
});

// src/host/settings-schema.js
import z from "@deepseek-ai/schemastery";
function schemaFor(definition) {
  switch (definition.kind) {
    case "boolean":
      return z.boolean().default(definition.default);
    case "string":
      return z.string().default(definition.default);
    case "number":
      return z.number().min(definition.min).max(definition.max).step(definition.step ?? 1).default(definition.default);
    case "choice":
      return z.union([...definition.options]).default(definition.default);
    case "position":
      return z.object({
        x: z.number().min(definition.min).max(definition.max).default(definition.default.x),
        y: z.number().min(definition.min).max(definition.max).default(definition.default.y)
      }).default(definition.default);
    default:
      throw new TypeError(`Unsupported Kinich setting kind: ${definition.kind}`);
  }
}
var KinichThemeSettingsSchema = z.object(Object.fromEntries(
  Object.entries(KINICH_SETTING_DEFINITIONS).map(([key, definition]) => [key, schemaFor(definition)])
));
var KinichThemeConfigSchema = z.object(Object.fromEntries(
  Object.entries(KINICH_SETTING_DEFINITIONS).map(([key, definition]) => [key, schemaFor(definition).volatile()])
));

// src/host/balance-route.js
import { createHash } from "node:crypto";
var BALANCE_PATH = "/api/kinich-balance";
var OFFICIAL_HOST = "api.deepseek.com";
var SUPPORTED_CURRENCIES = /* @__PURE__ */ new Set(["CNY", "USD"]);
var CACHE_TTL_MS = 6e4;
var MANUAL_REFRESH_FLOOR_MS = 5e3;
var REQUEST_TIMEOUT_MS = 1e4;
var MAX_BALANCE_RESPONSE_BYTES = 64 * 1024;
var cached;
var inFlight;
var generation = 0;
function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff"
    }
  });
}
function errorSnapshot(status, extra = {}) {
  const previous = cached?.value;
  const sameBinding = typeof previous?.totalBalance === "string" && typeof extra.bindingId === "string" && previous.bindingId === extra.bindingId;
  return {
    status,
    providerLabel: "DeepSeek API",
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    stale: sameBinding,
    ...sameBinding ? {
      bindingId: previous.bindingId,
      generation: previous.generation,
      currency: previous.currency,
      totalBalance: previous.totalBalance,
      grantedBalance: previous.grantedBalance,
      toppedUpBalance: previous.toppedUpBalance,
      isAvailable: previous.isAvailable
    } : {},
    ...extra
  };
}
function parseRetryAt(header) {
  if (header === null) return Date.now() + 6e4;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Date.now() + seconds * 1e3;
  const date = Date.parse(header);
  return Number.isFinite(date) ? date : Date.now() + 6e4;
}
function resolveConnection(settings, launchEnvironment) {
  let section;
  if (typeof settings.get === "function") {
    section = settings.get("llm-deepseek") ?? {};
  } else {
    const entries = settings.describe({ redactSecrets: true });
    const provider = entries.find((entry) => entry.ns === "llm-deepseek-api-key") ?? entries.find((entry) => entry.ns === "llm-deepseek");
    if (!provider) return { status: "unbound" };
    section = provider.value ?? {};
  }
  const apiKeyEnv = typeof section.apiKeyEnv === "string" && section.apiKeyEnv.length > 0 ? section.apiKeyEnv : "DEEPSEEK_API_KEY";
  const rawBaseURL = typeof section.baseURL === "string" && section.baseURL.length > 0 ? section.baseURL : launchEnvironment?.get("DEEPSEEK_BASE_URL")?.value ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  let baseURL;
  try {
    baseURL = new URL(rawBaseURL);
  } catch {
    return { status: "unsupported" };
  }
  if (baseURL.protocol !== "https:" || baseURL.hostname !== OFFICIAL_HOST || baseURL.port !== "" && baseURL.port !== "443" || baseURL.username !== "" || baseURL.password !== "") {
    return { status: "unsupported" };
  }
  return { apiKeyEnv, balanceURL: new URL("/user/balance", baseURL.origin).href };
}
function simpleBindingId(reference, source, secret) {
  const digest = createHash("sha256").update(reference).update("\0").update(source).update("\0").update(secret).digest("hex").slice(0, 16);
  return `deepseek-${digest}`;
}
async function resolveBalanceBinding(ctx) {
  const connection = resolveConnection(ctx.settings, ctx.launchEnvironment);
  if (connection.status) return connection;
  const credential = await ctx.credentials.resolve(connection.apiKeyEnv);
  if (credential === void 0 || credential.value === "") return { status: "unbound" };
  return {
    ...connection,
    credential,
    bindingId: simpleBindingId(connection.apiKeyEnv, credential.source ?? "configured", credential.value)
  };
}
async function queryBalance(binding) {
  const { balanceURL, bindingId, credential } = binding;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(balanceURL, {
      headers: { accept: "application/json", authorization: `Bearer ${credential.value}` },
      redirect: "error",
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) return errorSnapshot("auth-error", { bindingId });
    if (response.status === 429) return errorSnapshot("rate-limited", { bindingId, retryAt: new Date(parseRetryAt(response.headers.get("retry-after"))).toISOString() });
    if (!response.ok) return errorSnapshot("unavailable", { bindingId });
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return errorSnapshot("unavailable", { bindingId });
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BALANCE_RESPONSE_BYTES) return errorSnapshot("unavailable", { bindingId });
    const reader = response.body?.getReader();
    if (!reader) return errorSnapshot("unavailable", { bindingId });
    const chunks = [];
    let responseBytes = 0;
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      responseBytes += value.byteLength;
      if (responseBytes > MAX_BALANCE_RESPONSE_BYTES) {
        await reader.cancel();
        return errorSnapshot("unavailable", { bindingId });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(responseBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return errorSnapshot("unavailable", { bindingId });
    }
    if (typeof body?.is_available !== "boolean" || !Array.isArray(body.balance_infos)) return errorSnapshot("unavailable", { bindingId });
    const infos = Array.isArray(body?.balance_infos) ? body.balance_infos : [];
    const primary = infos.find((info) => info?.currency === "CNY") ?? infos[0];
    const validAmount = (value) => typeof value === "string" && value.length <= 64 && /^\d+(?:\.\d+)?$/.test(value);
    const currency = primary?.currency ?? "CNY";
    if (primary === void 0 || primary === null || !SUPPORTED_CURRENCIES.has(currency) || !validAmount(primary.total_balance) || !validAmount(primary.granted_balance ?? "0") || !validAmount(primary.topped_up_balance ?? "0")) return errorSnapshot("unavailable", { bindingId });
    generation += 1;
    return {
      status: "ready",
      bindingId,
      generation,
      providerLabel: "DeepSeek API",
      currency,
      totalBalance: primary.total_balance,
      grantedBalance: String(primary.granted_balance ?? "0"),
      toppedUpBalance: String(primary.topped_up_balance ?? "0"),
      isAvailable: Boolean(body.is_available),
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      stale: false
    };
  } catch {
    return errorSnapshot("unavailable", { bindingId });
  } finally {
    clearTimeout(timer);
  }
}
async function readBalance(ctx, force) {
  const binding = await resolveBalanceBinding(ctx);
  if (binding.status) return errorSnapshot(binding.status);
  const now = Date.now();
  if (cached?.bindingId === binding.bindingId) {
    const retryAt = cached.value.status === "rate-limited" ? Date.parse(cached.value.retryAt ?? "") : Number.NaN;
    if (Number.isFinite(retryAt) && retryAt > now) return cached.value;
    const age = now - cached.at;
    if (age < (force ? MANUAL_REFRESH_FLOOR_MS : CACHE_TTL_MS)) return cached.value;
  }
  if (inFlight?.bindingId === binding.bindingId) return inFlight.promise;
  const current = { bindingId: binding.bindingId, promise: void 0 };
  current.promise = queryBalance(binding).then((value) => {
    if (inFlight === current) cached = { at: Date.now(), bindingId: binding.bindingId, value };
    return value;
  }).finally(() => {
    if (inFlight === current) inFlight = void 0;
  });
  inFlight = current;
  return current.promise;
}
function installBalanceRoute(ctx) {
  ctx.inject(["connection", "settings", "credentials"], (balanceCtx) => {
    balanceCtx.effect(() => balanceCtx.connection.fetch.register({
      path: BALANCE_PATH,
      methods: ["GET"],
      requestBody: "buffered",
      fetch: (request) => {
        const force = new URL(request.url).searchParams.get("force") === "1";
        return readBalance(balanceCtx, force).then((value) => json(value));
      }
    }), "dsh-kinich-theme: authenticated DeepSeek balance route");
  });
}

// src/host/index.js
var name = "dsh-kinich-theme";
var Config = KinichThemeConfigSchema;
function apply(ctx) {
  installBalanceRoute(ctx);
  ctx.inject(["settings"], (settingsCtx) => {
    if (typeof settingsCtx.settings.register === "function") {
      settingsCtx.settings.register(KINICH_SETTINGS_NAMESPACE, KinichThemeSettingsSchema, { applies: "live" });
    } else if (typeof settingsCtx.settings.configure === "function") {
      settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
    }
  });
}
export {
  Config,
  apply,
  name
};
