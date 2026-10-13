import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { WallpaperStore } from "../src/host/wallpaper/store.js";
import { importWallpaperArchive } from "../src/host/wallpaper/archive.js";
import { inspectWallpaperAsset, wallpaperHash } from "../src/host/wallpaper/assets.js";

const paths = process.argv.slice(2); assert.ok(paths.length);
const bytes = await readFile(new URL("../assets/mascot/ajaw-mark.png",import.meta.url)); const info=inspectWallpaperAsset(bytes);
const profileDir=await mkdtemp(join(tmpdir(),"kinich-desktop-export-audit-"));
const store=new WallpaperStore({profileDir,profileName:"desktop-export-audit",pluginVersion:"2.0.0-alpha.9",builtin:async()=>({assets:[{...info,bytes}],manifest:{schemaVersion:1,id:"audit-default",version:"1",name:"Audit",representativeAssetId:info.sha256,projects:[{id:"one",title:"One",assetIds:[info.sha256],coverId:info.sha256,heroId:info.sha256}]}})});
const initial=await store.ensure(), volumes=[], hashes=new Set();
try {
  for (const path of paths) {
    const archive=await readFile(path), files=unzipSync(archive), manifest=JSON.parse(Buffer.from(files["manifest.json"]).toString("utf8"));
    for(const [name,data] of Object.entries(files)) { const match=/^blobs\/([a-f0-9]{64})\.(png|jpg|webp|woff2)$/.exec(name); if(match){assert.equal(wallpaperHash(data),match[1]);hashes.add(match[1]);} }
    const result=await importWallpaperArchive(store,archive); assert.equal((await store.getState()).active,initial.active);
    volumes.push({path,byteLength:archive.length,sha256:wallpaperHash(archive),volume:manifest.volume,counts:manifest.counts,datasetId:manifest.datasetId,result});
  }
  assert.equal(new Set(volumes.map(volume=>volume.datasetId)).size,1);assert.notEqual(volumes.at(-1).result.staged,true);
  const state=await store.getState();assert.ok(state.history.length);
  const restored=await store.restore(state.history[0],state.revision);const current=await store.current();
  assert.equal(current.active.mode,"dynamic");assert.equal(current.manifest.projects.length,8);
  for(const hash of hashes) assert.equal(wallpaperHash((await store.readAsset(hash)).bytes),hash);
  const record={recordedAtUtc:new Date().toISOString(),profileDir,volumes,distinctAssets:hashes.size,restoredSnapshot:restored.active,projects:current.manifest.projects.length,parameters:current.active.parameters,sampledAccent:current.active.sampledAccent,currentPreservedDuringImport:true};
  await writeFile("docs/wallpaper-reference/2026-10-08/DESKTOP_EXPORT_ROUNDTRIP_2026-10-12.json",JSON.stringify(record,null,2)+"\n");
  console.log(JSON.stringify({volumes:volumes.length,assets:hashes.size,projects:record.projects,currentPreservedDuringImport:true,restoredParameters:record.parameters,profileDir}));
} finally {await store.close();}
