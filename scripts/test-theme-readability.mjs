import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as theme from "../src/client/theme/tokens.js";

// Independent sRGB oracle: assertions exercise emitted tokens, not the repair helper.
function luminance(hex) {
	assert.match(hex, /^#[0-9a-f]{6}$/i);
	const channels = hex.slice(1).match(/../g).map(value => Number.parseInt(value, 16) / 255)
		.map(value => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(first, second) {
	const a = luminance(first), b = luminance(second);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const kinich = pkg.name === "dsh-kinich-theme";
const presets = kinich ? theme.KINICH_THEME_PRESETS : { xiao: theme.XIAO_THEME_TOKENS };
const original = JSON.stringify(presets);
const samples = ["", "#000000", "#ffffff", "#808080", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
	"#00ffff", "#ff00ff", "#804000", "#408000", "#008040", "#004080", "#400080", "#800040",
	"#7f7fff", "#ff7f7f", "#7fff7f", "#e94256", "#238dd1", "#69aa32", "#9b5cd1", "#e8a225"];
const surfaces = ["bg-base", "bg-layer-1", "bg-layer-2", "bg-layer-3", "bg-overlay", "bg-multi-select", "markdown-code-block"]
	.map(name => "--dsw-alias-" + name).concat(["bubble", "bubble-highlight", "sidebar-fill", "sidebar-nav-item-active", "menu", "selector"].map(name => "--dsw-specific-" + name));
const text = ["label-primary", "label-secondary", "label-tertiary", "label-caption", "brand-text",
	"brand-primary-new-colorprimary-new-color", "label-primary-bluish", "state-business-primary"].map(name => "--dsw-alias-" + name);
const generate = (style, accent, wallpaper = false, visibility = 75, saved) => kinich
	? theme.getKinichThemeTokens(style, accent, wallpaper, visibility, saved)
	: theme.getXiaoThemeTokens(accent, wallpaper, visibility);
let checked = 0;
for (const [style, base] of Object.entries(presets)) for (const accent of samples) {
	const tokens = generate(style, accent);
	for (const mode of ["light", "dark"]) {
		for (const foreground of text) for (const background of surfaces) {
			const ratio = contrast(tokens[foreground][mode], base[background][mode]);
			assert.ok(ratio >= 4.5, `${style}/${mode}/${accent || "default"}: ${foreground} on ${background} = ${ratio}`);
			checked++;
		}
		for (const name of ["button-primary-fill", "button-primary-hover", "state-business-primary"]) {
			assert.ok(contrast(tokens["--dsw-alias-label-primary-foreground"][mode], tokens["--dsw-alias-" + name][mode]) >= 4.5);
			checked++;
		}
		for (const key of Object.keys(base).filter(key => /state-(?:success|warn|error)-/.test(key))) {
			assert.equal(tokens[key][mode], base[key][mode], "Semantic status colours must retain their meaning");
		}
	}
	for (const visibility of [0, 100]) {
		const wallpaper = generate(style, accent, true, visibility);
		for (const key of text) assert.deepEqual(wallpaper[key], tokens[key], "Wallpaper visibility must not re-sample or change the readable ink");
	}
}
if (kinich) {
	const saved = Object.freeze({ light: "#17a617", dark: "#7878ed", strongLight: "#138d13", strongDark: "#9999f0", foregroundLight: "#11150f", foregroundDark: "#11150f" });
	const copy = JSON.stringify(saved);
	const tokens = generate("phlogiston", "#00ff00", false, 75, saved);
	for (const mode of ["light", "dark"]) assert.ok(contrast(tokens["--dsw-alias-brand-text"][mode], presets.phlogiston["--dsw-alias-bg-layer-1"][mode]) >= 4.5);
	assert.equal(JSON.stringify(saved), copy, "Historical derived palettes must not be rewritten by presentation repair");
}
assert.equal(JSON.stringify(presets), original, "Theme presets are immutable inputs");
console.log(`${pkg.name}: ${checked} emitted text/button contrast pairs passed; semantic colours and saved palette inputs preserved.`);
