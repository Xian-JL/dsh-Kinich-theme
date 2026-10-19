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
  enabled: Object.freeze({ kind: "boolean", default: true, recoverInvalid: true }),
  balanceEnabled: Object.freeze({ kind: "boolean", default: true, recoverInvalid: true }),
  visualStyle: Object.freeze({ kind: "choice", default: "jungle", options: VISUAL_STYLES }),
  visualIntensity: Object.freeze({ kind: "choice", default: "balanced", options: VISUAL_INTENSITIES }),
  ambientMotion: Object.freeze({ kind: "boolean", default: true }),
  dynamicWallpaperEnabled: Object.freeze({ kind: "boolean", default: true, recoverInvalid: true }),
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
  backgroundVisibility: Object.freeze({ kind: "number", default: 75, min: 0, max: 100, step: 5, recoverInvalid: true })
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
  const digest2 = createHash("sha256").update(reference).update("\0").update(source).update("\0").update(secret).digest("hex").slice(0, 16);
  return `deepseek-${digest2}`;
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
  const enabled = () => {
    const section = typeof ctx.settings.get === "function" ? ctx.settings.get(KINICH_SETTINGS_NAMESPACE) : ctx.settings.describe({ redactSecrets: true }).find((entry) => entry.ns === KINICH_SETTINGS_NAMESPACE)?.value;
    return section?.enabled !== false && section?.balanceEnabled !== false;
  };
  if (!enabled()) return errorSnapshot("disabled");
  const binding = await resolveBalanceBinding(ctx);
  if (!enabled()) return errorSnapshot("disabled");
  if (binding.status) return errorSnapshot(binding.status);
  const now2 = Date.now();
  if (cached?.bindingId === binding.bindingId) {
    const retryAt = cached.value.status === "rate-limited" ? Date.parse(cached.value.retryAt ?? "") : Number.NaN;
    if (Number.isFinite(retryAt) && retryAt > now2) return cached.value;
    const age = now2 - cached.at;
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

// src/shared/wallpaper.js
var WALLPAPER_SCHEMA_VERSION = 1;
var WALLPAPER_SPEC_VERSION = "1.0.8";
var WALLPAPER_ASSET_PATH = "/api/kinich-wallpaper/asset";
var WALLPAPER_STATE_PATH = "/api/kinich-wallpaper/state";
var WALLPAPER_APPLY_PATH = "/api/kinich-wallpaper/apply";
var WALLPAPER_HISTORY_PATH = "/api/kinich-wallpaper/history";
var WALLPAPER_HISTORY_ITEM_PATH = "/api/kinich-wallpaper/history-item";
var WALLPAPER_CLEAR_HISTORY_PATH = "/api/kinich-wallpaper/clear-history";
var WALLPAPER_BUNDLE_PATH = "/api/kinich-wallpaper/bundle";
var WALLPAPER_EXPORT_PATH = "/api/kinich-wallpaper/export";
var WALLPAPER_IMPORT_PATH = "/api/kinich-wallpaper/import";
var WALLPAPER_DEFAULT_PATH = "/api/kinich-wallpaper/default";
var WALLPAPER_PALETTE_PATH = "/api/kinich-wallpaper/palette";
var MAX_WALLPAPER_ASSET_BYTES = 2 * 1024 * 1024;
var MAX_WALLPAPER_BUNDLE_ASSETS = 320;
var WALLPAPER_DEFAULT_PARAMETERS = Object.freeze({ rhythm: 50, amplitude: 50, elementDensity: 50, visibility: 50 });
var WALLPAPER_PARAMETER_KEYS = Object.freeze(Object.keys(WALLPAPER_DEFAULT_PARAMETERS));
var WALLPAPER_MODES = Object.freeze(["none", "static", "dynamic"]);
var WALLPAPER_TEMPLATES = Object.freeze(["work", "overview", "detail", "about"]);
var WALLPAPER_HASH = /^[a-f0-9]{64}$/;
var WallpaperError = class extends Error {
  constructor(code, message = code, status = 400) {
    super(message);
    this.name = "WallpaperError";
    this.code = code;
    this.status = status;
  }
};
function wallpaperParameters(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new WallpaperError("invalid-parameters");
  const result = {};
  for (const key of WALLPAPER_PARAMETER_KEYS) {
    const v = value[key] ?? WALLPAPER_DEFAULT_PARAMETERS[key];
    if (!Number.isInteger(v) || v < 0 || v > 100) throw new WallpaperError("invalid-parameters", `Invalid ${key}`);
    result[key] = v;
  }
  if (Object.keys(value).some((key) => !WALLPAPER_PARAMETER_KEYS.includes(key))) throw new WallpaperError("invalid-parameters");
  return result;
}
function canonicalWallpaperJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalWallpaperJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalWallpaperJson(value[key])}`).join(",")}}`;
}
function validateWallpaperSnapshot(item) {
  if (!item || typeof item !== "object" || item.schemaVersion !== 1 || !WALLPAPER_MODES.includes(item.mode) || !WALLPAPER_TEMPLATES.includes(item.templateId) || typeof item.autoPalette !== "boolean" || !Number.isSafeInteger(item.sequence) || item.sequence < 0 || !Number.isFinite(Date.parse(item.createdAtUtc)) || !Number.isFinite(item.normalizedViewPosition) || item.normalizedViewPosition < 0 || item.normalizedViewPosition > 1) throw new WallpaperError("invalid-snapshot");
  if (item.mode !== "none" && !WALLPAPER_HASH.test(item.bundleHash)) throw new WallpaperError("invalid-snapshot");
  for (const key of ["id", "reason", "originVersion", "projectId", "paletteAlgorithmVersion"]) safeText(item[key], 256);
  if (!(item.sampledAccent === "" || /^#[a-f0-9]{6}$/i.test(item.sampledAccent))) throw new WallpaperError("invalid-accent");
  if (item.paletteCaptured !== void 0 && typeof item.paletteCaptured !== "boolean") throw new WallpaperError("invalid-snapshot");
  if (item.derivedPalette !== void 0) {
    if (!item.derivedPalette || typeof item.derivedPalette !== "object" || Array.isArray(item.derivedPalette) || Object.keys(item.derivedPalette).some((style) => !["jungle", "phlogiston", "sunlit"].includes(style))) throw new WallpaperError("invalid-palette");
    const keys = ["light", "dark", "strongLight", "strongDark", "foregroundLight", "foregroundDark"];
    for (const palette of Object.values(item.derivedPalette)) if (palette !== null && (typeof palette !== "object" || Object.keys(palette).length !== keys.length || keys.some((key) => !/^#[a-f0-9]{6}$/i.test(palette[key])))) throw new WallpaperError("invalid-palette");
  }
  wallpaperParameters(item.parameters);
  return item;
}
function safeText(value, limit, fallback = "") {
  const result = value ?? fallback;
  if (typeof result !== "string" || result.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) throw new WallpaperError("invalid-manifest");
  return result;
}
function assetId(value) {
  if (!WALLPAPER_HASH.test(value)) throw new WallpaperError("invalid-asset-id");
  return value;
}
function safeSource(value = "") {
  if (!value) return "";
  safeText(value, 2048);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new WallpaperError("invalid-source-url");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new WallpaperError("invalid-source-url");
  return value;
}
var DEFAULT_ABOUT = Object.freeze([
  { heading: "Kinich", paragraphs: ["以全屏图像、裁切与连续运动呈现内容。壁纸与会话状态独立，阿乔继续保有原来的交互。"] },
  { heading: "版本记录", paragraphs: ["复杂动态壁纸的最终确认版本为 v2.0。"] },
  { heading: "视觉与交互", paragraphs: ["全屏、总览、详情画廊与微缩导航。"] },
  { heading: "素材", paragraphs: ["来源与处理记录随素材包保存。"] },
  { heading: "项目", paragraphs: ["dsh-kinich-theme"], links: [{ label: "GitHub · dsh-Kinich-theme", url: "https://github.com/Xian-JL/dsh-Kinich-theme" }] },
  { heading: "Credits", paragraphs: ["视觉参考：Camille Mormal；动效与开发参考：Aristide Benoist；字体参考：Söhne Buch。"], links: [{ label: "Camille Mormal", url: "https://camillemormal.com/" }, { label: "Aristide Benoist", url: "https://aristidebenoist.com/" }, { label: "Söhne · Klim Type Foundry", url: "https://klim.co.nz/retail-fonts/soehne/" }] }
]);
function validateWallpaperManifest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new WallpaperError("invalid-manifest");
  if (input.schemaVersion !== WALLPAPER_SCHEMA_VERSION) throw new WallpaperError("unsupported-schema", "Wallpaper schema is not supported", 409);
  if (!Array.isArray(input.projects) || input.projects.length < 1 || input.projects.length > 256) throw new WallpaperError("invalid-projects");
  const ids = /* @__PURE__ */ new Set();
  const projects = input.projects.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new WallpaperError("invalid-projects");
    const id = safeText(item.id, 80, `project-${index + 1}`);
    if (!id || ids.has(id)) throw new WallpaperError("invalid-projects");
    ids.add(id);
    if (!Array.isArray(item.assetIds) || item.assetIds.length < 1 || item.assetIds.length > 256) throw new WallpaperError("invalid-assets");
    const largeImageIds = item.largeImageIds ?? [];
    if (!Array.isArray(largeImageIds) || largeImageIds.length > 256) throw new WallpaperError("invalid-assets");
    const galleryIds = largeImageIds.length ? largeImageIds : item.assetIds.filter((id2) => id2 !== (item.heroId ?? item.assetIds[0]));
    const rawGaps = item.imageGaps;
    let gaps;
    if (rawGaps === void 0) gaps = galleryIds.map(() => 40);
    else if (Array.isArray(rawGaps) && rawGaps.length === galleryIds.length) gaps = [...rawGaps];
    else if (Array.isArray(rawGaps) && rawGaps.length === item.assetIds.length) {
      gaps = galleryIds.map((id2) => rawGaps[item.assetIds.indexOf(id2)] ?? 40);
    } else throw new WallpaperError("invalid-image-gaps");
    if (gaps.some((gap) => ![0, 40, 320].includes(gap))) throw new WallpaperError("invalid-image-gaps");
    const thumbnailAssetIds = item.thumbnailAssetIds ?? item.assetIds.filter((id2) => id2 !== (item.heroId ?? item.assetIds[0]) && !largeImageIds.includes(id2));
    if (!Array.isArray(thumbnailAssetIds) || thumbnailAssetIds.length > 256) throw new WallpaperError("invalid-assets");
    const galleryCaptions = item.galleryCaptions ?? [];
    if (!Array.isArray(galleryCaptions) || galleryCaptions.length > 256 || galleryCaptions.length > 0 && galleryCaptions.length !== galleryIds.length) throw new WallpaperError("invalid-gallery-captions");
    return {
      id,
      title: safeText(item.title, 128, `壁纸 ${index + 1}`),
      headline: safeText(item.headline, 256, item.title ?? `壁纸 ${index + 1}`),
      description: safeText(item.description, 2048),
      role: safeText(item.role, 128, "视觉参考"),
      contributor: safeText(item.contributor, 256),
      sourceUrl: safeSource(item.sourceUrl),
      coverId: assetId(item.coverId ?? item.assetIds[0]),
      heroId: assetId(item.heroId ?? item.assetIds[0]),
      assetIds: item.assetIds.map(assetId),
      largeImageIds: largeImageIds.map(assetId),
      thumbnailAssetIds: thumbnailAssetIds.map(assetId),
      galleryCaptions: galleryCaptions.map((caption) => safeText(caption, 512)),
      imageGaps: gaps,
      nextProjectId: safeText(item.nextProjectId, 80, input.projects[(index + 1) % input.projects.length].id ?? `project-${(index + 1) % input.projects.length + 1}`)
    };
  });
  if (projects.some((project) => !ids.has(project.nextProjectId))) throw new WallpaperError("invalid-next-project");
  const loaderAssetIds = input.loaderAssetIds ?? [];
  if (!Array.isArray(loaderAssetIds) || loaderAssetIds.length > 25) throw new WallpaperError("invalid-assets");
  const fonts = input.fontAssetIds ?? [];
  if (!Array.isArray(fonts) || fonts.length > 8) throw new WallpaperError("too-many-fonts");
  const fontAssetIds = fonts.map(assetId);
  const assets = [...new Set(projects.flatMap((project) => [project.coverId, project.heroId, ...project.assetIds, ...project.largeImageIds, ...project.thumbnailAssetIds]).concat(loaderAssetIds.map(assetId), fontAssetIds))];
  if (assets.length > MAX_WALLPAPER_BUNDLE_ASSETS) throw new WallpaperError("too-many-assets");
  const about = input.about ?? DEFAULT_ABOUT;
  if (!Array.isArray(about) || about.length !== 6) throw new WallpaperError("invalid-about");
  const sampledAccent = input.sampledAccent == null || input.sampledAccent === "" ? "" : typeof input.sampledAccent === "string" && /^#[a-f0-9]{6}$/i.test(input.sampledAccent) ? input.sampledAccent.toLowerCase() : (() => {
    throw new WallpaperError("invalid-accent");
  })();
  return {
    schemaVersion: 1,
    id: safeText(input.id, 128),
    version: safeText(input.version, 80, "1"),
    name: safeText(input.name, 128, "自定义壁纸"),
    sourceUrl: safeSource(input.sourceUrl),
    sourceFingerprint: safeText(input.sourceFingerprint, 128),
    representativeAssetId: assetId(input.representativeAssetId ?? projects[0].coverId),
    sampledAccent,
    paletteAlgorithmVersion: safeText(input.paletteAlgorithmVersion, 80, "kinich-dominant-v1"),
    projects,
    loaderAssetIds: loaderAssetIds.map(assetId),
    assetIds: assets,
    fontAssetIds,
    about: about.map((section) => {
      if (!section || typeof section !== "object" || !Array.isArray(section.paragraphs) || section.paragraphs.length > 32) throw new WallpaperError("invalid-about");
      const links = section.links ?? [];
      if (!Array.isArray(links) || links.length > 16) throw new WallpaperError("invalid-about");
      return { heading: safeText(section.heading, 128), paragraphs: section.paragraphs.map((paragraph) => safeText(paragraph, 4096)), ...links.length ? { links: links.map((link) => {
        const url = safeSource(link.url);
        if (!url) throw new WallpaperError("invalid-source-url");
        return { label: safeText(link.label, 256), url };
      }) } : {} };
    })
  };
}

// src/host/wallpaper/store.js
import { mkdir, open, readFile, readdir, rename, stat, lstat, unlink } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

// src/host/wallpaper/assets.js
import { createHash as createHash2 } from "node:crypto";
var MAX_WALLPAPER_PIXELS = 3840 * 2160;
var WALLPAPER_ASSET_EXTENSIONS = Object.freeze({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "font/woff2": "woff2" });
var wallpaperHash = (bytes) => createHash2("sha256").update(bytes).digest("hex");
var WALLPAPER_NORMALIZATION_RULES = Object.freeze({
  "static-webp-v1": "PNG/JPEG/WebP source <=15MiB and <=40M pixels; no upscaling; <=1920x1080; WebP data URL <=512KiB; canvas removes source metadata.",
  "dynamic-webp-v1": "PNG/JPEG/WebP source <=15MiB and <=40M pixels; no upscaling; <=3840x2160; WebP bytes <=2MiB; canvas removes source metadata.",
  "final-bytes-v1": "Validated final image/font bytes; <=2MiB; images <=3840x2160. No recoding is performed by storage.",
  "historic-final-bytes-v1": "Existing displayed final bytes preserved without recoding. Original normalization pipeline was not recorded by the prior candidate."
});
function wallpaperNormalization(info, version = "final-bytes-v1") {
  if (!Object.hasOwn(WALLPAPER_NORMALIZATION_RULES, version)) throw new WallpaperError("normalization-version", "Unsupported wallpaper normalization version");
  if (version === "static-webp-v1" && (info.mediaType !== "image/webp" || info.width > 1920 || info.height > 1080 || 23 + 4 * Math.ceil(info.byteLength / 3) > 512 * 1024)) throw new WallpaperError("static-normalization-bounds");
  if (version === "dynamic-webp-v1" && info.mediaType !== "image/webp") throw new WallpaperError("dynamic-normalization-type");
  return { relativeBlobPath: `blobs/${info.sha256}.${info.extension}`, normalizationVersion: version, normalizationRules: WALLPAPER_NORMALIZATION_RULES[version] };
}
function inspectWallpaperAsset(input) {
  const bytes = Buffer.from(input);
  if (bytes.length < 24 || bytes.length > MAX_WALLPAPER_ASSET_BYTES) throw new WallpaperError("asset-size");
  let mediaType, width = 0, height = 0;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    mediaType = "image/png";
    if (bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.toString("ascii", bytes.length - 8, bytes.length - 4) !== "IEND") throw new WallpaperError("invalid-image");
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    mediaType = "image/webp";
    if (bytes.readUInt32LE(4) + 8 !== bytes.length) throw new WallpaperError("invalid-image");
    const kind = bytes.toString("ascii", 12, 16);
    if (kind === "VP8X" && bytes.length >= 30) {
      if (bytes[20] & 2) throw new WallpaperError("animated-import-not-supported");
      width = 1 + bytes.readUIntLE(24, 3);
      height = 1 + bytes.readUIntLE(27, 3);
    } else if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 47) {
      const bits2 = bytes.readUInt32LE(21);
      width = 1 + (bits2 & 16383);
      height = 1 + (bits2 >>> 14 & 16383);
    } else if (kind === "VP8 " && bytes.length >= 30 && bytes.subarray(23, 26).equals(Buffer.from([157, 1, 42]))) {
      width = bytes.readUInt16LE(26) & 16383;
      height = bytes.readUInt16LE(28) & 16383;
    } else throw new WallpaperError("invalid-image");
  } else if (bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    mediaType = "image/jpeg";
    let offset = 2;
    for (; ; ) {
      if (offset + 4 >= bytes.length || bytes[offset++] !== 255) throw new WallpaperError("invalid-image");
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if ([1, 216, ...Array.from({ length: 8 }, (_, i2) => 208 + i2)].includes(marker)) continue;
      if (offset + 2 > bytes.length) throw new WallpaperError("invalid-image");
      const size = bytes.readUInt16BE(offset);
      if (size < 2 || offset + size > bytes.length) throw new WallpaperError("invalid-image");
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (size < 8) throw new WallpaperError("invalid-image");
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
        break;
      }
      if (marker === 218) throw new WallpaperError("invalid-image");
      offset += size;
    }
  } else if (bytes.toString("ascii", 0, 4) === "wOF2" && bytes.length >= 48 && bytes.readUInt32BE(8) === bytes.length) mediaType = "font/woff2";
  else throw new WallpaperError("unsupported-asset");
  if (mediaType !== "font/woff2" && (!width || !height || width > 3840 || height > 2160 || width * height > MAX_WALLPAPER_PIXELS)) throw new WallpaperError("asset-dimensions");
  return { sha256: wallpaperHash(bytes), mediaType, extension: WALLPAPER_ASSET_EXTENSIONS[mediaType], byteLength: bytes.length, width, height };
}

// src/client/background/palette.js
var clamp = (value, min, max2) => Math.min(Math.max(value, min), max2);
function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max2 = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max2 - min;
  const lightness = (max2 + min) / 2;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (max2 === r) hue = (g - b) / delta % 6;
  else if (max2 === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, saturation, lightness };
}
function hslToHex(hue, saturation, lightness) {
  const h = (hue % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x2 = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = lightness - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x2, 0];
  else if (h < 120) rgb = [x2, c, 0];
  else if (h < 180) rgb = [0, c, x2];
  else if (h < 240) rgb = [0, x2, c];
  else if (h < 300) rgb = [x2, 0, c];
  else rgb = [c, 0, x2];
  return `#${rgb.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}
function parseHex(value) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  return [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
}
function colorLuminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrastRatio(first, second) {
  const firstLuminance = colorLuminance(first);
  const secondLuminance = colorLuminance(second);
  if (firstLuminance === null || secondLuminance === null) return 0;
  const [bright, dark] = [firstLuminance, secondLuminance].sort((a, b) => b - a);
  return (bright + 0.05) / (dark + 0.05);
}
function chooseAccent(hue, saturation, background, targetLightness, bounds) {
  let bestSafe = null;
  let bestAny = null;
  for (let percent = Math.round(bounds[0] * 100); percent <= Math.round(bounds[1] * 100); percent += 1) {
    const lightness = percent / 100;
    const color = hslToHex(hue, saturation, lightness);
    const ratio = contrastRatio(color, background);
    const candidate = { color, ratio, lightness, distance: Math.abs(lightness - targetLightness) };
    if (!bestAny || candidate.ratio > bestAny.ratio) bestAny = candidate;
    if (ratio >= 3 && (!bestSafe || candidate.distance < bestSafe.distance)) bestSafe = candidate;
  }
  return bestSafe ?? bestAny;
}
function contrastingForeground(background) {
  const black = "#11150f";
  const white = "#ffffff";
  return contrastRatio(black, background) >= contrastRatio(white, background) ? black : white;
}
function deriveKinichAccentPalette(accentHex, lightSurface = "#F8FAF3", darkSurface = "#101E1B") {
  const rgb = parseHex(accentHex);
  if (!rgb || colorLuminance(lightSurface) === null || colorLuminance(darkSurface) === null) return null;
  const { hue, saturation } = rgbToHsl(...rgb);
  const safeSaturation = clamp(saturation, 0.48, 0.76);
  const light = chooseAccent(hue, safeSaturation, lightSurface, 0.39, [0.28, 0.55]);
  const dark = chooseAccent(hue, safeSaturation, darkSurface, 0.7, [0.54, 0.88]);
  if (!light || !dark || light.ratio < 3 || dark.ratio < 3) return null;
  const strongLight = hslToHex(hue, safeSaturation, clamp(light.lightness - 0.055, 0.25, 0.58));
  const strongDark = hslToHex(hue, safeSaturation, clamp(dark.lightness + 0.06, 0.52, 0.9));
  return Object.freeze({
    light: light.color,
    dark: dark.color,
    strongLight,
    strongDark,
    foregroundLight: contrastingForeground(light.color),
    foregroundDark: contrastingForeground(dark.color)
  });
}

// src/client/theme/tokens.js
function token(light, dark) {
  return Object.freeze({
    light,
    dark
  });
}
var JUNGLE_TOKENS = Object.freeze({
  "--dsw-alias-bg-base": token("#EFF3EA", "#0B1514"),
  "--dsw-alias-bg-layer-1": token("#F8FAF3", "#101E1B"),
  "--dsw-alias-bg-layer-2": token("#E4ECE3", "#142622"),
  "--dsw-alias-bg-layer-3": token("#D6E3DA", "#1B302A"),
  "--dsw-alias-bg-overlay": token("#F7F9F2", "#18302B"),
  "--dsw-alias-bg-module-platform": token("#E5EDE5", "#132420"),
  "--dsw-alias-bg-multi-select": token("#E0E8D8", "#23342B"),
  "--dsw-alias-bg-skeleton": token("rgba(54, 79, 55, 0.08)", "rgba(197, 232, 108, 0.08)"),
  "--dsw-alias-bg-mask-drop": token("rgba(241, 242, 233, 0.80)", "rgba(9, 16, 13, 0.82)"),
  "--dsw-alias-border-l1": token("rgba(45, 70, 50, 0.10)", "rgba(52, 73, 60, 0.62)"),
  "--dsw-alias-border-l2-darkmode-thin": token("rgba(45, 70, 50, 0.15)", "rgba(52, 73, 60, 0.78)"),
  "--dsw-alias-border-l2": token("rgba(45, 70, 50, 0.20)", "#34493C"),
  "--dsw-alias-border-l3": token("rgba(45, 70, 50, 0.28)", "#466050"),
  "--dsw-alias-border-l4": token("rgba(45, 70, 50, 0.38)", "#587463"),
  "--dsw-alias-brand-primary": token("#5F8124", "#C8EC62"),
  "--dsw-alias-brand-primary-invert": token("#E2EDC0", "#14211B"),
  "--dsw-alias-brand-primary-new-colorprimary-new-color": token("#247F73", "#C8EC62"),
  "--dsw-alias-brand-text": token("#506F1D", "#D8F47D"),
  "--dsw-alias-button-primary-fill": token("#5F8124", "#C8EC62"),
  "--dsw-alias-button-primary-hover": token("#506F1D", "#D8F47D"),
  "--dsw-alias-button-primary-dimmed": token("#DCE6C1", "#34452A"),
  "--dsw-alias-button-info-fill": token("#477A13", "#4F741B"),
  "--dsw-alias-button-info-hover": token("#3D6810", "#5C8122"),
  "--dsw-alias-button-elevated-fill": token("#FAFBF4", "#23342B"),
  "--dsw-alias-button-floating-fill": token("#F7F8F1", "#192720"),
  "--dsw-alias-button-floating-hover": token("#E9EEE2", "#2B3E33"),
  "--dsw-alias-button-ghost-active-border": token("#78964D", "#8EBB48"),
  "--dsw-alias-button-ghost-active-fill": token("#DFE9C8", "#32432C"),
  "--dsw-alias-button-ghost-active-hover": token("#D3E0B7", "#3C5032"),
  "--dsw-alias-interactive-bg-hover": token("rgba(83, 116, 32, 0.10)", "rgba(190, 245, 87, 0.08)"),
  "--dsw-alias-interactive-bg-hover-accent": token("rgba(83, 116, 32, 0.18)", "rgba(190, 245, 87, 0.16)"),
  "--dsw-alias-interactive-bg-active": token("rgba(83, 116, 32, 0.22)", "rgba(190, 245, 87, 0.20)"),
  "--dsw-alias-interactive-bg-hover-solid": token("#E1EAC6", "#2A3A2C"),
  "--dsw-alias-label-primary": token("#142522", "#EAEBDD"),
  "--dsw-alias-label-secondary": token("#4C605B", "#A9BBB5"),
  "--dsw-alias-label-tertiary": token("#536761", "#829A92"),
  "--dsw-alias-label-caption": token("#5D6B60", "#8F9F94"),
  "--dsw-alias-label-dimmed": token("#ABB3A7", "#536159"),
  "--dsw-alias-label-primary-dimmed": token("#344138", "#D4D9D0"),
  "--dsw-alias-label-primary-foreground": token("#FFFFFF", "#18220D"),
  "--dsw-alias-label-primary-inverted": token("#F4F5EC", "#101A17"),
  "--dsw-alias-label-primary-bluish": token("#4E7121", "#D4F27E"),
  "--dsw-alias-markdown-citation": token("#DCE7BE", "#2D402A"),
  "--dsw-alias-markdown-code-block": token("#E8EDD8", "#101A15"),
  "--dsw-alias-markdown-code-block-banner": token("#DDE6C2", "#1A281E"),
  "--dsw-alias-markdown-code-segment-selected": token("#F8F9F1", "#26372A"),
  "--dsw-alias-markdown-code-segment-unselected": token("#D6DFB9", "#142019"),
  "--dsw-alias-markdown-inline-code": token("#E1E8CB", "#26352A"),
  "--dsw-alias-markdown-placeholder": token("#EDF0E1", "#1B2820"),
  "--dsw-alias-markdown-tag": token("#DCE7BE", "#2A3D28"),
  "--dsw-alias-scrollbar-bg-l1": token("#B7C49F", "#3B4A3D"),
  "--dsw-alias-scrollbar-bg-l2": token("#AAB993", "#475A49"),
  "--dsw-alias-scrollbar-hover-l1": token("#91A176", "#596D59"),
  "--dsw-alias-scrollbar-hover-l2": token("#819268", "#688168"),
  "--dsw-alias-state-business-primary": token("#557A24", "#C5E86C"),
  "--dsw-alias-state-business-tertiary": token("#E0E9C8", "#2D422A"),
  "--dsw-alias-state-success-primary": token("#3D7A25", "#8DD865"),
  "--dsw-alias-state-success-secondary": token("#66A23F", "#6BB94D"),
  "--dsw-alias-state-success-tertiary": token("#E0EED3", "#203A24"),
  "--dsw-alias-state-warn-label": token("#825F23", "#D9C28B"),
  "--dsw-alias-state-warn-primary": token("#967331", "#BEAA7A"),
  "--dsw-alias-state-warn-secondary": token("#B38B3E", "#A99462"),
  "--dsw-alias-state-warn-tertiary": token("#F2E8D0", "#3A3222"),
  "--dsw-alias-state-error-primary": token("#C4554C", "#FFB2A7"),
  "--dsw-alias-state-error-secondary": token("#DA756B", "#D97A69"),
  "--dsw-alias-toast-bg": token("#25331F", "#34452F"),
  "--dsw-alias-tooltip-bg": token("#1D2A18", "#3A4B35"),
  "--dsw-specific-bubble": token("#E4ECCC", "#1B2A20"),
  "--dsw-specific-bubble-highlight": token("#CFE89B", "#344C2E"),
  "--dsw-specific-input-major": token("#FFFFFA", "#15251C"),
  "--dsw-specific-login-input": token("#F1F5E2", "#0F1A14"),
  "--dsw-specific-menu": token("#E4ECCB", "#213027"),
  "--dsw-specific-selector": token("#E8EFD4", "#23362A"),
  "--dsw-specific-sidebar-fill": token("#E1EAE3", "#0D1A18"),
  "--dsw-specific-sidebar-nav-item-active-accent": token("#C8E96F", "#356255"),
  "--dsw-specific-sidebar-nav-item-active": token("#D7E5D8", "#18302A"),
  "--dsw-specific-sidebar-nav-item-hover": token("#DDE8E0", "#132622"),
  "--dsw-specific-tip": token("#E8EFD5", "#1E3024")
});
var PHLOGISTON_TOKENS = Object.freeze({
  ...JUNGLE_TOKENS,
  "--dsw-alias-bg-base": token("#171A13", "#090B08"),
  "--dsw-alias-bg-layer-1": token("#20251A", "#10130D"),
  "--dsw-alias-bg-layer-2": token("#272E1E", "#171C12"),
  "--dsw-alias-bg-layer-3": token("#303924", "#1D2517"),
  "--dsw-alias-bg-overlay": token("#22281C", "#252C1D"),
  "--dsw-alias-bg-module-platform": token("#252C1C", "#12170F"),
  "--dsw-specific-sidebar-fill": token("#141910", "#0B100B"),
  "--dsw-specific-sidebar-nav-item-active": token("#33411F", "#243119"),
  "--dsw-specific-sidebar-nav-item-active-accent": token("#D7FF5B", "#CEFF58"),
  "--dsw-specific-sidebar-nav-item-hover": token("#252E1B", "#172015"),
  "--dsw-alias-brand-primary": token("#D6F34B", "#D7FF56"),
  "--dsw-alias-brand-primary-invert": token("#20250E", "#1A210C"),
  "--dsw-alias-brand-text": token("#DDF86A", "#E5FF77"),
  "--dsw-alias-button-primary-fill": token("#D7F34E", "#D7FF56"),
  "--dsw-alias-button-primary-hover": token("#E5FF74", "#E9FF82"),
  "--dsw-alias-button-primary-dimmed": token("#4D5528", "#374020"),
  "--dsw-alias-label-primary": token("#F2F3E8", "#F5F7EC"),
  "--dsw-alias-label-secondary": token("#C6CAB8", "#CED3C0"),
  "--dsw-alias-label-tertiary": token("#9EA58D", "#A6AE95"),
  "--dsw-alias-label-primary-foreground": token("#171B0D", "#11150A"),
  "--dsw-alias-state-business-primary": token("#D1F14B", "#D5FF58"),
  "--dsw-alias-state-business-tertiary": token("#3B4724", "#2B391D"),
  "--dsw-alias-state-warn-primary": token("#FF9F2F", "#FFB24A"),
  "--dsw-alias-state-warn-tertiary": token("#56391E", "#422B18"),
  "--dsw-specific-bubble": token("#252C1B", "#182016"),
  "--dsw-specific-bubble-highlight": token("#3B4B20", "#30431F"),
  "--dsw-specific-input-major": token("#1E2418", "#111810"),
  "--dsw-specific-selector": token("#29321D", "#202B1A")
});
var SUNLIT_TOKENS = Object.freeze({
  ...JUNGLE_TOKENS,
  "--dsw-alias-bg-base": token("#FFF9EA", "#14140F"),
  "--dsw-alias-bg-layer-1": token("#FFFCF3", "#1A1B14"),
  "--dsw-alias-bg-layer-2": token("#F8EFD7", "#23241A"),
  "--dsw-alias-bg-layer-3": token("#F1E4C5", "#2B2A1D"),
  "--dsw-alias-bg-overlay": token("#FFF8E8", "#302F22"),
  "--dsw-alias-bg-module-platform": token("#F8EBCB", "#1F2117"),
  "--dsw-specific-sidebar-fill": token("#F8E9C7", "#171A12"),
  "--dsw-specific-sidebar-nav-item-active": token("#F1DFAE", "#29321F"),
  "--dsw-specific-sidebar-nav-item-active-accent": token("#6A8A28", "#B7E765"),
  "--dsw-specific-sidebar-nav-item-hover": token("#F5E7C4", "#20261A"),
  "--dsw-alias-brand-primary": token("#668426", "#B9EA63"),
  "--dsw-alias-brand-primary-invert": token("#F3D98B", "#2B321D"),
  "--dsw-alias-brand-text": token("#5B7720", "#C7F27A"),
  "--dsw-alias-button-primary-fill": token("#668426", "#B9EA63"),
  "--dsw-alias-button-primary-hover": token("#55731D", "#C9F77A"),
  "--dsw-alias-button-primary-dimmed": token("#E8DDBD", "#3A402B"),
  "--dsw-alias-label-primary": token("#342E20", "#F3F0DF"),
  "--dsw-alias-label-secondary": token("#625A47", "#CBC7B3"),
  "--dsw-alias-label-tertiary": token("#837A64", "#A6A18E"),
  "--dsw-alias-state-business-primary": token("#708F2B", "#BCEB6B"),
  "--dsw-alias-state-business-tertiary": token("#EEE2BD", "#313C25"),
  "--dsw-alias-state-warn-primary": token("#B8751F", "#EFB75A"),
  "--dsw-specific-bubble": token("#F3E7C8", "#24291D"),
  "--dsw-specific-bubble-highlight": token("#E9D79D", "#344126"),
  "--dsw-specific-input-major": token("#FFFDF6", "#1B2117"),
  "--dsw-specific-selector": token("#F3E4BD", "#2A3322")
});
var KINICH_THEME_PRESETS = Object.freeze({
  jungle: JUNGLE_TOKENS,
  phlogiston: PHLOGISTON_TOKENS,
  sunlit: SUNLIT_TOKENS
});
var BACKGROUND_SURFACE_ALPHA = Object.freeze({
  "--dsw-alias-bg-base": { from: [0.48, 0.4], to: [0.2, 0.16] },
  "--dsw-alias-bg-layer-1": { from: [0.94, 0.92], to: [0.5, 0.44] },
  "--dsw-alias-bg-layer-2": { from: [0.96, 0.94], to: [0.56, 0.5] },
  "--dsw-alias-bg-layer-3": { from: [0.97, 0.96], to: [0.62, 0.56] },
  "--dsw-alias-bg-module-platform": { from: [0.95, 0.93], to: [0.56, 0.5] },
  "--dsw-alias-bg-multi-select": { from: [0.94, 0.92], to: [0.52, 0.46] },
  "--dsw-specific-sidebar-fill": { from: [0.88, 0.85], to: [0.45, 0.4] },
  "--dsw-specific-bubble": { from: [0.96, 0.94], to: [0.6, 0.54] },
  "--dsw-specific-bubble-highlight": { from: [0.94, 0.92], to: [0.56, 0.5] },
  "--dsw-specific-selector": { from: [0.96, 0.94], to: [0.6, 0.54] }
});
function getKinichAccentPalette(style, accentHex) {
  const base = KINICH_THEME_PRESETS[style] ?? JUNGLE_TOKENS;
  const surfaces = base["--dsw-alias-bg-layer-1"];
  return deriveKinichAccentPalette(accentHex, surfaces.light, surfaces.dark);
}

// src/host/wallpaper/store.js
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var isMissing = (error) => error?.code === "ENOENT";
var delay = (milliseconds) => new Promise((resolve3) => setTimeout(resolve3, milliseconds));
var digestRecord = (value) => wallpaperHash(Buffer.from(canonicalWallpaperJson(value)));
function verifiedEnvelope(envelope) {
  if (!envelope?.state || envelope.checksum !== digestRecord(envelope.state)) throw new WallpaperError("corrupt-store", "Wallpaper state cannot be verified", 500);
  if (envelope.state.schemaVersion !== WALLPAPER_SCHEMA_VERSION) throw new WallpaperError("unsupported-schema", "Wallpaper schema needs a newer Kinich version", 409);
  return envelope.state;
}
function validateSimpleName(value, label, max2 = 128) {
  if (typeof value !== "string" || !value.length || value.length > max2 || /[\u0000-\u001f]/.test(value)) throw new WallpaperError("invalid-record", `Invalid ${label}`);
  return value;
}
var WallpaperStore = class {
  constructor({ profileDir, profileName = "", pluginVersion, builtin, fault = async () => {
  } }) {
    if (typeof profileDir !== "string" || !isAbsolute(profileDir)) throw new WallpaperError("profile-unavailable", "A DSH Profile storage scope is required", 503);
    this.root = join(resolve(profileDir), "kinich-wallpaper");
    this.profileName = profileName;
    this.pluginVersion = pluginVersion;
    this.builtin = builtin;
    this.fault = fault;
    this.queue = Promise.resolve();
    this.closed = false;
  }
  folder(name2) {
    if (!["blobs", "bundles", "snapshots", "leases", "imports"].includes(name2)) throw new WallpaperError("invalid-storage-scope", "Invalid wallpaper storage scope", 500);
    return join(this.root, name2);
  }
  path(folder, hash, extension = "json") {
    if (!WALLPAPER_HASH.test(hash) || !["json", "png", "jpg", "webp", "woff2"].includes(extension)) throw new WallpaperError("invalid-asset-id");
    return join(this.folder(folder), `${hash}.${extension}`);
  }
  async prepare() {
    await mkdir(this.root, { recursive: true });
    if ((await lstat(this.root)).isSymbolicLink()) throw new WallpaperError("linked-store", "Wallpaper Profile storage cannot be redirected", 500);
    for (const name2 of ["blobs", "bundles", "snapshots", "leases", "imports"]) {
      await mkdir(this.folder(name2), { recursive: true });
      if ((await lstat(this.folder(name2))).isSymbolicLink()) throw new WallpaperError("linked-store", "Wallpaper storage cannot be redirected", 500);
    }
  }
  async writeAtomic(path, bytes) {
    const pending = `${path}.${randomUUID()}.pending`;
    const file = await open(pending, "wx", 384);
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      await rename(pending, path);
    } catch (error) {
      await unlink(pending).catch(() => {
      });
      throw error;
    }
  }
  async writeJSON(path, value) {
    return this.writeAtomic(path, Buffer.from(canonicalWallpaperJson(value)));
  }
  async readJSON(path) {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      if (isMissing(error)) throw error;
      throw new WallpaperError("corrupt-record", "A wallpaper storage record is invalid", 500);
    }
  }
  async locked(action) {
    const run = async () => {
      if (this.closed) throw new WallpaperError("service-closed", "Wallpaper storage is closing", 503);
      await this.prepare();
      const lockPath = join(this.root, "writer.lock");
      const deadline = Date.now() + 3e4;
      let handle;
      while (!handle) {
        try {
          const candidate = await open(lockPath, "wx", 384);
          try {
            await candidate.writeFile(JSON.stringify({ pid: process.pid, createdAt: Date.now() }));
            await candidate.sync();
          } catch (error) {
            await candidate.close();
            await unlink(lockPath).catch(() => {
            });
            throw error;
          }
          handle = candidate;
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
          let owner;
          try {
            owner = await this.readJSON(lockPath);
          } catch (readError) {
            if (!isMissing(readError) && readError.code !== "corrupt-record") throw readError;
          }
          let alive = true;
          if (Number.isInteger(owner?.pid) && owner.pid > 0) {
            try {
              process.kill(owner.pid, 0);
            } catch (probeError) {
              alive = probeError.code !== "ESRCH";
            }
          }
          let abandoned = false;
          if (!owner) {
            try {
              abandoned = Date.now() - (await stat(lockPath)).mtimeMs > 3e4;
            } catch (statError) {
              if (isMissing(statError)) continue;
              throw statError;
            }
          }
          if (!alive || abandoned) {
            await unlink(lockPath).catch((unlinkError) => {
              if (!isMissing(unlinkError)) throw unlinkError;
            });
            continue;
          }
          if (Date.now() >= deadline) throw new WallpaperError("profile-busy", "Wallpaper storage is busy in another Desktop process", 409);
          await delay(30);
        }
      }
      try {
        return await action();
      } finally {
        await handle.close();
        await unlink(lockPath).catch((error) => {
          if (!isMissing(error)) throw error;
        });
      }
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => {
    });
    return next;
  }
  async readIndex() {
    let candidate;
    let indexMissing = false;
    try {
      candidate = await this.readJSON(join(this.root, "index.json"));
    } catch (error) {
      if (isMissing(error)) indexMissing = true;
      else if (error.code !== "corrupt-store" && error.code !== "corrupt-record") throw error;
    }
    if (candidate) {
      try {
        return verifiedEnvelope(candidate);
      } catch (error) {
        if (error.code === "unsupported-schema") throw error;
      }
    }
    let backup;
    try {
      backup = await this.readJSON(join(this.root, "index.backup.json"));
    } catch (error) {
      if (isMissing(error) && indexMissing) return null;
      if (isMissing(error)) throw new WallpaperError("corrupt-store", "Wallpaper state has no recoverable index", 500);
      throw error;
    }
    const state = verifiedEnvelope(backup);
    await this.verifyState(state);
    return state;
  }
  async verifyState(state) {
    if (state.active) await this.snapshot(state.active);
    for (const id of state.history) await this.snapshot(id);
  }
  async recover() {
    const journalPath = join(this.root, "journal.json");
    let journal;
    try {
      journal = await this.readJSON(journalPath);
    } catch (error) {
      if (!isMissing(error)) throw new WallpaperError("corrupt-journal", "Wallpaper transaction needs recovery", 500);
    }
    if (journal) {
      const next = verifiedEnvelope(journal.next);
      await this.verifyState(next);
      await this.writeJSON(join(this.root, "index.json"), journal.next);
      await this.writeJSON(join(this.root, "index.backup.json"), journal.next);
      await unlink(journalPath);
    }
    try {
      return await this.readIndex();
    } catch (error) {
      if (error.code === "corrupt-store" && journal) return verifiedEnvelope(journal.next);
      throw error;
    }
  }
  async commit(before, next) {
    next.revision = (before?.revision ?? -1) + 1;
    const envelope = { checksum: digestRecord(next), state: next };
    await this.fault("assets-durable");
    await this.writeJSON(join(this.root, "journal.json"), { next: envelope });
    await this.fault("journal-durable");
    await this.writeJSON(join(this.root, "index.json"), envelope);
    await this.fault("index-durable");
    await this.writeJSON(join(this.root, "index.backup.json"), envelope);
    await this.fault("backup-durable");
    await unlink(join(this.root, "journal.json"));
    await this.collectGarbage(next);
    return next;
  }
  checkRevision(state, expected) {
    if (!Number.isSafeInteger(expected) || expected !== state.revision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
  }
  async saveAsset(input, attribution = "", sourceUrl = "", { deferMetadata = false, normalizationVersion = "final-bytes-v1" } = {}) {
    const info = inspectWallpaperAsset(input);
    const bytes = Buffer.from(input);
    const normalization = wallpaperNormalization(info, normalizationVersion);
    const safeAttribution = typeof attribution === "string" ? attribution.slice(0, 512) : "";
    let safeSource2 = "";
    if (typeof sourceUrl === "string" && sourceUrl.length <= 2048) {
      try {
        const u = new URL(sourceUrl);
        if (["https:", "http:"].includes(u.protocol) && !u.username && !u.password) safeSource2 = u.href;
      } catch {
      }
    }
    const blob = this.path("blobs", info.sha256, info.extension);
    try {
      const existing = await readFile(blob);
      if (wallpaperHash(existing) !== info.sha256) throw new WallpaperError("corrupt-asset", "Asset hash mismatch", 500);
    } catch (error) {
      if (!isMissing(error)) throw error;
      await this.writeAtomic(blob, bytes);
    }
    if (deferMetadata) {
      await this.writeJSON(this.path("leases", info.sha256), { assetId: info.sha256, updatedAtUtc: now() });
      return info;
    }
    try {
      const existing = await this.readJSON(this.path("blobs", info.sha256));
      if (["sha256", "mediaType", "extension", "byteLength", "width", "height"].some((key) => existing[key] !== info[key])) throw new WallpaperError("corrupt-asset", "Existing asset metadata is damaged", 500);
      await this.writeJSON(this.path("leases", info.sha256), { assetId: info.sha256, updatedAtUtc: now() });
      return info;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    await this.writeJSON(this.path("blobs", info.sha256), { ...info, ...normalization, attribution: safeAttribution, sourceUrl: safeSource2, uploadedAt: now() });
    return info;
  }
  async readAsset(id) {
    const info = await this.readJSON(this.path("blobs", id));
    const bytes = await readFile(this.path("blobs", id, info.extension));
    if (wallpaperHash(bytes) !== id || bytes.length !== info.byteLength) throw new WallpaperError("corrupt-asset", "Wallpaper asset is damaged", 500);
    return { info, bytes };
  }
  async saveBundle(input) {
    const bundle = validateWallpaperManifest(input);
    if (!bundle.assetIds.includes(bundle.representativeAssetId)) throw new WallpaperError("invalid-representative");
    for (const id2 of [...bundle.assetIds, ...bundle.fontAssetIds]) {
      const { info } = await this.readAsset(id2);
      if (bundle.fontAssetIds.includes(id2) !== (info.mediaType === "font/woff2")) throw new WallpaperError("invalid-asset-role");
    }
    const id = digestRecord(bundle);
    await this.writeJSON(this.path("bundles", id), bundle);
    return id;
  }
  async readBundle(id) {
    let data;
    try {
      data = await this.readJSON(this.path("bundles", id));
    } catch (error) {
      if (isMissing(error)) throw new WallpaperError("bundle-not-found", "Wallpaper package is unavailable", 404);
      throw error;
    }
    if (digestRecord(data) !== id) throw new WallpaperError("corrupt-bundle", "Wallpaper manifest is damaged", 500);
    return validateWallpaperManifest(data);
  }
  async saveSnapshot(record) {
    validateWallpaperSnapshot(record);
    const hash = digestRecord(record);
    await this.writeJSON(this.path("snapshots", hash), record);
    return hash;
  }
  async snapshot(hash) {
    let record;
    try {
      record = await this.readJSON(this.path("snapshots", hash));
    } catch (error) {
      if (isMissing(error)) throw new WallpaperError("snapshot-missing", "Wallpaper history record is unavailable", 404);
      throw error;
    }
    if (digestRecord(record) !== hash) throw new WallpaperError("corrupt-snapshot", "Wallpaper history record is damaged", 500);
    return record;
  }
  async collectGarbage(state) {
    const liveSnapshots = new Set([state.active, ...state.history].filter(Boolean));
    const liveBundles = /* @__PURE__ */ new Set();
    const liveAssets = /* @__PURE__ */ new Set();
    let unresolvedReference = false;
    for (const name2 of await readdir(this.folder("leases"))) {
      const id = name2.endsWith(".json") ? name2.slice(0, -5) : "";
      if (!WALLPAPER_HASH.test(id)) continue;
      const lease = await this.readJSON(this.path("leases", id)).catch((error) => {
        if (!isMissing(error)) unresolvedReference = true;
        return null;
      });
      if (lease?.kind === "export") {
        let alive = Number.isInteger(lease.pid) && lease.pid > 0;
        if (alive) try {
          process.kill(lease.pid, 0);
        } catch (error) {
          alive = error.code !== "ESRCH";
        }
        if (alive && Array.isArray(lease.assetIds) && lease.assetIds.every((hash) => WALLPAPER_HASH.test(hash))) for (const hash of lease.assetIds) liveAssets.add(hash);
        else await unlink(this.path("leases", id)).catch((error) => {
          if (!isMissing(error)) throw error;
        });
        continue;
      }
      try {
        const lease2 = await this.readJSON(this.path("leases", id));
        if (lease2.assetId === id && Date.now() - Date.parse(lease2.updatedAtUtc) < 10 * 6e4) liveAssets.add(id);
        else await unlink(this.path("leases", id));
      } catch (error) {
        if (!isMissing(error)) unresolvedReference = true;
      }
    }
    for (const name2 of await readdir(this.folder("imports"))) {
      if (!name2.endsWith(".json") || !WALLPAPER_HASH.test(name2.slice(0, -5))) continue;
      try {
        const pending = await this.readJSON(join(this.folder("imports"), name2));
        if (Date.now() - Date.parse(pending.updatedAtUtc) > 30 * 24 * 60 * 6e4) {
          await unlink(join(this.folder("imports"), name2));
          continue;
        }
        for (const part of Object.values(pending.parts ?? {})) {
          for (const hash of part.snapshotHashes ?? []) if (WALLPAPER_HASH.test(hash)) liveSnapshots.add(hash);
          for (const hash of part.bundleHashes ?? []) if (WALLPAPER_HASH.test(hash)) liveBundles.add(hash);
          for (const hash of part.assetHashes ?? []) if (WALLPAPER_HASH.test(hash)) liveAssets.add(hash);
        }
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    }
    for (const id of liveSnapshots) {
      try {
        const record = await this.snapshot(id);
        if (record.bundleHash) liveBundles.add(record.bundleHash);
      } catch {
        unresolvedReference = true;
      }
    }
    for (const id of liveBundles) {
      try {
        const bundle = await this.readBundle(id);
        for (const asset of [...bundle.assetIds, ...bundle.fontAssetIds]) liveAssets.add(asset);
      } catch {
        unresolvedReference = true;
      }
    }
    if (unresolvedReference) return;
    const cutoff = Date.now() - 10 * 6e4;
    for (const name2 of await readdir(this.folder("snapshots"))) {
      const id = name2.endsWith(".json") ? name2.slice(0, -5) : "";
      if (!WALLPAPER_HASH.test(id) || liveSnapshots.has(id) || !name2.endsWith(".json")) continue;
      try {
        const record = await this.snapshot(id);
        if (Date.parse(record.createdAtUtc) < cutoff) await unlink(this.path("snapshots", id));
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    }
    for (const name2 of await readdir(this.folder("bundles"))) {
      const id = name2.endsWith(".json") ? name2.slice(0, -5) : "";
      if (!WALLPAPER_HASH.test(id) || liveBundles.has(id) || !name2.endsWith(".json")) continue;
      try {
        if ((await stat(this.path("bundles", id))).mtimeMs < cutoff) await unlink(this.path("bundles", id));
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    }
    for (const name2 of await readdir(this.folder("blobs"))) {
      if (!name2.endsWith(".json")) continue;
      const id = name2.slice(0, -5);
      if (!WALLPAPER_HASH.test(id) || liveAssets.has(id)) continue;
      let info;
      try {
        info = await this.readJSON(this.path("blobs", id));
      } catch (error) {
        if (isMissing(error)) continue;
        throw error;
      }
      if (!Number.isFinite(Date.parse(info.uploadedAt)) || Date.parse(info.uploadedAt) >= cutoff) continue;
      for (const extension of ["png", "jpg", "webp", "woff2"]) await unlink(this.path("blobs", id, extension)).catch((error) => {
        if (!isMissing(error)) throw error;
      });
      await unlink(this.path("blobs", id));
    }
  }
  async putBuiltin() {
    if (typeof this.builtin !== "function") throw new WallpaperError("builtin-unavailable", "Default wallpaper package is not installed", 503);
    const pack = await this.builtin();
    for (const asset of pack.assets) if ((await this.saveAsset(asset.bytes, asset.attribution, asset.sourceUrl)).sha256 !== asset.sha256) throw new WallpaperError("builtin-integrity", "Built-in wallpaper failed its hash check", 500);
    return this.saveBundle(pack.manifest);
  }
  createSnapshot(data, sequence) {
    if (!WALLPAPER_MODES.includes(data.mode) || data.mode !== "none" && !WALLPAPER_HASH.test(data.bundleHash ?? "")) throw new WallpaperError("invalid-mode");
    if (data.mode !== "none") validateSimpleName(data.projectId, "projectId", 80);
    const templateId = data.templateId ?? "work";
    if (!WALLPAPER_TEMPLATES.includes(templateId) || typeof (data.autoPalette ?? true) !== "boolean" || !Number.isFinite(data.viewPosition ?? 0) || (data.viewPosition ?? 0) < 0 || (data.viewPosition ?? 0) > 1) throw new WallpaperError("invalid-snapshot");
    return {
      schemaVersion: 1,
      specVersion: WALLPAPER_SPEC_VERSION,
      id: randomUUID(),
      sequence,
      createdAtUtc: now(),
      reason: data.reason ?? "apply",
      originVersion: this.pluginVersion,
      mode: data.mode,
      bundleHash: data.mode === "none" ? "" : data.bundleHash,
      parameters: wallpaperParameters(data.parameters),
      autoPalette: data.autoPalette ?? true,
      projectId: data.mode === "none" ? "" : data.projectId,
      templateId,
      normalizedViewPosition: data.viewPosition ?? 0,
      sampledAccent: data.sampledAccent ?? "",
      paletteCaptured: data.paletteCaptured ?? Boolean(data.sampledAccent),
      paletteStyleId: data.paletteStyleId ?? "jungle",
      derivedPalette: data.derivedPalette ?? Object.fromEntries(Object.keys(KINICH_THEME_PRESETS).map((style) => [style, getKinichAccentPalette(style, data.sampledAccent ?? "")])),
      paletteAlgorithmVersion: data.paletteAlgorithmVersion ?? "kinich-dominant-v1"
    };
  }
  async createIndexFromLegacy(legacy) {
    const backupPath = join(this.root, "legacy-background-backup.json");
    try {
      await this.readJSON(backupPath);
    } catch (error) {
      if (!isMissing(error)) throw error;
      await this.writeJSON(backupPath, { createdAtUtc: now(), originVersion: "1.8.1", settings: legacy });
    }
    let mode, bundleHash = "", parameters = { ...WALLPAPER_DEFAULT_PARAMETERS }, sampledAccent = legacy.customBackgroundAccent ?? "";
    if (legacy.customBackgroundImage) {
      const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(legacy.customBackgroundImage);
      if (!match || legacy.customBackgroundImage.length > 512 * 1024) throw new WallpaperError("legacy-image-invalid", "Existing static wallpaper data is invalid; original settings preserved", 409);
      const imageBytes = Buffer.from(match[1], "base64");
      const image = await this.saveAsset(imageBytes, "既有用户静态背景", "", { normalizationVersion: "static-webp-v1" });
      sampledAccent = /^#[a-f0-9]{6}$/i.test(sampledAccent) ? sampledAccent.toLowerCase() : "";
      bundleHash = await this.saveBundle({
        schemaVersion: 1,
        id: "legacy-static",
        version: "1",
        name: "已有静态背景",
        representativeAssetId: image.sha256,
        sampledAccent,
        projects: [{ id: "legacy", title: "自定义背景", headline: "Kinich 自定义背景", assetIds: [image.sha256], coverId: image.sha256, heroId: image.sha256 }]
      });
      mode = "static";
      const visibility = legacy.backgroundVisibility;
      parameters.visibility = Number.isInteger(visibility) && visibility >= 0 && visibility <= 100 ? visibility : 75;
    } else {
      bundleHash = await this.putBuiltin();
      const bundle2 = await this.readBundle(bundleHash);
      mode = "dynamic";
      sampledAccent = bundle2.sampledAccent;
    }
    const bundle = mode === "none" ? null : await this.readBundle(bundleHash);
    const snapshotId = await this.saveSnapshot(this.createSnapshot({
      mode,
      bundleHash,
      projectId: bundle?.projects[0].id ?? "",
      parameters,
      autoPalette: legacy.backgroundAutoPalette !== false,
      sampledAccent,
      reason: legacy.customBackgroundImage ? "migration-1.8.1" : "default-v2"
    }, 0));
    return { schemaVersion: 1, specVersion: WALLPAPER_SPEC_VERSION, revision: 0, sequence: 0, active: snapshotId, history: [], migrations: ["1.8.1-background-v1", "asset-normalization-index-v1"] };
  }
  async ensure(legacy = {}) {
    return this.locked(async () => {
      let state = await this.recover();
      if (state) {
        if ((state.migrations ?? []).includes("asset-normalization-index-v1")) return state;
        for (const name2 of await readdir(this.folder("blobs"))) {
          if (!/^[a-f0-9]{64}\.json$/.test(name2)) continue;
          const path = join(this.folder("blobs"), name2), metadata = await this.readJSON(path);
          if (!metadata.normalizationVersion) await this.writeJSON(path, { ...metadata, ...wallpaperNormalization(metadata, "historic-final-bytes-v1") });
        }
        const next = structuredClone(state);
        next.migrations = [...next.migrations ?? [], "asset-normalization-index-v1"];
        return this.commit(state, next);
      }
      const created = await this.createIndexFromLegacy(legacy);
      return this.commit(null, created);
    });
  }
  async apply(data, expectedRevision) {
    return this.locked(async () => {
      const state = await this.recover();
      if (!state) throw new WallpaperError("not-initialized", "Wallpaper storage is not ready", 503);
      if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
      const old = await this.snapshot(state.active);
      let bundle;
      if (data.mode !== "none") {
        bundle = await this.readBundle(data.bundleHash);
        for (const id of [...bundle.assetIds, ...bundle.fontAssetIds]) await this.readAsset(id);
        if (!bundle.projects.some((item) => item.id === data.projectId)) throw new WallpaperError("invalid-project");
      }
      const candidate = { ...data, parameters: wallpaperParameters(data.parameters), autoPalette: data.autoPalette ?? old.autoPalette };
      const same = old.mode === candidate.mode && old.bundleHash === (candidate.mode === "none" ? "" : candidate.bundleHash) && old.projectId === (candidate.mode === "none" ? "" : candidate.projectId) && old.templateId === (candidate.templateId ?? "work") && old.normalizedViewPosition === (candidate.viewPosition ?? 0) && old.autoPalette === candidate.autoPalette && canonicalWallpaperJson(old.parameters) === canonicalWallpaperJson(candidate.parameters);
      if (same) return state;
      const next = structuredClone(state);
      next.sequence++;
      next.history.unshift(state.active);
      next.active = await this.saveSnapshot(this.createSnapshot({
        ...candidate,
        sampledAccent: candidate.reason === "restore" ? candidate.sampledAccent : candidate.bundleHash === old.bundleHash ? old.sampledAccent : bundle?.sampledAccent ?? "",
        paletteCaptured: candidate.reason === "restore" ? candidate.paletteCaptured : candidate.bundleHash === old.bundleHash ? old.paletteCaptured : Boolean(candidate.paletteCaptured || bundle?.sampledAccent),
        paletteAlgorithmVersion: bundle?.paletteAlgorithmVersion ?? old.paletteAlgorithmVersion
      }, next.sequence));
      return this.commit(state, next);
    });
  }
  async updateParameters(patch, expectedRevision) {
    const state = await this.getState();
    if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
    const active = await this.snapshot(state.active);
    if (!patch || typeof patch !== "object" || Object.keys(patch).some((key) => !["parameters", "autoPalette"].includes(key))) throw new WallpaperError("invalid-parameters");
    return this.apply({ ...active, parameters: { ...active.parameters, ...patch.parameters ?? {} }, autoPalette: patch.autoPalette ?? active.autoPalette, viewPosition: active.normalizedViewPosition, reason: "parameters" }, expectedRevision);
  }
  async restoreDefault(expectedRevision) {
    const state = await this.getState();
    this.checkRevision(state, expectedRevision);
    const bundleHash = await this.putBuiltin();
    const bundle = await this.readBundle(bundleHash);
    return this.apply({ mode: "dynamic", bundleHash, projectId: bundle.projects[0].id, templateId: "work", parameters: WALLPAPER_DEFAULT_PARAMETERS, autoPalette: true, reason: "restore-default" }, expectedRevision);
  }
  async capturePalette(data, expectedRevision) {
    return this.locked(async () => {
      const state = await this.recover();
      if (!state) throw new WallpaperError("not-initialized", "壁纸存储尚未初始化", 503);
      this.checkRevision(state, expectedRevision);
      const active = await this.snapshot(state.active);
      if (active.mode === "none") throw new WallpaperError("palette-not-active", "当前没有可采样的壁纸", 409);
      if (active.paletteCaptured || active.sampledAccent) return state;
      if (!data || data.algorithmVersion !== "kinich-dominant-v1" || !(data.color === "" || typeof data.color === "string" && /^#[a-f0-9]{6}$/i.test(data.color))) throw new WallpaperError("invalid-accent");
      const bundle = await this.readBundle(active.bundleHash);
      if (data.representativeAssetId !== bundle.representativeAssetId) throw new WallpaperError("palette-image-mismatch", "强调色必须来自固定代表图");
      await this.readAsset(bundle.representativeAssetId);
      const next = structuredClone(state);
      next.sequence++;
      const updated = { ...active, id: randomUUID(), sequence: next.sequence, createdAtUtc: now(), reason: "palette-capture", sampledAccent: data.color.toLowerCase(), derivedPalette: Object.fromEntries(Object.keys(KINICH_THEME_PRESETS).map((style) => [style, getKinichAccentPalette(style, data.color)])), paletteCaptured: true, paletteAlgorithmVersion: data.algorithmVersion };
      next.active = await this.saveSnapshot(updated);
      return this.commit(state, next);
    });
  }
  async restore(id, expectedRevision) {
    const state = await this.getState();
    if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
    if (!state.history.includes(id)) throw new WallpaperError("history-not-found", "History entry has been cleared", 404);
    const old = await this.snapshot(id);
    return this.apply({ ...old, viewPosition: old.normalizedViewPosition, reason: "restore" }, expectedRevision);
  }
  async clearHistory(expectedRevision) {
    return this.locked(async () => {
      const state = await this.recover();
      if (!state) throw new WallpaperError("not-initialized", "Wallpaper storage is not ready", 503);
      if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
      const next = structuredClone(state);
      next.history = [];
      return this.commit(state, next);
    });
  }
  async deleteHistory(id, expectedRevision) {
    return this.locked(async () => {
      const state = await this.recover();
      if (!state) throw new WallpaperError("not-initialized", "Wallpaper storage is not ready", 503);
      if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
      if (state.active === id) throw new WallpaperError("active-protected", "The active wallpaper is protected", 409);
      if (!state.history.includes(id)) throw new WallpaperError("history-not-found", "History entry has been cleared", 404);
      const next = structuredClone(state);
      next.history = next.history.filter((candidate) => candidate !== id);
      return this.commit(state, next);
    });
  }
  /** Caller must hold the Profile lock: journal recovery also writes to disk. */
  async readStateLocked() {
    const state = await this.recover();
    if (!state) throw new WallpaperError("not-initialized", "Wallpaper storage is not ready", 503);
    return state;
  }
  async getState() {
    return this.locked(() => this.readStateLocked());
  }
  async current() {
    return this.locked(async () => {
      const state = await this.readStateLocked();
      const active = await this.snapshot(state.active);
      let manifest = null, assets = {};
      if (active.bundleHash) {
        manifest = await this.readBundle(active.bundleHash);
        for (const id of [...manifest.assetIds, ...manifest.fontAssetIds]) assets[id] = await this.readAssetInfo(id);
      }
      return { revision: state.revision, profileName: this.profileName, activeHash: state.active, active, manifest, assets, historyCount: state.history.length };
    });
  }
  async readAssetInfo(id) {
    const metadata = await this.readJSON(this.path("blobs", id));
    return metadata;
  }
  async history(cursor = 0, limit = 30) {
    return this.locked(async () => {
      const state = await this.readStateLocked();
      if (!Number.isSafeInteger(cursor) || cursor < 0) throw new WallpaperError("invalid-cursor");
      const entries = [];
      for (const id of state.history.slice(cursor, cursor + Math.min(30, limit))) {
        let item, bundle;
        try {
          item = await this.snapshot(id);
          bundle = item.bundleHash ? await this.readBundle(item.bundleHash) : null;
          if (bundle) for (const asset of bundle.assetIds) await this.readAsset(asset);
          entries.push({ ...item, hash: id, name: bundle?.name ?? "无壁纸", representativeAssetId: bundle?.representativeAssetId ?? "", recoverable: true });
        } catch (error) {
          entries.push({ ...item, hash: id, name: bundle?.name ?? "记录或素材缺失", representativeAssetId: bundle?.representativeAssetId ?? "", recoverable: false, errorCode: error.code ?? "record-unavailable" });
        }
      }
      return { revision: state.revision, entries, total: state.history.length, nextCursor: cursor + entries.length < state.history.length ? cursor + entries.length : null };
    });
  }
  async close() {
    await this.queue;
    this.closed = true;
  }
};

// node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var crct = /* @__PURE__ */ (function() {
  var t = new Int32Array(256);
  for (var i2 = 0; i2 < 256; ++i2) {
    var c = i2, k = 9;
    while (--k)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i2] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i2 = 0; i2 < d.length; ++i2)
        cr = crct[cr & 255 ^ d[i2]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
var Inflate = /* @__PURE__ */ (function() {
  function Inflate2(opts, cb) {
    if (typeof opts == "function")
      cb = opts, opts = {};
    this.ondata = cb;
    var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
    this.s = { i: 0, b: dict ? dict.length : 0 };
    this.o = new u8(32768);
    this.p = new u8(0);
    if (dict)
      this.o.set(dict);
  }
  Inflate2.prototype.e = function(c) {
    if (!this.ondata)
      err(5);
    if (this.d)
      err(4);
    if (!this.p.length)
      this.p = c;
    else if (c.length) {
      var n = new u8(this.p.length + c.length);
      n.set(this.p), n.set(c, this.p.length), this.p = n;
    }
  };
  Inflate2.prototype.c = function(final) {
    this.s.i = +(this.d = final || false);
    var bts = this.s.b;
    var dt = inflt(this.p, this.s, this.o);
    this.ondata(slc(dt, bts, this.s.b), this.d);
    this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
    this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
  };
  Inflate2.prototype.push = function(chunk, final) {
    this.e(chunk), this.c(final);
  };
  return Inflate2;
})();
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i2 = 0; i2 < str.length; ++i2)
      ar_1[i2] = str.charCodeAt(i2);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i2 = 0; i2 < l; ++i2) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i2 << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i2);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i2) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var z64hs = function(d, b, l, z2, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z2 && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z2 < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
var ZipPassThrough = /* @__PURE__ */ (function() {
  function ZipPassThrough2(filename) {
    this.filename = filename;
    this.c = crc();
    this.size = 0;
    this.compression = 0;
  }
  ZipPassThrough2.prototype.process = function(chunk, final) {
    this.ondata(null, chunk, final);
  };
  ZipPassThrough2.prototype.push = function(chunk, final) {
    if (!this.ondata)
      err(5);
    this.c.p(chunk);
    this.size += chunk.length;
    if (final)
      this.crc = this.c.d();
    this.process(chunk, final || false);
  };
  return ZipPassThrough2;
})();
var Zip = /* @__PURE__ */ (function() {
  function Zip2(cb) {
    this.ondata = cb;
    this.u = [];
    this.d = 1;
  }
  Zip2.prototype.add = function(file) {
    var _this = this;
    if (!this.ondata)
      err(5);
    if (this.d & 2)
      this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
    else {
      var f = strToU8(file.filename), fl_1 = f.length;
      var com = file.comment, o = com && strToU8(com);
      var u = fl_1 != file.filename.length || o && com.length != o.length;
      var hl_1 = fl_1 + exfl(file.extra) + 30;
      if (fl_1 > 65535)
        this.ondata(err(11, 0, 1), null, false);
      var header = new u8(hl_1);
      wzh(header, 0, file, f, u, -1);
      var chks_1 = [header];
      var pAll_1 = function() {
        for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
          var chk = chks_2[_i];
          _this.ondata(null, chk, false);
        }
        chks_1 = [];
      };
      var tr_1 = this.d;
      this.d = 0;
      var ind_1 = this.u.length;
      var uf_1 = mrg(file, {
        f,
        u,
        o,
        t: function() {
          if (file.terminate)
            file.terminate();
        },
        r: function() {
          pAll_1();
          if (tr_1) {
            var nxt = _this.u[ind_1 + 1];
            if (nxt)
              nxt.r();
            else
              _this.d = 1;
          }
          tr_1 = 1;
        }
      });
      var cl_1 = 0;
      file.ondata = function(err2, dat, final) {
        if (err2) {
          _this.ondata(err2, dat, final);
          _this.terminate();
        } else {
          cl_1 += dat.length;
          chks_1.push(dat);
          if (final) {
            var dd = new u8(16);
            wbytes(dd, 0, 134695760);
            wbytes(dd, 4, file.crc);
            wbytes(dd, 8, cl_1);
            wbytes(dd, 12, file.size);
            chks_1.push(dd);
            uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file.crc, uf_1.size = file.size;
            if (tr_1)
              uf_1.r();
            tr_1 = 1;
          } else if (tr_1)
            pAll_1();
        }
      };
      this.u.push(uf_1);
    }
  };
  Zip2.prototype.end = function() {
    var _this = this;
    if (this.d & 2) {
      this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
      return;
    }
    if (this.d)
      this.e();
    else
      this.u.push({
        r: function() {
          if (!(_this.d & 1))
            return;
          _this.u.splice(-1, 1);
          _this.e();
        },
        t: function() {
        }
      });
    this.d = 3;
  };
  Zip2.prototype.e = function() {
    var bt = 0, l = 0, tl = 0;
    for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
      var f = _a2[_i];
      tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
    }
    var out = new u8(tl + 22);
    for (var _b2 = 0, _c = this.u; _b2 < _c.length; _b2++) {
      var f = _c[_b2];
      wzh(out, bt, f, f.f, f.u, -f.c - 2, l, f.o);
      bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
    }
    wzf(out, bt, this.u.length, tl, l);
    this.ondata(null, out, true);
    this.d = 2;
  };
  Zip2.prototype.terminate = function() {
    for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
      var f = _a2[_i];
      f.t();
    }
    this.d = 2;
  };
  return Zip2;
})();
var UnzipPassThrough = /* @__PURE__ */ (function() {
  function UnzipPassThrough2() {
  }
  UnzipPassThrough2.prototype.push = function(chunk, final) {
    this.ondata(null, chunk, final);
  };
  UnzipPassThrough2.compression = 0;
  return UnzipPassThrough2;
})();
var UnzipInflate = /* @__PURE__ */ (function() {
  function UnzipInflate2() {
    var _this = this;
    this.i = new Inflate(function(dat, final) {
      _this.ondata(null, dat, final);
    });
  }
  UnzipInflate2.prototype.push = function(chunk, final) {
    try {
      this.i.push(chunk, final);
    } catch (e) {
      this.ondata(e, null, final);
    }
  };
  UnzipInflate2.compression = 8;
  return UnzipInflate2;
})();
var Unzip = /* @__PURE__ */ (function() {
  function Unzip2(cb) {
    this.onfile = cb;
    this.k = [];
    this.o = {
      0: UnzipPassThrough
    };
    this.p = et;
  }
  Unzip2.prototype.push = function(chunk, final) {
    var _this = this;
    if (!this.onfile)
      err(5);
    if (!this.p)
      err(4);
    if (this.c > 0) {
      var len = Math.min(this.c, chunk.length);
      var toAdd = chunk.subarray(0, len);
      this.c -= len;
      if (this.d)
        this.d.push(toAdd, !this.c);
      else
        this.k[0].push(toAdd);
      chunk = chunk.subarray(len);
      if (chunk.length)
        return this.push(chunk, final);
    } else {
      var f = 0, i2 = 0, is = void 0, buf = void 0;
      if (!this.p.length)
        buf = chunk;
      else if (!chunk.length)
        buf = this.p;
      else {
        buf = new u8(this.p.length + chunk.length);
        buf.set(this.p), buf.set(chunk, this.p.length);
      }
      var l = buf.length, oc = this.c, add = oc && this.d;
      var _loop_2 = function() {
        var sig = b4(buf, i2);
        if (sig == 67324752) {
          f = 1, is = i2;
          this_1.d = null;
          this_1.c = 0;
          var bf = b2(buf, i2 + 6), cmp_1 = b2(buf, i2 + 8), u = bf & 2048, dd = bf & 8, fnl = b2(buf, i2 + 26), es = b2(buf, i2 + 28);
          if (l > i2 + 30 + fnl + es) {
            var chks_3 = [];
            this_1.k.unshift(chks_3);
            f = 2;
            var lsc = b4(buf, i2 + 18), lsu = b4(buf, i2 + 22);
            var fn_1 = strFromU8(buf.subarray(i2 + 30, i2 += 30 + fnl), !u);
            var _a2 = z64hs(buf, i2, es, 2, lsc, lsu, 0), sc_1 = _a2[0], su_1 = _a2[1], z64 = _a2[3];
            if (dd)
              sc_1 = -1 - z64;
            i2 += es;
            this_1.c = sc_1;
            var d_1;
            var file_1 = {
              name: fn_1,
              compression: cmp_1,
              start: function() {
                if (!file_1.ondata)
                  err(5);
                if (!sc_1)
                  file_1.ondata(null, et, true);
                else {
                  var ctr = _this.o[cmp_1];
                  if (!ctr)
                    file_1.ondata(err(14, "unknown compression type " + cmp_1, 1), null, false);
                  d_1 = sc_1 < 0 ? new ctr(fn_1) : new ctr(fn_1, sc_1, su_1);
                  d_1.ondata = function(err2, dat3, final2) {
                    file_1.ondata(err2, dat3, final2);
                  };
                  for (var _i = 0, chks_4 = chks_3; _i < chks_4.length; _i++) {
                    var dat2 = chks_4[_i];
                    d_1.push(dat2, false);
                  }
                  if (_this.k[0] == chks_3 && _this.c)
                    _this.d = d_1;
                  else
                    d_1.push(et, true);
                }
              },
              terminate: function() {
                if (d_1 && d_1.terminate)
                  d_1.terminate();
              }
            };
            if (sc_1 >= 0)
              file_1.size = sc_1, file_1.originalSize = su_1;
            this_1.onfile(file_1);
          }
          return "break";
        } else if (oc) {
          if (sig == 134695760) {
            is = i2 += 12 + (oc == -2 && 8), f = 3, this_1.c = 0;
            return "break";
          } else if (sig == 33639248) {
            is = i2 -= 4, f = 3, this_1.c = 0;
            return "break";
          }
        }
      };
      var this_1 = this;
      for (; i2 < l - 4; ++i2) {
        var state_1 = _loop_2();
        if (state_1 === "break")
          break;
      }
      this.p = et;
      if (oc < 0) {
        var dat = f ? buf.subarray(0, is - 12 - (oc == -2 && 8) - (b4(buf, is - 16) == 134695760 && 4)) : buf.subarray(0, i2);
        if (add)
          add.push(dat, !!f);
        else
          this.k[+(f == 2)].push(dat);
      }
      if (f & 2)
        return this.push(buf.subarray(i2), final);
      this.p = buf.subarray(i2);
    }
    if (final) {
      if (this.c)
        err(13);
      this.p = null;
    }
  };
  Unzip2.prototype.register = function(decoder) {
    this.o[decoder.compression] = decoder;
  };
  return Unzip2;
})();

// src/host/wallpaper/archive.js
import { readFile as readFile2, unlink as unlink2 } from "node:fs/promises";
import { join as join2 } from "node:path";
import { randomUUID as randomUUID2 } from "node:crypto";
var MAX_WALLPAPER_ARCHIVE_BYTES = 256 * 1024 * 1024;
var MAX_ARCHIVE_ENTRIES = 1025;
var digest = (value) => wallpaperHash(Buffer.from(canonicalWallpaperJson(value)));
function parseArchiveJson(bytes, code) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    throw new WallpaperError(code, "壁纸包中的 JSON 记录无效");
  }
}
function entryLimit(name2) {
  return name2 === "manifest.json" ? 16 * 1024 * 1024 : name2.startsWith("blobs/") && !name2.endsWith(".json") ? 2 * 1024 * 1024 : name2.startsWith("records/bundles/") ? 4 * 1024 * 1024 : name2.startsWith("records/snapshots/") ? 64 * 1024 : 16 * 1024;
}
async function readArchiveEntries(store, input) {
  const entries = /* @__PURE__ */ Object.create(null), seen = /* @__PURE__ */ new Set();
  let count = 0, compressed = 0, expanded = 0, issue;
  let pendingAssets = [];
  const unzipper = new Unzip((file) => {
    count++;
    if (count > MAX_ARCHIVE_ENTRIES) {
      issue = "archive-too-many-files";
      return;
    }
    if (file.name.endsWith("/")) {
      if (file.name.split("/").includes("..")) issue = "archive-path";
      return;
    }
    if (!/^(?:manifest\.json|records\/(?:snapshots|bundles)\/[a-f0-9]{64}\.json|blobs\/[a-f0-9]{64}\.(?:png|jpg|webp|woff2|json))$/.test(file.name)) {
      issue = "archive-path";
      return;
    }
    if (seen.has(file.name)) {
      issue = "archive-duplicate-path";
      return;
    }
    seen.add(file.name);
    if (Number.isSafeInteger(file.originalSize) && file.originalSize > entryLimit(file.name)) {
      issue = "archive-entry-size";
      return;
    }
    const chunks = [];
    let size = 0;
    file.ondata = (error, chunk, final) => {
      if (error) {
        issue = "archive-invalid";
        return;
      }
      size += chunk.length;
      expanded += chunk.length;
      if (size > entryLimit(file.name) || expanded > MAX_WALLPAPER_ARCHIVE_BYTES) {
        issue = "archive-expanded-size";
        file.terminate();
        return;
      }
      chunks.push(Buffer.from(chunk));
      if (final) {
        const data = Buffer.concat(chunks, size);
        const assetPath = /^blobs\/([a-f0-9]{64})\.(png|jpg|webp|woff2)$/.exec(file.name);
        if (assetPath) {
          try {
            const info = inspectWallpaperAsset(data);
            if (info.sha256 !== assetPath[1] || info.extension !== assetPath[2]) {
              issue = "archive-asset-hash";
              return;
            }
          } catch {
            issue = "archive-asset-invalid";
            return;
          }
          pendingAssets.push(store.saveAsset(data, "", "", { deferMetadata: true }));
          entries[file.name] = true;
        } else entries[file.name] = data;
      }
    };
    try {
      file.start();
    } catch {
      issue = "archive-method";
    }
  });
  unzipper.register(UnzipInflate);
  const feed = async (chunk) => {
    compressed += chunk.length;
    if (compressed > MAX_WALLPAPER_ARCHIVE_BYTES) throw new WallpaperError("archive-size", "壁纸包必须小于 256 MiB", 413);
    try {
      unzipper.push(chunk);
    } catch {
      throw new WallpaperError("archive-invalid", "壁纸 ZIP 数据损坏或无法解压");
    }
    if (issue) throw new WallpaperError(issue, "壁纸包包含超限、重复或不允许的路径");
    if (pendingAssets.length) {
      const writes = pendingAssets;
      pendingAssets = [];
      await Promise.all(writes);
    }
  };
  try {
    if (input instanceof Uint8Array || Buffer.isBuffer(input)) {
      if (input.length < 22) throw new WallpaperError("archive-size", "壁纸 ZIP 数据不完整");
      for (let offset = 0; offset < input.length; offset += 64 * 1024) await feed(input.subarray(offset, Math.min(input.length, offset + 64 * 1024)));
    } else if (input?.getReader) {
      const reader = input.getReader();
      for (; ; ) {
        const { value, done } = await reader.read();
        if (done) break;
        for (let offset = 0; offset < value.length; offset += 64 * 1024) await feed(value.subarray(offset, Math.min(value.length, offset + 64 * 1024)));
      }
      if (compressed < 22) throw new WallpaperError("archive-size", "壁纸 ZIP 数据不完整");
    } else throw new WallpaperError("archive-invalid", "壁纸包输入流不可用");
    unzipper.push(new Uint8Array(0), true);
    if (pendingAssets.length) await Promise.all(pendingAssets);
  } catch (error) {
    if (error instanceof WallpaperError) throw error;
    throw new WallpaperError("archive-invalid", "壁纸 ZIP 数据损坏或无法解压");
  }
  if (issue) throw new WallpaperError(issue, "壁纸包包含超限、重复或不允许的路径");
  return entries;
}
async function exportWallpaperArchive(store, options = {}) {
  return store.locked(() => prepareWallpaperExport(store, options));
}
async function prepareWallpaperExport(store, { scope = "current", historyHash = "", volumeIndex = 0, expectedDatasetId = "", planOnly = false } = {}) {
  if (!["current", "history", "all"].includes(scope)) throw new WallpaperError("invalid-export-scope");
  const state = await store.readStateLocked();
  const currentId = state.active;
  if (scope === "history" && (!WALLPAPER_HASH.test(historyHash) || !state.history.includes(historyHash))) throw new WallpaperError("history-not-found", "历史记录不存在", 404);
  const snapshotIds = scope === "current" ? [currentId] : scope === "history" ? [historyHash] : [currentId, ...state.history];
  const snapshots = [], snapshotRecords = /* @__PURE__ */ new Map(), bundles = /* @__PURE__ */ new Map(), assets = /* @__PURE__ */ new Map();
  for (const id of snapshotIds) {
    const snapshot = await store.snapshot(id);
    snapshotRecords.set(id, snapshot);
    let bundle = null;
    if (snapshot.bundleHash) {
      if (!bundles.has(snapshot.bundleHash)) bundles.set(snapshot.bundleHash, await store.readBundle(snapshot.bundleHash));
      bundle = bundles.get(snapshot.bundleHash);
      for (const assetId2 of [...bundle.assetIds, ...bundle.fontAssetIds]) if (!assets.has(assetId2)) assets.set(assetId2, await store.readAssetInfo(assetId2));
    }
    snapshots.push({ hash: id, bytes: Buffer.byteLength(canonicalWallpaperJson(snapshot)), bundleHash: snapshot.bundleHash ?? "", assetHashes: bundle ? [.../* @__PURE__ */ new Set([...bundle.assetIds, ...bundle.fontAssetIds])] : [] });
  }
  const datasetId = digest({ currentId, snapshotIds });
  if (expectedDatasetId && expectedDatasetId !== datasetId) throw new WallpaperError("archive-state-changed", "壁纸历史在导出期间发生变化，请重新生成分卷清单", 409);
  const groups = [];
  let group = null;
  const oversizedBundleRecordGroups = /* @__PURE__ */ new Map(), oversizedBundleAssets = /* @__PURE__ */ new Set();
  const freshGroup = () => ({ snapshotHashes: [], bundleHashes: /* @__PURE__ */ new Set(), assetHashes: /* @__PURE__ */ new Set(), bytes: 0, entries: 1 });
  for (const snapshot of snapshots) {
    const bundle = snapshot.bundleHash ? bundles.get(snapshot.bundleHash) : null;
    let singleBytes = snapshot.bytes + (bundle ? Buffer.byteLength(canonicalWallpaperJson(bundle)) : 0);
    const singleAssets = new Set(snapshot.assetHashes);
    for (const hash of singleAssets) {
      const info = assets.get(hash);
      singleBytes += info.byteLength + Buffer.byteLength(canonicalWallpaperJson(info));
    }
    if (singleBytes > MAX_WALLPAPER_ARCHIVE_BYTES - 16 * 1024 * 1024 || singleAssets.size > 256 || 4 + singleAssets.size * 2 > MAX_ARCHIVE_ENTRIES) {
      if (!bundle || !singleAssets.size) throw new WallpaperError("archive-item-needs-volumes", "单条快照超过可安全分卷的上限", 413);
      if (group?.snapshotHashes.length || group?.assetHashes.size) {
        groups.push(group);
        group = null;
      }
      const existingRecordGroup = oversizedBundleRecordGroups.get(snapshot.bundleHash);
      if (existingRecordGroup) {
        if (existingRecordGroup.entries < MAX_ARCHIVE_ENTRIES) {
          existingRecordGroup.snapshotHashes.push(snapshot.hash);
          existingRecordGroup.bytes += snapshot.bytes;
          existingRecordGroup.entries++;
        } else {
          const recordGroup2 = freshGroup();
          recordGroup2.snapshotHashes.push(snapshot.hash);
          recordGroup2.bytes = snapshot.bytes;
          recordGroup2.entries++;
          groups.push(recordGroup2);
        }
        continue;
      }
      let assetGroup = freshGroup();
      for (const hash of singleAssets) {
        if (oversizedBundleAssets.has(hash)) continue;
        const info = assets.get(hash), cost = info.byteLength + Buffer.byteLength(canonicalWallpaperJson(info));
        if (assetGroup.assetHashes.size && (assetGroup.assetHashes.size >= 256 || assetGroup.bytes + cost > MAX_WALLPAPER_ARCHIVE_BYTES - 16 * 1024 * 1024 || assetGroup.entries + 2 > MAX_ARCHIVE_ENTRIES)) {
          groups.push(assetGroup);
          assetGroup = freshGroup();
        }
        assetGroup.assetHashes.add(hash);
        assetGroup.bytes += cost;
        assetGroup.entries += 2;
        oversizedBundleAssets.add(hash);
      }
      if (assetGroup.assetHashes.size) groups.push(assetGroup);
      const recordGroup = freshGroup();
      recordGroup.snapshotHashes.push(snapshot.hash);
      recordGroup.bundleHashes.add(snapshot.bundleHash);
      recordGroup.bytes = snapshot.bytes + Buffer.byteLength(canonicalWallpaperJson(bundle));
      recordGroup.entries += 2;
      groups.push(recordGroup);
      oversizedBundleRecordGroups.set(snapshot.bundleHash, recordGroup);
      continue;
    }
    if (!group) group = freshGroup();
    const extraBundle = snapshot.bundleHash && !group.bundleHashes.has(snapshot.bundleHash) ? Buffer.byteLength(canonicalWallpaperJson(bundle)) : 0;
    let extra = snapshot.bytes + extraBundle;
    let extraEntries = 1 + (extraBundle ? 1 : 0);
    for (const hash of singleAssets) if (!group.assetHashes.has(hash)) {
      const info = assets.get(hash);
      extra += info.byteLength + Buffer.byteLength(canonicalWallpaperJson(info));
      extraEntries += 2;
    }
    if (group.snapshotHashes.length && (group.bytes + extra > MAX_WALLPAPER_ARCHIVE_BYTES - 16 * 1024 * 1024 || group.entries + extraEntries > MAX_ARCHIVE_ENTRIES || group.assetHashes.size + [...singleAssets].filter((hash) => !group.assetHashes.has(hash)).length > 256)) {
      groups.push(group);
      group = freshGroup();
      extra = snapshot.bytes + (bundle ? Buffer.byteLength(canonicalWallpaperJson(bundle)) : 0);
      extraEntries = 1 + (bundle ? 1 : 0);
      for (const hash of singleAssets) {
        const info = assets.get(hash);
        extra += info.byteLength + Buffer.byteLength(canonicalWallpaperJson(info));
        extraEntries += 2;
      }
    }
    group.snapshotHashes.push(snapshot.hash);
    group.bytes += extra;
    group.entries += extraEntries;
    if (snapshot.bundleHash) group.bundleHashes.add(snapshot.bundleHash);
    for (const hash of singleAssets) group.assetHashes.add(hash);
  }
  if (group?.snapshotHashes.length) groups.push(group);
  const datasetCounts = { snapshots: snapshots.length, bundles: bundles.size, assets: assets.size };
  const volumePlan = groups.map((item, index) => ({ index, snapshotCount: item.snapshotHashes.length, bundleCount: item.bundleHashes.size, assetCount: item.assetHashes.size, estimatedBytes: item.bytes }));
  if (planOnly) return { formatVersion: 1, datasetId, scope, counts: datasetCounts, volumes: volumePlan };
  if (!Number.isSafeInteger(volumeIndex) || volumeIndex < 0 || volumeIndex >= groups.length) throw new WallpaperError("archive-volume-not-found", "壁纸分卷不存在", 404);
  const selected = groups[volumeIndex];
  const selectedBundles = [...selected.bundleHashes];
  const selectedAssets = [...selected.assetHashes];
  const manifest = {
    formatVersion: 1,
    schemaVersion: WALLPAPER_SCHEMA_VERSION,
    specVersion: WALLPAPER_SPEC_VERSION,
    scope,
    datasetId,
    exportedAtUtc: (/* @__PURE__ */ new Date()).toISOString(),
    currentSnapshotHash: currentId,
    volume: { index: volumeIndex, count: groups.length },
    datasetCounts,
    counts: { snapshots: selected.snapshotHashes.length, bundles: selectedBundles.length, assets: selectedAssets.length },
    snapshotHashes: selected.snapshotHashes,
    bundleHashes: selectedBundles,
    assetHashes: selectedAssets
  };
  if (Buffer.byteLength(canonicalWallpaperJson(manifest)) > 16 * 1024 * 1024) throw new WallpaperError("archive-manifest-size", "该分卷清单超过 16 MiB", 413);
  const leaseId = digest({ export: randomUUID2() }), leasePath = store.path("leases", leaseId);
  await store.writeJSON(leasePath, { kind: "export", pid: process.pid, assetIds: selectedAssets, createdAtUtc: (/* @__PURE__ */ new Date()).toISOString() });
  let cancelled = false, zip;
  const release = () => unlink2(leasePath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  return new ReadableStream({ start(controller) {
    zip = new Zip((error, chunk, final) => {
      if (cancelled) return;
      if (error) {
        controller.error(error);
        return;
      }
      controller.enqueue(chunk);
      if (final) controller.close();
    });
    const check = () => {
      if (cancelled) throw new WallpaperError("export-cancelled");
    };
    const waitForDrain = async () => {
      while (!cancelled && controller.desiredSize <= 0) await new Promise((resolve3) => setTimeout(resolve3, 0));
      check();
    };
    const add = async (name2, getBytes) => {
      check();
      const entry = new ZipPassThrough(name2);
      zip.add(entry);
      const bytes = await getBytes();
      check();
      for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
        const end = Math.min(bytes.length, offset + 64 * 1024);
        entry.push(bytes.subarray(offset, end), end === bytes.length);
        await waitForDrain();
      }
    };
    void (async () => {
      try {
        await add("manifest.json", async () => strToU8(canonicalWallpaperJson(manifest)));
        for (const hash of selected.snapshotHashes) await add(`records/snapshots/${hash}.json`, async () => strToU8(canonicalWallpaperJson(snapshotRecords.get(hash))));
        for (const hash of selectedBundles) await add(`records/bundles/${hash}.json`, async () => strToU8(canonicalWallpaperJson(bundles.get(hash))));
        for (const hash of selectedAssets) {
          const info = assets.get(hash);
          await add(`blobs/${hash}.json`, async () => strToU8(canonicalWallpaperJson(info)));
          await add(`blobs/${hash}.${info.extension}`, async () => {
            const file = await store.readAsset(hash);
            if (file.info.sha256 !== hash) throw new WallpaperError("archive-asset-hash");
            return new Uint8Array(file.bytes);
          });
        }
        zip.end();
      } catch (error) {
        if (!cancelled) controller.error(error);
      } finally {
        await release().catch(() => {
        });
      }
    })();
  }, async cancel() {
    cancelled = true;
    zip?.terminate();
    await release();
  } });
}
async function importWallpaperArchive(store, input) {
  const startingRevision = (await store.getState()).revision;
  const files = await readArchiveEntries(store, input);
  const manifest = parseArchiveJson(files["manifest.json"] ?? [], "archive-manifest");
  const multiVolume = Number.isSafeInteger(manifest?.volume?.count) && manifest.volume.count > 1;
  if (manifest?.formatVersion !== 1 || manifest.schemaVersion !== WALLPAPER_SCHEMA_VERSION || !["current", "history", "all"].includes(manifest.scope) || typeof manifest.datasetId !== "string" || !WALLPAPER_HASH.test(manifest.datasetId) || !Array.isArray(manifest.snapshotHashes) || !Array.isArray(manifest.bundleHashes) || !Array.isArray(manifest.assetHashes) || manifest.snapshotHashes.length > 1e5 || manifest.bundleHashes.length > 1e5 || manifest.assetHashes.length > 256) throw new WallpaperError("archive-version", "壁纸包版本或清单不受支持", 409);
  if (manifest.volume && (!Number.isSafeInteger(manifest.volume.index) || !Number.isSafeInteger(manifest.volume.count) || manifest.volume.index < 0 || manifest.volume.index >= manifest.volume.count || manifest.volume.count < 1 || !manifest.datasetCounts || !Number.isSafeInteger(manifest.datasetCounts.snapshots) || manifest.datasetCounts.snapshots < manifest.snapshotHashes.length || !Number.isSafeInteger(manifest.datasetCounts.bundles) || manifest.datasetCounts.bundles < manifest.bundleHashes.length || !Number.isSafeInteger(manifest.datasetCounts.assets) || manifest.datasetCounts.assets < manifest.assetHashes.length)) throw new WallpaperError("archive-volume-manifest", "分卷索引无效");
  if (new Set(manifest.snapshotHashes).size !== manifest.snapshotHashes.length || new Set(manifest.bundleHashes).size !== manifest.bundleHashes.length || new Set(manifest.assetHashes).size !== manifest.assetHashes.length) throw new WallpaperError("archive-manifest", "壁纸包清单含重复内容哈希");
  const declaredPaths = /* @__PURE__ */ new Set(["manifest.json"]);
  for (const hash of manifest.snapshotHashes) {
    if (!WALLPAPER_HASH.test(hash)) throw new WallpaperError("archive-manifest");
    declaredPaths.add(`records/snapshots/${hash}.json`);
  }
  for (const hash of manifest.bundleHashes) {
    if (!WALLPAPER_HASH.test(hash)) throw new WallpaperError("archive-manifest");
    declaredPaths.add(`records/bundles/${hash}.json`);
  }
  const incomingAssets = /* @__PURE__ */ new Map();
  for (const hash of manifest.assetHashes) {
    if (!WALLPAPER_HASH.test(hash)) throw new WallpaperError("archive-manifest");
    const metadataPath = `blobs/${hash}.json`;
    const metadata = files[metadataPath];
    if (!metadata) throw new WallpaperError("archive-asset-missing", "壁纸包素材清单不完整");
    const info = parseArchiveJson(metadata, "archive-asset-metadata");
    const dataPath = `blobs/${hash}.${info.extension}`;
    const data = files[dataPath];
    if (!data) throw new WallpaperError("archive-asset-missing", "壁纸包缺少图像或字体");
    const bytes = await readFile2(store.path("blobs", hash, info.extension));
    const inspected = inspectWallpaperAsset(bytes);
    if (inspected.sha256 !== hash || inspected.mediaType !== info.mediaType || inspected.extension !== info.extension || info.byteLength !== bytes.length) throw new WallpaperError("archive-asset-hash", "壁纸包素材哈希、类型或长度不匹配");
    await store.saveAsset(bytes, info.attribution ?? "导入的 Kinich 壁纸", info.sourceUrl ?? "", { normalizationVersion: info.normalizationVersion ?? "final-bytes-v1" });
    incomingAssets.set(hash, { info });
    declaredPaths.add(metadataPath);
    declaredPaths.add(dataPath);
  }
  if (Object.keys(files).some((path) => !declaredPaths.has(path)) || [...declaredPaths].some((path) => !files[path])) throw new WallpaperError("archive-path", "壁纸包包含未清单声明或缺失的文件");
  const bundles = /* @__PURE__ */ new Map();
  for (const hash of manifest.bundleHashes) {
    const inputBundle = parseArchiveJson(files[`records/bundles/${hash}.json`], "archive-bundle");
    const item = validateWallpaperManifest(inputBundle);
    if (digest(item) !== hash) throw new WallpaperError("archive-bundle-hash", "动态包清单哈希不匹配");
    if (multiVolume) await store.writeJSON(store.path("bundles", hash), item);
    else {
      const saved = await store.saveBundle(item);
      if (saved !== hash) throw new WallpaperError("archive-bundle-hash", "动态包清单哈希不匹配");
    }
    bundles.set(hash, item);
  }
  const referencedAssets = new Set([...bundles.values()].flatMap((bundle) => [...bundle.assetIds, ...bundle.fontAssetIds]));
  if (!multiVolume && (referencedAssets.size !== incomingAssets.size || [...referencedAssets].some((hash) => !incomingAssets.has(hash)))) throw new WallpaperError("archive-asset-reference", "壁纸包含有未引用素材或缺少被引用素材");
  const snapshots = /* @__PURE__ */ new Map();
  for (const hash of manifest.snapshotHashes) {
    const item = parseArchiveJson(files[`records/snapshots/${hash}.json`], "archive-snapshot");
    if (digest(item) !== hash || item.schemaVersion !== WALLPAPER_SCHEMA_VERSION || !["none", "static", "dynamic"].includes(item.mode) || (item.mode === "none" ? Boolean(item.bundleHash) : !WALLPAPER_HASH.test(item.bundleHash ?? "")) || typeof item.autoPalette !== "boolean" || !Number.isSafeInteger(item.sequence) || item.sequence < 0 || !Number.isFinite(Date.parse(item.createdAtUtc)) || !["work", "overview", "detail", "about"].includes(item.templateId) || !Number.isFinite(item.normalizedViewPosition) || item.normalizedViewPosition < 0 || item.normalizedViewPosition > 1) throw new WallpaperError("archive-snapshot-hash", "快照校验失败");
    validateWallpaperSnapshot(item);
    const parameters = wallpaperParameters(item.parameters);
    if (item.mode !== "none") {
      const bundle = bundles.get(item.bundleHash);
      if (!bundle && !multiVolume || bundle && !bundle.projects.some((project) => project.id === item.projectId)) throw new WallpaperError("archive-snapshot-reference", "快照引用了缺失动态包或项目");
    }
    const normalized = { ...item, parameters };
    if (await store.saveSnapshot(normalized) !== hash) throw new WallpaperError("archive-snapshot-hash");
    snapshots.set(hash, normalized);
  }
  if (manifest.counts?.snapshots !== snapshots.size || manifest.counts?.bundles !== bundles.size || manifest.counts?.assets !== incomingAssets.size) throw new WallpaperError("archive-count-mismatch");
  if (manifest.currentSnapshotHash && !WALLPAPER_HASH.test(manifest.currentSnapshotHash)) throw new WallpaperError("archive-manifest");
  const commitImportedSnapshots = async (hashes, markerPath = "") => store.locked(async () => {
    const current = await store.recover();
    if (!current) throw new WallpaperError("not-initialized", "壁纸存储尚未初始化", 503);
    store.checkRevision(current, startingRevision);
    const next = structuredClone(current);
    const present = /* @__PURE__ */ new Set([current.active, ...current.history]);
    for (const hash of hashes) if (hash !== current.active && !present.has(hash)) {
      next.history.push(hash);
      present.add(hash);
    }
    let imported = next.history.length - current.history.length;
    if (imported) await store.commit(current, next);
    if (markerPath) await unlink2(markerPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    return { imported, currentPreserved: true, revision: imported ? next.revision : current.revision };
  });
  if (manifest.volume?.count > 1) {
    const markerPath = join2(store.folder("imports"), `${manifest.datasetId}.json`);
    const partIndex = String(manifest.volume.index);
    return store.locked(async () => {
      const current = await store.recover();
      if (!current) throw new WallpaperError("not-initialized", "壁纸存储尚未初始化", 503);
      store.checkRevision(current, startingRevision);
      let marker = { datasetId: manifest.datasetId, volumeCount: manifest.volume.count, datasetCounts: manifest.datasetCounts, startedRevision: startingRevision, updatedAtUtc: (/* @__PURE__ */ new Date()).toISOString(), parts: {} };
      try {
        marker = await store.readJSON(markerPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (marker.startedRevision !== void 0) store.checkRevision(current, marker.startedRevision);
      if (marker.datasetId !== manifest.datasetId || marker.volumeCount !== manifest.volume.count || canonicalWallpaperJson(marker.datasetCounts) !== canonicalWallpaperJson(manifest.datasetCounts)) throw new WallpaperError("archive-volume-conflict", "分卷与已暂存数据集不匹配", 409);
      const part = { snapshotHashes: manifest.snapshotHashes, bundleHashes: manifest.bundleHashes, assetHashes: manifest.assetHashes };
      if (marker.parts[partIndex] && canonicalWallpaperJson(marker.parts[partIndex]) !== canonicalWallpaperJson(part)) throw new WallpaperError("archive-volume-conflict", "同一分卷编号对应不同内容", 409);
      marker.parts[partIndex] = part;
      marker.updatedAtUtc = (/* @__PURE__ */ new Date()).toISOString();
      await store.writeJSON(markerPath, marker);
      const received = Object.keys(marker.parts).map(Number).sort((a, b) => a - b);
      if (received.length < marker.volumeCount) return { imported: 0, currentPreserved: true, staged: true, received: received.length, total: marker.volumeCount, datasetId: marker.datasetId, revision: current.revision };
      const snapshotHashes = /* @__PURE__ */ new Set(), bundleHashes = /* @__PURE__ */ new Set(), assetHashes = /* @__PURE__ */ new Set();
      for (const item of Object.values(marker.parts)) {
        for (const hash of item.snapshotHashes) snapshotHashes.add(hash);
        for (const hash of item.bundleHashes) bundleHashes.add(hash);
        for (const hash of item.assetHashes) assetHashes.add(hash);
      }
      if (snapshotHashes.size !== marker.datasetCounts.snapshots || bundleHashes.size !== marker.datasetCounts.bundles || assetHashes.size !== marker.datasetCounts.assets) throw new WallpaperError("archive-volume-incomplete", "分卷总索引与收到的内容数量不符", 400);
      const allAssets = /* @__PURE__ */ new Set();
      for (const hash of bundleHashes) {
        const bundle = await store.readBundle(hash);
        if (await store.saveBundle(bundle) !== hash) throw new WallpaperError("archive-bundle-hash", "分卷包清单哈希不匹配");
        for (const assetHash of [...bundle.assetIds, ...bundle.fontAssetIds]) {
          await store.readAsset(assetHash);
          allAssets.add(assetHash);
        }
      }
      if (allAssets.size !== assetHashes.size || [...allAssets].some((hash) => !assetHashes.has(hash))) throw new WallpaperError("archive-volume-incomplete", "分卷缺少动态包引用素材", 400);
      for (const hash of snapshotHashes) {
        const snapshot = await store.snapshot(hash);
        if (snapshot.mode !== "none") {
          if (!bundleHashes.has(snapshot.bundleHash)) throw new WallpaperError("archive-snapshot-reference", "分卷缺少快照引用的动态包");
          const bundle = await store.readBundle(snapshot.bundleHash);
          if (!bundle.projects.some((project) => project.id === snapshot.projectId)) throw new WallpaperError("archive-snapshot-reference", "分卷快照引用项目无效");
        }
      }
      const next = structuredClone(current);
      const present = /* @__PURE__ */ new Set([current.active, ...current.history]);
      for (const hash of snapshotHashes) if (hash !== current.active && !present.has(hash)) {
        next.history.push(hash);
        present.add(hash);
      }
      const imported = next.history.length - current.history.length;
      if (imported) await store.commit(current, next);
      await unlink2(markerPath);
      return { imported, currentPreserved: true, staged: false, received: received.length, total: marker.volumeCount, datasetId: marker.datasetId, revision: imported ? next.revision : current.revision };
    });
  }
  return commitImportedSnapshots(snapshots.keys());
}

// src/host/wallpaper/routes.js
var WALLPAPER_ASSET_LIMIT = 2 * 1024 * 1024;
var PRIVATE_HEADERS = { "cache-control": "private, no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
function json2(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...PRIVATE_HEADERS, "content-type": "application/json; charset=utf-8" } });
}
function fail(error) {
  const storageErrors = { ENOSPC: ["disk-full", "磁盘空间不足；本次操作未完成，已有壁纸和历史仍保留", 507], EACCES: ["storage-permission", "壁纸数据目录没有写入权限", 403], EPERM: ["storage-permission", "壁纸数据目录写入被拒绝或文件正在被占用", 403], EIO: ["storage-io", "壁纸数据读写失败；请重试，已有历史仍保留", 503] };
  if (storageErrors[error?.code]) {
    const [code, message, status] = storageErrors[error.code];
    return json2({ error: code, message }, status);
  }
  const known = error instanceof WallpaperError;
  return json2({ error: known ? error.code : "wallpaper-unavailable", message: known ? error.message : "壁纸服务暂不可用" }, known ? error.status : 500);
}
async function jsonBody(request, limit = 1024 * 1024) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw new WallpaperError("request-too-large", "请求超过大小限制", 413);
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length > limit) throw new WallpaperError("request-too-large", "请求超过大小限制", 413);
  try {
    const value = JSON.parse(bytes.toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new WallpaperError("invalid-request", "壁纸请求格式无效");
  }
}
async function assetBody(request) {
  const header = request.headers.get("content-length"), length = header === null ? null : Number(header);
  if (length !== null && (!/^\d+$/.test(header) || !Number.isSafeInteger(length) || length < 24 || length > WALLPAPER_ASSET_LIMIT)) throw new WallpaperError("asset-size", "素材必须小于 2 MiB", 413);
  if (!request.body) throw new WallpaperError("asset-size", "素材为空", 400);
  const reader = request.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (; ; ) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > WALLPAPER_ASSET_LIMIT) {
        await reader.cancel().catch(() => {
        });
        throw new WallpaperError("asset-size", "素材必须小于 2 MiB", 413);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  if (size < 24 || length !== null && size !== length) throw new WallpaperError("asset-size", "素材长度不匹配", 400);
  return Buffer.concat(chunks, size);
}
function installWallpaperRoutes(ctx, { pluginVersion, builtin, legacy = {} } = {}) {
  const connection = ctx.get("connection");
  const profile = ctx.get("profileContext");
  if (!connection?.fetch?.register || !profile?.dir) return () => {
  };
  let closed = false;
  const store = new WallpaperStore({ profileDir: profile.dir, profileName: typeof profile.name === "string" ? profile.name : "", pluginVersion, builtin });
  let ready;
  const ensureReady = () => ready ??= store.ensure(legacy);
  const route = (path, methods, callback, requestBody = "buffered") => connection.fetch.register({ path, methods, requestBody, fetch: (request) => Promise.resolve().then(async () => {
    if (closed) throw new WallpaperError("service-closed", "壁纸服务已关闭", 503);
    await ensureReady();
    return callback(request);
  }).catch(fail) });
  const dispose = [
    route(WALLPAPER_STATE_PATH, ["GET"], async () => json2(await store.current())),
    route(WALLPAPER_ASSET_PATH, ["GET", "POST"], async (request) => {
      if (request.method === "POST") return json2(await store.saveAsset(await assetBody(request), request.headers.get("x-kinich-attribution") ?? "", request.headers.get("x-kinich-source") ?? "", { normalizationVersion: request.headers.get("x-kinich-normalization") ?? "final-bytes-v1" }), 201);
      const { info, bytes } = await store.readAsset(new URL(request.url).searchParams.get("id") ?? "");
      return new Response(bytes, { status: 200, headers: { ...PRIVATE_HEADERS, "content-type": info.mediaType, "content-length": String(bytes.length), etag: `"${info.sha256}"` } });
    }),
    route(WALLPAPER_BUNDLE_PATH, ["GET", "POST"], async (request) => request.method === "POST" ? json2({ bundleHash: await store.saveBundle(await jsonBody(request)) }, 201) : json2(await store.readBundle(new URL(request.url).searchParams.get("id") ?? ""))),
    route(WALLPAPER_APPLY_PATH, ["POST"], async (request) => {
      const data = await jsonBody(request, 64 * 1024);
      if (!Number.isSafeInteger(data.expectedRevision)) throw new WallpaperError("invalid-revision");
      return json2(await store.apply(data, data.expectedRevision));
    }),
    route(WALLPAPER_HISTORY_PATH, ["GET"], async (request) => {
      const query = new URL(request.url).searchParams;
      return json2(await store.history(Number(query.get("cursor") ?? 0), 30));
    }),
    route(WALLPAPER_HISTORY_ITEM_PATH, ["POST"], async (request) => {
      const data = await jsonBody(request, 4096);
      if (!Number.isSafeInteger(data.expectedRevision)) throw new WallpaperError("invalid-revision");
      if (data.action === "restore") return json2(await store.restore(data.hash, data.expectedRevision));
      if (data.action === "delete") return json2(await store.deleteHistory(data.hash, data.expectedRevision));
      throw new WallpaperError("invalid-history-action");
    }),
    route(WALLPAPER_CLEAR_HISTORY_PATH, ["POST"], async (request) => {
      const data = await jsonBody(request, 4096);
      return json2(await store.clearHistory(data.expectedRevision));
    }),
    route(WALLPAPER_EXPORT_PATH, ["GET"], async (request) => {
      const query = new URL(request.url).searchParams;
      const args = { scope: query.get("scope") ?? "current", historyHash: query.get("hash") ?? "" };
      if (query.get("plan") === "1") return json2(await exportWallpaperArchive(store, { ...args, planOnly: true }));
      const bytes = await exportWallpaperArchive(store, { ...args, volumeIndex: Number(query.get("volume") ?? 0), expectedDatasetId: query.get("datasetId") ?? "" });
      const volume = Number(query.get("volume") ?? 0) + 1;
      const dataset = query.get("datasetId") ?? "";
      const filename = `kinich-wallpaper-${args.scope}-${/^[a-f0-9]{64}$/.test(dataset) ? dataset.slice(0, 16) : "backup"}-part-${volume}.kinich-wallpaper.zip`;
      return new Response(bytes, { status: 200, headers: { ...PRIVATE_HEADERS, "content-type": "application/zip", "content-disposition": `attachment; filename="${filename}"` } });
    }),
    route(WALLPAPER_IMPORT_PATH, ["POST"], async (request) => {
      const header = request.headers.get("content-length"), declared = header === null ? null : Number(header);
      if (declared !== null && (!/^\d+$/.test(header) || !Number.isSafeInteger(declared) || declared < 22 || declared > MAX_WALLPAPER_ARCHIVE_BYTES)) throw new WallpaperError("archive-size", "壁纸包必须小于 256 MiB", 413);
      const result = await importWallpaperArchive(store, request.body);
      return json2(result);
    }, "streamed"),
    route(WALLPAPER_DEFAULT_PATH, ["POST"], async (request) => {
      const data = await jsonBody(request, 4096);
      return json2(await store.restoreDefault(data.expectedRevision));
    }),
    route(WALLPAPER_PALETTE_PATH, ["POST"], async (request) => {
      const data = await jsonBody(request, 4096);
      return json2(await store.capturePalette(data, data.expectedRevision));
    })
  ];
  return async () => {
    closed = true;
    for (const unregister of dispose.reverse()) if (typeof unregister === "function") await unregister();
    await store.close();
  };
}

// src/host/wallpaper/builtin.js
import { readFileSync } from "node:fs";
import { readFile as readFile3 } from "node:fs/promises";
import { dirname, join as join3, resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";
var PROJECTS = Object.freeze([
  { id: "gucci", title: "林间主题", description: "从这里，开启新的探索。", imageCount: 12 },
  { id: "samsung", title: "清简腕表", description: "雨林深处的日常节奏。", imageCount: 19 },
  { id: "rituals", title: "沐浴之境", description: "在晨光与色彩之间。", imageCount: 16 },
  { id: "moco", title: "画布印象", description: "让每个细节慢下来。", imageCount: 15 },
  { id: "sennheiser", title: "音色流动", description: "听见画面中的韵律。", imageCount: 16 },
  { id: "swarovski", title: "晶光愿景", description: "光线穿过层层叠影。", imageCount: 15 },
  { id: "activia", title: "自然回响", description: "从自然中汲取灵感。", imageCount: 11 },
  { id: "saeco", title: "匠心咖啡", description: "故事在温暖中展开。", imageCount: 14 }
]);
var REFERENCE_SCRIPT_SHA256 = "a8c103d4e6f3f57534e8208b05fae57aa48a7b58c7b552723609639cc8f40dfe";
function packageRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const parent of [resolve2(here, ".."), resolve2(here, "../../..")]) {
    try {
      if (JSON.parse(readFileSync(join3(parent, "package.json"), "utf8")).name === "dsh-kinich-theme") return parent;
    } catch {
    }
  }
  throw new Error("Cannot resolve the dsh-kinich-theme package root");
}
async function loadKinichWallpaperBuiltin() {
  const root = join3(packageRoot(), "assets", "wallpapers", "camille-reference");
  const sourceMap = JSON.parse(readFileSync(join3(root, "source-map.json"), "utf8"));
  const reference = JSON.parse(readFileSync(join3(root, "project-reference-data.json"), "utf8"));
  if (reference.scriptSha256 !== REFERENCE_SCRIPT_SHA256 || !Array.isArray(reference.projects) || reference.projects.length !== PROJECTS.length) throw new Error("Pinned Camille Mormal project reference data is invalid");
  const assetMap = /* @__PURE__ */ new Map();
  for (const item of Object.values(sourceMap)) {
    if (!item || typeof item.sourceUrl !== "string" || !/^https:\/\/camillemormal\.com\/static\/(?:media\/d\/|font\/)/.test(item.sourceUrl) || !/^images\/[a-f0-9]{64}\.(?:jpg|woff2)$/.test(item.relativePath)) throw new Error("Invalid bundled wallpaper source map");
    const bytes = await readFile3(join3(root, item.relativePath));
    const sha256 = wallpaperHash(bytes);
    if (sha256 !== item.sha256) throw new Error(`Built-in wallpaper integrity check failed: ${item.relativePath}`);
    assetMap.set(item.sourceUrl, { sha256, bytes, sourceUrl: item.sourceUrl, attribution: item.attribution || "Camille Mormal", kind: item.kind || "image" });
  }
  const locate = (url) => assetMap.get(url)?.sha256 ?? "";
  const projectRows = PROJECTS.map((project, index) => {
    const referenceProject = reference.projects[index];
    if (referenceProject?.id !== project.id || referenceProject.nextProjectId !== PROJECTS[(index + 1) % PROJECTS.length].id || referenceProject.nextProjectUrl !== `https://camillemormal.com/${referenceProject.nextProjectId}`) throw new Error(`Pinned project order/footer mismatch: ${project.id}`);
    const home = locate(`https://camillemormal.com/static/media/d/work/${project.id}/home.jpg?1`);
    const hero = locate(`https://camillemormal.com/static/media/d/work/${project.id}/hero.jpg?1`);
    const gallery = referenceProject.gallery;
    if (!home || !hero || !Array.isArray(gallery) || gallery.length !== project.imageCount) throw new Error(`Built-in wallpaper is missing a project cover or gallery: ${project.id}`);
    const largeIds = gallery.map((item, galleryIndex) => {
      if (item.largeIndex !== void 0 && item.largeIndex !== galleryIndex) throw new Error(`Gallery sequence is invalid: ${project.id}`);
      const largeId = locate(item.largeSourceUrl), smallId = locate(item.thumbnailSourceUrl);
      if (!largeId || !smallId || !item.caption || ![0, 40, 320].includes(item.gapBeforePx)) throw new Error(`Built-in gallery metadata is incomplete: ${project.id}/${galleryIndex}`);
      return largeId;
    });
    const thumbnailIds = gallery.map((item) => locate(item.thumbnailSourceUrl));
    const storyAssetIds = [.../* @__PURE__ */ new Set([hero, ...thumbnailIds, ...largeIds])];
    return {
      id: project.id,
      title: project.title,
      headline: project.title,
      description: `Kinich 主题视觉场景。${project.description}`,
      role: "Kinich 视觉主题",
      contributor: "Kinich · Ajaw",
      sourceUrl: referenceProject.pageUrl,
      coverId: home,
      heroId: hero,
      assetIds: storyAssetIds,
      largeImageIds: largeIds,
      thumbnailAssetIds: thumbnailIds,
      galleryCaptions: gallery.map((item) => item.caption),
      imageGaps: gallery.map((item) => item.gapBeforePx),
      nextProjectId: referenceProject.nextProjectId
    };
  });
  const loaderAssetIds = Object.values(sourceMap).filter((item) => item.kind === "loader").sort((a, b) => (a.loaderIndex ?? 0) - (b.loaderIndex ?? 0)).map((item) => item.sha256);
  if (loaderAssetIds.length !== 25) throw new Error("Built-in wallpaper loading mosaic is incomplete");
  const fontAssetIds = Object.values(sourceMap).filter((item) => item.kind === "font").map((item) => item.sha256);
  if (fontAssetIds.length !== 1) throw new Error("Built-in wallpaper Söhne font is missing");
  const sourceFingerprint = wallpaperHash(Buffer.from(canonicalWallpaperJson([...assetMap.keys()].sort().map((url) => [url, assetMap.get(url).sha256]))));
  return { assets: [...assetMap.values()], manifest: {
    schemaVersion: 1,
    id: "camille-mormal-reference-2026-10-08",
    version: "1.0.2",
    name: "Kinich 动态画廊",
    sourceUrl: "https://camillemormal.com/",
    sourceFingerprint,
    paletteAlgorithmVersion: "kinich-dominant-v1",
    representativeAssetId: projectRows[0].coverId,
    loaderAssetIds,
    fontAssetIds,
    projects: projectRows
  } };
}

// src/client/version.generated.js
var PLUGIN_VERSION = "2.0.3-rc.1";

// src/host/index.js
var name = "dsh-kinich-theme";
var Config = KinichThemeConfigSchema;
function apply(ctx) {
  installBalanceRoute(ctx);
  ctx.inject(["connection", "settings"], (hostCtx) => {
    const profile = hostCtx.get("profileContext");
    if (!profile?.dir) return;
    const legacy = typeof hostCtx.settings.get === "function" ? hostCtx.settings.get(KINICH_SETTINGS_NAMESPACE) ?? {} : {};
    hostCtx.effect(() => installWallpaperRoutes(hostCtx, { profileDir: profile.dir, profileName: profile.name, pluginVersion: PLUGIN_VERSION, legacy, builtin: loadKinichWallpaperBuiltin }));
  });
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
