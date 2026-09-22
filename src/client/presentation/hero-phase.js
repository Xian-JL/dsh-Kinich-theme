import * as react from "react";
import {
	KINICH_HERO_TRANSITION_MS,
	KINICH_REDUCED_TRANSITION_MS,
	detectKinichHero,
	stableKinichPagePhase,
	transitionKinichPagePhase
} from "./phase-model.js";

/**
 * Observe only DSH's stable phase marker. This is presentation state: it never
 * mutates navigation, sessions, or persisted Kinich settings.
 */
export function useKinichPagePhase() {
	const [phase, setPhase] = (0, react.useState)("conversation");
	const phaseRef = (0, react.useRef)("conversation");
	const heroRef = (0, react.useRef)(false);
	const initializedRef = (0, react.useRef)(false);
	const timerRef = (0, react.useRef)(null);
	const frameRef = (0, react.useRef)(null);

	(0, react.useEffect)(() => {
		if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
		const reducedMotion = typeof window !== "undefined"
			? window.matchMedia?.("(prefers-reduced-motion: reduce)")
			: undefined;

		const publish = next => {
			phaseRef.current = next;
			setPhase(next);
			if (document.body) document.body.dataset.kinichPagePhase = next;
		};
		const settle = hero => {
			if (timerRef.current !== null) clearTimeout(timerRef.current);
			const delay = reducedMotion?.matches ? KINICH_REDUCED_TRANSITION_MS : KINICH_HERO_TRANSITION_MS;
			timerRef.current = setTimeout(() => {
				const next = stableKinichPagePhase(hero);
				publish(next);
				timerRef.current = null;
			}, delay);
		};
		const sync = () => {
			frameRef.current = null;
			const hero = detectKinichHero(document);
			if (!initializedRef.current) {
				initializedRef.current = true;
				heroRef.current = hero;
				if (!hero) {
					publish("conversation");
					return;
				}
			} else if (hero === heroRef.current) {
				return;
			} else {
				heroRef.current = hero;
			}
			publish(transitionKinichPagePhase(hero));
			settle(hero);
		};
		const scheduleSync = () => {
			if (frameRef.current !== null) return;
			frameRef.current = requestAnimationFrame(sync);
		};

		const observer = new MutationObserver(scheduleSync);
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["data-phase"],
			childList: true,
			subtree: true
		});
		scheduleSync();

		return () => {
			observer.disconnect();
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
			if (timerRef.current !== null) clearTimeout(timerRef.current);
			if (document.body?.dataset.kinichPagePhase === phaseRef.current) {
				delete document.body.dataset.kinichPagePhase;
			}
		};
	}, []);

	return phase;
}
