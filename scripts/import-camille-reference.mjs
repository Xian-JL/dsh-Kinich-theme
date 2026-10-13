import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACK = join(ROOT, "assets/wallpapers/camille-reference");
const IMAGE_DIR = join(PACK, "images");
const SOURCE_MAP_PATH = join(PACK, "source-map.json");
const SITE_DATA_PATH = join(PACK, "project-reference-data.json");
const FONT_URL = "https://camillemormal.com/static/font/s.woff2";
const EXPECTED_SCRIPT_SHA256 = "a8c103d4e6f3f57534e8208b05fae57aa48a7b58c7b552723609639cc8f40dfe";
const PROJECTS = [
	{ id: "gucci", title: "林间主题", description: "从这里，开启新的探索。", imageCount: 12 },
	{ id: "samsung", title: "清简腕表", description: "雨林深处的日常节奏。", imageCount: 19 },
	{ id: "rituals", title: "沐浴之境", description: "在晨光与色彩之间。", imageCount: 16 },
	{ id: "moco", title: "画布印象", description: "让每个细节慢下来。", imageCount: 15 },
	{ id: "sennheiser", title: "音色流动", description: "听见画面中的韵律。", imageCount: 16 },
	{ id: "swarovski", title: "晶光愿景", description: "光线穿过层层叠影。", imageCount: 15 },
	{ id: "activia", title: "自然回响", description: "从自然中汲取灵感。", imageCount: 11 },
	{ id: "saeco", title: "匠心咖啡", description: "故事在温暖中展开。", imageCount: 14 }
];

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function attr(tag, name) { return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? ""; }
function decodeEntities(value) {
	return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function textContent(value) { return decodeEntities(value.replace(/<\/span>\s*<span[^>]*>/g, " ").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()); }
async function fetchBytes(url, { json = false } = {}) {
	let lastError;
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(url, { headers: { "user-agent": "Kinich wallpaper source importer/1.0" }, signal: AbortSignal.timeout(30_000) });
			if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
			const bytes = Buffer.from(await response.arrayBuffer());
			if (json) return JSON.parse(bytes.toString("utf8"));
			return bytes;
		} catch (error) { lastError = error; }
		await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
	}
	throw new Error(`Could not fetch ${url}: ${lastError?.message ?? "unknown network error"}`);
}
async function writeAsset(sourceUrl, record) {
	let bytes;
	if (record.sha256 && record.relativePath) {
		try { bytes = await readFile(join(PACK, record.relativePath)); } catch {}
		if (bytes && sha256(bytes) !== record.sha256) throw new Error(`Existing asset hash is invalid: ${record.relativePath}`);
	}
	if (!bytes) bytes = await fetchBytes(sourceUrl);
	if (sourceUrl === FONT_URL && bytes.toString("ascii", 0, 4) !== "wOF2") throw new Error("The reference font is not a WOFF2 file");
	if (sourceUrl !== FONT_URL && !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) throw new Error(`Reference image is not JPEG: ${sourceUrl}`);
	const hash = sha256(bytes), extension = sourceUrl === FONT_URL ? "woff2" : "jpg", relativePath = `images/${hash}.${extension}`;
	await writeFile(join(PACK, relativePath), bytes);
	return { sha256: hash, relativePath, sourceUrl, attribution: "Camille Mormal", ...record };
}

await mkdir(IMAGE_DIR, { recursive: true });
const script = await fetchBytes("https://camillemormal.com/static/js/d.js?1");
if (sha256(script) !== EXPECTED_SCRIPT_SHA256) throw new Error("Reference site script changed from the pinned specification snapshot");
const existing = JSON.parse(await readFile(SOURCE_MAP_PATH, "utf8"));
const sources = new Map(Object.values(existing).map(item => [item.sourceUrl, { ...item }]));
for (const [url, record] of sources) {
	const match = url.match(/\/static\/media\/d\/load\/(\d+)\.jpg\?1$/);
	if (match) Object.assign(record, { kind: "loader", loaderIndex: Number(match[1]), attribution: "Camille Mormal" });
}
const projectData = [];

for (let projectIndex = 0; projectIndex < PROJECTS.length; projectIndex++) {
	const project = PROJECTS[projectIndex];
	const pageUrl = `https://camillemormal.com/${project.id}`;
	const payload = await fetchBytes(`${pageUrl}?webp=true&device=d`, { json: true });
	if (typeof payload.body !== "string") throw new Error(`Project HTML payload is missing: ${project.id}`);
	const html = payload.body;
	const imageTags = [...html.matchAll(/<img\b[^>]*data-src="([^"]+)"[^>]*>/g)];
	const images = imageTags.map(match => {
		const url = new URL(match[1], "https://camillemormal.com").href;
		const tag = match[0];
		return { url, tag, alt: decodeEntities(attr(tag, "alt")), width: Number(attr(tag, "width")) || 0, height: Number(attr(tag, "height")) || 0 };
	}).filter(image => image.url.includes(`/static/media/d/work/${project.id}/section/`));
	const small = new Map(images.filter(image => image.url.includes("/section/small/")).map(image => [image.url.split("/").at(-1).split("?")[0], image]));
	const large = images.filter(image => image.url.includes("/section/large/"));
	if (large.length !== project.imageCount || small.size !== project.imageCount) throw new Error(`${project.id}: expected ${project.imageCount} paired gallery items, got large=${large.length}, small=${small.size}`);
	let previousEnd = -1, galleryIndex = 0;
	const gallery = large.map(image => {
		const pagePosition = imageTags.find(item => item[0] === image.tag)?.index ?? html.indexOf(image.tag);
		const segment = html.slice(Math.max(0, previousEnd), pagePosition);
		const gapBeforePx = segment.includes('class="w-s-mtl"') ? 320 : segment.includes('class="w-s-mts"') ? 40 : 0;
		previousEnd = pagePosition + image.tag.length;
		const fileName = image.url.split("/").at(-1).split("?")[0];
		const thumbnail = small.get(fileName);
		if (!thumbnail) throw new Error(`${project.id}: thumbnail is missing for ${fileName}`);
		for (const [record, kind] of [[image, "gallery-large"], [thumbnail, "gallery-small"]]) {
			sources.set(record.url, { ...(sources.get(record.url) ?? {}), sourceUrl: record.url, kind, projectId: project.id,
				galleryIndex, alt: record.alt, width: record.width, height: record.height,
				...(kind === "gallery-large" ? { gapBeforePx } : {}) });
		}
		galleryIndex++;
		return { largeIndex: galleryIndex - 1, largeSourceUrl: image.url, thumbnailSourceUrl: thumbnail.url, caption: image.alt, width: image.width, height: image.height, gapBeforePx };
	});
	const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "";
	const footerAt = html.indexOf("w-footer");
	const footerHtml = footerAt >= 0 ? html.slice(footerAt, footerAt + 10_000) : "";
	const footerLinks = [...footerHtml.matchAll(/href="([^"]+)"/g)].map(match => new URL(match[1], "https://camillemormal.com").href);
	const nextProjectUrl = footerLinks.find(url => /^https:\/\/camillemormal\.com\/[a-z]+$/.test(url) && url !== pageUrl) ?? "";
	const expectedNext = PROJECTS[(projectIndex + 1) % PROJECTS.length].id;
	if (new URL(nextProjectUrl).pathname !== `/${expectedNext}`) throw new Error(`${project.id}: footer points to ${nextProjectUrl}, expected /${expectedNext}`);
	const heroUrl = `https://camillemormal.com/static/media/d/work/${project.id}/hero.jpg?1`;
	const homeUrl = `https://camillemormal.com/static/media/d/work/${project.id}/home.jpg?1`;
	if (!sources.has(heroUrl) || !sources.has(homeUrl)) throw new Error(`${project.id}: existing home/hero source map is incomplete`);
	Object.assign(sources.get(heroUrl), { kind: "hero", projectId: project.id });
	Object.assign(sources.get(homeUrl), { kind: "home", projectId: project.id });
	projectData.push({ id: project.id, pageUrl, referenceTitle: textContent(h1), nextProjectId: expectedNext, nextProjectUrl, gallery });
}

if (!sources.has(FONT_URL)) sources.set(FONT_URL, { sourceUrl: FONT_URL, kind: "font", attribution: "Klim Type Foundry / Camille Mormal" });
else Object.assign(sources.get(FONT_URL), { sourceUrl: FONT_URL, kind: "font", attribution: "Klim Type Foundry / Camille Mormal" });
const entries = [...sources].sort(([a], [b]) => a.localeCompare(b));
let cursor = 0, completed = 0;
const workers = Array.from({ length: 10 }, async () => {
	while (cursor < entries.length) {
		const [sourceUrl, record] = entries[cursor++];
		const updated = await writeAsset(sourceUrl, record);
		sources.set(sourceUrl, updated);
		completed++;
		if (completed % 25 === 0 || completed === entries.length) console.log(`Imported ${completed}/${entries.length} source assets`);
	}
});
await Promise.all(workers);
const sortedSources = Object.fromEntries([...sources].sort(([a], [b]) => a.localeCompare(b)));
await writeFile(SOURCE_MAP_PATH, `${JSON.stringify(sortedSources, null, 2)}\n`, "utf8");
const referenceData = { snapshotDate: "2026-10-08", retrievedAt: new Date().toISOString(), scriptSha256: EXPECTED_SCRIPT_SHA256, projects: projectData };
await writeFile(SITE_DATA_PATH, `${JSON.stringify(referenceData, null, 2)}\n`, "utf8");
console.log(`Saved ${Object.keys(sortedSources).length} verified assets and ${projectData.length} ordered project records.`);
