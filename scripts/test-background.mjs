import assert from "node:assert/strict";
import {
	deriveKinichAccentPalette,
	contrastRatio,
	extractDominantKinichAccent
} from "../src/client/background/palette.js";
import {
	kinichBackgroundDimensions,
	MAX_BACKGROUND_OUTPUT_HEIGHT,
	MAX_BACKGROUND_OUTPUT_WIDTH,
	MAX_BACKGROUND_SOURCE_BYTES,
	MAX_BACKGROUND_SOURCE_PIXELS,
	validateKinichBackgroundFile
} from "../src/client/background/image.js";
import { DEFAULT_KINICH_SETTINGS, KINICH_SETTING_DEFINITIONS, MAX_BACKGROUND_DATA_URL_LENGTH, isKinichSettingValue } from "../src/shared/settings.js";
import { decodeKinichSettings } from "../src/client/settings/decode.js";

function solidPixels(color, count = 64) {
	return Uint8ClampedArray.from(Array.from({ length: count }, () => color).flat());
}

assert.match(extractDominantKinichAccent(solidPixels([220, 55, 70, 255])), /^#[0-9a-f]{6}$/i);
assert.equal(extractDominantKinichAccent(solidPixels([128, 128, 128, 255])), null,
	"A grayscale image has no safe dominant accent");
assert.equal(extractDominantKinichAccent(solidPixels([220, 55, 70, 0])), null,
	"Transparent pixels do not influence accent extraction");
assert.equal(extractDominantKinichAccent(new Uint8ClampedArray([1, 2, 3])), null,
	"Malformed image data fails closed");

const lightSurface = "#F8FAF3";
const darkSurface = "#101E1B";
for (const sourceAccent of ["#e94256", "#238dd1", "#69aa32", "#9b5cd1", "#e8a225"]) {
	const palette = deriveKinichAccentPalette(sourceAccent, lightSurface, darkSurface);
	assert.ok(palette, `${sourceAccent} should derive a palette`);
	for (const color of [palette.light, palette.dark, palette.strongLight, palette.strongDark,
		palette.foregroundLight, palette.foregroundDark]) assert.match(color, /^#[0-9a-f]{6}$/i);
	assert.ok(contrastRatio(palette.light, lightSurface) >= 3, `${sourceAccent} light accent contrast`);
	assert.ok(contrastRatio(palette.dark, darkSurface) >= 3, `${sourceAccent} dark accent contrast`);
	assert.ok(contrastRatio(palette.foregroundLight, palette.light) >= 4.5, `${sourceAccent} light button text contrast`);
	assert.ok(contrastRatio(palette.foregroundDark, palette.dark) >= 4.5, `${sourceAccent} dark button text contrast`);
}
assert.equal(deriveKinichAccentPalette("not-a-color"), null);

assert.equal(validateKinichBackgroundFile({ type: "image/png", size: 100 }), true);
assert.equal(validateKinichBackgroundFile({ type: "image/jpeg", size: 100 }), true);
assert.equal(validateKinichBackgroundFile({ type: "image/webp", size: 100 }), true);
for (const file of [
	{ type: "image/gif", size: 100 },
	{ type: "image/png", size: 0 },
	{ type: "image/png", size: MAX_BACKGROUND_SOURCE_BYTES + 1 }
]) assert.throws(() => validateKinichBackgroundFile(file));
assert.throws(() => kinichBackgroundDimensions(8000, 6000), /too-many-pixels/);
assert.deepEqual(kinichBackgroundDimensions(4000, 2000), { width: 1920, height: 960 });
assert.ok(MAX_BACKGROUND_DATA_URL_LENGTH > 400_000 && MAX_BACKGROUND_DATA_URL_LENGTH < 600_000);
assert.equal(MAX_BACKGROUND_SOURCE_PIXELS, 40_000_000);
assert.equal(MAX_BACKGROUND_OUTPUT_WIDTH, 1920);
assert.equal(MAX_BACKGROUND_OUTPUT_HEIGHT, 1080);

assert.equal(DEFAULT_KINICH_SETTINGS.customBackgroundImage, "");
assert.equal(DEFAULT_KINICH_SETTINGS.customBackgroundAccent, "");
assert.equal(DEFAULT_KINICH_SETTINGS.backgroundAutoPalette, true);
assert.equal(isKinichSettingValue(KINICH_SETTING_DEFINITIONS.customBackgroundImage, "data:image/webp;base64,YWJj"), true);
assert.equal(isKinichSettingValue(KINICH_SETTING_DEFINITIONS.customBackgroundImage, "https://example.com/image.webp"), false,
	"Remote backgrounds are not accepted");
assert.equal(isKinichSettingValue(KINICH_SETTING_DEFINITIONS.customBackgroundAccent, "#abc123"), true);
assert.equal(isKinichSettingValue(KINICH_SETTING_DEFINITIONS.customBackgroundAccent, "rgba(1,2,3,.5)"), false);

const oldSettings = decodeKinichSettings({ visualStyle: "phlogiston", animateAjaw: false });
assert.equal(oldSettings.visualStyle, "phlogiston");
assert.equal(oldSettings.animateAjaw, false);
assert.equal(oldSettings.customBackgroundImage, "");
assert.equal(oldSettings.backgroundAutoPalette, true);
const damagedBackground = decodeKinichSettings({ visualStyle: "sunlit", customBackgroundImage: "file:///private/path.jpg" });
assert.equal(damagedBackground.visualStyle, "sunlit", "A corrupt new asset field must not reset older valid settings");
assert.equal(damagedBackground.customBackgroundImage, "");

console.log("Kinich custom background and palette tests passed.");
