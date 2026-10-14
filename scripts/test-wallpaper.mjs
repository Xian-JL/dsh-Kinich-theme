import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { WALLPAPER_DEFAULT_PARAMETERS, WALLPAPER_STATE_PATH as SHARED_STATE_PATH, WALLPAPER_ASSET_PATH as SHARED_ASSET_PATH, WALLPAPER_APPLY_PATH as SHARED_APPLY_PATH, WALLPAPER_HISTORY_ITEM_PATH as SHARED_HISTORY_ITEM_PATH, WALLPAPER_CLEAR_HISTORY_PATH as SHARED_CLEAR_HISTORY_PATH, WALLPAPER_EXPORT_PATH as SHARED_EXPORT_PATH, WALLPAPER_IMPORT_PATH as SHARED_IMPORT_PATH, WALLPAPER_DEFAULT_PATH as SHARED_DEFAULT_PATH, WALLPAPER_PALETTE_PATH as SHARED_PALETTE_PATH, WallpaperError, canonicalWallpaperJson, wallpaperElementCount, wallpaperMultiplier, wallpaperScale, wallpaperMotionAllowed, validateWallpaperManifest } from "../src/shared/wallpaper.js";
import { inspectWallpaperAsset, wallpaperHash } from "../src/host/wallpaper/assets.js";
import { WallpaperStore } from "../src/host/wallpaper/store.js";
import { installWallpaperRoutes, WALLPAPER_STATE_PATH, WALLPAPER_ASSET_PATH, WALLPAPER_APPLY_PATH, WALLPAPER_EXPORT_PATH, WALLPAPER_IMPORT_PATH, WALLPAPER_DEFAULT_PATH, WALLPAPER_PALETTE_PATH } from "../src/host/wallpaper/routes.js";
import { exportWallpaperArchive, importWallpaperArchive } from "../src/host/wallpaper/archive.js";
import { loadKinichWallpaperBuiltin } from "../src/host/wallpaper/builtin.js";

assert.equal(WALLPAPER_STATE_PATH, SHARED_STATE_PATH);
assert.equal(WALLPAPER_ASSET_PATH, SHARED_ASSET_PATH);
assert.equal(WALLPAPER_APPLY_PATH, SHARED_APPLY_PATH);
assert.equal(WALLPAPER_EXPORT_PATH, SHARED_EXPORT_PATH); assert.equal(WALLPAPER_IMPORT_PATH, SHARED_IMPORT_PATH); assert.equal(WALLPAPER_DEFAULT_PATH, SHARED_DEFAULT_PATH); assert.equal(WALLPAPER_PALETTE_PATH, SHARED_PALETTE_PATH);
assert.equal((await import("../src/host/wallpaper/routes.js")).WALLPAPER_HISTORY_ITEM_PATH, SHARED_HISTORY_ITEM_PATH);
assert.equal((await import("../src/host/wallpaper/routes.js")).WALLPAPER_CLEAR_HISTORY_PATH, SHARED_CLEAR_HISTORY_PATH);

assert.deepEqual(WALLPAPER_DEFAULT_PARAMETERS, { rhythm: 50, amplitude: 50, elementDensity: 50, visibility: 50 });
assert.deepEqual([0,1,25,50,75,100].map(wallpaperMultiplier), [0,0.02,0.5,1,2,3]);
assert.deepEqual([0,1,25,50,75,100].map(value => wallpaperElementCount(value)), [0,1,4,8,16,24]);
assert.deepEqual(wallpaperScale(1600,1000), { image: 1, text: 1600 / 1920 });
assert.deepEqual(wallpaperScale(1920,1080), { image: 1.2, text: 1 });
assert.equal(wallpaperMotionAllowed({mode:"dynamic",parameters:{rhythm:0}}), false);
assert.equal(wallpaperMotionAllowed({mode:"static",parameters:{rhythm:50}}), false);
assert.equal(wallpaperMotionAllowed({mode:"dynamic",parameters:{rhythm:50}}, {reducedMotion:true}), false);
assert.throws(() => validateWallpaperManifest({schemaVersion:1,projects:[]}), /invalid-projects/);
assert.throws(() => validateWallpaperManifest({schemaVersion:1,projects:[{id:"x",assetIds:["../../escape"]}]}), /invalid-asset-id/);
assert.throws(() => validateWallpaperManifest({schemaVersion:1,projects:[{id:"x",assetIds:["a".repeat(64)]},{id:"x",assetIds:["b".repeat(64)]}]}), /invalid-projects/);
assert.throws(() => validateWallpaperManifest({schemaVersion:1,projects:[{id:"x",assetIds:["a".repeat(64)],nextProjectId:"missing"}]}), /invalid-next-project/);

const referencePack=await loadKinichWallpaperBuiltin(),referenceManifest=validateWallpaperManifest(referencePack.manifest);
assert.equal(referencePack.assets.length,278);
assert.equal(referenceManifest.projects.length,8);
assert.deepEqual(referenceManifest.projects.map(project=>project.largeImageIds.length),[12,19,16,15,16,15,11,14]);
assert.ok(referenceManifest.projects.every(project=>project.thumbnailAssetIds.length===project.largeImageIds.length&&project.galleryCaptions.length===project.largeImageIds.length&&project.imageGaps.length===project.largeImageIds.length));
assert.deepEqual(referenceManifest.projects.map(project=>project.nextProjectId),["samsung","rituals","moco","sennheiser","swarovski","activia","saeco","gucci"]);
assert.equal(referenceManifest.fontAssetIds.length,1);
assert.equal(referenceManifest.assetIds.length,278);

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceImage = await readFile(join(repo,"assets","mascot","ajaw-mark.png"));
const imageInfo = inspectWallpaperAsset(sourceImage);
assert.equal(imageInfo.mediaType,"image/png");
assert.ok(imageInfo.width > 0 && imageInfo.height > 0);
assert.throws(() => inspectWallpaperAsset(Buffer.from("GIF89a")), error => error instanceof WallpaperError && error.code === "asset-size");
const damagedPng = Buffer.from(sourceImage); damagedPng.writeUInt32BE(100_000,16);
assert.throws(() => inspectWallpaperAsset(damagedPng), /asset-dimensions/);
const animatedWebp = Buffer.alloc(48); animatedWebp.write("RIFF",0); animatedWebp.writeUInt32LE(40,4); animatedWebp.write("WEBPVP8X",8); animatedWebp.writeUInt32LE(16,16); animatedWebp[20]=2; animatedWebp.writeUIntLE(63,24,3); animatedWebp.writeUIntLE(63,27,3);
assert.throws(() => inspectWallpaperAsset(animatedWebp), /animated-import-not-supported/);
const woff = Buffer.alloc(48); woff.write("wOF2",0); woff.writeUInt32BE(48,8);
assert.equal(inspectWallpaperAsset(woff).mediaType,"font/woff2");

const profileRoot = await mkdtemp(join(tmpdir(),"kinich-wallpaper-store-"));
const makeBundle = assetId => ({ schemaVersion:1, id:"test-pack", version:"1", name:"测试场景", representativeAssetId:assetId,
	projects:[{id:"first",title:"场景一",headline:"Kinich · 场景一",description:"本地照片",assetIds:[assetId],coverId:assetId,heroId:assetId}] });
let injectedFault;
const builtin = async () => ({ manifest:makeBundle(imageInfo.sha256), assets:[{...imageInfo,bytes:sourceImage,attribution:"test fixture",sourceUrl:""}] });
const makeStore = (name, fault) => new WallpaperStore({profileDir:join(profileRoot,name),profileName:name,pluginVersion:"2.0.0-alpha.1",builtin,fault});

try {
	const referenceStore=new WallpaperStore({profileDir:join(profileRoot,"reference-default"),profileName:"reference-default",pluginVersion:"2.0.0-alpha.2",builtin:async()=>referencePack});
	const referenceState=await referenceStore.ensure(),referenceCurrent=await referenceStore.current();
	assert.equal((await referenceStore.snapshot(referenceState.active)).mode,"dynamic");
	assert.equal(referenceCurrent.manifest.assetIds.length,278);assert.equal(referenceCurrent.manifest.fontAssetIds.length,1);
	const referencePlan=await exportWallpaperArchive(referenceStore,{scope:"current",planOnly:true});assert.ok(referencePlan.volumes.length>1);assert.ok(referencePlan.volumes.every(volume=>volume.assetCount<=256));
	const referenceImportTarget=makeStore("reference-import-target"),referenceImportInitial=await referenceImportTarget.ensure();let referenceImportResult;
	for(const volume of referencePlan.volumes){const stream=await exportWallpaperArchive(referenceStore,{scope:"current",volumeIndex:volume.index,expectedDatasetId:referencePlan.datasetId});const reader=stream.getReader(),parts=[];for(;;){const {value,done}=await reader.read();if(done)break;parts.push(Buffer.from(value));}referenceImportResult=await importWallpaperArchive(referenceImportTarget,Buffer.concat(parts));if(volume.index===0){assert.equal(referenceImportResult.staged,true);assert.equal((await referenceImportTarget.getState()).revision,referenceImportInitial.revision);}}
	assert.equal(referenceImportResult.staged,false);assert.equal(referenceImportResult.imported,1);assert.equal((await referenceImportTarget.getState()).active,referenceImportInitial.active);
	const importedReferenceState=await referenceImportTarget.getState(),importedReferenceSnapshot=await referenceImportTarget.snapshot(importedReferenceState.history[0]),importedReferenceBundle=await referenceImportTarget.readBundle(importedReferenceSnapshot.bundleHash);
	assert.equal(importedReferenceBundle.fontAssetIds.length,1);assert.equal(importedReferenceBundle.projects[1].largeImageIds.length,19);
	const referenceActive=await referenceStore.current();await referenceStore.apply({mode:"dynamic",bundleHash:referenceActive.active.bundleHash,projectId:referenceActive.active.projectId,templateId:"work",parameters:{...referenceActive.active.parameters,amplitude:51},autoPalette:true,reason:"test-archive-history"},referenceActive.revision);
	const allReferencePlan=await exportWallpaperArchive(referenceStore,{scope:"all",planOnly:true});assert.equal(allReferencePlan.counts.snapshots,2);assert.equal(allReferencePlan.counts.assets,278);assert.ok(allReferencePlan.volumes.every(volume=>volume.assetCount<=256));assert.equal(allReferencePlan.volumes.reduce((sum,volume)=>sum+volume.assetCount,0),278);assert.equal(allReferencePlan.volumes.reduce((sum,volume)=>sum+volume.bundleCount,0),1);
	const first=makeStore("desktop-a"); const initialized=await first.ensure();
	assert.equal(initialized.active ? (await first.snapshot(initialized.active)).mode : "missing","dynamic");
	assert.deepEqual((await first.current()).active.parameters,WALLPAPER_DEFAULT_PARAMETERS);
	assert.equal((await first.current()).manifest.projects[0].id,"first");
	assert.equal((await first.readAsset(imageInfo.sha256)).info.sha256,imageInfo.sha256);

	const otherProfile=makeStore("desktop-b"); const other=await otherProfile.ensure();
	assert.equal(otherProfile.profileName,"desktop-b"); assert.notEqual(other.active,initialized.active);
	await assert.rejects(first.apply({mode:"static",bundleHash:"0".repeat(64),projectId:"first",parameters:WALLPAPER_DEFAULT_PARAMETERS},initialized.revision),error=>error.code==="bundle-not-found");
	const changed=await first.apply({mode:"dynamic",bundleHash:(await first.current()).active.bundleHash,projectId:"first",parameters:{...WALLPAPER_DEFAULT_PARAMETERS,rhythm:25},reason:"parameters"},initialized.revision);
	assert.equal((await first.snapshot(changed.active)).parameters.rhythm,25); assert.deepEqual(changed.history,[initialized.active]);
	await assert.rejects(first.apply({mode:"none",expectedRevision:initialized.revision},initialized.revision),error=>error.code==="revision-conflict");
	const history=await first.history(0,30); assert.equal(history.total,1); assert.equal(history.entries[0].recoverable,true);
	const restored=await first.restore(initialized.active,changed.revision); assert.equal((await first.snapshot(restored.active)).parameters.rhythm,50);
	const deletedHistory=await first.clearHistory(restored.revision); assert.equal(deletedHistory.history.length,0); assert.equal((await first.current()).manifest.name,"测试场景");
	await assert.rejects(first.deleteHistory(deletedHistory.active,deletedHistory.revision),error=>error.code==="active-protected");
	await assert.rejects(first.restore(initialized.active,deletedHistory.revision),error=>error.code==="history-not-found");
	await otherProfile.apply({mode:"none",parameters:WALLPAPER_DEFAULT_PARAMETERS},other.revision);
	assert.equal((await otherProfile.current()).active.mode,"none"); assert.equal((await first.current()).active.mode,"dynamic");
	const paletteStore=makeStore("palette-profile"),paletteInitial=await paletteStore.ensure();
	const paletteChanged=await paletteStore.capturePalette({color:"#2a9b71",representativeAssetId:imageInfo.sha256,algorithmVersion:"kinich-dominant-v1"},paletteInitial.revision);
	assert.equal((await paletteStore.snapshot(paletteChanged.active)).sampledAccent,"#2a9b71");assert.equal(paletteChanged.history.length,0);
	const paletteRepeat=await paletteStore.capturePalette({color:"#ffffff",representativeAssetId:imageInfo.sha256,algorithmVersion:"kinich-dominant-v1"},paletteChanged.revision);
	assert.equal(paletteRepeat.revision,paletteChanged.revision);assert.equal((await paletteStore.snapshot(paletteRepeat.active)).sampledAccent,"#2a9b71");
	const sampledSnapshot=await paletteStore.snapshot(paletteChanged.active);
	const paletteParameterChange=await paletteStore.updateParameters({parameters:{rhythm:25},autoPalette:false},paletteRepeat.revision);
	const paletteAfterParameterChange=await paletteStore.snapshot(paletteParameterChange.active);
	assert.equal(paletteAfterParameterChange.sampledAccent,"#2a9b71");assert.equal(paletteAfterParameterChange.paletteCaptured,true);
	assert.deepEqual(paletteAfterParameterChange.derivedPalette,sampledSnapshot.derivedPalette);
	const paletteHistoryRestore=await paletteStore.restore(paletteChanged.active,paletteParameterChange.revision);
	assert.equal((await paletteStore.snapshot(paletteHistoryRestore.active)).sampledAccent,"#2a9b71");
	const noColorStore=makeStore("no-color-profile");await noColorStore.ensure();const noColorCurrent=await noColorStore.current();
	const noColorOff=await noColorStore.updateParameters({autoPalette:false},noColorCurrent.revision);
	const noColorCapture=await noColorStore.capturePalette({color:"",representativeAssetId:imageInfo.sha256,algorithmVersion:"kinich-dominant-v1"},noColorOff.revision);
	assert.equal((await noColorStore.snapshot(noColorCapture.active)).paletteCaptured,true);
	assert.equal((await noColorStore.capturePalette({color:"#2a9b71",representativeAssetId:imageInfo.sha256,algorithmVersion:"kinich-dominant-v1"},noColorCapture.revision)).revision,noColorCapture.revision);
	const backup=JSON.parse(await readFile(join(first.root,"legacy-background-backup.json"),"utf8"));assert.equal(backup.originVersion,"1.8.1");
	const damagedStore=makeStore("damaged-history-profile"),damagedInitial=await damagedStore.ensure();
	const damagedRemoved=await damagedStore.apply({mode:"none",parameters:WALLPAPER_DEFAULT_PARAMETERS},damagedInitial.revision);
	await writeFile(damagedStore.path("blobs",imageInfo.sha256,imageInfo.extension),Buffer.from("damaged"));
	const damagedHistory=await damagedStore.history();assert.equal(damagedHistory.entries.length,1);assert.equal(damagedHistory.entries[0].recoverable,false);assert.equal(damagedHistory.entries[0].mode,"dynamic");
	assert.equal((await damagedStore.current()).active.mode,"none");assert.deepEqual((await damagedStore.getState()).history,damagedRemoved.history);
	await Promise.all([noColorStore.close(),damagedStore.close()]);

	const routeMap=new Map();
	const dispose=installWallpaperRoutes({get:key=>key==="connection"?{fetch:{register:route=>{routeMap.set(route.path,route);return()=>routeMap.delete(route.path);}}}:key==="profileContext"?{dir:join(profileRoot,"routes-profile"),name:"routes-profile"}:undefined},
		{pluginVersion:"2.0.0-alpha.1",builtin});
	assert.equal(routeMap.has(WALLPAPER_STATE_PATH),true); assert.equal(routeMap.has(WALLPAPER_ASSET_PATH),true); assert.equal(routeMap.has(WALLPAPER_APPLY_PATH),true);
	assert.equal(routeMap.has(WALLPAPER_EXPORT_PATH),true); assert.equal(routeMap.has(WALLPAPER_IMPORT_PATH),true); assert.equal(routeMap.has(WALLPAPER_DEFAULT_PATH),true);assert.equal(routeMap.has(WALLPAPER_PALETTE_PATH),true);
	const stateResponse=await routeMap.get(WALLPAPER_STATE_PATH).fetch(new Request("http://dsh.test"+WALLPAPER_STATE_PATH));
	assert.equal(stateResponse.status,200); const routeState=await stateResponse.json(); assert.equal(routeState.active.mode,"dynamic");
	const planResponse=await routeMap.get(WALLPAPER_EXPORT_PATH).fetch(new Request(`http://dsh.test${WALLPAPER_EXPORT_PATH}?scope=current&plan=1`));
	assert.equal(planResponse.status,200); const plan=await planResponse.json(); assert.equal(plan.volumes.length,1);
	const routeArchive=await routeMap.get(WALLPAPER_EXPORT_PATH).fetch(new Request(`http://dsh.test${WALLPAPER_EXPORT_PATH}?scope=current&volume=0&datasetId=${plan.datasetId}`));
	assert.equal(routeArchive.status,200); assert.equal(routeArchive.headers.get("content-type"),"application/zip");
	const routeArchiveBytes=Buffer.from(await routeArchive.arrayBuffer());
	const routeImport=await routeMap.get(WALLPAPER_IMPORT_PATH).fetch(new Request("http://dsh.test"+WALLPAPER_IMPORT_PATH,{method:"POST",headers:{"content-type":"application/zip","content-length":String(routeArchiveBytes.length)},body:routeArchiveBytes}));
	const routeImportPayload=await routeImport.json(); assert.equal(routeImport.status,200,JSON.stringify(routeImportPayload)); assert.equal(routeImportPayload.currentPreserved,true);
	const routeDefault=await routeMap.get(WALLPAPER_DEFAULT_PATH).fetch(new Request("http://dsh.test"+WALLPAPER_DEFAULT_PATH,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:routeState.revision})}));
	assert.equal(routeDefault.status,200);
	const routePalette=await routeMap.get(WALLPAPER_PALETTE_PATH).fetch(new Request("http://dsh.test"+WALLPAPER_PALETTE_PATH,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:routeState.revision,color:"#258a63",representativeAssetId:imageInfo.sha256,algorithmVersion:"kinich-dominant-v1"})}));
	assert.equal(routePalette.status,200); assert.equal((await routePalette.json()).history.length,0);
	const badAsset=await routeMap.get(WALLPAPER_ASSET_PATH).fetch(new Request("http://dsh.test"+WALLPAPER_ASSET_PATH,{method:"POST",headers:{"content-type":"image/gif","content-length":"24"},body:Buffer.alloc(24)}));
	assert.ok(badAsset.status>=400); await dispose(); assert.equal(routeMap.size,0);
	const archiveTarget=makeStore("archive-target"); const archiveTargetBefore=await archiveTarget.ensure();
	const archiveStream=await exportWallpaperArchive(first,{scope:"all"}); const archiveReader=archiveStream.getReader(),archiveParts=[]; for(;;){const {value,done}=await archiveReader.read();if(done)break;archiveParts.push(Buffer.from(value));}
	const archive=Buffer.concat(archiveParts); assert.equal(archive.subarray(0,2).toString("hex"),"504b");
	const imported=await importWallpaperArchive(archiveTarget,archive);
	assert.equal(imported.currentPreserved,true); assert.equal(imported.imported,1);
	assert.equal((await archiveTarget.current()).active.id,(await archiveTarget.snapshot(archiveTargetBefore.active)).id);
	const importRaceStore=makeStore("clear-import-race"),importRaceInitial=await importRaceStore.ensure();let streamRead=0;
	const delayedArchive={getReader:()=>({read:async()=>{if(streamRead++===0){await importRaceStore.clearHistory(importRaceInitial.revision);return {value:archive,done:false};}return {done:true};}})};
	await assert.rejects(importWallpaperArchive(importRaceStore,delayedArchive),error=>error.code==="revision-conflict");
	const importRaceFinal=await importRaceStore.getState();assert.equal(importRaceFinal.active,importRaceInitial.active);assert.deepEqual(importRaceFinal.history,[]);await importRaceStore.close();
	const archiveHistory=await archiveTarget.history(0,30); assert.equal(archiveHistory.entries[0].recoverable,true);
	const roundTrip=await archiveTarget.restore(archiveHistory.entries[0].hash,(await archiveTarget.current()).revision);
	assert.equal((await archiveTarget.snapshot(roundTrip.active)).mode,"dynamic");
	const malicious=zipSync({"manifest.json":strToU8("{}"),"../outside.json":strToU8("bad")});
	await assert.rejects(importWallpaperArchive(archiveTarget,malicious),error=>error.code==="archive-path");
	const splitBundle=validateWallpaperManifest(makeBundle(imageInfo.sha256)),splitBundleHash=wallpaperHash(Buffer.from(canonicalWallpaperJson(splitBundle)));
	const splitBase=await archiveTarget.current(),baseSnapshot=await archiveTarget.snapshot(splitBase.activeHash),splitSnapshot={...baseSnapshot,id:randomUUID(),bundleHash:splitBundleHash,projectId:"first",createdAtUtc:new Date().toISOString()};
	const splitSnapshotHash=wallpaperHash(Buffer.from(canonicalWallpaperJson(splitSnapshot))),splitDataset="c".repeat(64),assetMeta={...imageInfo,attribution:"test fixture",sourceUrl:""};
	const splitManifest=(index,snapshotHashes,bundleHashes,assetHashes)=>({formatVersion:1,schemaVersion:1,specVersion:"1.0.1",scope:"all",datasetId:splitDataset,exportedAtUtc:new Date().toISOString(),currentSnapshotHash:splitBase.activeHash,
		volume:{index,count:2},datasetCounts:{snapshots:1,bundles:1,assets:1},counts:{snapshots:snapshotHashes.length,bundles:bundleHashes.length,assets:assetHashes.length},snapshotHashes,bundleHashes,assetHashes});
	const assetPart=zipSync({"manifest.json":strToU8(JSON.stringify(splitManifest(0,[],[],[imageInfo.sha256]))),[`blobs/${imageInfo.sha256}.json`]:strToU8(JSON.stringify(assetMeta)),[`blobs/${imageInfo.sha256}.png`]:sourceImage});
	const recordPart=zipSync({"manifest.json":strToU8(JSON.stringify(splitManifest(1,[splitSnapshotHash],[splitBundleHash],[]))),[`records/bundles/${splitBundleHash}.json`]:strToU8(canonicalWallpaperJson(splitBundle)),[`records/snapshots/${splitSnapshotHash}.json`]:strToU8(canonicalWallpaperJson(splitSnapshot))});
	const beforeSplitImport=await archiveTarget.current(); const firstPart=await importWallpaperArchive(archiveTarget,assetPart);
	assert.equal(firstPart.staged,true);assert.equal((await archiveTarget.current()).revision,beforeSplitImport.revision);
	const finalPart=await importWallpaperArchive(archiveTarget,recordPart);assert.equal(finalPart.staged,false);assert.equal(finalPart.imported,1);
	const volumeStore=makeStore("volume-profile"); const volumeState=await volumeStore.ensure(); const volumeBase=await volumeStore.snapshot(volumeState.active); const volumeHistory=[];
	for(let index=0;index<1025;index++){const record={...volumeBase,id:randomUUID(),sequence:index+1,createdAtUtc:new Date(Date.UTC(2020,0,1)+index*1000).toISOString()};volumeHistory.push(await volumeStore.saveSnapshot(record));}
	await volumeStore.commit(volumeState,{...structuredClone(volumeState),history:volumeHistory});
	const volumePlan=await exportWallpaperArchive(volumeStore,{scope:"all",planOnly:true});
	assert.equal(volumePlan.volumes.length,2); assert.equal(volumePlan.counts.snapshots,1026);
	const volumeTarget=makeStore("volume-import-target"); const volumeTargetState=await volumeTarget.ensure(); let volumeImportResult;
	for(const volume of volumePlan.volumes){
		const stream=await exportWallpaperArchive(volumeStore,{scope:"all",volumeIndex:volume.index,expectedDatasetId:volumePlan.datasetId}); const reader=stream.getReader(),parts=[];
		for(;;){const {value,done}=await reader.read();if(done)break;parts.push(Buffer.from(value));}
		volumeImportResult=await importWallpaperArchive(volumeTarget,Buffer.concat(parts));
		if(volume.index===0){assert.equal(volumeImportResult.staged,true);assert.equal((await volumeTarget.getState()).revision,volumeTargetState.revision);}
	}
	assert.equal(volumeImportResult.staged,false); assert.equal(volumeImportResult.imported,1026);
	assert.equal((await volumeTarget.getState()).active,volumeTargetState.active);
	const hugeAssetIds=Array.from({length:130},(_,index)=>index.toString(16).padStart(64,"0"));
	const hugeBundle={assetIds:hugeAssetIds,fontAssetIds:[],projects:[]};
	const hugeSnapshot={bundleHash:"b".repeat(64),mode:"dynamic",projectId:"large"};
	const hugeStore={locked:action=>action(),readStateLocked:async()=>({active:"a".repeat(64),history:[]}),snapshot:async()=>hugeSnapshot,readBundle:async()=>hugeBundle,readAssetInfo:async hash=>({sha256:hash,byteLength:2*1024*1024,extension:"webp"})};
	const hugePlan=await exportWallpaperArchive(hugeStore,{scope:"current",planOnly:true});
	assert.equal(hugePlan.volumes.length,3); assert.equal(hugePlan.volumes.reduce((sum,item)=>sum+item.assetCount,0),130);
	assert.equal(hugePlan.volumes.reduce((sum,item)=>sum+item.snapshotCount,0),1);

	const faultStore=makeStore("recovery-profile",async stage=>{if(stage==="index-durable"&&injectedFault){injectedFault=false;throw new Error("simulated host interruption");}});
	for(const checkpoint of ["assets-durable","journal-durable","backup-durable"]){
		let enabled=false;const faulted=makeStore(`checkpoint-${checkpoint}`,async stage=>{if(enabled&&stage===checkpoint){enabled=false;throw Object.assign(new Error("simulated disk interruption"),{code:"ENOSPC"});}});
		const original=await faulted.ensure();enabled=true;await assert.rejects(faulted.apply({mode:"none",parameters:WALLPAPER_DEFAULT_PARAMETERS},original.revision),/simulated disk interruption/);
		const reopened=makeStore(`checkpoint-${checkpoint}`),recovered=await reopened.ensure(),snapshot=await reopened.snapshot(recovered.active);
		assert.ok(["dynamic","none"].includes(snapshot.mode));assert.deepEqual(recovered.history,snapshot.mode==="none"?[original.active]:[]);
		if(checkpoint==="assets-durable")assert.equal(recovered.active,original.active);await Promise.all([faulted.close(),reopened.close()]);
	}
	const beforeCrash=await faultStore.ensure(); injectedFault=true;
	await assert.rejects(faultStore.apply({mode:"none",parameters:WALLPAPER_DEFAULT_PARAMETERS},beforeCrash.revision),/simulated host interruption/);
	const restarted=makeStore("recovery-profile"); const afterRecovery=await restarted.ensure();
	assert.equal((await restarted.snapshot(afterRecovery.active)).mode,"none"); assert.deepEqual(afterRecovery.history,[beforeCrash.active]);
	await Promise.all([referenceStore.close(),referenceImportTarget.close(),first.close(),otherProfile.close(),paletteStore.close(),archiveTarget.close(),volumeStore.close(),volumeTarget.close(),faultStore.close(),restarted.close()]);
	console.log("Wallpaper 278-asset reference bundle, Profile isolation, streamed ZIP round-trip, 256-asset volume bounds, atomic import, routes, revisions and crash recovery passed.");
} finally { await rm(profileRoot,{recursive:true,force:true}); }
