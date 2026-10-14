export const WALLPAPER_SCHEMA_VERSION = 1;
export const WALLPAPER_SPEC_VERSION = "1.0.5";
export const WALLPAPER_ASSET_PATH = "/api/kinich-wallpaper/asset";
export const WALLPAPER_STATE_PATH = "/api/kinich-wallpaper/state";
export const WALLPAPER_APPLY_PATH = "/api/kinich-wallpaper/apply";
export const WALLPAPER_HISTORY_PATH = "/api/kinich-wallpaper/history";
export const WALLPAPER_HISTORY_ITEM_PATH = "/api/kinich-wallpaper/history-item";
export const WALLPAPER_CLEAR_HISTORY_PATH = "/api/kinich-wallpaper/clear-history";
export const WALLPAPER_BUNDLE_PATH = "/api/kinich-wallpaper/bundle";
export const WALLPAPER_EXPORT_PATH = "/api/kinich-wallpaper/export";
export const WALLPAPER_IMPORT_PATH = "/api/kinich-wallpaper/import";
export const WALLPAPER_DEFAULT_PATH = "/api/kinich-wallpaper/default";
export const WALLPAPER_PALETTE_PATH = "/api/kinich-wallpaper/palette";
export const MAX_WALLPAPER_ASSET_BYTES = 2 * 1024 * 1024;
export const MAX_WALLPAPER_BUNDLE_ASSETS = 320;
export const WALLPAPER_DEFAULT_PARAMETERS = Object.freeze({ rhythm: 50, amplitude: 50, elementDensity: 50, visibility: 50 });
export const WALLPAPER_PARAMETER_KEYS = Object.freeze(Object.keys(WALLPAPER_DEFAULT_PARAMETERS));
export const WALLPAPER_MODES = Object.freeze(["none", "static", "dynamic"]);
export const WALLPAPER_TEMPLATES = Object.freeze(["work", "overview", "detail", "about"]);
export const WALLPAPER_HASH = /^[a-f0-9]{64}$/;

export class WallpaperError extends Error {
	constructor(code, message = code, status = 400) { super(message); this.name = "WallpaperError"; this.code = code; this.status = status; }
}

export function wallpaperParameters(value = {}) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new WallpaperError("invalid-parameters");
	const result = {};
	for (const key of WALLPAPER_PARAMETER_KEYS) {
		const v = value[key] ?? WALLPAPER_DEFAULT_PARAMETERS[key];
		if (!Number.isInteger(v) || v < 0 || v > 100) throw new WallpaperError("invalid-parameters", `Invalid ${key}`);
		result[key] = v;
	}
	if (Object.keys(value).some(key => !WALLPAPER_PARAMETER_KEYS.includes(key))) throw new WallpaperError("invalid-parameters");
	return result;
}

export function wallpaperMultiplier(value) { return value <= 50 ? value / 50 : 1 + 2 * (value - 50) / 50; }
export function wallpaperElementCount(value, available = Infinity) {
	const count = value === 0 ? 0 : value <= 50 ? Math.ceil(8 * value / 50) : 8 + Math.ceil(16 * (value - 50) / 50);
	return Math.min(count, available);
}
export function wallpaperDamping(dt, rhythm) { return 1 - (1 - 0.083) ** (Math.min(50, Math.max(0, dt)) / (1000 / 60) * wallpaperMultiplier(rhythm)); }
export function wallpaperScale(width, height) {
	return width / height > 16 / 9 ? { image: height / 1000, text: height / 1080 } : { image: width / 1600, text: width / 1920 };
}
export function wallpaperMotionAllowed(active, { ambientMotion = true, reducedMotion = false } = {}) {
	return active?.mode === "dynamic" && active.parameters.rhythm > 0 && ambientMotion && !reducedMotion;
}
/** Profile preference controls mounting, independently of snapshots and visibility. */
export function wallpaperDisplayAllowed(active, dynamicEnabled = true) {
	return Boolean(active && active.mode !== "none" && (active.mode !== "dynamic" || dynamicEnabled !== false));
}
export function wallpaperAssetUrl(hash) {
	if (!WALLPAPER_HASH.test(hash)) throw new WallpaperError("invalid-asset-id");
	return `${WALLPAPER_ASSET_PATH}?id=${hash}`;
}
export function canonicalWallpaperJson(value) {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalWallpaperJson).join(",")}]`;
	return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalWallpaperJson(value[key])}`).join(",")}}`;
}
export function validateWallpaperSnapshot(item) {
	if (!item || typeof item!=="object" || item.schemaVersion!==1 || !WALLPAPER_MODES.includes(item.mode) || !WALLPAPER_TEMPLATES.includes(item.templateId) || typeof item.autoPalette!=="boolean" || !Number.isSafeInteger(item.sequence) || item.sequence<0 || !Number.isFinite(Date.parse(item.createdAtUtc)) || !Number.isFinite(item.normalizedViewPosition) || item.normalizedViewPosition<0 || item.normalizedViewPosition>1) throw new WallpaperError("invalid-snapshot");
	if (item.mode!=="none" && !WALLPAPER_HASH.test(item.bundleHash)) throw new WallpaperError("invalid-snapshot");
	for(const key of ["id","reason","originVersion","projectId","paletteAlgorithmVersion"]) safeText(item[key],256);
	if (!(item.sampledAccent==="" || /^#[a-f0-9]{6}$/i.test(item.sampledAccent))) throw new WallpaperError("invalid-accent");
	if (item.paletteCaptured!==undefined && typeof item.paletteCaptured!=="boolean") throw new WallpaperError("invalid-snapshot");
	if(item.derivedPalette!==undefined){
		if(!item.derivedPalette || typeof item.derivedPalette!=="object" || Array.isArray(item.derivedPalette) || Object.keys(item.derivedPalette).some(style=>!["jungle","phlogiston","sunlit"].includes(style))) throw new WallpaperError("invalid-palette");
		const keys=["light","dark","strongLight","strongDark","foregroundLight","foregroundDark"];
		for(const palette of Object.values(item.derivedPalette))if(palette!==null && (typeof palette!=="object" || Object.keys(palette).length!==keys.length || keys.some(key=>!/^#[a-f0-9]{6}$/i.test(palette[key])))) throw new WallpaperError("invalid-palette");
	}
	wallpaperParameters(item.parameters); return item;
}
function safeText(value, limit, fallback = "") {
	const result = value ?? fallback;
	if (typeof result !== "string" || result.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) throw new WallpaperError("invalid-manifest");
	return result;
}
function assetId(value) { if (!WALLPAPER_HASH.test(value)) throw new WallpaperError("invalid-asset-id"); return value; }
function safeSource(value = "") {
	if (!value) return "";
	safeText(value, 2048);
	let url; try { url = new URL(value); } catch { throw new WallpaperError("invalid-source-url"); }
	if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new WallpaperError("invalid-source-url");
	return value;
}
const DEFAULT_ABOUT = Object.freeze([
	{ heading: "Kinich", paragraphs: ["以全屏图像、裁切与连续运动呈现内容。壁纸与会话状态独立，阿乔继续保有原来的交互。"] },
	{ heading: "版本记录", paragraphs: ["复杂动态壁纸的最终确认版本为 v2.0。"] },
	{ heading: "视觉与交互", paragraphs: ["全屏、总览、详情画廊与微缩导航。"] },
	{ heading: "素材", paragraphs: ["来源与处理记录随素材包保存。"] },
	{ heading: "项目", paragraphs: ["dsh-kinich-theme"], links:[{label:"GitHub · dsh-Kinich-theme",url:"https://github.com/Xian-JL/dsh-Kinich-theme"}] },
	{ heading: "Credits", paragraphs: ["视觉参考：Camille Mormal；动效与开发参考：Aristide Benoist；字体参考：Söhne Buch。"], links:[{label:"Camille Mormal",url:"https://camillemormal.com/"},{label:"Aristide Benoist",url:"https://aristidebenoist.com/"},{label:"Söhne · Klim Type Foundry",url:"https://klim.co.nz/retail-fonts/soehne/"}] }
]);

export function validateWallpaperManifest(input) {
	if (!input || typeof input !== "object" || Array.isArray(input)) throw new WallpaperError("invalid-manifest");
	if (input.schemaVersion !== WALLPAPER_SCHEMA_VERSION) throw new WallpaperError("unsupported-schema", "Wallpaper schema is not supported", 409);
	if (!Array.isArray(input.projects) || input.projects.length < 1 || input.projects.length > 256) throw new WallpaperError("invalid-projects");
	const ids = new Set();
	const projects = input.projects.map((item, index) => {
		if (!item || typeof item !== "object" || Array.isArray(item)) throw new WallpaperError("invalid-projects");
		const id = safeText(item.id, 80, `project-${index + 1}`);
		if (!id || ids.has(id)) throw new WallpaperError("invalid-projects"); ids.add(id);
		if (!Array.isArray(item.assetIds) || item.assetIds.length < 1 || item.assetIds.length > 256) throw new WallpaperError("invalid-assets");
		const largeImageIds = item.largeImageIds ?? [];
		if (!Array.isArray(largeImageIds) || largeImageIds.length > 256) throw new WallpaperError("invalid-assets");
		const galleryIds = largeImageIds.length ? largeImageIds : item.assetIds.filter(id => id !== (item.heroId ?? item.assetIds[0]));
		const rawGaps = item.imageGaps;
		let gaps;
		if (rawGaps === undefined) gaps = galleryIds.map(() => 40);
		else if (Array.isArray(rawGaps) && rawGaps.length === galleryIds.length) gaps = [...rawGaps];
		else if (Array.isArray(rawGaps) && rawGaps.length === item.assetIds.length) {
			// Migrate alpha bundles whose gaps were indexed over hero + thumbnail + large assets.
			gaps = galleryIds.map(id => rawGaps[item.assetIds.indexOf(id)] ?? 40);
		} else throw new WallpaperError("invalid-image-gaps");
		if (gaps.some(gap => ![0, 40, 320].includes(gap))) throw new WallpaperError("invalid-image-gaps");
		const thumbnailAssetIds = item.thumbnailAssetIds ?? item.assetIds.filter(id => id !== (item.heroId ?? item.assetIds[0]) && !largeImageIds.includes(id));
		if (!Array.isArray(thumbnailAssetIds) || thumbnailAssetIds.length > 256) throw new WallpaperError("invalid-assets");
		const galleryCaptions = item.galleryCaptions ?? [];
		if (!Array.isArray(galleryCaptions) || galleryCaptions.length > 256 || (galleryCaptions.length > 0 && galleryCaptions.length !== galleryIds.length)) throw new WallpaperError("invalid-gallery-captions");
		return { id, title: safeText(item.title, 128, `壁纸 ${index + 1}`), headline: safeText(item.headline, 256, item.title ?? `壁纸 ${index + 1}`),
			description: safeText(item.description, 2048), role: safeText(item.role, 128, "视觉参考"), contributor: safeText(item.contributor, 256),
			sourceUrl: safeSource(item.sourceUrl), coverId: assetId(item.coverId ?? item.assetIds[0]), heroId: assetId(item.heroId ?? item.assetIds[0]),
			assetIds: item.assetIds.map(assetId), largeImageIds: largeImageIds.map(assetId), thumbnailAssetIds: thumbnailAssetIds.map(assetId), galleryCaptions: galleryCaptions.map(caption => safeText(caption, 512)), imageGaps: gaps,
			nextProjectId: safeText(item.nextProjectId, 80, input.projects[(index + 1) % input.projects.length].id ?? `project-${(index + 1) % input.projects.length + 1}`) };
	});
	if (projects.some(project => !ids.has(project.nextProjectId))) throw new WallpaperError("invalid-next-project");
	const loaderAssetIds = input.loaderAssetIds ?? [];
	if (!Array.isArray(loaderAssetIds) || loaderAssetIds.length > 25) throw new WallpaperError("invalid-assets");
	const fonts = input.fontAssetIds ?? [];
	if (!Array.isArray(fonts) || fonts.length > 8) throw new WallpaperError("too-many-fonts");
	const fontAssetIds = fonts.map(assetId);
	const assets = [...new Set(projects.flatMap(project => [project.coverId, project.heroId, ...project.assetIds, ...project.largeImageIds, ...project.thumbnailAssetIds]).concat(loaderAssetIds.map(assetId), fontAssetIds))];
	if (assets.length > MAX_WALLPAPER_BUNDLE_ASSETS) throw new WallpaperError("too-many-assets");
	const about = input.about ?? DEFAULT_ABOUT;
	if (!Array.isArray(about) || about.length !== 6) throw new WallpaperError("invalid-about");
	const sampledAccent = input.sampledAccent == null || input.sampledAccent === "" ? "" :
		typeof input.sampledAccent === "string" && /^#[a-f0-9]{6}$/i.test(input.sampledAccent) ? input.sampledAccent.toLowerCase() : (() => { throw new WallpaperError("invalid-accent"); })();
	return { schemaVersion: 1, id: safeText(input.id, 128), version: safeText(input.version, 80, "1"), name: safeText(input.name, 128, "自定义壁纸"),
		sourceUrl: safeSource(input.sourceUrl), sourceFingerprint: safeText(input.sourceFingerprint, 128), representativeAssetId: assetId(input.representativeAssetId ?? projects[0].coverId),
		sampledAccent, paletteAlgorithmVersion: safeText(input.paletteAlgorithmVersion, 80, "kinich-dominant-v1"), projects, loaderAssetIds: loaderAssetIds.map(assetId), assetIds: assets,
		fontAssetIds, about: about.map(section => {
			if (!section || typeof section !== "object" || !Array.isArray(section.paragraphs) || section.paragraphs.length > 32) throw new WallpaperError("invalid-about");
			const links=section.links??[];if(!Array.isArray(links)||links.length>16)throw new WallpaperError("invalid-about");
			return { heading: safeText(section.heading, 128), paragraphs: section.paragraphs.map(paragraph => safeText(paragraph, 4096)), ...(links.length?{links:links.map(link=>{const url=safeSource(link.url);if(!url)throw new WallpaperError("invalid-source-url");return {label:safeText(link.label,256),url};})}:{}) };
		}) };
}
