const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function rgbToHsl(red, green, blue) {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	const lightness = (max + min) / 2;
	if (delta === 0) return { hue: 0, saturation: 0, lightness };
	const saturation = delta / (1 - Math.abs(2 * lightness - 1));
	let hue;
	if (max === r) hue = ((g - b) / delta) % 6;
	else if (max === g) hue = (b - r) / delta + 2;
	else hue = (r - g) / delta + 4;
	return { hue: (hue * 60 + 360) % 360, saturation, lightness };
}

function hslToHex(hue, saturation, lightness) {
	const h = ((hue % 360) + 360) % 360;
	const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const x = c * (1 - Math.abs(h / 60 % 2 - 1));
	const m = lightness - c / 2;
	let rgb;
	if (h < 60) rgb = [c, x, 0];
	else if (h < 120) rgb = [x, c, 0];
	else if (h < 180) rgb = [0, c, x];
	else if (h < 240) rgb = [0, x, c];
	else if (h < 300) rgb = [x, 0, c];
	else rgb = [c, 0, x];
	return `#${rgb.map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(value) {
	if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) return null;
	return [1, 3, 5].map(index => Number.parseInt(value.slice(index, index + 2), 16));
}

export function colorLuminance(hex) {
	const rgb = parseHex(hex);
	if (!rgb) return null;
	const linear = rgb.map(channel => {
		const value = channel / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrastRatio(first, second) {
	const firstLuminance = colorLuminance(first);
	const secondLuminance = colorLuminance(second);
	if (firstLuminance === null || secondLuminance === null) return 0;
	const [bright, dark] = [firstLuminance, secondLuminance].sort((a, b) => b - a);
	return (bright + 0.05) / (dark + 0.05);
}

/** Returns a tint color that adjusts only the custom image layer. */
export function getKinichBackgroundAdjustment(brightness) {
	if (typeof brightness !== "number" || !Number.isFinite(brightness)) return "transparent";
	const normalized = clamp(brightness, 50, 180);
	if (normalized === 100) return "transparent";
	const opacity = Number((Math.abs(normalized - 100) / 100).toFixed(3));
	return normalized > 100
		? `rgba(255, 255, 255, ${opacity})`
		: `rgba(0, 0, 0, ${opacity})`;
}

/** Picks a stable chromatic accent; transparency, near-neutral, and extreme pixels are ignored. */
export function extractDominantKinichAccent(pixels) {
	if (!pixels || !Number.isFinite(pixels.length) || pixels.length < 4 || pixels.length % 4 !== 0) return null;
	const bucketCount = 24;
	const buckets = Array.from({ length: bucketCount }, () => ({ weight: 0, sine: 0, cosine: 0, saturation: 0 }));
	const pixelCount = pixels.length / 4;
	const stride = Math.max(1, Math.floor(pixelCount / 12_000));
	for (let pixel = 0; pixel < pixelCount; pixel += stride) {
		const offset = pixel * 4;
		const alpha = pixels[offset + 3] / 255;
		if (alpha < 0.45) continue;
		const { hue, saturation, lightness } = rgbToHsl(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
		if (saturation < 0.22 || lightness < 0.10 || lightness > 0.90) continue;
		const weight = alpha * saturation;
		const bucket = buckets[Math.floor(hue / 15) % bucketCount];
		const radians = hue * Math.PI / 180;
		bucket.weight += weight;
		bucket.sine += Math.sin(radians) * weight;
		bucket.cosine += Math.cos(radians) * weight;
		bucket.saturation += saturation * weight;
	}
	let selected;
	for (const bucket of buckets) if (!selected || bucket.weight > selected.weight) selected = bucket;
	if (!selected || selected.weight === 0) return null;
	const hue = (Math.atan2(selected.sine, selected.cosine) * 180 / Math.PI + 360) % 360;
	const saturation = clamp(selected.saturation / selected.weight, 0.48, 0.76);
	return hslToHex(hue, saturation, 0.5);
}

function chooseAccent(hue, saturation, background, targetLightness, bounds) {
	let bestSafe = null;
	let bestAny = null;
	for (let percent = Math.round(bounds[0] * 100); percent <= Math.round(bounds[1] * 100); percent += 1) {
		const lightness = percent / 100;
		const color = hslToHex(hue, saturation, lightness);
		const ratio = contrastRatio(color, background);
		const candidate = { color, ratio, lightness, distance: Math.abs(lightness - targetLightness) };
		if (!bestAny || candidate.ratio > bestAny.ratio) bestAny = candidate;
		if (ratio >= 3 && (!bestSafe || candidate.distance < bestSafe.distance)) bestSafe = candidate;
	}
	return bestSafe ?? bestAny;
}

function contrastingForeground(background) {
	const black = "#11150f";
	const white = "#ffffff";
	return contrastRatio(black, background) >= contrastRatio(white, background) ? black : white;
}

/** Derives paired light/dark accent values that remain visible against Kinich's surfaces. */
export function deriveKinichAccentPalette(accentHex, lightSurface = "#F8FAF3", darkSurface = "#101E1B") {
	const rgb = parseHex(accentHex);
	if (!rgb || colorLuminance(lightSurface) === null || colorLuminance(darkSurface) === null) return null;
	const { hue, saturation } = rgbToHsl(...rgb);
	const safeSaturation = clamp(saturation, 0.48, 0.76);
	const light = chooseAccent(hue, safeSaturation, lightSurface, 0.39, [0.28, 0.55]);
	const dark = chooseAccent(hue, safeSaturation, darkSurface, 0.70, [0.54, 0.88]);
	if (!light || !dark || light.ratio < 3 || dark.ratio < 3) return null;
	const strongLight = hslToHex(hue, safeSaturation, clamp(light.lightness - 0.055, 0.25, 0.58));
	const strongDark = hslToHex(hue, safeSaturation, clamp(dark.lightness + 0.06, 0.52, 0.9));
	return Object.freeze({
		light: light.color,
		dark: dark.color,
		strongLight,
		strongDark,
		foregroundLight: contrastingForeground(light.color),
		foregroundDark: contrastingForeground(dark.color)
	});
}
