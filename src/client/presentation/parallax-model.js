export const KINICH_PARALLAX_LIMIT_PX = 4;

export function kinichParallaxOffset(clientX, clientY, rect, limit = KINICH_PARALLAX_LIMIT_PX) {
	if (!rect || rect.width <= 0 || rect.height <= 0 || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return { x: 0, y: 0 };
	const clamp = value => Math.max(-1, Math.min(1, value));
	return {
		x: Number((clamp((clientX - rect.left) / rect.width * 2 - 1) * limit).toFixed(2)),
		y: Number((clamp((clientY - rect.top) / rect.height * 2 - 1) * limit).toFixed(2))
	};
}
