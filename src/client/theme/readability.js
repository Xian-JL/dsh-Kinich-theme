import { contrastRatio } from "../background/palette.js";

const HEX = /^#[0-9a-f]{6}$/i;
const SURFACES = Object.freeze([
	"--dsw-alias-bg-base", "--dsw-alias-bg-layer-1", "--dsw-alias-bg-layer-2",
	"--dsw-alias-bg-layer-3", "--dsw-alias-bg-overlay", "--dsw-specific-bubble",
	"--dsw-specific-sidebar-fill", "--dsw-specific-menu", "--dsw-specific-selector",
	"--dsw-specific-bubble-highlight", "--dsw-specific-sidebar-nav-item-active",
	"--dsw-alias-bg-multi-select", "--dsw-alias-markdown-code-block"
]);
const TEXT = Object.freeze([
	"--dsw-alias-label-primary", "--dsw-alias-label-secondary", "--dsw-alias-label-tertiary",
	"--dsw-alias-label-caption", "--dsw-alias-brand-text",
	"--dsw-alias-brand-primary-new-colorprimary-new-color", "--dsw-alias-label-primary-bluish",
	"--dsw-alias-state-business-primary"
]);
const rgb = color => [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
const mix = (channels, end, step) => "#" + channels.map(channel =>
	Math.round(channel + (end - channel) * step / 255).toString(16).padStart(2, "0")).join("");

/** Keep valid colours unchanged; repair only failing pairs with the nearest neutral mix. */
export function readableColor(color, backgrounds, minimum = 4.5) {
	const surfaces = backgrounds.filter(value => typeof value === "string" && HEX.test(value));
	if (!HEX.test(color ?? "") || surfaces.length === 0) return color;
	const passes = candidate => surfaces.every(surface => contrastRatio(candidate, surface) >= minimum);
	if (passes(color)) return color;
	const channels = rgb(color);
	let best = color, distance = Infinity;
	for (const end of [0, 255]) {
		if (!passes(mix(channels, end, 255))) continue;
		let low = 0, high = 255;
		while (high - low > 1) {
			const middle = Math.floor((low + high) / 2);
			if (passes(mix(channels, end, middle))) high = middle;
			else low = middle;
		}
		const candidate = mix(channels, end, high);
		const delta = rgb(candidate).reduce((total, channel, index) => total + (channel - channels[index]) ** 2, 0);
		if (delta < distance) { best = candidate; distance = delta; }
	}
	return best;
}

/**
 * Apply contrast floors to emitted roles against the theme's opaque surfaces.
 * Wallpaper pixels are unknown: this is not a whole-page WCAG conformance claim.
 * Persisted samples, saved palettes, surfaces and semantic error/warning/success colours stay untouched.
 */
export function enforceReadableThemeTokens(tokens, opaqueBase) {
	const update = (key, mode, backgrounds, floor) => {
		if (!tokens[key]) return;
		const color = readableColor(tokens[key][mode], backgrounds, floor);
		if (color !== tokens[key][mode]) tokens[key] = Object.freeze({ ...tokens[key], [mode]: color });
	};
	for (const mode of ["light", "dark"]) {
		const surfaces = SURFACES.map(key => opaqueBase[key]?.[mode]);
		for (const key of TEXT) update(key, mode, surfaces, 4.5);
		for (const key of ["--dsw-alias-brand-primary", "--dsw-specific-sidebar-nav-item-active-accent"]) {
			update(key, mode, surfaces, 3);
		}
		const foreground = tokens["--dsw-alias-label-primary-foreground"]?.[mode];
		for (const key of ["--dsw-alias-button-primary-fill", "--dsw-alias-button-primary-hover", "--dsw-alias-state-business-primary"]) {
			update(key, mode, [foreground], 4.5);
		}
	}
	return tokens;
}
