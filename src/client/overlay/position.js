const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function nudgeAjawPosition(position, key, overlayRect, buttonRect, fast = false) {
	const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
	const direction = directions[key];
	if (!direction || !overlayRect?.width || !overlayRect?.height || !buttonRect) return null;
	const distance = fast ? 32 : 8;
	const minX = buttonRect.width / 2 / overlayRect.width * 100;
	const maxX = 100 - minX;
	const minY = buttonRect.height / 2 / overlayRect.height * 100;
	const maxY = 100 - minY;
	return {
		x: Number(clamp(position.x + direction[0] * distance / overlayRect.width * 100, minX, maxX).toFixed(3)),
		y: Number(clamp(position.y + direction[1] * distance / overlayRect.height * 100, minY, maxY).toFixed(3))
	};
}
