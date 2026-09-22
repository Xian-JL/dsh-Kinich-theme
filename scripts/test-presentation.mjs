import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	KINICH_HERO_SELECTOR,
	KINICH_HERO_TRANSITION_MS,
	KINICH_REDUCED_TRANSITION_MS,
	detectKinichHero,
	isKinichHeroTarget,
	stableKinichPagePhase,
	transitionKinichPagePhase
} from "../src/client/presentation/phase-model.js";
import {
	CLICK_BURST_FRAGMENT_COUNT,
	CLICK_BURST_POOL_SIZE,
	clickBurstFragmentMotion,
	clickBurstPoolSlot,
	playClickBurst
} from "../src/client/interaction/click-burst.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const overlay = await readFile(resolve(ROOT, "src/client/overlay/kinich-overlay.js"), "utf8");
const clickSource = await readFile(resolve(ROOT, "src/client/interaction/click-burst.js"), "utf8");
const presentationStyles = await readFile(resolve(ROOT, "src/client/styles-v13.css"), "utf8");

assert.equal(KINICH_HERO_SELECTOR, "[data-phase='hero']");
assert.equal(detectKinichHero({ querySelector: selector => selector === KINICH_HERO_SELECTOR ? {} : null }), true);
assert.equal(detectKinichHero({ querySelector: () => null }), false);
assert.equal(stableKinichPagePhase(false), "conversation");
assert.equal(stableKinichPagePhase(true), "hero");
assert.equal(transitionKinichPagePhase(false), "leaving-hero");
assert.equal(transitionKinichPagePhase(true), "entering-hero");
assert.equal(isKinichHeroTarget("entering-hero"), true);
assert.equal(isKinichHeroTarget("hero"), true);
assert.equal(isKinichHeroTarget("leaving-hero"), false);
assert.equal(KINICH_HERO_TRANSITION_MS, 760);
assert.ok(KINICH_REDUCED_TRANSITION_MS <= 120);

assert.equal(CLICK_BURST_POOL_SIZE, 4);
assert.equal(CLICK_BURST_FRAGMENT_COUNT, 10);
assert.deepEqual(clickBurstFragmentMotion(0), { angle: -5, distance: 22, delay: 0 });
assert.deepEqual(clickBurstFragmentMotion(1), { angle: 43, distance: 27, delay: 9 });
assert.equal(clickBurstPoolSlot(1), 1);
assert.equal(clickBurstPoolSlot(4), 0);
assert.equal(clickBurstPoolSlot(9), 1);

const animations = [];
function animatedPart(dataset = {}) {
	return {
		dataset,
		animate: (keyframes, options) => {
			const animation = { keyframes, options, onfinish: null };
			animations.push(animation);
			return animation;
		}
	};
}
const parts = {
	".dsh-kinich-click-burst__core": animatedPart(),
	".dsh-kinich-click-burst__ring": animatedPart(),
	".dsh-kinich-click-burst__arc": animatedPart()
};
const fragments = Array.from({ length: CLICK_BURST_FRAGMENT_COUNT }, (_, index) => {
	const motion = clickBurstFragmentMotion(index);
	return animatedPart({ angle: String(motion.angle), distance: String(motion.distance), delay: String(motion.delay) });
});
const node = {
	hidden: true,
	dataset: {},
	style: {},
	getAnimations: () => [],
	querySelector: selector => parts[selector],
	querySelectorAll: selector => selector === ".dsh-kinich-click-burst__fragment" ? fragments : []
};
playClickBurst(node, { x: 24, y: 36 }, 7);
assert.equal(node.hidden, false);
assert.equal(node.dataset.generation, "7");
assert.equal(node.style.transform, "translate3d(24px, 36px, 0)");
assert.equal(animations.length, 3 + CLICK_BURST_FRAGMENT_COUNT);
assert.equal(clickSource.includes("setTimeout"), false, "Click rendering must not use timer-driven frames");
assert.equal(clickSource.includes("requestAnimationFrame"), false, "Web Animations should own click interpolation without React frame updates");

assert.ok(overlay.includes('setBalanceOpen(false)'));
assert.ok(overlay.includes("HERO_AJAW_POSITION"));
assert.ok(overlay.includes("presentedAjawFlip"));
assert.ok(overlay.includes("presentedAjawRotation"));
assert.ok(overlay.includes('"data-page-phase": pagePhase'));
assert.ok(presentationStyles.includes("--kinich-scene-duration: 760ms"));
assert.ok(presentationStyles.includes("will-change: transform, opacity"));
assert.ok(presentationStyles.includes(".dsh-kinich-click-burst > i"));
assert.ok(presentationStyles.includes("overflow: visible"), "Click fragments must escape the 1px burst origin");
assert.equal(/\.dsh-kinich-click-burst\s*\{[^}]*contain:\s*[^;}]*paint/s.test(presentationStyles), false, "Paint containment would clip the burst to its 1px origin");
assert.equal(presentationStyles.includes("steps("), false, "v1.3 click presentation must not quantize motion into low-frame steps");

console.log("Kinich v1.3 presentation and high-refresh feedback tests passed.");
