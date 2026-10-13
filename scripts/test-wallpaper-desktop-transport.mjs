import assert from "node:assert/strict";
import {readFile,mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {installWallpaperRoutes,WALLPAPER_STATE_PATH,WALLPAPER_ASSET_PATH,WALLPAPER_EXPORT_PATH,WALLPAPER_IMPORT_PATH} from "../src/host/wallpaper/routes.js";
import {inspectWallpaperAsset} from "../src/host/wallpaper/assets.js";
const bytes=await readFile(new URL("../assets/mascot/ajaw-mark.png",import.meta.url)),info=inspectWallpaperAsset(bytes),routes=new Map();
const profileDir=await mkdtemp(join(tmpdir(),"kinich-desktop-transport-"));
const dispose=installWallpaperRoutes({get:key=>key==="connection"?{fetch:{register:route=>{routes.set(route.path,route);return()=>routes.delete(route.path);}}}:key==="profileContext"?{dir:profileDir,name:"transport"}:undefined},{pluginVersion:"2.0.0-alpha.10",builtin:async()=>({assets:[{...info,bytes}],manifest:{schemaVersion:1,id:"transport",name:"Transport",projects:[{id:"one",title:"One",assetIds:[info.sha256],coverId:info.sha256,heroId:info.sha256}]}})});
const request=(path,options)=>routes.get(path).fetch(new Request("http://dsh.test"+path,options));
try {
  const before=await (await request(WALLPAPER_STATE_PATH)).json();
  const upload=await request(WALLPAPER_ASSET_PATH,{method:"POST",headers:{"content-type":"image/png"},body:bytes});assert.equal(upload.status,201);
  const wrong=await request(WALLPAPER_ASSET_PATH,{method:"POST",headers:{"content-length":String(bytes.length+1)},body:bytes});assert.equal(wrong.status,400);
  const tooLarge=await request(WALLPAPER_ASSET_PATH,{method:"POST",body:Buffer.alloc(2*1024*1024+1)});assert.equal(tooLarge.status,413);
  // Exact registered path remains separate from URL queries.
  const planned=await routes.get(WALLPAPER_EXPORT_PATH).fetch(new Request("http://dsh.test"+WALLPAPER_EXPORT_PATH+"?scope=current&plan=1"));const dataset=await planned.json();
  const exported=await routes.get(WALLPAPER_EXPORT_PATH).fetch(new Request("http://dsh.test"+WALLPAPER_EXPORT_PATH+"?scope=current&volume=0&datasetId="+dataset.datasetId));
  assert.match(exported.headers.get("content-disposition"),/part-1\.kinich-wallpaper\.zip/);
  const archive=new Uint8Array(await exported.arrayBuffer());
  const imported=await request(WALLPAPER_IMPORT_PATH,{method:"POST",headers:{"content-type":"application/zip"},body:archive});assert.equal(imported.status,200,await imported.clone().text());assert.equal((await imported.json()).currentPreserved,true);
  const empty=await request(WALLPAPER_IMPORT_PATH,{method:"POST",body:new Uint8Array(1)});assert.equal(empty.status,400);
  const after=await (await request(WALLPAPER_STATE_PATH)).json();assert.equal(after.activeHash,before.activeHash);assert.equal(after.revision,before.revision);
  console.log("Desktop transport passed: absent Content-Length upload/import, actual size limits, mismatched lengths, unique volume name, current unchanged.");
}finally{await dispose();}
