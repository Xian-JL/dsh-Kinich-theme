import assert from "node:assert/strict";
import { normalizeKinichStaticWallpaperImage } from "../src/client/wallpaper/image.js";
import { MAX_BACKGROUND_DATA_URL_LENGTH } from "../src/shared/settings.js";

const nativeURL = globalThis.URL;
const nativeImage = globalThis.Image;
const nativeDocument = globalThis.document;
let revoked = 0, dimensions, encodings = 0;
globalThis.URL = { createObjectURL: () => "blob:test", revokeObjectURL: () => revoked++ };
globalThis.Image = class { naturalWidth = 4000; naturalHeight = 2000; set src(_) { queueMicrotask(() => this.onload()); } };
const context = { clearRect() {}, drawImage(_, x, y, width, height) { dimensions = [width, height]; }, getImageData: () => ({ data: Uint8ClampedArray.from([128,128,128,255]) }) };
globalThis.document = { createElement: () => ({ getContext: () => context, toDataURL: () => { encodings++; return encodings === 1 ? "data:image/webp;base64," + "A".repeat(MAX_BACKGROUND_DATA_URL_LENGTH) : "data:image/webp;base64," + Buffer.from("final normalized bytes").toString("base64"); } }) };
try {
  const result = await normalizeKinichStaticWallpaperImage({ name:"private-original-name.jpg", type:"image/jpeg", size:2000 });
  assert.deepEqual(dimensions, [1920,960]); assert.equal(encodings,2);
  assert.ok(result.dataUrl.length <= MAX_BACKGROUND_DATA_URL_LENGTH);
  assert.equal(result.blob.type,"image/webp"); assert.equal(await result.blob.text(),"final normalized bytes");
  assert.equal(result.accent,null); assert.equal(revoked,1); assert.equal(result.name,undefined);
  await assert.rejects(normalizeKinichStaticWallpaperImage({type:"image/gif",size:100}));
  console.log("Static wallpaper import passed: legacy bounds, size retry, normalized bytes, grayscale sampling, no filename, object URL cleanup.");
} finally { globalThis.URL=nativeURL; globalThis.Image=nativeImage; globalThis.document=nativeDocument; }
