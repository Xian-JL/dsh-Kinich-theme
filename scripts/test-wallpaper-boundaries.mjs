import assert from "node:assert/strict";
import { mkdtemp,readFile,writeFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join,resolve,sep } from "node:path";
import { randomUUID } from "node:crypto";
import { zipSync,strToU8 } from "fflate";
import { WallpaperStore } from "../src/host/wallpaper/store.js";
import { inspectWallpaperAsset,wallpaperHash } from "../src/host/wallpaper/assets.js";
import { importWallpaperArchive,exportWallpaperArchive } from "../src/host/wallpaper/archive.js";
import { canonicalWallpaperJson,validateWallpaperManifest,WALLPAPER_DEFAULT_PARAMETERS } from "../src/shared/wallpaper.js";

const root=await mkdtemp(join(tmpdir(),"kinich-boundaries-"));
const stores=[];
const bytes=await readFile(new URL("../assets/mascot/ajaw-mark.png",import.meta.url)),info=inspectWallpaperAsset(bytes);
const inputBundle={schemaVersion:1,id:"boundary-pack",version:"1",name:"Same name",representativeAssetId:info.sha256,projects:[{id:"one",title:"One",assetIds:[info.sha256],coverId:info.sha256,heroId:info.sha256}]};
const builtin=async()=>({manifest:inputBundle,assets:[{...info,bytes,attribution:"Original attribution",sourceUrl:"https://example.com/original"}]});
const makeStore=name=>{const store=new WallpaperStore({profileDir:join(root,name),profileName:name,pluginVersion:"2.0.0-alpha.8",builtin});stores.push(store);return store;};
const digest=value=>wallpaperHash(Buffer.from(canonicalWallpaperJson(value)));
function archive(snapshot,bundle,options={}){
	const normalized=validateWallpaperManifest(bundle),bundleHash=digest(normalized),item={...snapshot,id:options.id??snapshot.id,bundleHash},snapshotHash=digest(item);
	const manifest={formatVersion:1,schemaVersion:1,specVersion:"1.0.2",scope:"all",datasetId:options.datasetId??"d".repeat(64),counts:{snapshots:1,bundles:1,assets:1},snapshotHashes:[snapshotHash],bundleHashes:[bundleHash],assetHashes:[info.sha256],...options.manifest};
	const files={"manifest.json":strToU8(canonicalWallpaperJson(manifest)),[`records/snapshots/${snapshotHash}.json`]:strToU8(canonicalWallpaperJson(item)),[`records/bundles/${bundleHash}.json`]:strToU8(canonicalWallpaperJson(normalized)),[`blobs/${info.sha256}.json`]:strToU8(canonicalWallpaperJson({...info,attribution:"Incoming attribution",sourceUrl:"https://example.com/incoming",...options.metadata})),[`blobs/${info.sha256}.png`]:bytes};
	options.edit?.(files,manifest);return {zip:zipSync(files),files,manifest,normalized,item,snapshotHash,bundleHash};
}
try{
	const source=makeStore("source"),sourceState=await source.ensure(),snapshot=await source.snapshot(sourceState.active);
	const target=makeStore("target"),initial=await target.ensure();const baselineMeta=await readFile(target.path("blobs",info.sha256));
	const good=archive(snapshot,inputBundle),first=await importWallpaperArchive(target,good.zip);assert.equal(first.imported,1);assert.equal((await target.getState()).active,initial.active);
	const repeat=await importWallpaperArchive(target,good.zip);assert.equal(repeat.imported,0);assert.equal(repeat.revision,first.revision);assert.deepEqual(await readFile(target.path("blobs",info.sha256)),baselineMeta);
	const sameName=archive(snapshot,{...inputBundle,projects:[{...inputBundle.projects[0],description:"Different content"}]},{id:randomUUID()});
	assert.equal((await importWallpaperArchive(target,sameName.zip)).imported,1);const names=await target.history();assert.equal(names.entries.filter(item=>item.name==="Same name").length,2);
	const selectedPlan=await exportWallpaperArchive(target,{scope:"history",historyHash:good.snapshotHash,planOnly:true});assert.equal(selectedPlan.counts.snapshots,1);assert.equal(selectedPlan.counts.assets,1);
	let rejected=0;
	async function reject(label,zip,codes){const before=await readFile(join(target.root,"index.json")),meta=await readFile(target.path("blobs",info.sha256));await assert.rejects(importWallpaperArchive(target,zip),error=>codes.includes(error.code),label);assert.deepEqual(await readFile(join(target.root,"index.json")),before,label);assert.deepEqual(await readFile(target.path("blobs",info.sha256)),meta,label);rejected++;}
	await reject("unknown archive version",archive(snapshot,inputBundle,{manifest:{formatVersion:2}}).zip,["archive-version"]);
	await reject("duplicate hash list",archive(snapshot,inputBundle,{manifest:{assetHashes:[info.sha256,info.sha256]}}).zip,["archive-manifest"]);
	await reject("wrong counts",archive(snapshot,inputBundle,{manifest:{counts:{snapshots:2,bundles:1,assets:1}}}).zip,["archive-count-mismatch"]);
	await reject("wrong asset length",archive(snapshot,inputBundle,{metadata:{byteLength:info.byteLength+1}}).zip,["archive-asset-hash"]);
	await reject("bad image",archive(snapshot,inputBundle,{edit:files=>{files[`blobs/${info.sha256}.png`]=Buffer.alloc(32);}}).zip,["archive-asset-invalid"]);
	await reject("valid image under wrong hash",archive(snapshot,inputBundle,{edit:files=>{const modified=Buffer.from(bytes);modified[modified.length-1]^=1;files[`blobs/${info.sha256}.png`]=modified;}}).zip,["archive-asset-hash","archive-asset-invalid"]);
	await reject("missing asset",archive(snapshot,inputBundle,{edit:files=>{delete files[`blobs/${info.sha256}.png`];}}).zip,["archive-asset-missing"]);
	for(const path of ["../outside.json","/absolute.json","C:/outside.json","blobs/../../outside.json","payload.js","payload.html"]){await reject(path,archive(snapshot,inputBundle,{edit:files=>{files[path]=strToU8("bad");}}).zip,["archive-path"]);}
	await reject("invalid snapshot palette",archive({...snapshot,sampledAccent:"url(https://example.com)"},inputBundle).zip,["invalid-accent"]);
	await reject("invalid font role (single volume)",archive(snapshot,{...inputBundle,fontAssetIds:[info.sha256]}).zip,["invalid-asset-role"]);
	// A split package cannot evade the bundle's image/font role validation at final commit.
	const multi=makeStore("bad-multi-font"),multiInitial=await multi.ensure(),wrong=archive(snapshot,{...inputBundle,fontAssetIds:[info.sha256]});
	const common={...wrong.manifest,volume:{index:0,count:2},datasetCounts:{snapshots:1,bundles:1,assets:1}};
	const assetFiles={"manifest.json":strToU8(canonicalWallpaperJson({...common,snapshotHashes:[],bundleHashes:[],counts:{snapshots:0,bundles:0,assets:1}})),[`blobs/${info.sha256}.json`]:wrong.files[`blobs/${info.sha256}.json`],[`blobs/${info.sha256}.png`]:bytes};
	const recordFiles={"manifest.json":strToU8(canonicalWallpaperJson({...common,volume:{index:1,count:2},assetHashes:[],counts:{snapshots:1,bundles:1,assets:0}})),[`records/snapshots/${wrong.snapshotHash}.json`]:wrong.files[`records/snapshots/${wrong.snapshotHash}.json`],[`records/bundles/${wrong.bundleHash}.json`]:wrong.files[`records/bundles/${wrong.bundleHash}.json`]};
	const staged=await importWallpaperArchive(multi,zipSync(assetFiles));assert.equal(staged.staged,true);assert.equal((await multi.getState()).revision,multiInitial.revision);assert.deepEqual((await multi.getState()).history,[]);
	await assert.rejects(importWallpaperArchive(multi,zipSync(recordFiles)),error=>error.code==="invalid-asset-role");assert.equal((await multi.getState()).active,multiInitial.active);assert.deepEqual((await multi.getState()).history,[]);
	// Actual old WebP bytes from this repository, not a synthetic header-only fixture.
	const generated=await readFile(new URL("../src/client/assets.generated.js",import.meta.url),"utf8"),match=/data:image\/webp;base64,([A-Za-z0-9+/=]+)/.exec(generated);assert.ok(match);
	const legacy={customBackgroundImage:match[0],customBackgroundAccent:"#2a9b71",backgroundVisibility:75,backgroundAutoPalette:false,ambientMotion:false,animateAjaw:false,visualIntensity:"soft"};
	assert.equal(inspectWallpaperAsset(Buffer.from(match[1],"base64")).mediaType,"image/webp");
	const migrated=makeStore("legacy"),migration=await migrated.ensure(legacy),migratedCurrent=await migrated.current();assert.equal(migratedCurrent.active.mode,"static");assert.equal(migratedCurrent.active.parameters.visibility,75);assert.equal(migratedCurrent.active.autoPalette,false);assert.equal(migratedCurrent.active.sampledAccent,"#2a9b71");
	assert.deepEqual((await migrated.readJSON(join(migrated.root,"legacy-background-backup.json"))).settings,legacy);assert.equal((await migrated.ensure({})).active,migration.active);
	const removed=await migrated.apply({mode:"none",parameters:WALLPAPER_DEFAULT_PARAMETERS},migration.revision);await migrated.close();const reopened=makeStore("legacy");assert.equal((await reopened.ensure(legacy)).active,removed.active);
	const uploadPath=join(root,"original-upload.png");await writeFile(uploadPath,bytes);const owned=makeStore("source-deleted"),ownedInitial=await owned.ensure();const saved=await owned.saveAsset(await readFile(uploadPath));await rm(uploadPath);assert.deepEqual((await owned.readAsset(saved.sha256)).bytes,bytes);assert.equal((await owned.getState()).active,ownedInitial.active);
	// Import an asset absent from the receiving Profile: its original provenance must survive.
	const freshBytes=Buffer.from(match[1],"base64"),freshInfo=await owned.saveAsset(freshBytes,"Specific original credit","https://example.com/credit");
	const freshBundle=await owned.saveBundle({...inputBundle,id:"fresh-credit",representativeAssetId:freshInfo.sha256,projects:[{id:"one",title:"One",assetIds:[freshInfo.sha256],coverId:freshInfo.sha256,heroId:freshInfo.sha256}]});
	await owned.apply({mode:"static",bundleHash:freshBundle,projectId:"one",parameters:WALLPAPER_DEFAULT_PARAMETERS,autoPalette:false},ownedInitial.revision);
	const receiver=makeStore("fresh-provenance");await receiver.ensure();await importWallpaperArchive(receiver,await new Response(await exportWallpaperArchive(owned,{scope:"current"})).arrayBuffer().then(buffer=>new Uint8Array(buffer)));
	const receivedInfo=(await receiver.readAsset(freshInfo.sha256)).info;assert.equal(receivedInfo.attribution,"Specific original credit");assert.equal(receivedInfo.sourceUrl,"https://example.com/credit");
	assert.equal(receivedInfo.normalizationVersion,"final-bytes-v1");assert.equal(receivedInfo.relativeBlobPath,`blobs/${freshInfo.sha256}.webp`);
	const receiverState=await receiver.getState(),oldMetadata={...receivedInfo};delete oldMetadata.normalizationVersion;delete oldMetadata.normalizationRules;delete oldMetadata.relativeBlobPath;
	await receiver.writeJSON(receiver.path("blobs",freshInfo.sha256),oldMetadata);const oldIndex=structuredClone(receiverState);oldIndex.migrations=oldIndex.migrations.filter(marker=>marker!=="asset-normalization-index-v1");await receiver.commit(receiverState,oldIndex);
	const migratedMetadata=await receiver.ensure();assert.equal(migratedMetadata.active,receiverState.active);assert.deepEqual(migratedMetadata.history,receiverState.history);const historicInfo=(await receiver.readAsset(freshInfo.sha256)).info;assert.equal(historicInfo.normalizationVersion,"historic-final-bytes-v1");assert.equal(historicInfo.attribution,receivedInfo.attribution);assert.deepEqual((await receiver.readAsset(freshInfo.sha256)).bytes,freshBytes);assert.equal((await receiver.ensure()).revision,migratedMetadata.revision);
	console.log(`Wallpaper boundaries passed: ${rejected} rejected archives preserve index/metadata; duplicate/same-name imports; selected export; missing-volume staging; split font roles; real WebP migration/backup/idempotence; none survives reopen; source-file-independent bytes.`);
}finally{
	await Promise.all(stores.map(store=>store.close()));
	if(!resolve(root).startsWith(resolve(tmpdir())+sep)||!root.split(sep).at(-1).startsWith("kinich-boundaries-"))throw new Error("Refusing unexpected test cleanup root");
	await rm(root,{recursive:true,force:true});
}
