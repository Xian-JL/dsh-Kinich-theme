import { mkdir, open, readFile, readdir, rename, stat, lstat, unlink } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { WALLPAPER_DEFAULT_PARAMETERS, WALLPAPER_HASH, WALLPAPER_MODES, WALLPAPER_SCHEMA_VERSION, WALLPAPER_SPEC_VERSION, WALLPAPER_TEMPLATES, WallpaperError, canonicalWallpaperJson, validateWallpaperManifest, validateWallpaperSnapshot, wallpaperParameters } from "../../shared/wallpaper.js";
import { inspectWallpaperAsset, MAX_WALLPAPER_ASSET_BYTES, wallpaperHash, wallpaperNormalization } from "./assets.js";
import { getKinichAccentPalette, KINICH_THEME_PRESETS } from "../../client/theme/tokens.js";

const now = () => new Date().toISOString();
const isMissing = error => error?.code === "ENOENT";
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const digestRecord = value => wallpaperHash(Buffer.from(canonicalWallpaperJson(value)));

function verifiedEnvelope(envelope) {
	if (!envelope?.state || envelope.checksum !== digestRecord(envelope.state)) throw new WallpaperError("corrupt-store", "Wallpaper state cannot be verified", 500);
	if (envelope.state.schemaVersion !== WALLPAPER_SCHEMA_VERSION) throw new WallpaperError("unsupported-schema", "Wallpaper schema needs a newer Kinich version", 409);
	return envelope.state;
}
function validateSimpleName(value, label, max = 128) {
	if (typeof value !== "string" || !value.length || value.length > max || /[\u0000-\u001f]/.test(value)) throw new WallpaperError("invalid-record", `Invalid ${label}`);
	return value;
}

/** All disk paths are derived from the active DSH Profile and validated SHA-256 ids. */
export class WallpaperStore {
	constructor({ profileDir, profileName = "", pluginVersion, builtin, fault = async () => {} }) {
		if (typeof profileDir !== "string" || !isAbsolute(profileDir)) throw new WallpaperError("profile-unavailable", "A DSH Profile storage scope is required", 503);
		this.root = join(resolve(profileDir), "kinich-wallpaper"); this.profileName = profileName; this.pluginVersion = pluginVersion;
		this.builtin = builtin; this.fault = fault; this.queue = Promise.resolve(); this.closed = false;
	}
	folder(name) {
		if (!["blobs", "bundles", "snapshots", "leases", "imports"].includes(name)) throw new WallpaperError("invalid-storage-scope", "Invalid wallpaper storage scope", 500);
		return join(this.root, name);
	}
	path(folder, hash, extension = "json") {
		if (!WALLPAPER_HASH.test(hash) || !["json", "png", "jpg", "webp", "woff2"].includes(extension)) throw new WallpaperError("invalid-asset-id");
		return join(this.folder(folder), `${hash}.${extension}`);
	}
	async prepare() {
		await mkdir(this.root, { recursive: true });
		if ((await lstat(this.root)).isSymbolicLink()) throw new WallpaperError("linked-store", "Wallpaper Profile storage cannot be redirected", 500);
		for (const name of ["blobs", "bundles", "snapshots", "leases", "imports"]) {
			await mkdir(this.folder(name), { recursive: true });
			if ((await lstat(this.folder(name))).isSymbolicLink()) throw new WallpaperError("linked-store", "Wallpaper storage cannot be redirected", 500);
		}
	}
	async writeAtomic(path, bytes) {
		const pending = `${path}.${randomUUID()}.pending`;
		const file = await open(pending, "wx", 0o600);
		try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
		try { await rename(pending, path); }
		catch (error) { await unlink(pending).catch(() => {}); throw error; }
	}
	async writeJSON(path, value) { return this.writeAtomic(path, Buffer.from(canonicalWallpaperJson(value))); }
	async readJSON(path) { try { return JSON.parse(await readFile(path, "utf8")); } catch (error) { if (isMissing(error)) throw error; throw new WallpaperError("corrupt-record", "A wallpaper storage record is invalid", 500); } }

	async locked(action) {
		const run = async () => {
			if (this.closed) throw new WallpaperError("service-closed", "Wallpaper storage is closing", 503);
			await this.prepare();
			const lockPath = join(this.root, "writer.lock"); const deadline = Date.now() + 30000;
			let handle;
			while (!handle) {
				try {
					const candidate = await open(lockPath, "wx", 0o600);
					try { await candidate.writeFile(JSON.stringify({ pid: process.pid, createdAt: Date.now() })); await candidate.sync(); }
					catch (error) { await candidate.close(); await unlink(lockPath).catch(() => {}); throw error; }
					handle = candidate;
				} catch (error) {
					if (error.code !== "EEXIST") throw error;
					let owner; try { owner = await this.readJSON(lockPath); } catch (readError) { if (!isMissing(readError) && readError.code !== "corrupt-record") throw readError; }
					let alive = true;
					if (Number.isInteger(owner?.pid) && owner.pid > 0) { try { process.kill(owner.pid, 0); } catch (probeError) { alive = probeError.code !== "ESRCH"; } }
					let abandoned=false;
					if(!owner){try{abandoned=Date.now()-(await stat(lockPath)).mtimeMs>30000;}catch(statError){if(isMissing(statError))continue;throw statError;}}
					if (!alive || abandoned) { await unlink(lockPath).catch(unlinkError => { if (!isMissing(unlinkError)) throw unlinkError; }); continue; }
					if (Date.now() >= deadline) throw new WallpaperError("profile-busy", "Wallpaper storage is busy in another Desktop process", 409);
					await delay(30);
				}
			}
			try { return await action(); }
			finally { await handle.close(); await unlink(lockPath).catch(error => { if (!isMissing(error)) throw error; }); }
		};
		const next = this.queue.then(run, run); this.queue = next.catch(() => {}); return next;
	}
	async readIndex() {
		let candidate; let indexMissing = false;
		try { candidate = await this.readJSON(join(this.root, "index.json")); }
		catch (error) { if (isMissing(error)) indexMissing = true; else if (error.code !== "corrupt-store" && error.code !== "corrupt-record") throw error; }
		if (candidate) { try { return verifiedEnvelope(candidate); } catch (error) { if (error.code === "unsupported-schema") throw error; } }
		let backup;
		try { backup = await this.readJSON(join(this.root, "index.backup.json")); }
		catch (error) { if (isMissing(error) && indexMissing) return null; if (isMissing(error)) throw new WallpaperError("corrupt-store", "Wallpaper state has no recoverable index", 500); throw error; }
		const state = verifiedEnvelope(backup); await this.verifyState(state); return state;
	}
	async verifyState(state) { if (state.active) await this.snapshot(state.active); for (const id of state.history) await this.snapshot(id); }
	async recover() {
		const journalPath = join(this.root, "journal.json"); let journal;
		try { journal = await this.readJSON(journalPath); } catch (error) { if (!isMissing(error)) throw new WallpaperError("corrupt-journal", "Wallpaper transaction needs recovery", 500); }
		if (journal) {
			const next = verifiedEnvelope(journal.next); await this.verifyState(next);
			await this.writeJSON(join(this.root, "index.json"), journal.next);
			await this.writeJSON(join(this.root, "index.backup.json"), journal.next);
			await unlink(journalPath);
		}
		try { return await this.readIndex(); } catch (error) { if (error.code === "corrupt-store" && journal) return verifiedEnvelope(journal.next); throw error; }
	}
	async commit(before, next) {
		next.revision = (before?.revision ?? -1) + 1;
		const envelope = { checksum: digestRecord(next), state: next };
		await this.fault("assets-durable");
		await this.writeJSON(join(this.root, "journal.json"), { next: envelope }); await this.fault("journal-durable");
		await this.writeJSON(join(this.root, "index.json"), envelope); await this.fault("index-durable");
		await this.writeJSON(join(this.root, "index.backup.json"), envelope); await this.fault("backup-durable");
		await unlink(join(this.root, "journal.json"));
		await this.collectGarbage(next);
		return next;
	}
	checkRevision(state, expected) { if (!Number.isSafeInteger(expected) || expected !== state.revision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409); }

	async saveAsset(input, attribution = "", sourceUrl = "", { deferMetadata = false, normalizationVersion = "final-bytes-v1" } = {}) {
		const info = inspectWallpaperAsset(input); const bytes = Buffer.from(input);
		const normalization = wallpaperNormalization(info, normalizationVersion);
		const safeAttribution = typeof attribution === "string" ? attribution.slice(0, 512) : "";
		let safeSource = ""; if (typeof sourceUrl === "string" && sourceUrl.length <= 2048) { try { const u = new URL(sourceUrl); if (["https:","http:"].includes(u.protocol) && !u.username && !u.password) safeSource = u.href; } catch {} }
		const blob = this.path("blobs", info.sha256, info.extension);
		try { const existing = await readFile(blob); if (wallpaperHash(existing) !== info.sha256) throw new WallpaperError("corrupt-asset", "Asset hash mismatch", 500); }
		catch (error) { if (!isMissing(error)) throw error; await this.writeAtomic(blob, bytes); }
		if (deferMetadata) {
			await this.writeJSON(this.path("leases", info.sha256), { assetId: info.sha256, updatedAtUtc: now() });
			return info;
		}
		try {
			const existing=await this.readJSON(this.path("blobs",info.sha256));
			if(["sha256","mediaType","extension","byteLength","width","height"].some(key=>existing[key]!==info[key]))throw new WallpaperError("corrupt-asset","Existing asset metadata is damaged",500);
			await this.writeJSON(this.path("leases",info.sha256),{assetId:info.sha256,updatedAtUtc:now()});
			return info;
		} catch(error) {if(!isMissing(error))throw error;}
		await this.writeJSON(this.path("blobs", info.sha256), { ...info, ...normalization, attribution: safeAttribution, sourceUrl: safeSource, uploadedAt: now() });
		return info;
	}
	async readAsset(id) {
		const info = await this.readJSON(this.path("blobs", id)); const bytes = await readFile(this.path("blobs", id, info.extension));
		if (wallpaperHash(bytes) !== id || bytes.length !== info.byteLength) throw new WallpaperError("corrupt-asset", "Wallpaper asset is damaged", 500);
		return { info, bytes };
	}
	async saveBundle(input) {
		const bundle = validateWallpaperManifest(input);
		if (!bundle.assetIds.includes(bundle.representativeAssetId)) throw new WallpaperError("invalid-representative");
		for (const id of [...bundle.assetIds, ...bundle.fontAssetIds]) {
			const { info } = await this.readAsset(id);
			if (bundle.fontAssetIds.includes(id) !== (info.mediaType === "font/woff2")) throw new WallpaperError("invalid-asset-role");
		}
		const id = digestRecord(bundle); await this.writeJSON(this.path("bundles", id), bundle); return id;
	}
	async readBundle(id) { let data; try { data = await this.readJSON(this.path("bundles", id)); } catch (error) { if (isMissing(error)) throw new WallpaperError("bundle-not-found", "Wallpaper package is unavailable", 404); throw error; } if (digestRecord(data) !== id) throw new WallpaperError("corrupt-bundle", "Wallpaper manifest is damaged", 500); return validateWallpaperManifest(data); }
	async saveSnapshot(record) { validateWallpaperSnapshot(record); const hash = digestRecord(record); await this.writeJSON(this.path("snapshots", hash), record); return hash; }
	async snapshot(hash) { let record; try { record = await this.readJSON(this.path("snapshots", hash)); } catch (error) { if (isMissing(error)) throw new WallpaperError("snapshot-missing", "Wallpaper history record is unavailable", 404); throw error; } if (digestRecord(record) !== hash) throw new WallpaperError("corrupt-snapshot", "Wallpaper history record is damaged", 500); return record; }
	async collectGarbage(state) {
		const liveSnapshots = new Set([state.active, ...state.history].filter(Boolean)); const liveBundles = new Set(); const liveAssets = new Set();
		let unresolvedReference=false;
		for(const name of await readdir(this.folder("leases"))){
			const id=name.endsWith(".json")?name.slice(0,-5):"";if(!WALLPAPER_HASH.test(id))continue;
			const lease=await this.readJSON(this.path("leases",id)).catch(error=>{if(!isMissing(error))unresolvedReference=true;return null;});
			if(lease?.kind==="export"){
				let alive=Number.isInteger(lease.pid)&&lease.pid>0;
				if(alive)try{process.kill(lease.pid,0);}catch(error){alive=error.code!=="ESRCH";}
				if(alive&&Array.isArray(lease.assetIds)&&lease.assetIds.every(hash=>WALLPAPER_HASH.test(hash)))for(const hash of lease.assetIds)liveAssets.add(hash);
				else await unlink(this.path("leases",id)).catch(error=>{if(!isMissing(error))throw error;});
				continue;
			}
			try {const lease=await this.readJSON(this.path("leases",id));if(lease.assetId===id&&Date.now()-Date.parse(lease.updatedAtUtc)<10*60_000)liveAssets.add(id);else await unlink(this.path("leases",id));}catch(error){if(!isMissing(error))unresolvedReference=true;}
		}
		for (const name of await readdir(this.folder("imports"))) {
			if (!name.endsWith(".json") || !WALLPAPER_HASH.test(name.slice(0, -5))) continue;
			try {
				const pending = await this.readJSON(join(this.folder("imports"), name));
				if (Date.now() - Date.parse(pending.updatedAtUtc) > 30 * 24 * 60 * 60_000) { await unlink(join(this.folder("imports"), name)); continue; }
				for (const part of Object.values(pending.parts ?? {})) {
					for (const hash of part.snapshotHashes ?? []) if (WALLPAPER_HASH.test(hash)) liveSnapshots.add(hash);
					for (const hash of part.bundleHashes ?? []) if (WALLPAPER_HASH.test(hash)) liveBundles.add(hash);
					for (const hash of part.assetHashes ?? []) if (WALLPAPER_HASH.test(hash)) liveAssets.add(hash);
				}
			} catch (error) { if (!isMissing(error)) throw error; }
		}
		for (const id of liveSnapshots) { try { const record = await this.snapshot(id); if (record.bundleHash) liveBundles.add(record.bundleHash); } catch { unresolvedReference=true; } }
		for (const id of liveBundles) { try { const bundle = await this.readBundle(id); for (const asset of [...bundle.assetIds, ...bundle.fontAssetIds]) liveAssets.add(asset); } catch { unresolvedReference=true; } }
		if(unresolvedReference)return;
		const cutoff = Date.now() - 10 * 60_000;
		for (const name of await readdir(this.folder("snapshots"))) {
			const id = name.endsWith(".json") ? name.slice(0, -5) : ""; if (!WALLPAPER_HASH.test(id) || liveSnapshots.has(id) || !name.endsWith(".json")) continue;
			try { const record = await this.snapshot(id); if (Date.parse(record.createdAtUtc) < cutoff) await unlink(this.path("snapshots", id)); } catch (error) { if (!isMissing(error)) throw error; }
		}
		for (const name of await readdir(this.folder("bundles"))) {
			const id = name.endsWith(".json") ? name.slice(0, -5) : ""; if (!WALLPAPER_HASH.test(id) || liveBundles.has(id) || !name.endsWith(".json")) continue;
			try { if ((await stat(this.path("bundles", id))).mtimeMs < cutoff) await unlink(this.path("bundles", id)); } catch (error) { if (!isMissing(error)) throw error; }
		}
		for (const name of await readdir(this.folder("blobs"))) {
			if (!name.endsWith(".json")) continue; const id = name.slice(0, -5); if (!WALLPAPER_HASH.test(id) || liveAssets.has(id)) continue;
			let info; try { info = await this.readJSON(this.path("blobs", id)); } catch (error) { if (isMissing(error)) continue; throw error; }
			if (!Number.isFinite(Date.parse(info.uploadedAt)) || Date.parse(info.uploadedAt) >= cutoff) continue;
			for (const extension of ["png", "jpg", "webp", "woff2"]) await unlink(this.path("blobs", id, extension)).catch(error => { if (!isMissing(error)) throw error; });
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
		if (!WALLPAPER_MODES.includes(data.mode) || (data.mode !== "none" && !WALLPAPER_HASH.test(data.bundleHash ?? ""))) throw new WallpaperError("invalid-mode");
		if (data.mode !== "none") validateSimpleName(data.projectId, "projectId", 80);
		const templateId = data.templateId ?? "work";
		if (!WALLPAPER_TEMPLATES.includes(templateId) || typeof (data.autoPalette ?? true) !== "boolean" || !Number.isFinite(data.viewPosition ?? 0) || (data.viewPosition ?? 0) < 0 || (data.viewPosition ?? 0) > 1) throw new WallpaperError("invalid-snapshot");
		return { schemaVersion: 1, specVersion: WALLPAPER_SPEC_VERSION, id: randomUUID(), sequence, createdAtUtc: now(), reason: data.reason ?? "apply",
			originVersion: this.pluginVersion, mode: data.mode, bundleHash: data.mode === "none" ? "" : data.bundleHash,
			parameters: wallpaperParameters(data.parameters), autoPalette: data.autoPalette ?? true, projectId: data.mode === "none" ? "" : data.projectId,
			templateId, normalizedViewPosition: data.viewPosition ?? 0, sampledAccent: data.sampledAccent ?? "", paletteCaptured: data.paletteCaptured ?? Boolean(data.sampledAccent), paletteStyleId: data.paletteStyleId ?? "jungle",
			derivedPalette: data.derivedPalette ?? Object.fromEntries(Object.keys(KINICH_THEME_PRESETS).map(style=>[style,getKinichAccentPalette(style,data.sampledAccent??"")])),
			paletteAlgorithmVersion: data.paletteAlgorithmVersion ?? "kinich-dominant-v1" };
	}
	async createIndexFromLegacy(legacy) {
		const backupPath = join(this.root,"legacy-background-backup.json");
		try { await this.readJSON(backupPath); } catch(error) { if(!isMissing(error))throw error; await this.writeJSON(backupPath,{createdAtUtc:now(),originVersion:"1.8.1",settings:legacy}); }
		let mode, bundleHash = "", parameters = { ...WALLPAPER_DEFAULT_PARAMETERS }, sampledAccent = legacy.customBackgroundAccent ?? "";
		if (legacy.customBackgroundImage) {
			const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(legacy.customBackgroundImage);
			if (!match || legacy.customBackgroundImage.length > 512 * 1024) throw new WallpaperError("legacy-image-invalid", "Existing static wallpaper data is invalid; original settings preserved", 409);
			const imageBytes = Buffer.from(match[1], "base64"); const image = await this.saveAsset(imageBytes, "既有用户静态背景", "", { normalizationVersion: "static-webp-v1" });
			sampledAccent = /^#[a-f0-9]{6}$/i.test(sampledAccent) ? sampledAccent.toLowerCase() : "";
			bundleHash = await this.saveBundle({ schemaVersion: 1, id: "legacy-static", version: "1", name: "已有静态背景", representativeAssetId: image.sha256,
				sampledAccent, projects: [{ id: "legacy", title: "自定义背景", headline: "Kinich 自定义背景", assetIds: [image.sha256], coverId: image.sha256, heroId: image.sha256 }] });
			mode = "static"; const visibility = legacy.backgroundVisibility;
			parameters.visibility = Number.isInteger(visibility) && visibility >= 0 && visibility <= 100 ? visibility : 75;
		} else {
			bundleHash = await this.putBuiltin(); const bundle = await this.readBundle(bundleHash); mode = "dynamic"; sampledAccent = bundle.sampledAccent;
		}
		const bundle = mode === "none" ? null : await this.readBundle(bundleHash);
		const snapshotId = await this.saveSnapshot(this.createSnapshot({ mode, bundleHash, projectId: bundle?.projects[0].id ?? "", parameters,
			autoPalette: legacy.backgroundAutoPalette !== false, sampledAccent, reason: legacy.customBackgroundImage ? "migration-1.8.1" : "default-v2" }, 0));
		return { schemaVersion: 1, specVersion: WALLPAPER_SPEC_VERSION, revision: 0, sequence: 0, active: snapshotId, history: [], migrations: ["1.8.1-background-v1", "asset-normalization-index-v1"] };
	}
	async ensure(legacy = {}) {
		return this.locked(async () => {
			let state = await this.recover();
			if (state) {
				if ((state.migrations ?? []).includes("asset-normalization-index-v1")) return state;
				// An explicit metadata-only migration; snapshots and blob bytes remain immutable.
				for (const name of await readdir(this.folder("blobs"))) {
					if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
					const path=join(this.folder("blobs"),name), metadata=await this.readJSON(path);
					if (!metadata.normalizationVersion) await this.writeJSON(path,{...metadata,...wallpaperNormalization(metadata,"historic-final-bytes-v1")});
				}
				const next=structuredClone(state);next.migrations=[...(next.migrations??[]),"asset-normalization-index-v1"];
				return this.commit(state,next);
			}
			const created = await this.createIndexFromLegacy(legacy);
			return this.commit(null, created);
		});
	}
	async apply(data, expectedRevision) {
		return this.locked(async () => {
			const state = await this.recover(); if (!state) throw new WallpaperError("not-initialized", "Wallpaper storage is not ready", 503);
			if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
			const old = await this.snapshot(state.active);
			let bundle;
			if (data.mode !== "none") {
				bundle = await this.readBundle(data.bundleHash);
				for (const id of [...bundle.assetIds, ...bundle.fontAssetIds]) await this.readAsset(id);
				if (!bundle.projects.some(item => item.id === data.projectId)) throw new WallpaperError("invalid-project");
			}
			const candidate = { ...data, parameters: wallpaperParameters(data.parameters), autoPalette: data.autoPalette ?? old.autoPalette };
			const same = old.mode === candidate.mode && old.bundleHash === (candidate.mode === "none" ? "" : candidate.bundleHash) &&
				old.projectId === (candidate.mode === "none" ? "" : candidate.projectId) && old.templateId === (candidate.templateId ?? "work") &&
				old.normalizedViewPosition === (candidate.viewPosition ?? 0) && old.autoPalette === candidate.autoPalette &&
				canonicalWallpaperJson(old.parameters) === canonicalWallpaperJson(candidate.parameters);
			if (same) return state;
			const next = structuredClone(state); next.sequence++; next.history.unshift(state.active);
			next.active = await this.saveSnapshot(this.createSnapshot({ ...candidate, sampledAccent: candidate.reason==="restore"?candidate.sampledAccent:candidate.bundleHash===old.bundleHash?old.sampledAccent:(bundle?.sampledAccent??""), paletteCaptured:candidate.reason==="restore"?candidate.paletteCaptured:candidate.bundleHash===old.bundleHash?old.paletteCaptured:Boolean(candidate.paletteCaptured||bundle?.sampledAccent),
				paletteAlgorithmVersion: bundle?.paletteAlgorithmVersion ?? old.paletteAlgorithmVersion }, next.sequence));
			return this.commit(state, next);
		});
	}
	async updateParameters(patch, expectedRevision) {
		const state = await this.getState(); if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
		const active = await this.snapshot(state.active);
		if (!patch || typeof patch !== "object" || Object.keys(patch).some(key => !["parameters", "autoPalette"].includes(key))) throw new WallpaperError("invalid-parameters");
		return this.apply({ ...active, parameters: { ...active.parameters, ...(patch.parameters ?? {}) }, autoPalette: patch.autoPalette ?? active.autoPalette, viewPosition: active.normalizedViewPosition, reason: "parameters" }, expectedRevision);
	}
	async restoreDefault(expectedRevision) {
		const state = await this.getState(); this.checkRevision(state, expectedRevision);
		const bundleHash = await this.putBuiltin(); const bundle = await this.readBundle(bundleHash);
		return this.apply({ mode: "dynamic", bundleHash, projectId: bundle.projects[0].id, templateId: "work", parameters: WALLPAPER_DEFAULT_PARAMETERS, autoPalette: true, reason: "restore-default" }, expectedRevision);
	}
	async capturePalette(data, expectedRevision) {
		return this.locked(async () => {
			const state = await this.recover(); if (!state) throw new WallpaperError("not-initialized", "壁纸存储尚未初始化", 503);
			this.checkRevision(state, expectedRevision);
			const active = await this.snapshot(state.active);
			if (active.mode === "none") throw new WallpaperError("palette-not-active", "当前没有可采样的壁纸", 409);
			if (active.paletteCaptured || active.sampledAccent) return state;
			if (!data || data.algorithmVersion !== "kinich-dominant-v1" || !(data.color === "" || (typeof data.color === "string" && /^#[a-f0-9]{6}$/i.test(data.color)))) throw new WallpaperError("invalid-accent");
			const bundle = await this.readBundle(active.bundleHash);
			if (data.representativeAssetId !== bundle.representativeAssetId) throw new WallpaperError("palette-image-mismatch", "强调色必须来自固定代表图");
			await this.readAsset(bundle.representativeAssetId);
			const next = structuredClone(state); next.sequence++;
			const updated = { ...active, id: randomUUID(), sequence: next.sequence, createdAtUtc: now(), reason: "palette-capture", sampledAccent: data.color.toLowerCase(), derivedPalette:Object.fromEntries(Object.keys(KINICH_THEME_PRESETS).map(style=>[style,getKinichAccentPalette(style,data.color)])), paletteCaptured: true, paletteAlgorithmVersion: data.algorithmVersion };
			next.active = await this.saveSnapshot(updated); return this.commit(state, next);
		});
	}
	async restore(id, expectedRevision) {
		const state = await this.getState(); if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
		if (!state.history.includes(id)) throw new WallpaperError("history-not-found", "History entry has been cleared", 404);
		const old = await this.snapshot(id);
		return this.apply({ ...old, viewPosition: old.normalizedViewPosition, reason: "restore" }, expectedRevision);
	}
	async clearHistory(expectedRevision) {
		return this.locked(async () => { const state = await this.recover(); if (!state) throw new WallpaperError("not-initialized", "Wallpaper storage is not ready", 503);
			if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
			const next = structuredClone(state); next.history = []; return this.commit(state, next); });
	}
	async deleteHistory(id, expectedRevision) {
		return this.locked(async () => { const state = await this.recover(); if (!state) throw new WallpaperError("not-initialized", "Wallpaper storage is not ready", 503);
			if (state.revision !== expectedRevision) throw new WallpaperError("revision-conflict", "Wallpaper changed; refresh and retry", 409);
			if (state.active === id) throw new WallpaperError("active-protected", "The active wallpaper is protected", 409);
			if (!state.history.includes(id)) throw new WallpaperError("history-not-found", "History entry has been cleared", 404);
			const next = structuredClone(state); next.history = next.history.filter(candidate => candidate !== id); return this.commit(state, next); });
	}
	/** Caller must hold the Profile lock: journal recovery also writes to disk. */
	async readStateLocked() { const state = await this.recover(); if (!state) throw new WallpaperError("not-initialized", "Wallpaper storage is not ready", 503); return state; }
	async getState() { return this.locked(() => this.readStateLocked()); }
	async current() {
		return this.locked(async () => {
		const state = await this.readStateLocked(); const active = await this.snapshot(state.active); let manifest = null, assets = {};
		if (active.bundleHash) { manifest = await this.readBundle(active.bundleHash); for (const id of [...manifest.assetIds, ...manifest.fontAssetIds]) assets[id] = await this.readAssetInfo(id); }
		return { revision: state.revision, profileName: this.profileName, activeHash: state.active, active, manifest, assets, historyCount: state.history.length };
		});
	}
	async readAssetInfo(id) { const metadata = await this.readJSON(this.path("blobs", id)); return metadata; }
	async history(cursor = 0, limit = 30) {
		return this.locked(async () => {
		const state = await this.readStateLocked(); if (!Number.isSafeInteger(cursor) || cursor < 0) throw new WallpaperError("invalid-cursor");
		const entries = [];
		for (const id of state.history.slice(cursor, cursor + Math.min(30, limit))) {
			let item, bundle;
			try { item=await this.snapshot(id); bundle=item.bundleHash?await this.readBundle(item.bundleHash):null; if(bundle)for(const asset of bundle.assetIds)await this.readAsset(asset); entries.push({...item,hash:id,name:bundle?.name??"无壁纸",representativeAssetId:bundle?.representativeAssetId??"",recoverable:true}); }
			catch(error) { entries.push({...item,hash:id,name:bundle?.name??"记录或素材缺失",representativeAssetId:bundle?.representativeAssetId??"",recoverable:false,errorCode:error.code??"record-unavailable"}); }
		}
		return { revision: state.revision, entries, total: state.history.length, nextCursor: cursor + entries.length < state.history.length ? cursor + entries.length : null };
		});
	}
	async close() { await this.queue; this.closed = true; }
}
