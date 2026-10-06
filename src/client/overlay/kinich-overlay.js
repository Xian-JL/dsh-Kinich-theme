import * as react from "react";
import * as react_jsx_runtime from "react/jsx-runtime";
import { AJAW_IDLE_DATA_URI, KINICH_CHARACTER_DATA_URI, NATLAN_CORNER_DATA_URI } from "../assets.generated.js";
import { DEFAULT_KINICH_SETTINGS, isKinichSettingValue, KINICH_SETTING_DEFINITIONS } from "../../shared/settings.js";
import { useKinichSettings } from "../hooks/use-kinich-settings.js";
import { getKinichThemeTokens, getKinichAccentPalette, KINICH_THEME_SOURCE } from "../theme/tokens.js";
import { getKinichSessionState, subscribeKinichSessionState } from "../session/status-store.js";
import { selectMainViewSessionId } from "../session/compat.js";
import { refreshBalance } from "../balance/balance-store.js";
import { getBalanceRetryMinutes } from "../balance/policy.js";
import { useBalance } from "../balance/use-balance.js";
import { KINICH_CLICK_BURST_EVENT, toOverlayPoint } from "../interaction/interaction-bridge.js";
import { nudgeAjawPosition } from "./position.js";
import {
	CLICK_BURST_FRAGMENT_COUNT,
	CLICK_BURST_POOL_SIZE,
	clickBurstFragmentMotion,
	clickBurstPoolSlot,
	playClickBurst
} from "../interaction/click-burst.js";
import { useKinichPagePhase } from "../presentation/hero-phase.js";
import { useKinichImmersiveParallax } from "../presentation/parallax.js";
import { isKinichHeroTarget } from "../presentation/phase-model.js";

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
const HERO_AJAW_POSITION = Object.freeze({ x: 95, y: 90 });
function displayAjawPosition(position) {
	return position.x >= 96 && position.y <= 20 ? { x: 94, y: 84 } : position;
}

function balanceAmount(balance) {
	if (typeof balance.totalBalance !== "string") return "—";
	const symbol = balance.currency === "CNY" ? "¥" : balance.currency === "USD" ? "$" : `${balance.currency ?? ""} `;
	return `${symbol}${balance.totalBalance}`;
}
export function calculateAjawPosition(clientX, clientY, drag) {
	const { overlayRect } = drag;
	const localX = clamp(clientX - overlayRect.left - drag.offsetX, drag.halfWidth, overlayRect.width - drag.halfWidth);
	const localY = clamp(clientY - overlayRect.top - drag.offsetY, drag.halfHeight, overlayRect.height - drag.halfHeight);
	return { x: Number((localX / overlayRect.width * 100).toFixed(3)), y: Number((localY / overlayRect.height * 100).toFixed(3)) };
}

function useKinichThemePresentation(theme, style, intensity, backgroundImage, backgroundAccent, autoPalette) {
	const safeBackgroundImage = isKinichSettingValue(KINICH_SETTING_DEFINITIONS.customBackgroundImage, backgroundImage)
		? backgroundImage : "";
	const safeBackgroundAccent = isKinichSettingValue(KINICH_SETTING_DEFINITIONS.customBackgroundAccent, backgroundAccent)
		? backgroundAccent : "";
	const useBackgroundAccent = safeBackgroundImage !== "" && autoPalette && safeBackgroundAccent !== "";
	const accentPalette = (0, react.useMemo)(
		() => useBackgroundAccent ? getKinichAccentPalette(style, safeBackgroundAccent) : null,
		[style, useBackgroundAccent, safeBackgroundAccent]
	);
	const tokens = (0, react.useMemo)(
		() => getKinichThemeTokens(style, accentPalette ? safeBackgroundAccent : "", safeBackgroundImage !== ""),
		[style, accentPalette, safeBackgroundAccent, safeBackgroundImage]
	);
	(0, react.useEffect)(() => {
		const dispose = theme.overrideTokens(KINICH_THEME_SOURCE, tokens);
		return typeof dispose === "function" ? dispose : void 0;
	}, [theme, tokens]);
	(0, react.useEffect)(() => {
		if (typeof document === "undefined") return;
		const body = document.body;
		const previousData = {
			kinichStyle: body.dataset.kinichStyle,
			kinichIntensity: body.dataset.kinichIntensity,
			kinichCustomBackground: body.dataset.kinichCustomBackground,
			kinichAutoPalette: body.dataset.kinichAutoPalette
		};
		const styleProperties = [
			"--kinich-user-background",
			"--kinich-background-accent-light",
			"--kinich-background-accent-dark",
			"--kinich-background-accent-strong-light",
			"--kinich-background-accent-strong-dark"
		];
		const previousStyles = new Map(styleProperties.map(name => [name, body.style.getPropertyValue(name)]));
		body.dataset.kinichStyle = style;
		body.dataset.kinichIntensity = intensity;
		body.dataset.kinichCustomBackground = String(safeBackgroundImage !== "");
		body.dataset.kinichAutoPalette = String(Boolean(accentPalette));
		if (safeBackgroundImage !== "") body.style.setProperty("--kinich-user-background", `url("${safeBackgroundImage}")`);
		if (accentPalette) {
			body.style.setProperty("--kinich-background-accent-light", accentPalette.light);
			body.style.setProperty("--kinich-background-accent-dark", accentPalette.dark);
			body.style.setProperty("--kinich-background-accent-strong-light", accentPalette.strongLight);
			body.style.setProperty("--kinich-background-accent-strong-dark", accentPalette.strongDark);
		}
		return () => {
			for (const [key, value] of Object.entries(previousData)) {
				if (value === void 0) delete body.dataset[key]; else body.dataset[key] = value;
			}
			for (const [name, value] of previousStyles) {
				if (value === "") body.style.removeProperty(name); else body.style.setProperty(name, value);
			}
		};
	}, [style, intensity, safeBackgroundImage, accentPalette]);
}

function useSessionFeedback(sessionId) {
	const [state, setState] = (0, react.useState)(() => getKinichSessionState(sessionId));
	(0, react.useEffect)(() => {
		setState(getKinichSessionState(sessionId));
		return subscribeKinichSessionState(changedSessionId => {
			if (sessionId === undefined || changedSessionId === sessionId) setState(getKinichSessionState(sessionId));
		});
	}, [sessionId]);
	(0, react.useEffect)(() => {
		if (typeof document === "undefined") return;
		document.body.dataset.kinichSessionState = state;
	}, [state]);
	return state;
}

function useInteractionFeedback(sessionState) {
	const [feedback, setFeedback] = (0, react.useState)("idle");
	const timerRef = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
		if (sessionState === "sending" || sessionState === "running" || sessionState === "waiting" || sessionState === "complete" || sessionState === "error") {
			setFeedback(sessionState);
			if (sessionState !== "sending" && sessionState !== "running" && sessionState !== "waiting") timerRef.current = setTimeout(() => setFeedback("idle"), sessionState === "error" ? 3200 : 1800);
		} else {
			setFeedback("idle");
		}
		return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
	}, [sessionState]);
	return feedback;
}

function useClickBurstLayer(overlayRef) {
	const layerRef = (0, react.useRef)(null);
	const sequenceRef = (0, react.useRef)(0);
	(0, react.useEffect)(() => {
		if (typeof document === "undefined" || typeof window === "undefined") return;
		const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		const receive = event => {
			if (reducedMotion?.matches || document.visibilityState !== "visible") return;
			const rect = overlayRef.current?.getBoundingClientRect();
			if (!rect || !Number.isFinite(event.detail?.clientX) || !Number.isFinite(event.detail?.clientY)) return;
			const point = toOverlayPoint(event.detail?.clientX, event.detail?.clientY, rect);
			if (!point) return;
			const generation = ++sequenceRef.current;
			const slot = clickBurstPoolSlot(generation);
			playClickBurst(layerRef.current?.children[slot], point, generation);
		};
		document.addEventListener(KINICH_CLICK_BURST_EVENT, receive);
		return () => {
			document.removeEventListener(KINICH_CLICK_BURST_EVENT, receive);
			for (const animation of layerRef.current?.getAnimations({ subtree: true }) ?? []) animation.cancel();
		};
	}, [overlayRef]);
	return layerRef;
}

function text(t, key, fallback) { return typeof t === "function" ? t(key) : fallback; }

export function KinichOverlay({ settings, theme, t, useSessions }) {
	const snapshot = useKinichSettings(settings);
	const value = snapshot.value ?? DEFAULT_KINICH_SETTINGS;
	useKinichThemePresentation(theme, value.visualStyle, value.visualIntensity,
		value.customBackgroundImage, value.customBackgroundAccent, value.backgroundAutoPalette);
	const mainSessionId = typeof useSessions === "function" ? useSessions(selectMainViewSessionId) : undefined;
	const sessionState = useSessionFeedback(mainSessionId);
	const interactionFeedback = useInteractionFeedback(sessionState);
	const balance = useBalance();
	const overheated = balance.overheated === true;
	const pagePhase = useKinichPagePhase();
	const heroTarget = isKinichHeroTarget(pagePhase);
	const [ajawPosition, setAjawPosition] = (0, react.useState)(() => displayAjawPosition(value.ajawPosition));
	const [dragging, setDragging] = (0, react.useState)(false);
	const [heroAjawOverride, setHeroAjawOverride] = (0, react.useState)(false);
	const [hovered, setHovered] = (0, react.useState)(false);
	const [reacting, setReacting] = (0, react.useState)(false);
	const [idleMood, setIdleMood] = (0, react.useState)("idle");
	const [balanceOpen, setBalanceOpen] = (0, react.useState)(false);
	const [manualRefreshStatus, setManualRefreshStatus] = (0, react.useState)("idle");
	const overlayRef = (0, react.useRef)(null);
	useKinichImmersiveParallax(overlayRef, value.visualIntensity === "immersive" && value.ambientMotion && pagePhase === "hero");
	const clickLayerRef = useClickBurstLayer(overlayRef);
	const dragRef = (0, react.useRef)(null);
	const frameRef = (0, react.useRef)(null);
	const pendingPositionRef = (0, react.useRef)(null);
	const keyboardPositionRef = (0, react.useRef)(null);
	const reactionTimerRef = (0, react.useRef)(null);
	const moodTimerRef = (0, react.useRef)(null);
	const ignoreClickRef = (0, react.useRef)(false);
	const clusterRef = (0, react.useRef)(null);
	const ajawButtonRef = (0, react.useRef)(null);
	(0, react.useLayoutEffect)(() => {
		const cluster = clusterRef.current;
		if (dragging || !cluster || cluster.style.transition !== "none") return;
		cluster.style.transform = "";
		requestAnimationFrame(() => { if (cluster.isConnected) cluster.style.transition = ""; });
	}, [dragging, ajawPosition]);

	(0, react.useEffect)(() => { if (dragRef.current === null) setAjawPosition(displayAjawPosition(value.ajawPosition)); }, [value.ajawPosition.x, value.ajawPosition.y]);
	(0, react.useEffect)(() => {
		if (pagePhase !== "entering-hero") return;
		setBalanceOpen(false);
		setHeroAjawOverride(false);
	}, [pagePhase]);
	(0, react.useEffect)(() => () => {
		if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		if (reactionTimerRef.current !== null) clearTimeout(reactionTimerRef.current);
		if (moodTimerRef.current !== null) clearTimeout(moodTimerRef.current);
	}, []);
	(0, react.useEffect)(() => {
		if (!balanceOpen || typeof document === "undefined") return;
		const closeOnEscape = event => { if (event.key === "Escape") { setBalanceOpen(false); ajawButtonRef.current?.focus(); } };
		const closeOutside = event => { if (!clusterRef.current?.contains(event.target)) setBalanceOpen(false); };
		document.addEventListener("keydown", closeOnEscape);
		document.addEventListener("pointerdown", closeOutside);
		return () => {
			document.removeEventListener("keydown", closeOnEscape);
			document.removeEventListener("pointerdown", closeOutside);
		};
	}, [balanceOpen]);

	(0, react.useEffect)(() => {
		if (!value.animateAjaw || sessionState !== "idle" || dragging || reacting || balanceOpen) return;
		let cancelled = false;
		const schedule = () => {
			const delay = 14000 + Math.floor(Math.random() * 10000);
			moodTimerRef.current = setTimeout(() => {
				if (cancelled) return;
				setIdleMood(Math.random() > 0.52 ? "excited" : "sleeping");
				moodTimerRef.current = setTimeout(() => { if (!cancelled) { setIdleMood("idle"); schedule(); } }, 2200);
			}, delay);
		};
		schedule();
		return () => { cancelled = true; if (moodTimerRef.current !== null) clearTimeout(moodTimerRef.current); };
	}, [value.animateAjaw, sessionState, dragging, reacting, balanceOpen]);

	const triggerReaction = () => {
		setReacting(false);
		requestAnimationFrame(() => setReacting(true));
		if (reactionTimerRef.current !== null) clearTimeout(reactionTimerRef.current);
		reactionTimerRef.current = setTimeout(() => { setReacting(false); reactionTimerRef.current = null; }, 900);
	};
	const flushAjawFrame = () => {
		frameRef.current = null;
		const next = pendingPositionRef.current;
		pendingPositionRef.current = null;
		const drag = dragRef.current;
		if (next === null || drag === null || clusterRef.current === null) return;
		const dx = (next.x - drag.startingPosition.x) / 100 * drag.overlayRect.width;
		const dy = (next.y - drag.startingPosition.y) / 100 * drag.overlayRect.height;
		clusterRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
	};
	const scheduleAjawPosition = position => {
		pendingPositionRef.current = position;
		if (frameRef.current === null) frameRef.current = requestAnimationFrame(flushAjawFrame);
	};
	const startAjawDrag = event => {
		if (!snapshot.writable || event.button !== 0) return;
		const overlay = event.currentTarget.closest(".dsh-kinich-overlay");
		if (overlay === null) return;
		const overlayRect = overlay.getBoundingClientRect();
		const buttonRect = event.currentTarget.getBoundingClientRect();
		const centerX = buttonRect.left + buttonRect.width / 2;
		const centerY = buttonRect.top + buttonRect.height / 2;
		const startingPosition = heroTarget && !heroAjawOverride ? HERO_AJAW_POSITION : ajawPosition;
		if (heroTarget && !heroAjawOverride) {
			setAjawPosition(startingPosition);
			setHeroAjawOverride(true);
		}
		dragRef.current = {
			startingPosition,
			halfHeight: event.currentTarget.offsetHeight / 2,
			halfWidth: event.currentTarget.offsetWidth / 2,
			offsetX: event.clientX - centerX,
			offsetY: event.clientY - centerY,
			overlayRect,
			pointerId: event.pointerId,
			position: startingPosition,
			originClientX: event.clientX,
			originClientY: event.clientY,
			moved: false
		};
		event.currentTarget.setPointerCapture(event.pointerId);
		setDragging(true);
		setIdleMood("idle");
	};
	const moveAjaw = event => {
		const drag = dragRef.current;
		if (drag === null || drag.pointerId !== event.pointerId) return;
		event.preventDefault();
		if (Math.hypot(event.clientX - drag.originClientX, event.clientY - drag.originClientY) > 4) drag.moved = true;
		const position = calculateAjawPosition(event.clientX, event.clientY, drag);
		drag.position = position;
		scheduleAjawPosition(position);
	};
	const finishAjawDrag = event => {
		const drag = dragRef.current;
		if (drag === null || drag.pointerId !== event.pointerId) return;
		dragRef.current = null;
		if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
		pendingPositionRef.current = null;
		if (clusterRef.current) {
			clusterRef.current.style.transition = "none";
		}
		setAjawPosition(drag.position);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		setDragging(false);
		ignoreClickRef.current = drag.moved;
		if (drag.position.x !== value.ajawPosition.x || drag.position.y !== value.ajawPosition.y) {
			persistAjawPosition(drag.position);
		}
	};
	const persistAjawPosition = position => {
		settings.set("ajawPosition", position)
			.then(accepted => { if (accepted === false) setAjawPosition(value.ajawPosition); })
			.catch(() => setAjawPosition(value.ajawPosition));
	};
	const commitKeyboardPosition = () => {
		const next = keyboardPositionRef.current;
		keyboardPositionRef.current = null;
		if (next) persistAjawPosition(next);
	};
	const moveAjawWithKeyboard = event => {
		if (!snapshot.writable || !(event.key.startsWith("Arrow") || event.key === "Home")) return;
		const overlayRect = overlayRef.current?.getBoundingClientRect();
		const buttonRect = event.currentTarget.getBoundingClientRect();
		const current = keyboardPositionRef.current ?? (heroTarget && !heroAjawOverride ? HERO_AJAW_POSITION : ajawPosition);
		const next = event.key === "Home" ? displayAjawPosition(DEFAULT_KINICH_SETTINGS.ajawPosition)
			: nudgeAjawPosition(current, event.key, overlayRect, buttonRect, event.shiftKey);
		if (!next) return;
		event.preventDefault();
		setHeroAjawOverride(true);
		setAjawPosition(next);
		keyboardPositionRef.current = next;
	};
	const toggleBalance = () => {
		if (ignoreClickRef.current) { ignoreClickRef.current = false; return; }
		if (!balanceOpen) { setManualRefreshStatus("idle"); void refreshBalance({ force: true }); }
		setBalanceOpen(open => !open);
		triggerReaction();
	};
	const refreshBalanceManually = async () => {
		setManualRefreshStatus("loading");
		const next = await refreshBalance({ force: true });
		setManualRefreshStatus(next.status === "rate-limited" ? "limited" : next.status === "unbound" || next.status === "unsupported" ? "idle" : next.stale || next.status !== "ready" ? "failed" : "done");
	};

	const ajawState = dragging ? "dragging" : interactionFeedback === "sending" ? "sending" : interactionFeedback === "waiting" ? "waiting" : interactionFeedback === "error" ? "error" : interactionFeedback === "running" ? "thinking" : interactionFeedback === "complete" ? "success" : reacting ? "reacting" : hovered ? "hover" : idleMood;
	const presentedAjawPosition = heroTarget && !dragging && !heroAjawOverride ? HERO_AJAW_POSITION : ajawPosition;
	const presentedAjawFlip = heroTarget && !heroAjawOverride ? 1 : value.ajawFlipped ? -1 : 1;
	const presentedAjawRotation = heroTarget && !heroAjawOverride ? 0 : value.ajawRotation;
	const moodBubble = ajawState === "sending" ? "↗" : ajawState === "thinking" ? "…" : ajawState === "waiting" ? "?" : ajawState === "success" ? "✓" : ajawState === "error" ? "!" : ajawState === "sleeping" ? "zZ" : ajawState === "excited" ? "!" : ajawState === "dragging" ? "↕" : reacting ? "★" : hovered ? "¥" : "";
	const balanceDialogId = "dsh-kinich-balance-bubble";
	const statusKey = `balance.status.${balance.status ?? "unavailable"}`;
	const statusFallback = balance.status === "ready" ? "余额已同步" : balance.status === "loading" ? "正在读取余额" : "余额暂不可用";
	const retryMinutes = getBalanceRetryMinutes(balance);
	const balanceNote = retryMinutes !== null
		? `${text(t, "balance.retry.before", "预计 ")}${retryMinutes}${text(t, "balance.retry.after", " 分钟后可重试。")} ${balance.stale ? text(t, "balance.stale", "显示最近一次成功读取的余额。") : ""} ${overheated ? text(t, "balance.overheated", "余额低于 ¥10，阿乔已进入红温加速。") : ""}`
		: overheated ? balance.stale ? `${text(t, "balance.stale", "显示最近一次成功读取的余额。")} ${text(t, "balance.overheated", "余额低于 ¥10，阿乔已进入红温加速。")}` : text(t, "balance.overheated", "余额低于 ¥10，阿乔已进入红温加速。")
		: balance.stale ? text(t, "balance.stale", "显示最近一次成功读取的余额。") : text(t, "balance.live", "每 60 秒自动刷新；点击阿乔立即检查。");

	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-kinich-overlay",
		ref: overlayRef,
		"data-ajaw": String(value.animateAjaw),
		"data-ambient-motion": String(value.ambientMotion),
		"data-character": String(value.showCharacter),
		"data-character-opacity": value.characterOpacity,
		"data-character-position": value.characterPosition,
		"data-intensity": value.visualIntensity,
		"data-ornament": String(value.showOrnament),
		"data-ornament-intensity": value.ornamentIntensity,
		"data-page-phase": pagePhase,
		"data-session-state": sessionState,
		"data-interaction-feedback": interactionFeedback,
		"data-overheated": String(overheated),
		"data-texture": String(value.showTexture),
		"data-texture-intensity": value.textureIntensity,
		"data-visual-style": value.visualStyle,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"aria-hidden": "true",
				className: "dsh-kinich-click-layer",
				ref: clickLayerRef,
				children: Array.from({ length: CLICK_BURST_POOL_SIZE }, (_, slot) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-kinich-click-burst",
					hidden: true,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "dsh-kinich-click-burst__core" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "dsh-kinich-click-burst__ring" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "dsh-kinich-click-burst__arc" }),
						...Array.from({ length: CLICK_BURST_FRAGMENT_COUNT }, (_, index) => {
							const motion = clickBurstFragmentMotion(index);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
							className: "dsh-kinich-click-burst__fragment",
							"data-angle": String(motion.angle),
							"data-distance": String(motion.distance),
							"data-delay": String(motion.delay)
						}, index);
						})
					]
				}, slot))
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-live": "polite",
				"aria-atomic": "true",
				className: "dsh-kinich-interaction-status",
				role: "status",
				children: interactionFeedback === "sending" ? text(t, "feedback.sending", "正在传递指令") : interactionFeedback === "running" ? text(t, "feedback.running", "正在探索") : interactionFeedback === "waiting" ? text(t, "feedback.waiting", "等待你的确认") : interactionFeedback === "complete" ? text(t, "feedback.complete", "探索完成") : interactionFeedback === "error" ? text(t, "feedback.error", "本次行动未完成") : ""
			}),
			heroTarget && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { className: "dsh-kinich-sr-only", children: `${text(t, "welcome.line1", "从这里，")}${text(t, "welcome.line2", "开启新的探索。")}` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", { "aria-hidden": "true", className: "dsh-kinich-welcome", children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-welcome__eyebrow", children: "◆ KINICH & AJAW" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h1", { children: [text(t, "welcome.line1", "从这里，"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}), text(t, "welcome.line2", "开启新的探索。") ] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [text(t, "welcome.copy1", "将想法交给对话，让复杂问题逐渐清晰。"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}), text(t, "welcome.copy2", "阿乔会替你留意账户余额。")] })
			] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { "aria-hidden": "true", className: "dsh-kinich-decoration", children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-atmosphere" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-ambient-motion", children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ambient-motion__veil" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ambient-motion__canopy" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ambient-motion__ribbon dsh-kinich-ambient-motion__ribbon--one" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ambient-motion__ribbon dsh-kinich-ambient-motion__ribbon--two" }),
					...Array.from({ length: 5 }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ambient-motion__glint", "data-glint": String(index + 1) }, `glint-${index}`)),
					...Array.from({ length: 24 }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ambient-motion__mote", "data-mote": String(index + 1) }, index))
				] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-texture" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-horizon-line" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", className: "dsh-kinich-ornament", src: NATLAN_CORNER_DATA_URI }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-character-frame", children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", className: "dsh-kinich-character", src: KINICH_CHARACTER_DATA_URI }) })
			] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-kinich-ajaw-cluster",
				"data-bubble-side": presentedAjawPosition.x < 50 ? "right" : "left",
				"data-bubble-vertical": presentedAjawPosition.y < 30 ? "down" : "up",
				"data-dragging": String(dragging),
				"data-open": String(balanceOpen),
				ref: clusterRef,
				style: {
					left: `${presentedAjawPosition.x}%`,
					top: `${presentedAjawPosition.y}%`,
					"--ajaw-flip": presentedAjawFlip,
					"--ajaw-rotation": `${presentedAjawRotation}deg`
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						"aria-controls": balanceDialogId,
						"aria-describedby": "dsh-kinich-ajaw-help",
						"aria-expanded": balanceOpen,
						"aria-haspopup": "dialog",
						"aria-label": text(t, "balance.open", "Open API balance"),
						className: "dsh-kinich-ajaw-idle",
						"data-draggable": String(snapshot.writable),
						"data-dragging": String(dragging),
						"data-state": ajawState,
						ref: ajawButtonRef,
						onClick: toggleBalance,
						onBlur: commitKeyboardPosition,
						onKeyDown: moveAjawWithKeyboard,
						onKeyUp: event => { if (event.key.startsWith("Arrow") || event.key === "Home") commitKeyboardPosition(); },
						onPointerCancel: finishAjawDrag,
						onPointerDown: startAjawDrag,
						onPointerEnter: () => setHovered(true),
						onPointerLeave: () => setHovered(false),
						onPointerMove: moveAjaw,
						onPointerUp: finishAjawDrag,
						type: "button",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ajaw-idle__bubble", children: moodBubble }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ajaw-idle__status-ring" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ajaw-idle__spark dsh-kinich-ajaw-idle__spark--one" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ajaw-idle__spark dsh-kinich-ajaw-idle__spark--two" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-kinich-ajaw-idle__sprite",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", src: AJAW_IDLE_DATA_URI })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-sr-only", id: "dsh-kinich-ajaw-help", children: text(t, "ajaw.keyboard", "方向键移动阿乔；按住 Shift 可快速移动，Home 可复位位置。") }),
					balanceOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						"aria-label": text(t, "balance.dialog", "API account balance"),
						"aria-busy": manualRefreshStatus === "loading",
						"aria-modal": "false",
						className: "dsh-kinich-balance-bubble",
						"data-balance-state": balance.status ?? "unavailable",
						"data-overheated": String(overheated),
						id: balanceDialogId,
						onClick: event => event.stopPropagation(),
						onPointerDown: event => event.stopPropagation(),
						role: "dialog",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-balance-bubble__header", children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { className: "dsh-kinich-balance-bubble__provider", children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true", className: "dsh-kinich-balance-bubble__diamond" }),
									text(t, "balance.provider", "DeepSeek API")
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { className: "dsh-kinich-balance-bubble__actions", children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { "aria-label": text(t, "balance.refresh", "Refresh balance"), className: "dsh-kinich-balance-bubble__refresh", disabled: manualRefreshStatus === "loading", onClick: () => void refreshBalanceManually(), type: "button", children: "↻" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { "aria-label": text(t, "balance.close", "Close"), className: "dsh-kinich-balance-bubble__close", onClick: () => { setBalanceOpen(false); ajawButtonRef.current?.focus(); }, type: "button", children: "×" })
								] })
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-balance-bubble__label", children: text(t, "balance.current", "Current account balance") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { className: "dsh-kinich-balance-bubble__amount", children: balanceAmount(balance) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { className: "dsh-kinich-balance-bubble__status", children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true", className: "dsh-kinich-balance-bubble__status-dot" }),
								text(t, statusKey, statusFallback)
							] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-balance-bubble__note", children: balanceNote }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-live": "polite", className: "dsh-kinich-balance-bubble__refresh-status", role: "status", children: manualRefreshStatus === "loading" ? text(t, "balance.refreshing", "正在检查余额") : manualRefreshStatus === "done" ? text(t, "balance.refreshed", "余额检查完成") : manualRefreshStatus === "limited" ? text(t, "balance.refreshLimited", "查询频率受限，请按提示时间重试") : manualRefreshStatus === "failed" ? text(t, "balance.refreshFailed", "检查失败，仍可查看上次结果") : "" })
						]
					})
				]
			})
		]
	});
}
