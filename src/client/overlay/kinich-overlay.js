import * as react from "react";
import * as react_jsx_runtime from "react/jsx-runtime";
import { AJAW_IDLE_DATA_URI, KINICH_CHARACTER_DATA_URI, NATLAN_CORNER_DATA_URI } from "../assets.generated.js";
import { DEFAULT_KINICH_SETTINGS } from "../../shared/settings.js";
import { useKinichSettings } from "../hooks/use-kinich-settings.js";
import { getKinichThemeTokens, KINICH_THEME_SOURCE } from "../theme/tokens.js";
import { getKinichSessionState, subscribeKinichSessionState } from "../session/status-store.js";

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
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

export function KinichOverlay({ settings, theme }) {
	const snapshot = useKinichSettings(settings);
	const value = snapshot.value ?? DEFAULT_KINICH_SETTINGS;
	useKinichThemePresentation(theme, value.visualStyle, value.visualIntensity);
	const sessionState = useSessionFeedback();
	const [ajawPosition, setAjawPosition] = (0, react.useState)(value.ajawPosition);
	const [dragging, setDragging] = (0, react.useState)(false);
	const [hovered, setHovered] = (0, react.useState)(false);
	const [reacting, setReacting] = (0, react.useState)(false);
	const [idleMood, setIdleMood] = (0, react.useState)("idle");
	const dragRef = (0, react.useRef)(null);
	const frameRef = (0, react.useRef)(null);
	const pendingPositionRef = (0, react.useRef)(null);
	const reactionTimerRef = (0, react.useRef)(null);
	const moodTimerRef = (0, react.useRef)(null);

	(0, react.useEffect)(() => { if (dragRef.current === null) setAjawPosition(value.ajawPosition); }, [value.ajawPosition.x, value.ajawPosition.y]);
	(0, react.useEffect)(() => () => {
		if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		if (reactionTimerRef.current !== null) clearTimeout(reactionTimerRef.current);
		if (moodTimerRef.current !== null) clearTimeout(moodTimerRef.current);
	}, []);

	(0, react.useEffect)(() => {
		if (!value.animateAjaw || sessionState !== "idle" || dragging || reacting) return;
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
	}, [value.animateAjaw, sessionState, dragging, reacting]);

	const triggerReaction = () => {
		setReacting(false); requestAnimationFrame(() => setReacting(true));
		if (reactionTimerRef.current !== null) clearTimeout(reactionTimerRef.current);
		reactionTimerRef.current = setTimeout(() => { setReacting(false); reactionTimerRef.current = null; }, 900);
	};
	const flushAjawFrame = () => { frameRef.current = null; const next = pendingPositionRef.current; pendingPositionRef.current = null; if (next !== null) setAjawPosition(next); };
	const scheduleAjawPosition = position => { pendingPositionRef.current = position; if (frameRef.current === null) frameRef.current = requestAnimationFrame(flushAjawFrame); };
	const startAjawDrag = event => {
		if (!snapshot.writable || event.button !== 0) return;
		const overlay = event.currentTarget.parentElement; if (overlay === null) return;
		event.preventDefault(); const overlayRect = overlay.getBoundingClientRect();
		const centerX = overlayRect.left + ajawPosition.x / 100 * overlayRect.width;
		const centerY = overlayRect.top + ajawPosition.y / 100 * overlayRect.height;
		dragRef.current = { halfHeight: event.currentTarget.offsetHeight / 2, halfWidth: event.currentTarget.offsetWidth / 2,
			offsetX: event.clientX - centerX, offsetY: event.clientY - centerY, overlayRect, pointerId: event.pointerId,
			position: ajawPosition, originClientX: event.clientX, originClientY: event.clientY, moved: false };
		event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); setIdleMood("idle");
	};
	const moveAjaw = event => {
		const drag = dragRef.current; if (drag === null || drag.pointerId !== event.pointerId) return;
		event.preventDefault(); if (Math.hypot(event.clientX - drag.originClientX, event.clientY - drag.originClientY) > 4) drag.moved = true;
		const position = calculateAjawPosition(event.clientX, event.clientY, drag); drag.position = position; scheduleAjawPosition(position);
	};
	const finishAjawDrag = event => {
		const drag = dragRef.current; if (drag === null || drag.pointerId !== event.pointerId) return;
		dragRef.current = null; if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
		pendingPositionRef.current = null; setAjawPosition(drag.position);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		setDragging(false); if (!drag.moved) triggerReaction();
		if (drag.position.x !== value.ajawPosition.x || drag.position.y !== value.ajawPosition.y) settings.set("ajawPosition", drag.position).catch(() => setAjawPosition(value.ajawPosition));
	};
	const flipAjaw = event => {
		if (!snapshot.writable) return; event.preventDefault(); event.stopPropagation();
		settings.set("ajawFlipped", !value.ajawFlipped).catch(() => {}); triggerReaction();
	};

	const ajawState = dragging ? "dragging" : sessionState === "running" ? "thinking" : sessionState === "complete" ? "success" : reacting ? "reacting" : hovered ? "hover" : idleMood;
	const bubble = ajawState === "thinking" ? "…" : ajawState === "success" ? "✓" : ajawState === "sleeping" ? "zZ" : ajawState === "excited" ? "!" : ajawState === "dragging" ? "↕" : reacting ? "★" : hovered ? "?" : "";

	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		"aria-hidden": "true", className: "dsh-kinich-overlay", "data-ajaw": String(value.animateAjaw), "data-character": String(value.showCharacter),
		"data-character-opacity": value.characterOpacity, "data-character-position": value.characterPosition, "data-intensity": value.visualIntensity, "data-ambient-motion": String(value.ambientMotion),
		"data-ornament": String(value.showOrnament), "data-ornament-intensity": value.ornamentIntensity, "data-session-state": sessionState,
		"data-texture": String(value.showTexture), "data-texture-intensity": value.textureIntensity, "data-visual-style": value.visualStyle,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-atmosphere" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-ambient-motion", children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ambient-motion__veil" }),
				...Array.from({ length: 8 }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ambient-motion__mote", "data-mote": String(index + 1) }, index))
			] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-texture" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-horizon-line" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", className: "dsh-kinich-ornament", src: NATLAN_CORNER_DATA_URI }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", className: "dsh-kinich-character", src: KINICH_CHARACTER_DATA_URI }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-ajaw-idle", "data-state": ajawState,
				"data-draggable": String(snapshot.writable), onDoubleClick: flipAjaw, onPointerCancel: finishAjawDrag, onPointerDown: startAjawDrag,
				onPointerEnter: () => setHovered(true), onPointerLeave: () => setHovered(false), onPointerMove: moveAjaw, onPointerUp: finishAjawDrag,
				style: { left: `${ajawPosition.x}%`, top: `${ajawPosition.y}%`, transform: `translate(-50%, -50%) rotate(${value.ajawRotation}deg) scaleX(${value.ajawFlipped ? -1 : 1})` },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ajaw-idle__bubble", children: bubble }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ajaw-idle__status-ring" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ajaw-idle__spark dsh-kinich-ajaw-idle__spark--one" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-ajaw-idle__spark dsh-kinich-ajaw-idle__spark--two" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", src: AJAW_IDLE_DATA_URI })
				]
			})
		]
	});
}
