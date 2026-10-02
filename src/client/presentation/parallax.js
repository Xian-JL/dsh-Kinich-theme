import * as react from "react";
import { kinichParallaxOffset } from "./parallax-model.js";

/** A bounded, opt-in scene offset. It never changes Host layout or stored settings. */
export function useKinichImmersiveParallax(overlayRef, enabled) {
	(0, react.useEffect)(() => {
		const overlay = overlayRef.current;
		if (!overlay || !enabled || typeof window === "undefined" || typeof document === "undefined") return;
		const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		let rect = overlay.getBoundingClientRect();
		let frame = null;
		let next = { x: 0, y: 0 };
		const publish = ({ x, y }) => {
			overlay.style.setProperty("--kinich-parallax-x", `${x}px`);
			overlay.style.setProperty("--kinich-parallax-y", `${y}px`);
		};
		const reset = () => {
			if (frame !== null) cancelAnimationFrame(frame);
			frame = null;
			next = { x: 0, y: 0 };
			publish(next);
		};
		const move = event => {
			if (document.visibilityState !== "visible" || reducedMotion?.matches || rect.width < 900) return;
			next = kinichParallaxOffset(event.clientX, event.clientY, rect);
			if (frame !== null) return;
			frame = requestAnimationFrame(() => { frame = null; if (overlay.isConnected) publish(next); });
		};
		const resize = () => { rect = overlay.getBoundingClientRect(); reset(); };
		const sizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
		sizeObserver?.observe(overlay);
		const visibility = () => { if (document.visibilityState !== "visible") reset(); };
		window.addEventListener("pointermove", move, { passive: true });
		window.addEventListener("resize", resize);
		window.addEventListener("blur", reset);
		document.addEventListener("visibilitychange", visibility);
		reducedMotion?.addEventListener?.("change", reset);
		return () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("resize", resize);
			sizeObserver?.disconnect();
			window.removeEventListener("blur", reset);
			document.removeEventListener("visibilitychange", visibility);
			reducedMotion?.removeEventListener?.("change", reset);
			reset();
			overlay.style.removeProperty("--kinich-parallax-x");
			overlay.style.removeProperty("--kinich-parallax-y");
		};
	}, [overlayRef, enabled]);
}
