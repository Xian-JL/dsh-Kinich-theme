import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { WallpaperStore } from "../src/host/wallpaper/store.js";
const path="docs/wallpaper-reference/2026-10-08/INSTALLED_LIFECYCLE_2026-10-12.json";
const record=JSON.parse((await readFile(path,"utf8")).replace(/^\uFEFF/,""));
const store=new WallpaperStore({profileDir:record.profileDir,profileName:"lifecycle-audit",pluginVersion:"2.0.0-alpha.9",builtin:async()=>{throw new Error("Existing lifecycle data must not be replaced");}});
try {
  const initial=await store.ensure(),current=await store.current(); assert.equal(current.active.mode,"dynamic");
  const restored=[];
  for(const hash of initial.history) {const state=await store.getState();await store.restore(hash,state.revision);const view=await store.current();assert.equal(view.active.mode,"dynamic");assert.equal(view.manifest.projects.length,8);for(const id of [...view.manifest.assetIds,...view.manifest.fontAssetIds])await store.readAsset(id);restored.push({hash,parameters:view.active.parameters,sampledAccent:view.active.sampledAccent});}
  const final=await store.getState();await store.restore(initial.active,final.revision);
  record.reopenedAndRestored={currentHash:initial.active,historyCount:initial.history.length,restored,originalCurrentRestored:true};
  await writeFile(path,JSON.stringify(record,null,2)+"\n");console.log(JSON.stringify(record.reopenedAndRestored));
} finally {await store.close();}
