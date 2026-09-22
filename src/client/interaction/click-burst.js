export const CLICK_BURST_POOL_SIZE = 4;
export const CLICK_BURST_FRAGMENT_COUNT = 10;

export function clickBurstFragmentMotion(index) {
	return {
		angle: index * 36 + (index % 2 ? 7 : -5),
		distance: 22 + index % 3 * 5,
		delay: index % 4 * 9
	};
}

export function clickBurstPoolSlot(sequence, poolSize = CLICK_BURST_POOL_SIZE) {
	return sequence % poolSize;
}

export function playClickBurst(node, point, generation) {
	if (!node || typeof node.querySelector !== "function") return;
	node.hidden = false;
	node.dataset.generation = String(generation);
	node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
	for (const animation of node.getAnimations({ subtree: true })) animation.cancel();

	const animate = (selector, keyframes, options) => node.querySelector(selector)?.animate(keyframes, {
		duration: 270,
		fill: "both",
		easing: "cubic-bezier(.16,.72,.24,1)",
		...options
	});
	animate(".dsh-kinich-click-burst__core", [
		{ opacity: 0, transform: "rotate(45deg) scale(.2)" },
		{ opacity: 1, transform: "rotate(45deg) scale(1.18)", offset: .28 },
		{ opacity: .92, transform: "rotate(45deg) scale(.78)", offset: .64 },
		{ opacity: 0, transform: "rotate(45deg) scale(.22)" }
	], { duration: 260 });
	animate(".dsh-kinich-click-burst__ring", [
		{ opacity: 0, transform: "rotate(45deg) scale(.24)" },
		{ opacity: .92, offset: .34 },
		{ opacity: 0, transform: "rotate(45deg) scale(1.12)" }
	], { duration: 270 });
	animate(".dsh-kinich-click-burst__arc", [
		{ opacity: 0, transform: "rotate(42deg) translateX(-5px) scaleX(.38)" },
		{ opacity: .95, offset: .35 },
		{ opacity: 0, transform: "rotate(42deg) translateX(7px) scaleX(1)" }
	], { duration: 245, delay: 22 });

	let finalAnimation;
	for (const fragment of node.querySelectorAll(".dsh-kinich-click-burst__fragment")) {
		const angle = Number(fragment.dataset.angle);
		const distance = Number(fragment.dataset.distance);
		const delay = Number(fragment.dataset.delay);
		finalAnimation = fragment.animate([
			{ opacity: 0, transform: `rotate(${angle}deg) translateX(7px) rotate(45deg) scale(.45)` },
			{ opacity: .96, offset: .24 },
			{ opacity: 0, transform: `rotate(${angle}deg) translateX(${distance}px) rotate(45deg) scale(.18)` }
		], { duration: 265, delay, fill: "both", easing: "cubic-bezier(.16,.72,.24,1)" });
	}
	if (finalAnimation) {
		finalAnimation.onfinish = () => {
			if (node.dataset.generation === String(generation)) node.hidden = true;
		};
	}
}
