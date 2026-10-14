import * as react from "react";
import { readConsistentWallpaperState } from "./read-state.js";
import {
	WALLPAPER_APPLY_PATH, WALLPAPER_ASSET_PATH, WALLPAPER_BUNDLE_PATH,
	WALLPAPER_CLEAR_HISTORY_PATH, WALLPAPER_DEFAULT_PARAMETERS,
	WALLPAPER_DEFAULT_PATH, WALLPAPER_EXPORT_PATH, WALLPAPER_HISTORY_ITEM_PATH, WALLPAPER_HISTORY_PATH, WALLPAPER_IMPORT_PATH, WALLPAPER_PALETTE_PATH, WALLPAPER_STATE_PATH,
	wallpaperAssetUrl
} from "../../shared/wallpaper.js";

async function request(path, { method = "GET", body, signal } = {}) {
	let response;
	try {
		response = await fetch(path, {
			method, credentials: "same-origin", cache: "no-store", signal,
			headers: { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }) },
			...(body === undefined ? {} : { body: JSON.stringify(body) })
		});
	} catch {
		throw Object.assign(new Error("Wallpaper service is unavailable"), { code: "network-unavailable" });
	}
	let payload;
	try { if (response.headers.get("content-type")?.startsWith("application/json")) payload = await response.json(); } catch {}
	if (!response.ok) throw Object.assign(new Error(payload?.message ?? "Wallpaper request failed"), { code: payload?.error ?? "request-failed", status: response.status });
	return payload;
}

export function useKinichWallpaper({ dynamicEnabled = true } = {}) {
	const [state, setState] = react.useState({ status: "loading", error: "", renderError: "", current: null, history: [], revision: -1, total: 0 });
	const generation = react.useRef(0);
	const pageCursor = react.useRef(null);
	const historyPagePending = react.useRef(false);
	const activeScene = react.useRef("");
	const [parameterPreview, setParameterPreview] = react.useState(null);
	const [refreshKey, setRefreshKey] = react.useState(0);
	const [view, setView] = react.useState("work");
	const [page, setPage] = react.useState(0);
	const [viewPosition, setViewPosition] = react.useState(0);
	const [browsing, setBrowsing] = react.useState(false);
	const [calibration, setCalibrationState] = react.useState(false);
	const [browseAutoPlay, setBrowseAutoPlayState] = react.useState(false);
	const [renderRevision, setRenderRevision] = react.useState(0);
	(0, react.useEffect)(() => {
		if (dynamicEnabled !== false) return;
		setBrowsing(false); setCalibrationState(false); setBrowseAutoPlayState(false);
		if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kinich-wallpaper-view", { detail: { browsing: false, calibration: false, browseAutoPlay: false } }));
	}, [dynamicEnabled]);

	const reload = react.useCallback(async (signal, allHistory = false) => {
		const mine = ++generation.current;
		try {
			const { current, history: page } = await readConsistentWallpaperState(
				() => request(WALLPAPER_STATE_PATH, { signal }), () => request(WALLPAPER_HISTORY_PATH, { signal }));
			if (mine === generation.current) {
				pageCursor.current = page.nextCursor;
				setState(value => ({ ...value, status: "ready", error: "", current, history: page.entries, total: page.total, revision: current.revision }));
				const selected = current.manifest?.projects?.findIndex(project => project.id === current.active.projectId) ?? 0;
				const scene = JSON.stringify([current.active.bundleHash,current.active.projectId,current.active.templateId,current.active.normalizedViewPosition]);
				if (scene !== activeScene.current) { activeScene.current=scene; setPage(Math.max(0, selected)); setView(current.active.templateId ?? "work"); setViewPosition(current.active.normalizedViewPosition ?? 0); }
			}
			return current;
		} catch (error) {
			if (mine === generation.current && error.name !== "AbortError") setState(value => ({ ...value, status: "error", error: error.message }));
			return null;
		}
	}, []);

	(0, react.useEffect)(() => {
		const controller = new AbortController();
		void reload(controller.signal);
		return () => { generation.current++; controller.abort(); };
	}, [reload, refreshKey]);
	(0, react.useEffect)(() => {
		const refresh = () => { if (typeof window !== "undefined") void reload(undefined); };
		if (typeof window === "undefined") return;
		window.addEventListener("kinich-wallpaper-change", refresh);
		return () => window.removeEventListener("kinich-wallpaper-change", refresh);
	}, [reload]);
	(0, react.useEffect)(() => {
		if (typeof window === "undefined") return;
		const renderStatus = event => setState(value => ({ ...value, renderError: typeof event.detail?.error === "string" ? event.detail.error : "" }));
		const renderRetry = () => setRenderRevision(value => value + 1);
		const receive = event => {
			if (event.detail && Object.hasOwn(event.detail,"parameterPreview")) setParameterPreview(event.detail.parameterPreview);
			if (["work", "overview", "detail", "about"].includes(event.detail?.view)) setView(event.detail.view);
			if (Number.isSafeInteger(event.detail?.page) && event.detail.page >= 0) setPage(event.detail.page);
			if (Number.isFinite(event.detail?.viewPosition)) setViewPosition(Math.min(1, Math.max(0, event.detail.viewPosition)));
			if (typeof event.detail?.browsing === "boolean") setBrowsing(event.detail.browsing);
			if (typeof event.detail?.calibration === "boolean") setCalibrationState(event.detail.calibration);
			if (typeof event.detail?.browseAutoPlay === "boolean") setBrowseAutoPlayState(event.detail.browseAutoPlay);
		};
		window.addEventListener("kinich-wallpaper-view", receive);
		window.addEventListener("kinich-wallpaper-render-status", renderStatus);
		window.addEventListener("kinich-wallpaper-render-retry", renderRetry);
		return () => { window.removeEventListener("kinich-wallpaper-view", receive); window.removeEventListener("kinich-wallpaper-render-status", renderStatus); window.removeEventListener("kinich-wallpaper-render-retry", renderRetry); };
	}, []);
	(0, react.useEffect)(() => {
		if (state.status === "ready" && state.current?.active?.mode !== "dynamic" && browsing) {
			setBrowsing(false);
			if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kinich-wallpaper-view", { detail: { browsing: false } }));
		}
	}, [state.status, state.current?.active?.mode, browsing]);
	const changeView = react.useCallback(next => {
		if(next!==view&&typeof window!=="undefined")window.dispatchEvent(new CustomEvent("kinich-wallpaper-transition-start",{detail:{fromView:view,toView:next,fromPage:page,toPage:page,parameters:state.current?.active?.parameters}}));
		setView(next);setViewPosition(0);if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("kinich-wallpaper-view",{detail:{view:next,viewPosition:0}}));
	},[view,page,state.current?.active?.parameters]);
	const changePage = react.useCallback(next => {
		const projectCount=state.current?.manifest?.projects?.length??0,from=page,to=Number.isSafeInteger(next)&&projectCount?((next%projectCount)+projectCount)%projectCount:next;
		if(to!==page&&typeof window!=="undefined")window.dispatchEvent(new CustomEvent("kinich-wallpaper-transition-start",{detail:{fromView:view,toView:view,fromPage:page,toPage:to,direction:projectCount?(to===((page+1)%projectCount)?1:-1):Math.sign(to-page),parameters:state.current?.active?.parameters}}));
		setPage(to);setViewPosition(0);if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("kinich-wallpaper-view",{detail:{page:to,viewPosition:0}}));
	},[view,page,state.current?.active?.parameters,state.current?.manifest?.projects?.length]);
	const changeViewPosition = react.useCallback(next => { setViewPosition(next); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kinich-wallpaper-view", { detail: { viewPosition: next } })); }, []);
	const enterBrowse = react.useCallback(() => { if (dynamicEnabled === false) return; setBrowsing(true); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kinich-wallpaper-view", { detail: { browsing: true } })); }, [dynamicEnabled]);
	const previewParameters = react.useCallback(patch => { setParameterPreview(patch); if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kinich-wallpaper-view", {detail:{parameterPreview:patch}})); }, []);
	const setCalibration = react.useCallback(next => { const enabled=Boolean(next)&&dynamicEnabled!==false;setCalibrationState(enabled);if(enabled){setBrowsing(true);setBrowseAutoPlayState(false);}if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("kinich-wallpaper-view",{detail:{browsing:enabled?true:undefined,calibration:enabled,browseAutoPlay:enabled?false:undefined}})); }, [dynamicEnabled]);
	const setBrowseAutoPlay = react.useCallback(next => {const enabled=Boolean(next);setBrowseAutoPlayState(enabled);if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("kinich-wallpaper-view",{detail:{browseAutoPlay:enabled}}));}, []);
	const exitBrowse = react.useCallback(() => {
		const active = state.current?.active, projects = state.current?.manifest?.projects ?? [];
		const nextView = active?.templateId ?? "work", nextPage = Math.max(0, projects.findIndex(project => project.id === active?.projectId)), nextPosition = active?.normalizedViewPosition ?? 0;
		setBrowsing(false);setCalibrationState(false);setBrowseAutoPlayState(false);setView(nextView);setPage(nextPage);setViewPosition(nextPosition);
		if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kinich-wallpaper-view", { detail: { browsing: false, calibration: false, browseAutoPlay: false, view: nextView, page: nextPage, viewPosition: nextPosition } }));
	}, [state.current]);

	const mutate = react.useCallback(async (path, payload) => {
		if (!state.current || !Number.isSafeInteger(state.revision)) throw new Error("Wallpaper storage is not ready");
		try {
			const result = await request(path, { method: "POST", body: { ...payload, expectedRevision: state.revision } });
			await reload();
			if (typeof window !== "undefined") window.dispatchEvent(new Event("kinich-wallpaper-change"));
			return result;
		} catch(error) { if(error.code === "revision-conflict") await reload(); throw error; }
		finally { previewParameters(null); }
	}, [state.current, state.revision, reload, previewParameters]);

	const upload = react.useCallback(async (blob, normalizationVersion = "dynamic-webp-v1") => {
		const response = await fetch(WALLPAPER_ASSET_PATH, {
			method: "POST", credentials: "same-origin", cache: "no-store",
			headers: { "content-type": blob.type, "x-kinich-attribution": "User supplied local image", "x-kinich-normalization": normalizationVersion },
			body: blob
		});
		const payload = await response.json().catch(() => null);
		if (!response.ok) throw new Error(payload?.message ?? "Could not save wallpaper asset");
		return payload;
	}, []);

	const uploadBundle = react.useCallback(bundle => request(WALLPAPER_BUNDLE_PATH, { method: "POST", body: bundle }), []);
	const exportPlan = react.useCallback(async (scope = "current", hash = "") => {
		const query = new URLSearchParams({ scope, plan: "1" }); if (hash) query.set("hash", hash);
		const response = await fetch(`${WALLPAPER_EXPORT_PATH}?${query}`, { credentials: "same-origin", cache: "no-store" });
		const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.message ?? "无法规划壁纸导出"); return payload;
	}, []);
	const exportUrl = react.useCallback((scope = "current", hash = "", volume = 0, datasetId = "") => {
		const query = new URLSearchParams({ scope, volume: String(volume), datasetId }); if (hash) query.set("hash", hash);
		return `${WALLPAPER_EXPORT_PATH}?${query}`;
	}, []);
	const importArchive = react.useCallback(async file => {
		const response = await fetch(WALLPAPER_IMPORT_PATH, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/zip" }, body: file });
		const payload = await response.json().catch(() => null);
		if (!response.ok) throw new Error(payload?.message ?? "壁纸包导入失败");
		setRefreshKey(value => value + 1); if (typeof window !== "undefined") window.dispatchEvent(new Event("kinich-wallpaper-change"));
		return payload;
	}, []);
	const nextHistoryPage = react.useCallback(async () => {
		if (!Number.isSafeInteger(pageCursor.current)||historyPagePending.current) return;
		const mine=generation.current;historyPagePending.current=true;
		try {
			const page = await request(WALLPAPER_HISTORY_PATH + "?cursor=" + pageCursor.current);
			if(mine!==generation.current)return;
			if(page.revision!==state.revision){await reload();return;}
			pageCursor.current = page.nextCursor;
			setState(value => ({ ...value, history: [...new Map(value.history.concat(page.entries).map(entry=>[entry.hash,entry])).values()], total: page.total }));
		} finally {historyPagePending.current=false;}
	}, [state.revision,reload]);

	return {
		dynamicEnabled,
		renderRevision,
		retryRenderer: () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("kinich-wallpaper-render-retry")); },
		...state, retry:()=>reload(), committedCurrent:state.current, current:parameterPreview&&state.current?{...state.current,active:{...state.current.active,parameters:{...state.current.active.parameters,...parameterPreview}}}:state.current, previewParameters, upload, uploadBundle, exportPlan, exportUrl, importArchive, nextHistoryPage, view, setView: changeView, page, setPage: changePage, viewPosition, setViewPosition: changeViewPosition, enterBrowse, setCalibration, setBrowseAutoPlay, exitBrowse,
		apply: payload => mutate(WALLPAPER_APPLY_PATH, payload),
		restoreDefault: () => mutate(WALLPAPER_DEFAULT_PATH, {}),
		capturePalette: payload => mutate(WALLPAPER_PALETTE_PATH, payload),
		restore: hash => mutate(WALLPAPER_HISTORY_ITEM_PATH, { action: "restore", hash }),
		deleteHistory: hash => mutate(WALLPAPER_HISTORY_ITEM_PATH, { action: "delete", hash }),
		clearHistory: () => mutate(WALLPAPER_CLEAR_HISTORY_PATH, {}),
		browsing: browsing && dynamicEnabled !== false,
		calibration: calibration && dynamicEnabled !== false,
		browseAutoPlay: browseAutoPlay && dynamicEnabled !== false
	};
}

export function emptyWallpaperParameters() { return { ...WALLPAPER_DEFAULT_PARAMETERS }; }
export { wallpaperAssetUrl };
