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
import { getKinichThemeTokens } from "../src/client/theme/tokens.js";
import { KINICH_PARALLAX_LIMIT_PX, kinichParallaxOffset } from "../src/client/presentation/parallax-model.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const overlay = await readFile(resolve(ROOT, "src/client/overlay/kinich-overlay.js"), "utf8");
const clickSource = await readFile(resolve(ROOT, "src/client/interaction/click-burst.js"), "utf8");
const presentationStyles = await readFile(resolve(ROOT, "src/client/styles-v13.css"), "utf8");
const parallaxSource = await readFile(resolve(ROOT, "src/client/presentation/parallax.js"), "utf8");
const baseStyles = await readFile(resolve(ROOT, "src/client/styles.css"), "utf8");

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
assert.equal(KINICH_PARALLAX_LIMIT_PX, 4);
const scene = { left: 100, top: 50, width: 800, height: 600 };
assert.deepEqual(kinichParallaxOffset(100, 50, scene), { x: -4, y: -4 });
assert.deepEqual(kinichParallaxOffset(500, 350, scene), { x: 0, y: 0 });
assert.deepEqual(kinichParallaxOffset(900, 650, scene), { x: 4, y: 4 });
assert.deepEqual(kinichParallaxOffset(Number.NaN, 350, scene), { x: 0, y: 0 });

function luminance(hex) {
	const channels = hex.slice(1).match(/.{2}/g).map(part => parseInt(part, 16) / 255);
	const [red, green, blue] = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
	return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
function contrast(first, second) {
	const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
	return (values[0] + 0.05) / (values[1] + 0.05);
}
const jungleTokens = getKinichThemeTokens("jungle");
for (const scheme of ["light", "dark"]) {
	for (const textToken of ["--dsw-alias-label-tertiary", "--dsw-alias-label-caption"]) {
		assert.ok(contrast(jungleTokens[textToken][scheme], jungleTokens["--dsw-alias-bg-layer-1"][scheme]) >= 4.5,
			`${scheme} ${textToken} should remain readable on the main settings surface`);
	}
}

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
assert.equal(/\.(?:pXSMma|Hqq-bq|wSkVaW|Dc7zOa)_/.test(`${baseStyles}\n${presentationStyles}`), false, "Welcome layout must not depend on DSH build-hashed CSS classes");
assert.ok(presentationStyles.includes("[data-phase='hero'] [class$='_headline']"));
assert.ok(presentationStyles.includes("[class$='_composerHero']"));
assert.ok(presentationStyles.includes("dsh-kinich-navigation-light"));
assert.ok(presentationStyles.includes("dsh-kinich-send-trace"));
assert.ok(presentationStyles.includes("[data-intensity='immersive'][data-ambient-motion='true'][data-page-phase='hero']"));
assert.ok(presentationStyles.includes("dsh-kinich-hero-copy-enter"));
assert.ok(parallaxSource.includes("new ResizeObserver(resize)"), "Parallax must track sidebar and panel geometry changes");
assert.equal(parallaxSource.includes("if (reducedMotion?.matches) return;"), false, "A reduced-motion setting at mount must not prevent a later opt-in change");

console.log("Kinich presentation and high-refresh feedback tests passed.");
