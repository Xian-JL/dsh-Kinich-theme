import { WallpaperError } from "../../shared/wallpaper.js";
import { WallpaperStore } from "./store.js";
import {
	WALLPAPER_APPLY_PATH, WALLPAPER_ASSET_PATH, WALLPAPER_BUNDLE_PATH,
	WALLPAPER_CLEAR_HISTORY_PATH, WALLPAPER_DEFAULT_PATH, WALLPAPER_EXPORT_PATH, WALLPAPER_HISTORY_ITEM_PATH, WALLPAPER_HISTORY_PATH,
	WALLPAPER_IMPORT_PATH, WALLPAPER_PALETTE_PATH, WALLPAPER_STATE_PATH
} from "../../shared/wallpaper.js";
import { exportWallpaperArchive, importWallpaperArchive, MAX_WALLPAPER_ARCHIVE_BYTES } from "./archive.js";

export { WALLPAPER_STATE_PATH, WALLPAPER_ASSET_PATH, WALLPAPER_BUNDLE_PATH, WALLPAPER_APPLY_PATH, WALLPAPER_HISTORY_PATH, WALLPAPER_HISTORY_ITEM_PATH, WALLPAPER_CLEAR_HISTORY_PATH, WALLPAPER_EXPORT_PATH, WALLPAPER_IMPORT_PATH, WALLPAPER_DEFAULT_PATH, WALLPAPER_PALETTE_PATH };
export const WALLPAPER_ASSET_LIMIT = 2 * 1024 * 1024;
const PRIVATE_HEADERS = { "cache-control": "private, no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };

function json(value, status = 200) {
	return new Response(JSON.stringify(value), { status, headers: { ...PRIVATE_HEADERS, "content-type": "application/json; charset=utf-8" } });
}
function fail(error) {
	const storageErrors={ENOSPC:["disk-full","磁盘空间不足；本次操作未完成，已有壁纸和历史仍保留",507],EACCES:["storage-permission","壁纸数据目录没有写入权限",403],EPERM:["storage-permission","壁纸数据目录写入被拒绝或文件正在被占用",403],EIO:["storage-io","壁纸数据读写失败；请重试，已有历史仍保留",503]};
	if(storageErrors[error?.code]){const [code,message,status]=storageErrors[error.code];return json({error:code,message},status);}
	const known = error instanceof WallpaperError;
	return json({ error: known ? error.code : "wallpaper-unavailable", message: known ? error.message : "壁纸服务暂不可用" }, known ? error.status : 500);
}
async function jsonBody(request, limit = 1024 * 1024) {
	const declared = Number(request.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > limit) throw new WallpaperError("request-too-large", "请求超过大小限制", 413);
	const bytes = Buffer.from(await request.arrayBuffer());
	if (bytes.length > limit) throw new WallpaperError("request-too-large", "请求超过大小限制", 413);
	try { const value = JSON.parse(bytes.toString("utf8")); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); return value; }
	catch { throw new WallpaperError("invalid-request", "壁纸请求格式无效"); }
}
async function assetBody(request) {
	const header = request.headers.get("content-length"), length = header === null ? null : Number(header);
	if (length !== null && (!/^\d+$/.test(header) || !Number.isSafeInteger(length) || length < 24 || length > WALLPAPER_ASSET_LIMIT)) throw new WallpaperError("asset-size", "素材必须小于 2 MiB", 413);
	if (!request.body) throw new WallpaperError("asset-size", "素材为空", 400);
	const reader=request.body.getReader(),chunks=[];let size=0;
	try { for (;;) {const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>WALLPAPER_ASSET_LIMIT){await reader.cancel().catch(()=>{});throw new WallpaperError("asset-size","素材必须小于 2 MiB",413);}chunks.push(Buffer.from(value));} }
	finally {reader.releaseLock();}
	if (size < 24 || length !== null && size !== length) throw new WallpaperError("asset-size", "素材长度不匹配", 400);
	return Buffer.concat(chunks,size);
}

/** Register authenticated, exact-path routes on the current DSH Profile's Host. */
export function installWallpaperRoutes(ctx, { pluginVersion, builtin, legacy = {} } = {}) {
	const connection = ctx.get("connection"); const profile = ctx.get("profileContext");
	if (!connection?.fetch?.register || !profile?.dir) return () => {};
	let closed = false; const store = new WallpaperStore({ profileDir: profile.dir, profileName: typeof profile.name === "string" ? profile.name : "", pluginVersion, builtin });
	let ready;
	const ensureReady = () => ready ??= store.ensure(legacy);
	const route = (path, methods, callback, requestBody = "buffered") => connection.fetch.register({ path, methods, requestBody, fetch: request =>
		Promise.resolve().then(async () => { if (closed) throw new WallpaperError("service-closed", "壁纸服务已关闭", 503); await ensureReady(); return callback(request); }).catch(fail) });
	const dispose = [
		route(WALLPAPER_STATE_PATH, ["GET"], async () => json(await store.current())),
		route(WALLPAPER_ASSET_PATH, ["GET", "POST"], async request => {
			if (request.method === "POST") return json(await store.saveAsset(await assetBody(request), request.headers.get("x-kinich-attribution") ?? "", request.headers.get("x-kinich-source") ?? "", { normalizationVersion: request.headers.get("x-kinich-normalization") ?? "final-bytes-v1" }), 201);
			const { info, bytes } = await store.readAsset(new URL(request.url).searchParams.get("id") ?? "");
			return new Response(bytes, { status: 200, headers: { ...PRIVATE_HEADERS, "content-type": info.mediaType, "content-length": String(bytes.length), etag: `"${info.sha256}"` } });
		}),
		route(WALLPAPER_BUNDLE_PATH, ["GET", "POST"], async request => request.method === "POST"
			? json({ bundleHash: await store.saveBundle(await jsonBody(request)) }, 201)
			: json(await store.readBundle(new URL(request.url).searchParams.get("id") ?? ""))),
		route(WALLPAPER_APPLY_PATH, ["POST"], async request => {
			const data = await jsonBody(request, 64 * 1024);
			if (!Number.isSafeInteger(data.expectedRevision)) throw new WallpaperError("invalid-revision");
			return json(await store.apply(data, data.expectedRevision));
		}),
		route(WALLPAPER_HISTORY_PATH, ["GET"], async request => {
			const query = new URL(request.url).searchParams; return json(await store.history(Number(query.get("cursor") ?? 0), 30));
		}),
		route(WALLPAPER_HISTORY_ITEM_PATH, ["POST"], async request => {
			const data = await jsonBody(request, 4096);
			if (!Number.isSafeInteger(data.expectedRevision)) throw new WallpaperError("invalid-revision");
			if (data.action === "restore") return json(await store.restore(data.hash, data.expectedRevision));
			if (data.action === "delete") return json(await store.deleteHistory(data.hash, data.expectedRevision));
			throw new WallpaperError("invalid-history-action");
		}),
		route(WALLPAPER_CLEAR_HISTORY_PATH, ["POST"], async request => {
			const data = await jsonBody(request, 4096); return json(await store.clearHistory(data.expectedRevision));
		}),
		route(WALLPAPER_EXPORT_PATH, ["GET"], async request => {
			const query = new URL(request.url).searchParams; const args = { scope: query.get("scope") ?? "current", historyHash: query.get("hash") ?? "" };
			if (query.get("plan") === "1") return json(await exportWallpaperArchive(store, { ...args, planOnly: true }));
			const bytes = await exportWallpaperArchive(store, { ...args, volumeIndex: Number(query.get("volume") ?? 0), expectedDatasetId: query.get("datasetId") ?? "" });
			const volume = Number(query.get("volume") ?? 0) + 1;
			const dataset = query.get("datasetId") ?? "";
			const filename = `kinich-wallpaper-${args.scope}-${/^[a-f0-9]{64}$/.test(dataset) ? dataset.slice(0, 16) : "backup"}-part-${volume}.kinich-wallpaper.zip`;
			return new Response(bytes, { status: 200, headers: { ...PRIVATE_HEADERS, "content-type": "application/zip", "content-disposition": `attachment; filename="${filename}"` } });
		}),
		route(WALLPAPER_IMPORT_PATH, ["POST"], async request => {
			const header = request.headers.get("content-length"), declared = header === null ? null : Number(header);
			if (declared !== null && (!/^\d+$/.test(header) || !Number.isSafeInteger(declared) || declared < 22 || declared > MAX_WALLPAPER_ARCHIVE_BYTES)) throw new WallpaperError("archive-size", "壁纸包必须小于 256 MiB", 413);
			const result = await importWallpaperArchive(store, request.body);
			return json(result);
		}, "streamed"),
		route(WALLPAPER_DEFAULT_PATH, ["POST"], async request => { const data = await jsonBody(request, 4096); return json(await store.restoreDefault(data.expectedRevision)); }),
		route(WALLPAPER_PALETTE_PATH, ["POST"], async request => { const data = await jsonBody(request, 4096); return json(await store.capturePalette(data, data.expectedRevision)); })
	];
	return async () => { closed = true; for (const unregister of dispose.reverse()) if (typeof unregister === "function") await unregister(); await store.close(); };
}

export { fail as wallpaperRouteFailure };
