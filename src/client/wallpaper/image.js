import { normalizeKinichBackgroundFile, KinichBackgroundError, MAX_BACKGROUND_SOURCE_BYTES, MAX_BACKGROUND_SOURCE_PIXELS, BACKGROUND_IMAGE_TYPES } from "../background/image.js";
import { MAX_WALLPAPER_ASSET_BYTES } from "../../shared/wallpaper.js";
import { extractDominantKinichAccent } from "../background/palette.js";

/** Static imports retain the bounded legacy WebP pipeline, including one accent sample. */
export async function normalizeKinichStaticWallpaperImage(file) {
	const image = await normalizeKinichBackgroundFile(file);
	const bytes = Uint8Array.from(atob(image.dataUrl.split(",")[1]), character => character.charCodeAt(0));
	return Object.freeze({ ...image, blob: new Blob([bytes], { type: "image/webp" }) });
}

/** Prepare one locally selected image without preserving its original path or EXIF. */
export async function normalizeKinichWallpaperImage(file, { sampleAccent = true } = {}) {
	if (!file || !BACKGROUND_IMAGE_TYPES.includes(file.type)) throw new KinichBackgroundError("unsupported-type");
	if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_BACKGROUND_SOURCE_BYTES) throw new KinichBackgroundError("source-too-large");
	if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") throw new KinichBackgroundError("processor-unavailable");
	const objectUrl = URL.createObjectURL(file);
	try {
		const image = new Image();
		await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new KinichBackgroundError("invalid-image")); image.src = objectUrl; });
		if (!Number.isInteger(image.naturalWidth) || !Number.isInteger(image.naturalHeight) || image.naturalWidth * image.naturalHeight > MAX_BACKGROUND_SOURCE_PIXELS) throw new KinichBackgroundError("too-many-pixels");
		const scale = Math.min(1, 3840 / image.naturalWidth, 2160 / image.naturalHeight);
		let width = Math.max(1, Math.round(image.naturalWidth * scale));
		let height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas"); const context = canvas.getContext("2d", { willReadFrequently: true });
		if (!context) throw new KinichBackgroundError("processor-unavailable");
		for (let attempt = 0; attempt < 10; attempt++) {
			canvas.width = width; canvas.height = height; context.clearRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
			const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", Math.max(0.46, 0.84 - attempt * 0.08)));
			if (!blob || blob.type !== "image/webp") throw new KinichBackgroundError("webp-unavailable");
			if (blob.size <= MAX_WALLPAPER_ASSET_BYTES) return Object.freeze({ blob, width, height,
				accent: sampleAccent ? extractDominantKinichAccent(context.getImageData(0, 0, width, height).data) : null });
			width = Math.max(1, Math.floor(width * 0.85)); height = Math.max(1, Math.floor(height * 0.85));
		}
		throw new KinichBackgroundError("output-too-large");
	} catch (error) { if (error instanceof KinichBackgroundError) throw error; throw new KinichBackgroundError("invalid-image"); }
	finally { URL.revokeObjectURL(objectUrl); }
}
