export const KINICH_HERO_SELECTOR = "[data-phase='hero']";
export const KINICH_HERO_TRANSITION_MS = 760;
export const KINICH_REDUCED_TRANSITION_MS = 80;

export function detectKinichHero(root) {
	return Boolean(root?.querySelector?.(KINICH_HERO_SELECTOR));
}

export function stableKinichPagePhase(hero) {
	return hero ? "hero" : "conversation";
}

export function transitionKinichPagePhase(hero) {
	return hero ? "entering-hero" : "leaving-hero";
}

export function isKinichHeroTarget(phase) {
	return phase === "entering-hero" || phase === "hero";
}
