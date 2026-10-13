import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalWallpaperJson } from "../../shared/wallpaper.js";
import { wallpaperHash } from "./assets.js";

const PROJECTS = Object.freeze([
	{ id: "gucci", title: "林间主题", description: "从这里，开启新的探索。", imageCount: 12 },
	{ id: "samsung", title: "清简腕表", description: "雨林深处的日常节奏。", imageCount: 19 },
	{ id: "rituals", title: "沐浴之境", description: "在晨光与色彩之间。", imageCount: 16 },
	{ id: "moco", title: "画布印象", description: "让每个细节慢下来。", imageCount: 15 },
	{ id: "sennheiser", title: "音色流动", description: "听见画面中的韵律。", imageCount: 16 },
	{ id: "swarovski", title: "晶光愿景", description: "光线穿过层层叠影。", imageCount: 15 },
	{ id: "activia", title: "自然回响", description: "从自然中汲取灵感。", imageCount: 11 },
	{ id: "saeco", title: "匠心咖啡", description: "故事在温暖中展开。", imageCount: 14 }
]);
const REFERENCE_SCRIPT_SHA256 = "a8c103d4e6f3f57534e8208b05fae57aa48a7b58c7b552723609639cc8f40dfe";

function packageRoot() {
	const here = dirname(fileURLToPath(import.meta.url));
	for (const parent of [resolve(here, ".."), resolve(here, "../../..")]) {
		try { if (JSON.parse(readFileSync(join(parent, "package.json"), "utf8")).name === "dsh-kinich-theme") return parent; } catch {}
	}
	throw new Error("Cannot resolve the dsh-kinich-theme package root");
}

export async function loadKinichWallpaperBuiltin() {
	const root = join(packageRoot(), "assets", "wallpapers", "camille-reference");
	const sourceMap = JSON.parse(readFileSync(join(root, "source-map.json"), "utf8"));
	const reference = JSON.parse(readFileSync(join(root, "project-reference-data.json"), "utf8"));
	if (reference.scriptSha256 !== REFERENCE_SCRIPT_SHA256 || !Array.isArray(reference.projects) || reference.projects.length !== PROJECTS.length) throw new Error("Pinned Camille Mormal project reference data is invalid");
	const assetMap = new Map();
	for (const item of Object.values(sourceMap)) {
		if (!item || typeof item.sourceUrl !== "string" || !/^https:\/\/camillemormal\.com\/static\/(?:media\/d\/|font\/)/.test(item.sourceUrl) || !/^images\/[a-f0-9]{64}\.(?:jpg|woff2)$/.test(item.relativePath)) throw new Error("Invalid bundled wallpaper source map");
		const bytes = await readFile(join(root, item.relativePath));
		const sha256 = wallpaperHash(bytes);
		if (sha256 !== item.sha256) throw new Error(`Built-in wallpaper integrity check failed: ${item.relativePath}`);
		assetMap.set(item.sourceUrl, { sha256, bytes, sourceUrl: item.sourceUrl, attribution: item.attribution || "Camille Mormal", kind: item.kind || "image" });
	}
	const locate = url => assetMap.get(url)?.sha256 ?? "";
	const projectRows = PROJECTS.map((project, index) => {
		const referenceProject = reference.projects[index];
		if (referenceProject?.id !== project.id || referenceProject.nextProjectId !== PROJECTS[(index + 1) % PROJECTS.length].id || referenceProject.nextProjectUrl !== `https://camillemormal.com/${referenceProject.nextProjectId}`) throw new Error(`Pinned project order/footer mismatch: ${project.id}`);
		const home = locate(`https://camillemormal.com/static/media/d/work/${project.id}/home.jpg?1`);
		const hero = locate(`https://camillemormal.com/static/media/d/work/${project.id}/hero.jpg?1`);
		const gallery = referenceProject.gallery;
		if (!home || !hero || !Array.isArray(gallery) || gallery.length !== project.imageCount) throw new Error(`Built-in wallpaper is missing a project cover or gallery: ${project.id}`);
		const largeIds = gallery.map((item, galleryIndex) => {
			if (item.largeIndex !== undefined && item.largeIndex !== galleryIndex) throw new Error(`Gallery sequence is invalid: ${project.id}`);
			const largeId = locate(item.largeSourceUrl), smallId = locate(item.thumbnailSourceUrl);
			if (!largeId || !smallId || !item.caption || ![0, 40, 320].includes(item.gapBeforePx)) throw new Error(`Built-in gallery metadata is incomplete: ${project.id}/${galleryIndex}`);
			return largeId;
		});
		const thumbnailIds = gallery.map(item => locate(item.thumbnailSourceUrl));
		const storyAssetIds = [...new Set([hero, ...thumbnailIds, ...largeIds])];
		return { id: project.id, title: project.title, headline: project.title, description: `Kinich 主题视觉场景。${project.description}`, role: "Kinich 视觉主题", contributor: "Kinich · Ajaw",
			sourceUrl: referenceProject.pageUrl, coverId: home, heroId: hero, assetIds: storyAssetIds, largeImageIds: largeIds, thumbnailAssetIds: thumbnailIds,
			galleryCaptions: gallery.map(item => item.caption), imageGaps: gallery.map(item => item.gapBeforePx), nextProjectId: referenceProject.nextProjectId };
	});
	const loaderAssetIds = Object.values(sourceMap).filter(item => item.kind === "loader").sort((a, b) => (a.loaderIndex ?? 0) - (b.loaderIndex ?? 0)).map(item => item.sha256);
	if (loaderAssetIds.length !== 25) throw new Error("Built-in wallpaper loading mosaic is incomplete");
	const fontAssetIds = Object.values(sourceMap).filter(item => item.kind === "font").map(item => item.sha256);
	if (fontAssetIds.length !== 1) throw new Error("Built-in wallpaper Söhne font is missing");
	const sourceFingerprint = wallpaperHash(Buffer.from(canonicalWallpaperJson([...assetMap.keys()].sort().map(url => [url, assetMap.get(url).sha256]))));
	return { assets: [...assetMap.values()], manifest: { schemaVersion: 1, id: "camille-mormal-reference-2026-10-08", version: "1.0.2", name: "Kinich 动态画廊", sourceUrl: "https://camillemormal.com/", sourceFingerprint,
		paletteAlgorithmVersion: "kinich-dominant-v1", representativeAssetId: projectRows[0].coverId, loaderAssetIds, fontAssetIds, projects: projectRows } };
}
