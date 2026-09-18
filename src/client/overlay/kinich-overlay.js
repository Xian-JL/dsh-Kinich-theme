import * as react from "react";
import * as react_jsx_runtime from "react/jsx-runtime";
import { AJAW_IDLE_DATA_URI, KINICH_CHARACTER_DATA_URI, NATLAN_CORNER_DATA_URI } from "../assets.generated.js";
import { DEFAULT_KINICH_SETTINGS } from "../../shared/settings.js";
import { useKinichSettings } from "../hooks/use-kinich-settings.js";
import { getKinichThemeTokens, KINICH_THEME_SOURCE } from "../theme/tokens.js";
import { getKinichSessionState, subscribeKinichSessionState } from "../session/status-store.js";
import { refreshBalance } from "../balance/balance-store.js";
import { useBalance } from "../balance/use-balance.js";
import { KINICH_CLICK_BURST_EVENT, KINICH_INTERACTION_EVENT, toOverlayPoint } from "../interaction/interaction-bridge.js";

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
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

function useKinichThemePresentation(theme, style, intensity) {
	(0, react.useEffect)(() => {
		const dispose = theme.overrideTokens(KINICH_THEME_SOURCE, getKinichThemeTokens(style));
		return typeof dispose === "function" ? dispose : void 0;
	}, [theme, style]);
	(0, react.useEffect)(() => {
		if (typeof document === "undefined") return;
		const body = document.body;
		const prevStyle = body.dataset.kinichStyle;
		const prevIntensity = body.dataset.kinichIntensity;
		body.dataset.kinichStyle = style;
		body.dataset.kinichIntensity = intensity;
		return () => {
			if (prevStyle === void 0) delete body.dataset.kinichStyle; else body.dataset.kinichStyle = prevStyle;
			if (prevIntensity === void 0) delete body.dataset.kinichIntensity; else body.dataset.kinichIntensity = prevIntensity;
		};
	}, [style, intensity]);
}

function useSessionFeedback() {
	const [state, setState] = (0, react.useState)(getKinichSessionState);
	(0, react.useEffect)(() => subscribeKinichSessionState(setState), []);
	return state;
}

function useInteractionFeedback(sessionState) {
	const [feedback, setFeedback] = (0, react.useState)("idle");
	const timerRef = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
		if (sessionState === "running" || sessionState === "complete" || sessionState === "error") {
			setFeedback(sessionState);
			if (sessionState !== "running") timerRef.current = setTimeout(() => setFeedback("idle"), sessionState === "error" ? 3200 : 1800);
		}
		return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
	}, [sessionState]);
	(0, react.useEffect)(() => {
		if (typeof document === "undefined") return;
		const receive = event => {
			if (event.detail?.state !== "sending") return;
			setFeedback("sending");
			if (timerRef.current !== null) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => { setFeedback(current => current === "sending" ? "idle" : current); timerRef.current = null; }, 1200);
		};
		document.addEventListener(KINICH_INTERACTION_EVENT, receive);
		return () => document.removeEventListener(KINICH_INTERACTION_EVENT, receive);
	}, []);
	return feedback;
}

function useClickBursts(overlayRef) {
	const [bursts, setBursts] = (0, react.useState)([]);
	const nextIdRef = (0, react.useRef)(0);
	const timersRef = (0, react.useRef)(new Map());
	(0, react.useEffect)(() => {
		if (typeof document === "undefined" || typeof window === "undefined") return;
		const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		const receive = event => {
			if (reducedMotion?.matches || document.visibilityState !== "visible") return;
			const rect = overlayRef.current?.getBoundingClientRect();
			if (!rect || !Number.isFinite(event.detail?.clientX) || !Number.isFinite(event.detail?.clientY)) return;
			const point = toOverlayPoint(event.detail?.clientX, event.detail?.clientY, rect);
			if (!point) return;
			const id = ++nextIdRef.current;
			setBursts(current => [...current.slice(-3), { id, ...point }]);
			const timer = setTimeout(() => {
				setBursts(current => current.filter(item => item.id !== id));
				timersRef.current.delete(id);
			}, 320);
			timersRef.current.set(id, timer);
		};
		document.addEventListener(KINICH_CLICK_BURST_EVENT, receive);
		return () => {
			document.removeEventListener(KINICH_CLICK_BURST_EVENT, receive);
			for (const timer of timersRef.current.values()) clearTimeout(timer);
			timersRef.current.clear();
		};
	}, [overlayRef]);
	return bursts;
}

function text(t, key, fallback) { return typeof t === "function" ? t(key) : fallback; }

export function KinichOverlay({ settings, theme, t }) {
	const snapshot = useKinichSettings(settings);
	const value = snapshot.value ?? DEFAULT_KINICH_SETTINGS;
	useKinichThemePresentation(theme, value.visualStyle, value.visualIntensity);
	const sessionState = useSessionFeedback();
	const interactionFeedback = useInteractionFeedback(sessionState);
	const balance = useBalance();
	const overheated = balance.overheated === true;
	const [ajawPosition, setAjawPosition] = (0, react.useState)(() => displayAjawPosition(value.ajawPosition));
	const [dragging, setDragging] = (0, react.useState)(false);
	const [hovered, setHovered] = (0, react.useState)(false);
	const [reacting, setReacting] = (0, react.useState)(false);
	const [idleMood, setIdleMood] = (0, react.useState)("idle");
	const [balanceOpen, setBalanceOpen] = (0, react.useState)(false);
	const overlayRef = (0, react.useRef)(null);
	const clickBursts = useClickBursts(overlayRef);
	const dragRef = (0, react.useRef)(null);
	const frameRef = (0, react.useRef)(null);
	const pendingPositionRef = (0, react.useRef)(null);
	const reactionTimerRef = (0, react.useRef)(null);
	const moodTimerRef = (0, react.useRef)(null);
	const ignoreClickRef = (0, react.useRef)(false);
	const clusterRef = (0, react.useRef)(null);

	(0, react.useEffect)(() => { if (dragRef.current === null) setAjawPosition(displayAjawPosition(value.ajawPosition)); }, [value.ajawPosition.x, value.ajawPosition.y]);
	(0, react.useEffect)(() => () => {
		if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		if (reactionTimerRef.current !== null) clearTimeout(reactionTimerRef.current);
		if (moodTimerRef.current !== null) clearTimeout(moodTimerRef.current);
	}, []);
	(0, react.useEffect)(() => {
		if (!balanceOpen || typeof document === "undefined") return;
		const closeOnEscape = event => { if (event.key === "Escape") setBalanceOpen(false); };
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
		if (next !== null) setAjawPosition(next);
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
		const centerX = overlayRect.left + ajawPosition.x / 100 * overlayRect.width;
		const centerY = overlayRect.top + ajawPosition.y / 100 * overlayRect.height;
		dragRef.current = {
			halfHeight: event.currentTarget.offsetHeight / 2,
			halfWidth: event.currentTarget.offsetWidth / 2,
			offsetX: event.clientX - centerX,
			offsetY: event.clientY - centerY,
			overlayRect,
			pointerId: event.pointerId,
			position: ajawPosition,
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
		setAjawPosition(drag.position);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		setDragging(false);
		ignoreClickRef.current = drag.moved;
		if (drag.position.x !== value.ajawPosition.x || drag.position.y !== value.ajawPosition.y) {
			settings.set("ajawPosition", drag.position).catch(() => setAjawPosition(value.ajawPosition));
		}
	};
	const toggleBalance = () => {
		if (ignoreClickRef.current) { ignoreClickRef.current = false; return; }
		setBalanceOpen(open => {
			if (!open) void refreshBalance({ force: true });
			return !open;
		});
		triggerReaction();
	};

	const ajawState = dragging ? "dragging" : interactionFeedback === "sending" ? "sending" : sessionState === "error" ? "error" : sessionState === "running" ? "thinking" : sessionState === "complete" ? "success" : reacting ? "reacting" : hovered ? "hover" : idleMood;
	const moodBubble = ajawState === "sending" ? "↗" : ajawState === "thinking" ? "…" : ajawState === "success" ? "✓" : ajawState === "error" ? "!" : ajawState === "sleeping" ? "zZ" : ajawState === "excited" ? "!" : ajawState === "dragging" ? "↕" : reacting ? "★" : hovered ? "¥" : "";
	const balanceDialogId = "dsh-kinich-balance-bubble";
	const statusKey = `balance.status.${balance.status ?? "unavailable"}`;
	const statusFallback = balance.status === "ready" ? "余额已同步" : balance.status === "loading" ? "正在读取余额" : "余额暂不可用";

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
				children: clickBursts.map(burst => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-kinich-click-burst",
					style: { left: `${burst.x}px`, top: `${burst.y}px` },
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "dsh-kinich-click-burst__core" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "dsh-kinich-click-burst__ring" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "dsh-kinich-click-burst__arc" }),
						...Array.from({ length: 10 }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
							className: "dsh-kinich-click-burst__fragment",
							style: { "--burst-angle": `${index * 36 + (index % 2 ? 7 : -5)}deg`, "--burst-distance": `${22 + index % 3 * 5}px`, "--burst-delay": `${index % 4 * 9}ms` }
						}, index))
					]
				}, burst.id))
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-live": "polite",
				"aria-atomic": "true",
				className: "dsh-kinich-interaction-status",
				role: "status",
				children: interactionFeedback === "sending" ? text(t, "feedback.sending", "正在传递指令") : interactionFeedback === "running" ? text(t, "feedback.running", "正在探索") : interactionFeedback === "complete" ? text(t, "feedback.complete", "探索完成") : interactionFeedback === "error" ? text(t, "feedback.error", "本次行动未完成") : ""
			}),
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
				"data-bubble-side": ajawPosition.x < 50 ? "right" : "left",
				"data-bubble-vertical": ajawPosition.y < 30 ? "down" : "up",
				"data-open": String(balanceOpen),
				ref: clusterRef,
				style: {
					left: `${ajawPosition.x}%`,
					top: `${ajawPosition.y}%`,
					"--ajaw-flip": value.ajawFlipped ? -1 : 1,
					"--ajaw-rotation": `${value.ajawRotation}deg`
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						"aria-controls": balanceDialogId,
						"aria-expanded": balanceOpen,
						"aria-label": text(t, "balance.open", "Open API balance"),
						className: "dsh-kinich-ajaw-idle",
						"data-draggable": String(snapshot.writable),
						"data-dragging": String(dragging),
						"data-state": ajawState,
						onClick: toggleBalance,
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
					balanceOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						"aria-label": text(t, "balance.dialog", "API account balance"),
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
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { "aria-label": text(t, "balance.refresh", "Refresh balance"), className: "dsh-kinich-balance-bubble__refresh", disabled: balance.refreshing === true, onClick: () => void refreshBalance({ force: true }), type: "button", children: "↻" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { "aria-label": text(t, "balance.close", "Close"), className: "dsh-kinich-balance-bubble__close", onClick: () => setBalanceOpen(false), type: "button", children: "×" })
								] })
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-balance-bubble__label", children: text(t, "balance.current", "Current account balance") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { className: "dsh-kinich-balance-bubble__amount", children: balanceAmount(balance) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { className: "dsh-kinich-balance-bubble__status", children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true", className: "dsh-kinich-balance-bubble__status-dot" }),
								text(t, statusKey, statusFallback)
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-balance-bubble__note", children: overheated
								? text(t, "balance.overheated", "余额低于 ¥10，阿乔已进入红温加速。")
								: balance.stale ? text(t, "balance.stale", "显示最近一次成功读取的余额。") : text(t, "balance.live", "每 60 秒自动刷新；点击阿乔立即检查。") })
						]
					})
				]
			})
		]
	});
}
