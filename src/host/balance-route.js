import { createHash } from "node:crypto";

const BALANCE_PATH = "/api/kinich-balance";
const OFFICIAL_HOST = "api.deepseek.com";
const CACHE_TTL_MS = 60_000;
const MANUAL_REFRESH_FLOOR_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;

let cached;
let inFlight;
let generation = 0;

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
		checkedAt: new Date().toISOString(),
		stale: sameBinding,
		...(sameBinding ? {
			bindingId: previous.bindingId,
			generation: previous.generation,
			currency: previous.currency,
			totalBalance: previous.totalBalance,
			grantedBalance: previous.grantedBalance,
			toppedUpBalance: previous.toppedUpBalance,
			isAvailable: previous.isAvailable
		} : {}),
		...extra
	};
}

function parseRetryAt(header) {
	if (header === null) return Date.now() + 60_000;
	const seconds = Number(header);
	if (Number.isFinite(seconds) && seconds >= 0) return Date.now() + seconds * 1000;
	const date = Date.parse(header);
	return Number.isFinite(date) ? date : Date.now() + 60_000;
}

function resolveConnection(settings) {
	const section = settings.get("llm-deepseek") ?? {};
	const apiKeyEnv = typeof section.apiKeyEnv === "string" && section.apiKeyEnv.length > 0
		? section.apiKeyEnv
		: "DEEPSEEK_API_KEY";
	const rawBaseURL = typeof section.baseURL === "string" && section.baseURL.length > 0
		? section.baseURL
		: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
	let baseURL;
	try { baseURL = new URL(rawBaseURL); } catch { return { status: "unsupported" }; }
	if (baseURL.protocol !== "https:" || baseURL.hostname !== OFFICIAL_HOST) return { status: "unsupported" };
	return { apiKeyEnv, balanceURL: new URL("/user/balance", baseURL.origin).href };
}

function simpleBindingId(reference, source, secret) {
	const digest = createHash("sha256").update(reference).update("\0").update(source).update("\0").update(secret).digest("hex").slice(0, 16);
	return `deepseek-${digest}`;
}

async function queryBalance(ctx) {
	const connection = resolveConnection(ctx.settings);
	if (connection.status === "unsupported") return errorSnapshot("unsupported");
	const credential = await ctx.credentials.resolve(connection.apiKeyEnv);
	if (credential === void 0 || credential.value === "") return errorSnapshot("unbound");
	const bindingId = simpleBindingId(connection.apiKeyEnv, credential.source ?? "configured", credential.value);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(connection.balanceURL, {
			headers: { accept: "application/json", authorization: `Bearer ${credential.value}` },
			signal: controller.signal
		});
		if (response.status === 401 || response.status === 403) return errorSnapshot("auth-error", { bindingId });
		if (response.status === 429) return errorSnapshot("rate-limited", { bindingId, retryAt: new Date(parseRetryAt(response.headers.get("retry-after"))).toISOString() });
		if (!response.ok) return errorSnapshot("unavailable", { bindingId });
		const body = await response.json();
		const infos = Array.isArray(body?.balance_infos) ? body.balance_infos : [];
		const primary = infos.find(info => info?.currency === "CNY") ?? infos[0];
		if (primary === void 0 || typeof primary.total_balance !== "string") return errorSnapshot("unavailable", { bindingId });
		generation += 1;
		return {
			status: "ready",
			bindingId,
			generation,
			providerLabel: "DeepSeek API",
			currency: String(primary.currency ?? "CNY"),
			totalBalance: primary.total_balance,
			grantedBalance: String(primary.granted_balance ?? "0"),
			toppedUpBalance: String(primary.topped_up_balance ?? "0"),
			isAvailable: Boolean(body.is_available),
			checkedAt: new Date().toISOString(),
			stale: false
		};
	} catch {
		return errorSnapshot("unavailable", { bindingId });
	} finally {
		clearTimeout(timer);
	}
}

async function readBalance(ctx, force) {
	const now = Date.now();
	if (cached !== void 0) {
		const age = now - cached.at;
		if (age < (force ? MANUAL_REFRESH_FLOOR_MS : CACHE_TTL_MS)) return cached.value;
	}
	if (inFlight !== void 0) return inFlight;
	inFlight = queryBalance(ctx).then(value => {
		cached = { at: Date.now(), value };
		return value;
	}).finally(() => { inFlight = void 0; });
	return inFlight;
}

export function installBalanceRoute(ctx) {
	ctx.inject(["connection", "settings", "credentials"], balanceCtx => {
		balanceCtx.effect(() => balanceCtx.connection.fetch.register({
			path: BALANCE_PATH,
			methods: ["GET"],
			requestBody: "buffered",
			fetch: request => {
				const force = new URL(request.url).searchParams.get("force") === "1";
				return readBalance(balanceCtx, force).then(value => json(value));
			}
		}), "dsh-kinich-theme: authenticated DeepSeek balance route");
	});
}

export { BALANCE_PATH, CACHE_TTL_MS, MANUAL_REFRESH_FLOOR_MS, REQUEST_TIMEOUT_MS };
