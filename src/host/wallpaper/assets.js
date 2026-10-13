import { createHash } from "node:crypto";
import { MAX_WALLPAPER_ASSET_BYTES, WallpaperError } from "../../shared/wallpaper.js";

export { MAX_WALLPAPER_ASSET_BYTES };
export const MAX_WALLPAPER_PIXELS = 3840 * 2160;
export const WALLPAPER_ASSET_EXTENSIONS = Object.freeze({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "font/woff2": "woff2" });
export const wallpaperHash = bytes => createHash("sha256").update(bytes).digest("hex");
export const WALLPAPER_NORMALIZATION_RULES = Object.freeze({
	"static-webp-v1": "PNG/JPEG/WebP source <=15MiB and <=40M pixels; no upscaling; <=1920x1080; WebP data URL <=512KiB; canvas removes source metadata.",
	"dynamic-webp-v1": "PNG/JPEG/WebP source <=15MiB and <=40M pixels; no upscaling; <=3840x2160; WebP bytes <=2MiB; canvas removes source metadata.",
	"final-bytes-v1": "Validated final image/font bytes; <=2MiB; images <=3840x2160. No recoding is performed by storage.",
	"historic-final-bytes-v1": "Existing displayed final bytes preserved without recoding. Original normalization pipeline was not recorded by the prior candidate."
});
export function wallpaperNormalization(info, version = "final-bytes-v1") {
	if (!Object.hasOwn(WALLPAPER_NORMALIZATION_RULES, version)) throw new WallpaperError("normalization-version", "Unsupported wallpaper normalization version");
	if (version === "static-webp-v1" && (info.mediaType !== "image/webp" || info.width > 1920 || info.height > 1080 || 23 + 4 * Math.ceil(info.byteLength / 3) > 512 * 1024)) throw new WallpaperError("static-normalization-bounds");
	if (version === "dynamic-webp-v1" && info.mediaType !== "image/webp") throw new WallpaperError("dynamic-normalization-type");
	return { relativeBlobPath: `blobs/${info.sha256}.${info.extension}`, normalizationVersion: version, normalizationRules: WALLPAPER_NORMALIZATION_RULES[version] };
}

/** Reject untrusted binary data whose real container bounds or dimensions disagree. */
export function inspectWallpaperAsset(input) {
	const bytes = Buffer.from(input);
	if (bytes.length < 24 || bytes.length > MAX_WALLPAPER_ASSET_BYTES) throw new WallpaperError("asset-size");
	let mediaType, width = 0, height = 0;
	if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
		mediaType = "image/png";
		if (bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.toString("ascii", bytes.length - 8, bytes.length - 4) !== "IEND") throw new WallpaperError("invalid-image");
		width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
	} else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
		mediaType = "image/webp";
		if (bytes.readUInt32LE(4) + 8 !== bytes.length) throw new WallpaperError("invalid-image");
		const kind = bytes.toString("ascii", 12, 16);
		if (kind === "VP8X" && bytes.length >= 30) {
			if (bytes[20] & 2) throw new WallpaperError("animated-import-not-supported");
			width = 1 + bytes.readUIntLE(24, 3); height = 1 + bytes.readUIntLE(27, 3);
		} else if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
			const bits = bytes.readUInt32LE(21); width = 1 + (bits & 0x3fff); height = 1 + ((bits >>> 14) & 0x3fff);
		} else if (kind === "VP8 " && bytes.length >= 30 && bytes.subarray(23, 26).equals(Buffer.from([157,1,42]))) {
			width = bytes.readUInt16LE(26) & 0x3fff; height = bytes.readUInt16LE(28) & 0x3fff;
		} else throw new WallpaperError("invalid-image");
	} else if (bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
		mediaType = "image/jpeg";
		let offset = 2;
		for (;;) {
			if (offset + 4 >= bytes.length || bytes[offset++] !== 255) throw new WallpaperError("invalid-image");
			while (bytes[offset] === 255) offset++;
			const marker = bytes[offset++];
			if ([0x01,0xd8,...Array.from({ length: 8 }, (_, i) => 0xd0 + i)].includes(marker)) continue;
			if (offset + 2 > bytes.length) throw new WallpaperError("invalid-image");
			const size = bytes.readUInt16BE(offset);
			if (size < 2 || offset + size > bytes.length) throw new WallpaperError("invalid-image");
			if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
				if (size < 8) throw new WallpaperError("invalid-image");
				height = bytes.readUInt16BE(offset + 3); width = bytes.readUInt16BE(offset + 5); break;
			}
			if (marker === 0xda) throw new WallpaperError("invalid-image");
			offset += size;
		}
	} else if (bytes.toString("ascii", 0, 4) === "wOF2" && bytes.length >= 48 && bytes.readUInt32BE(8) === bytes.length) mediaType = "font/woff2";
	else throw new WallpaperError("unsupported-asset");
	if (mediaType !== "font/woff2" && (!width || !height || width > 3840 || height > 2160 || width * height > MAX_WALLPAPER_PIXELS)) throw new WallpaperError("asset-dimensions");
	return { sha256: wallpaperHash(bytes), mediaType, extension: WALLPAPER_ASSET_EXTENSIONS[mediaType], byteLength: bytes.length, width, height };
}
