import { strToU8, Unzip, UnzipInflate, Zip, ZipPassThrough } from "fflate";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { canonicalWallpaperJson, WALLPAPER_HASH, WALLPAPER_SCHEMA_VERSION, WALLPAPER_SPEC_VERSION, WallpaperError, validateWallpaperManifest, validateWallpaperSnapshot, wallpaperParameters } from "../../shared/wallpaper.js";
import { inspectWallpaperAsset, wallpaperHash } from "./assets.js";

export const MAX_WALLPAPER_ARCHIVE_BYTES = 256 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 1025;
const digest = value => wallpaperHash(Buffer.from(canonicalWallpaperJson(value)));
function parseArchiveJson(bytes, code) { try { return JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { throw new WallpaperError(code, "壁纸包中的 JSON 记录无效"); } }

function entryLimit(name) { return name === "manifest.json" ? 16 * 1024 * 1024 : name.startsWith("blobs/") && !name.endsWith(".json") ? 2 * 1024 * 1024 : name.startsWith("records/bundles/") ? 4 * 1024 * 1024 : name.startsWith("records/snapshots/") ? 64 * 1024 : 16 * 1024; }
async function readArchiveEntries(store, input) {
	const entries = Object.create(null), seen = new Set(); let count = 0, compressed = 0, expanded = 0, issue; let pendingAssets = [];
	const unzipper = new Unzip(file => {
		count++;
		if (count > MAX_ARCHIVE_ENTRIES) { issue = "archive-too-many-files"; return; }
		if (file.name.endsWith("/")) { if (file.name.split("/").includes("..")) issue = "archive-path"; return; }
		if (!/^(?:manifest\.json|records\/(?:snapshots|bundles)\/[a-f0-9]{64}\.json|blobs\/[a-f0-9]{64}\.(?:png|jpg|webp|woff2|json))$/.test(file.name)) { issue = "archive-path"; return; }
		if (seen.has(file.name)) { issue = "archive-duplicate-path"; return; }
		seen.add(file.name);
		if (Number.isSafeInteger(file.originalSize) && file.originalSize > entryLimit(file.name)) { issue = "archive-entry-size"; return; }
		const chunks = []; let size = 0;
		file.ondata = (error, chunk, final) => {
			if (error) { issue = "archive-invalid"; return; }
			size += chunk.length; expanded += chunk.length;
			if (size > entryLimit(file.name) || expanded > MAX_WALLPAPER_ARCHIVE_BYTES) { issue = "archive-expanded-size"; file.terminate(); return; }
			chunks.push(Buffer.from(chunk));
			if (final) {
				const data = Buffer.concat(chunks, size); const assetPath = /^blobs\/([a-f0-9]{64})\.(png|jpg|webp|woff2)$/.exec(file.name);
				if (assetPath) {
					try { const info = inspectWallpaperAsset(data); if (info.sha256 !== assetPath[1] || info.extension !== assetPath[2]) { issue = "archive-asset-hash"; return; } }
					catch { issue = "archive-asset-invalid"; return; }
					pendingAssets.push(store.saveAsset(data, "", "", { deferMetadata: true })); entries[file.name] = true;
				} else entries[file.name] = data;
			}
		};
		try { file.start(); } catch { issue = "archive-method"; }
	});
	unzipper.register(UnzipInflate);
	const feed = async chunk => {
		compressed += chunk.length; if (compressed > MAX_WALLPAPER_ARCHIVE_BYTES) throw new WallpaperError("archive-size", "壁纸包必须小于 256 MiB", 413);
		try { unzipper.push(chunk); } catch { throw new WallpaperError("archive-invalid", "壁纸 ZIP 数据损坏或无法解压"); }
		if (issue) throw new WallpaperError(issue, "壁纸包包含超限、重复或不允许的路径");
		if (pendingAssets.length) { const writes = pendingAssets; pendingAssets = []; await Promise.all(writes); }
	};
	try {
		if (input instanceof Uint8Array || Buffer.isBuffer(input)) {
			if (input.length < 22) throw new WallpaperError("archive-size", "壁纸 ZIP 数据不完整");
			for (let offset = 0; offset < input.length; offset += 64 * 1024) await feed(input.subarray(offset, Math.min(input.length, offset + 64 * 1024)));
		} else if (input?.getReader) {
			const reader = input.getReader();
			for (;;) { const { value, done } = await reader.read(); if (done) break; for (let offset = 0; offset < value.length; offset += 64 * 1024) await feed(value.subarray(offset, Math.min(value.length, offset + 64 * 1024))); }
			if (compressed < 22) throw new WallpaperError("archive-size", "壁纸 ZIP 数据不完整");
		} else throw new WallpaperError("archive-invalid", "壁纸包输入流不可用");
		unzipper.push(new Uint8Array(0), true); if (pendingAssets.length) await Promise.all(pendingAssets);
	} catch (error) { if (error instanceof WallpaperError) throw error; throw new WallpaperError("archive-invalid", "壁纸 ZIP 数据损坏或无法解压"); }
	if (issue) throw new WallpaperError(issue, "壁纸包包含超限、重复或不允许的路径");
	return entries;
}

export async function exportWallpaperArchive(store, { scope = "current", historyHash = "", volumeIndex = 0, expectedDatasetId = "", planOnly = false } = {}) {
	if (!["current", "history", "all"].includes(scope)) throw new WallpaperError("invalid-export-scope");
	const state = await store.getState(); const currentId = state.active;
	if (scope === "history" && (!WALLPAPER_HASH.test(historyHash) || !state.history.includes(historyHash))) throw new WallpaperError("history-not-found", "历史记录不存在", 404);
	const snapshotIds = scope === "current" ? [currentId] : scope === "history" ? [historyHash] : [currentId, ...state.history];
	const snapshots = [], bundles = new Map(), assets = new Map();
	for (const id of snapshotIds) {
		const snapshot = await store.snapshot(id);
		let bundle = null;
		if (snapshot.bundleHash) {
			if (!bundles.has(snapshot.bundleHash)) bundles.set(snapshot.bundleHash, await store.readBundle(snapshot.bundleHash));
			bundle = bundles.get(snapshot.bundleHash);
			for (const assetId of [...bundle.assetIds, ...bundle.fontAssetIds]) if (!assets.has(assetId)) assets.set(assetId, await store.readAssetInfo(assetId));
		}
		snapshots.push({ hash: id, bytes: Buffer.byteLength(canonicalWallpaperJson(snapshot)), bundleHash: snapshot.bundleHash ?? "", assetHashes: bundle ? [...new Set([...bundle.assetIds, ...bundle.fontAssetIds])] : [] });
	}
	const datasetId = digest({ currentId, snapshotIds });
	if (expectedDatasetId && expectedDatasetId !== datasetId) throw new WallpaperError("archive-state-changed", "壁纸历史在导出期间发生变化，请重新生成分卷清单", 409);
	const groups = []; let group = null; const oversizedBundleRecordGroups = new Map(), oversizedBundleAssets = new Set();
	const freshGroup = () => ({ snapshotHashes: [], bundleHashes: new Set(), assetHashes: new Set(), bytes: 0, entries: 1 });
	for (const snapshot of snapshots) {
		const bundle = snapshot.bundleHash ? bundles.get(snapshot.bundleHash) : null;
		let singleBytes = snapshot.bytes + (bundle ? Buffer.byteLength(canonicalWallpaperJson(bundle)) : 0);
		const singleAssets = new Set(snapshot.assetHashes);
		for (const hash of singleAssets) { const info = assets.get(hash); singleBytes += info.byteLength + Buffer.byteLength(canonicalWallpaperJson(info)); }
		if (singleBytes > MAX_WALLPAPER_ARCHIVE_BYTES - 16 * 1024 * 1024 || singleAssets.size > 256 || 4 + singleAssets.size * 2 > MAX_ARCHIVE_ENTRIES) {
			if (!bundle || !singleAssets.size) throw new WallpaperError("archive-item-needs-volumes", "单条快照超过可安全分卷的上限", 413);
			if (group?.snapshotHashes.length || group?.assetHashes.size) { groups.push(group); group = null; }
			const existingRecordGroup = oversizedBundleRecordGroups.get(snapshot.bundleHash);
			if (existingRecordGroup) {
				if (existingRecordGroup.entries < MAX_ARCHIVE_ENTRIES) { existingRecordGroup.snapshotHashes.push(snapshot.hash); existingRecordGroup.bytes += snapshot.bytes; existingRecordGroup.entries++; }
				else { const recordGroup = freshGroup(); recordGroup.snapshotHashes.push(snapshot.hash); recordGroup.bytes = snapshot.bytes; recordGroup.entries++; groups.push(recordGroup); }
				continue;
			}
			let assetGroup = freshGroup();
			for (const hash of singleAssets) {
				if (oversizedBundleAssets.has(hash)) continue;
				const info = assets.get(hash), cost = info.byteLength + Buffer.byteLength(canonicalWallpaperJson(info));
				if (assetGroup.assetHashes.size && (assetGroup.assetHashes.size >= 256 || assetGroup.bytes + cost > MAX_WALLPAPER_ARCHIVE_BYTES - 16 * 1024 * 1024 || assetGroup.entries + 2 > MAX_ARCHIVE_ENTRIES)) { groups.push(assetGroup); assetGroup = freshGroup(); }
				assetGroup.assetHashes.add(hash); assetGroup.bytes += cost; assetGroup.entries += 2; oversizedBundleAssets.add(hash);
			}
			if (assetGroup.assetHashes.size) groups.push(assetGroup);
			const recordGroup = freshGroup(); recordGroup.snapshotHashes.push(snapshot.hash); recordGroup.bundleHashes.add(snapshot.bundleHash); recordGroup.bytes = snapshot.bytes + Buffer.byteLength(canonicalWallpaperJson(bundle)); recordGroup.entries += 2; groups.push(recordGroup);
			oversizedBundleRecordGroups.set(snapshot.bundleHash, recordGroup);
			continue;
		}
		if (!group) group = freshGroup();
		const extraBundle = snapshot.bundleHash && !group.bundleHashes.has(snapshot.bundleHash) ? Buffer.byteLength(canonicalWallpaperJson(bundle)) : 0;
		let extra = snapshot.bytes + extraBundle; let extraEntries = 1 + (extraBundle ? 1 : 0);
		for (const hash of singleAssets) if (!group.assetHashes.has(hash)) { const info = assets.get(hash); extra += info.byteLength + Buffer.byteLength(canonicalWallpaperJson(info)); extraEntries += 2; }
		if (group.snapshotHashes.length && (group.bytes + extra > MAX_WALLPAPER_ARCHIVE_BYTES - 16 * 1024 * 1024 || group.entries + extraEntries > MAX_ARCHIVE_ENTRIES || group.assetHashes.size + [...singleAssets].filter(hash => !group.assetHashes.has(hash)).length > 256)) {
			groups.push(group); group = freshGroup();
			extra = snapshot.bytes + (bundle ? Buffer.byteLength(canonicalWallpaperJson(bundle)) : 0); extraEntries = 1 + (bundle ? 1 : 0);
			for (const hash of singleAssets) { const info = assets.get(hash); extra += info.byteLength + Buffer.byteLength(canonicalWallpaperJson(info)); extraEntries += 2; }
		}
		group.snapshotHashes.push(snapshot.hash); group.bytes += extra; group.entries += extraEntries;
		if (snapshot.bundleHash) group.bundleHashes.add(snapshot.bundleHash);
		for (const hash of singleAssets) group.assetHashes.add(hash);
	}
	if (group?.snapshotHashes.length) groups.push(group);
	const datasetCounts = { snapshots: snapshots.length, bundles: bundles.size, assets: assets.size };
	const volumePlan = groups.map((item, index) => ({ index, snapshotCount: item.snapshotHashes.length, bundleCount: item.bundleHashes.size, assetCount: item.assetHashes.size, estimatedBytes: item.bytes }));
	if (planOnly) return { formatVersion: 1, datasetId, scope, counts: datasetCounts, volumes: volumePlan };
	if (!Number.isSafeInteger(volumeIndex) || volumeIndex < 0 || volumeIndex >= groups.length) throw new WallpaperError("archive-volume-not-found", "壁纸分卷不存在", 404);
	const selected = groups[volumeIndex]; const selectedBundles = [...selected.bundleHashes]; const selectedAssets = [...selected.assetHashes];
	const manifest = { formatVersion: 1, schemaVersion: WALLPAPER_SCHEMA_VERSION, specVersion: WALLPAPER_SPEC_VERSION, scope, datasetId, exportedAtUtc: new Date().toISOString(), currentSnapshotHash: currentId,
		volume: { index: volumeIndex, count: groups.length }, datasetCounts,
		counts: { snapshots: selected.snapshotHashes.length, bundles: selectedBundles.length, assets: selectedAssets.length }, snapshotHashes: selected.snapshotHashes, bundleHashes: selectedBundles, assetHashes: selectedAssets };
	if (Buffer.byteLength(canonicalWallpaperJson(manifest)) > 16 * 1024 * 1024) throw new WallpaperError("archive-manifest-size", "该分卷清单超过 16 MiB", 413);
	return new ReadableStream({ start(controller) {
		const zip = new Zip((error, chunk, final) => { if (error) { controller.error(error); return; } controller.enqueue(chunk); if (final) controller.close(); });
		const waitForDrain = async () => { while (controller.desiredSize <= 0) await new Promise(resolve => setTimeout(resolve, 0)); };
		const add = async (name, getBytes) => {
			const entry = new ZipPassThrough(name); zip.add(entry); const bytes = await getBytes();
			for (let offset = 0; offset < bytes.length; offset += 64 * 1024) { const end = Math.min(bytes.length, offset + 64 * 1024); entry.push(bytes.subarray(offset, end), end === bytes.length); await waitForDrain(); }
		};
		void (async () => {
			try {
				await add("manifest.json", async () => strToU8(canonicalWallpaperJson(manifest)));
				for (const hash of selected.snapshotHashes) await add(`records/snapshots/${hash}.json`, async () => strToU8(canonicalWallpaperJson(await store.snapshot(hash))));
				for (const hash of selectedBundles) await add(`records/bundles/${hash}.json`, async () => strToU8(canonicalWallpaperJson(await store.readBundle(hash))));
				for (const hash of selectedAssets) { const info=assets.get(hash);
					await add(`blobs/${hash}.json`, async () => strToU8(canonicalWallpaperJson(info)));
					await add(`blobs/${hash}.${info.extension}`, async () => { const file = await store.readAsset(hash); if (file.info.sha256 !== hash) throw new WallpaperError("archive-asset-hash"); return new Uint8Array(file.bytes); });
				}
				zip.end();
			} catch (error) { controller.error(error); }
		})();
	} });
}

export async function importWallpaperArchive(store, input) {
	const startingRevision = (await store.getState()).revision;
	const files = await readArchiveEntries(store, input);
	const manifest = parseArchiveJson(files["manifest.json"] ?? [], "archive-manifest");
	const multiVolume = Number.isSafeInteger(manifest?.volume?.count) && manifest.volume.count > 1;
	if (manifest?.formatVersion !== 1 || manifest.schemaVersion !== WALLPAPER_SCHEMA_VERSION || !["current", "history", "all"].includes(manifest.scope) || typeof manifest.datasetId !== "string" || !WALLPAPER_HASH.test(manifest.datasetId) || !Array.isArray(manifest.snapshotHashes) || !Array.isArray(manifest.bundleHashes) || !Array.isArray(manifest.assetHashes) || manifest.snapshotHashes.length > 100_000 || manifest.bundleHashes.length > 100_000 || manifest.assetHashes.length > 256) throw new WallpaperError("archive-version", "壁纸包版本或清单不受支持", 409);
	if (manifest.volume && (!Number.isSafeInteger(manifest.volume.index) || !Number.isSafeInteger(manifest.volume.count) || manifest.volume.index < 0 || manifest.volume.index >= manifest.volume.count || manifest.volume.count < 1 || !manifest.datasetCounts || !Number.isSafeInteger(manifest.datasetCounts.snapshots) || manifest.datasetCounts.snapshots < manifest.snapshotHashes.length || !Number.isSafeInteger(manifest.datasetCounts.bundles) || manifest.datasetCounts.bundles < manifest.bundleHashes.length || !Number.isSafeInteger(manifest.datasetCounts.assets) || manifest.datasetCounts.assets < manifest.assetHashes.length)) throw new WallpaperError("archive-volume-manifest", "分卷索引无效");
	if (new Set(manifest.snapshotHashes).size !== manifest.snapshotHashes.length || new Set(manifest.bundleHashes).size !== manifest.bundleHashes.length || new Set(manifest.assetHashes).size !== manifest.assetHashes.length) throw new WallpaperError("archive-manifest", "壁纸包清单含重复内容哈希");
	const declaredPaths = new Set(["manifest.json"]);
	for (const hash of manifest.snapshotHashes) { if (!WALLPAPER_HASH.test(hash)) throw new WallpaperError("archive-manifest"); declaredPaths.add(`records/snapshots/${hash}.json`); }
	for (const hash of manifest.bundleHashes) { if (!WALLPAPER_HASH.test(hash)) throw new WallpaperError("archive-manifest"); declaredPaths.add(`records/bundles/${hash}.json`); }
	const incomingAssets = new Map();
	for (const hash of manifest.assetHashes) {
		if (!WALLPAPER_HASH.test(hash)) throw new WallpaperError("archive-manifest");
		const metadataPath = `blobs/${hash}.json`; const metadata = files[metadataPath];
		if (!metadata) throw new WallpaperError("archive-asset-missing", "壁纸包素材清单不完整");
		const info = parseArchiveJson(metadata, "archive-asset-metadata"); const dataPath = `blobs/${hash}.${info.extension}`; const data = files[dataPath];
		if (!data) throw new WallpaperError("archive-asset-missing", "壁纸包缺少图像或字体");
		const bytes = await readFile(store.path("blobs", hash, info.extension)); const inspected = inspectWallpaperAsset(bytes);
		if (inspected.sha256 !== hash || inspected.mediaType !== info.mediaType || inspected.extension !== info.extension || info.byteLength !== bytes.length) throw new WallpaperError("archive-asset-hash", "壁纸包素材哈希、类型或长度不匹配");
		await store.saveAsset(bytes, info.attribution ?? "导入的 Kinich 壁纸", info.sourceUrl ?? "", { normalizationVersion: info.normalizationVersion ?? "final-bytes-v1" });
		incomingAssets.set(hash, { info }); declaredPaths.add(metadataPath); declaredPaths.add(dataPath);
	}
	if (Object.keys(files).some(path => !declaredPaths.has(path)) || [...declaredPaths].some(path => !files[path])) throw new WallpaperError("archive-path", "壁纸包包含未清单声明或缺失的文件");
	const bundles = new Map();
	for (const hash of manifest.bundleHashes) {
		const inputBundle = parseArchiveJson(files[`records/bundles/${hash}.json`], "archive-bundle");
		const item = validateWallpaperManifest(inputBundle); if (digest(item) !== hash) throw new WallpaperError("archive-bundle-hash", "动态包清单哈希不匹配");
		if (multiVolume) await store.writeJSON(store.path("bundles", hash), item);
		else { const saved = await store.saveBundle(item); if (saved !== hash) throw new WallpaperError("archive-bundle-hash", "动态包清单哈希不匹配"); }
		bundles.set(hash, item);
	}
	const referencedAssets = new Set([...bundles.values()].flatMap(bundle => [...bundle.assetIds, ...bundle.fontAssetIds]));
	if (!multiVolume && (referencedAssets.size !== incomingAssets.size || [...referencedAssets].some(hash => !incomingAssets.has(hash)))) throw new WallpaperError("archive-asset-reference", "壁纸包含有未引用素材或缺少被引用素材");
	const snapshots = new Map();
	for (const hash of manifest.snapshotHashes) {
		const item = parseArchiveJson(files[`records/snapshots/${hash}.json`], "archive-snapshot");
		if (digest(item) !== hash || item.schemaVersion !== WALLPAPER_SCHEMA_VERSION || !["none", "static", "dynamic"].includes(item.mode) || (item.mode === "none" ? Boolean(item.bundleHash) : !WALLPAPER_HASH.test(item.bundleHash ?? "")) || typeof item.autoPalette !== "boolean" || !Number.isSafeInteger(item.sequence) || item.sequence < 0 || !Number.isFinite(Date.parse(item.createdAtUtc)) || !["work", "overview", "detail", "about"].includes(item.templateId) || !Number.isFinite(item.normalizedViewPosition) || item.normalizedViewPosition < 0 || item.normalizedViewPosition > 1) throw new WallpaperError("archive-snapshot-hash", "快照校验失败");
		validateWallpaperSnapshot(item);const parameters = wallpaperParameters(item.parameters);
		if (item.mode !== "none") {
			const bundle = bundles.get(item.bundleHash);
			if ((!bundle && !multiVolume) || (bundle && !bundle.projects.some(project => project.id === item.projectId))) throw new WallpaperError("archive-snapshot-reference", "快照引用了缺失动态包或项目");
		}
		const normalized = { ...item, parameters }; if (await store.saveSnapshot(normalized) !== hash) throw new WallpaperError("archive-snapshot-hash"); snapshots.set(hash, normalized);
	}
	if (manifest.counts?.snapshots !== snapshots.size || manifest.counts?.bundles !== bundles.size || manifest.counts?.assets !== incomingAssets.size) throw new WallpaperError("archive-count-mismatch");
	if (manifest.currentSnapshotHash && !WALLPAPER_HASH.test(manifest.currentSnapshotHash)) throw new WallpaperError("archive-manifest");
	const commitImportedSnapshots = async (hashes, markerPath = "") => store.locked(async () => {
		const current = await store.recover(); if (!current) throw new WallpaperError("not-initialized", "壁纸存储尚未初始化", 503);
		store.checkRevision(current, startingRevision);
		const next = structuredClone(current); const present = new Set([current.active, ...current.history]);
		for (const hash of hashes) if (hash !== current.active && !present.has(hash)) { next.history.push(hash); present.add(hash); }
		let imported = next.history.length - current.history.length;
		if (imported) await store.commit(current, next);
		if (markerPath) await unlink(markerPath).catch(error => { if (error.code !== "ENOENT") throw error; });
		return { imported, currentPreserved: true, revision: imported ? next.revision : current.revision };
	});
	if (manifest.volume?.count > 1) {
		const markerPath = join(store.folder("imports"), `${manifest.datasetId}.json`); const partIndex = String(manifest.volume.index);
		return store.locked(async () => {
			const current = await store.recover(); if (!current) throw new WallpaperError("not-initialized", "壁纸存储尚未初始化", 503);
			store.checkRevision(current, startingRevision);
			let marker = { datasetId: manifest.datasetId, volumeCount: manifest.volume.count, datasetCounts: manifest.datasetCounts, startedRevision:startingRevision, updatedAtUtc: new Date().toISOString(), parts: {} };
			try { marker = await store.readJSON(markerPath); }
			catch (error) { if (error.code !== "ENOENT") throw error; }
			if(marker.startedRevision!==undefined)store.checkRevision(current,marker.startedRevision);
			if (marker.datasetId !== manifest.datasetId || marker.volumeCount !== manifest.volume.count || canonicalWallpaperJson(marker.datasetCounts) !== canonicalWallpaperJson(manifest.datasetCounts)) throw new WallpaperError("archive-volume-conflict", "分卷与已暂存数据集不匹配", 409);
			const part = { snapshotHashes: manifest.snapshotHashes, bundleHashes: manifest.bundleHashes, assetHashes: manifest.assetHashes };
			if (marker.parts[partIndex] && canonicalWallpaperJson(marker.parts[partIndex]) !== canonicalWallpaperJson(part)) throw new WallpaperError("archive-volume-conflict", "同一分卷编号对应不同内容", 409);
			marker.parts[partIndex] = part; marker.updatedAtUtc = new Date().toISOString(); await store.writeJSON(markerPath, marker);
			const received = Object.keys(marker.parts).map(Number).sort((a,b)=>a-b);
			if (received.length < marker.volumeCount) return { imported: 0, currentPreserved: true, staged: true, received: received.length, total: marker.volumeCount, datasetId: marker.datasetId, revision: current.revision };
			const snapshotHashes = new Set(), bundleHashes = new Set(), assetHashes = new Set();
			for (const item of Object.values(marker.parts)) { for (const hash of item.snapshotHashes) snapshotHashes.add(hash); for (const hash of item.bundleHashes) bundleHashes.add(hash); for (const hash of item.assetHashes) assetHashes.add(hash); }
			if (snapshotHashes.size !== marker.datasetCounts.snapshots || bundleHashes.size !== marker.datasetCounts.bundles || assetHashes.size !== marker.datasetCounts.assets) throw new WallpaperError("archive-volume-incomplete", "分卷总索引与收到的内容数量不符", 400);
			const allAssets = new Set();
			for (const hash of bundleHashes) {
				const bundle = await store.readBundle(hash);
				if(await store.saveBundle(bundle)!==hash)throw new WallpaperError("archive-bundle-hash","分卷包清单哈希不匹配");
				for (const assetHash of [...bundle.assetIds, ...bundle.fontAssetIds]) { await store.readAsset(assetHash); allAssets.add(assetHash); }
			}
			if (allAssets.size !== assetHashes.size || [...allAssets].some(hash => !assetHashes.has(hash))) throw new WallpaperError("archive-volume-incomplete", "分卷缺少动态包引用素材", 400);
			for (const hash of snapshotHashes) {
				const snapshot = await store.snapshot(hash);
				if (snapshot.mode !== "none") { if (!bundleHashes.has(snapshot.bundleHash)) throw new WallpaperError("archive-snapshot-reference", "分卷缺少快照引用的动态包"); const bundle = await store.readBundle(snapshot.bundleHash); if (!bundle.projects.some(project => project.id === snapshot.projectId)) throw new WallpaperError("archive-snapshot-reference", "分卷快照引用项目无效"); }
			}
			const next = structuredClone(current); const present = new Set([current.active, ...current.history]);
			for (const hash of snapshotHashes) if (hash !== current.active && !present.has(hash)) { next.history.push(hash); present.add(hash); }
			const imported = next.history.length - current.history.length; if (imported) await store.commit(current, next);
			await unlink(markerPath); return { imported, currentPreserved: true, staged: false, received: received.length, total: marker.volumeCount, datasetId: marker.datasetId, revision: imported ? next.revision : current.revision };
		});
	}
	return commitImportedSnapshots(snapshots.keys());
}
