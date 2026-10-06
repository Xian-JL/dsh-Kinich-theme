import { extractDominantKinichAccent } from "./palette.js";
import { MAX_BACKGROUND_DATA_URL_LENGTH } from "../../shared/settings.js";

export const MAX_BACKGROUND_SOURCE_BYTES = 15 * 1024 * 1024;
export const MAX_BACKGROUND_SOURCE_PIXELS = 40_000_000;
export const MAX_BACKGROUND_OUTPUT_WIDTH = 1920;
export const MAX_BACKGROUND_OUTPUT_HEIGHT = 1080;
export const BACKGROUND_IMAGE_TYPES = Object.freeze(["image/png", "image/jpeg", "image/webp"]);

export class KinichBackgroundError extends Error {
	constructor(code) {
		super(code);
		this.name = "KinichBackgroundError";
		this.code = code;
	}
}

export function validateKinichBackgroundFile(file) {
	if (!file || !BACKGROUND_IMAGE_TYPES.includes(file.type)) throw new KinichBackgroundError("unsupported-type");
	if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_BACKGROUND_SOURCE_BYTES) {
		throw new KinichBackgroundError("source-too-large");
	}
	return true;
}

export function kinichBackgroundDimensions(width, height) {
	if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
		throw new KinichBackgroundError("invalid-image");
	}
	if (width * height > MAX_BACKGROUND_SOURCE_PIXELS) throw new KinichBackgroundError("too-many-pixels");
	const scale = Math.min(1, MAX_BACKGROUND_OUTPUT_WIDTH / width, MAX_BACKGROUND_OUTPUT_HEIGHT / height);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

function loadImage(source) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new KinichBackgroundError("invalid-image"));
		image.src = source;
	});
}

/** Converts a user-selected file to bounded, metadata-free WebP kept in profile settings. */
export async function normalizeKinichBackgroundFile(file) {
	validateKinichBackgroundFile(file);
	if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function" || typeof document === "undefined") {
		throw new KinichBackgroundError("processor-unavailable");
	}
	const objectURL = URL.createObjectURL(file);
	try {
		const image = await loadImage(objectURL);
		const initial = kinichBackgroundDimensions(image.naturalWidth, image.naturalHeight);
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d", { willReadFrequently: true });
		if (!context) throw new KinichBackgroundError("processor-unavailable");
		let width = initial.width;
		let height = initial.height;
		let quality = 0.84;
		for (let attempt = 0; attempt < 10; attempt += 1) {
			canvas.width = width;
			canvas.height = height;
			context.clearRect(0, 0, width, height);
			context.drawImage(image, 0, 0, width, height);
			const dataUrl = canvas.toDataURL("image/webp", quality);
			if (!dataUrl.startsWith("data:image/webp;base64,")) throw new KinichBackgroundError("webp-unavailable");
			if (dataUrl.length <= MAX_BACKGROUND_DATA_URL_LENGTH) {
				const pixels = context.getImageData(0, 0, width, height).data;
				return Object.freeze({ dataUrl, accent: extractDominantKinichAccent(pixels), width, height });
			}
			if (quality > 0.54) quality -= 0.1;
			else {
				width = Math.max(1, Math.floor(width * 0.82));
				height = Math.max(1, Math.floor(height * 0.82));
				quality = 0.78;
			}
		}
		throw new KinichBackgroundError("output-too-large");
	} catch (error) {
		if (error instanceof KinichBackgroundError) throw error;
		throw new KinichBackgroundError("invalid-image");
	} finally {
		URL.revokeObjectURL(objectURL);
	}
}
