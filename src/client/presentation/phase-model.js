export const KINICH_HERO_SELECTOR = "[data-phase='hero']";
export const KINICH_HERO_TRANSITION_MS = 760;
export const KINICH_REDUCED_TRANSITION_MS = 80;

export function detectKinichHero(root) {
	return Boolean(root?.querySelector?.(KINICH_HERO_SELECTOR));
}

function containsKinichHero(node) {
	if (node?.nodeType !== 1) return false;
	return node.matches?.(KINICH_HERO_SELECTOR) === true || Boolean(node.querySelector?.(KINICH_HERO_SELECTOR));
}

/** Ignore ordinary streamed content mutations; only phase-marker changes matter. */
export function mutationAffectsKinichHero(records) {
	for (const record of records ?? []) {
		if (record.type === "attributes" && record.attributeName === "data-phase") {
			if (record.oldValue === "hero" || containsKinichHero(record.target)) return true;
			continue;
		}
		if (record.type !== "childList") continue;
		for (const node of [...(record.addedNodes ?? []), ...(record.removedNodes ?? [])]) {
			if (containsKinichHero(node)) return true;
		}
	}
	return false;
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
