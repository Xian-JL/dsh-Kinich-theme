import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,unlink,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {unzipSync} from 'fflate';
import {WallpaperStore} from '../src/host/wallpaper/store.js';
import {inspectWallpaperAsset} from '../src/host/wallpaper/assets.js';
import {exportWallpaperArchive} from '../src/host/wallpaper/archive.js';
import {readConsistentWallpaperState} from '../src/client/wallpaper/read-state.js';

let currentCalls=0,historyCalls=0;
const pair=await readConsistentWallpaperState(async()=>({revision:++currentCalls}),async()=>({revision:++historyCalls===1?2:historyCalls}));
assert.equal(pair.current.revision,2);assert.equal(pair.history.revision,2);
await assert.rejects(readConsistentWallpaperState(async()=>({revision:1}),async()=>({revision:2})),error=>error.code==='revision-conflict');
await assert.rejects(readConsistentWallpaperState(async()=>{throw new Error('offline');},async()=>({revision:1})),/offline/);

const root=await mkdtemp(join(tmpdir(),'kinich-consistency-')),rootReal=await realpath(root);
assert.ok(rootReal.toLowerCase().startsWith(resolve(tmpdir(),'kinich-consistency-').toLowerCase()));
const bytes=await readFile(new URL('../assets/mascot/ajaw-mark.png',import.meta.url)),info=inspectWallpaperAsset(bytes);
const bundle={schemaVersion:1,id:'consistency',version:'1',name:'Consistency',representativeAssetId:info.sha256,projects:[{id:'one',title:'One',assetIds:[info.sha256],coverId:info.sha256,heroId:info.sha256}]};
const builtin=async()=>({manifest:bundle,assets:[{...info,bytes,attribution:'test fixture',sourceUrl:''}]});
const stores=[];
const make=(name,fault)=>{const store=new WallpaperStore({profileDir:join(root,name),pluginVersion:'2.0.0-alpha.13',builtin,fault});stores.push(store);return store;};
try {
  let pause=false,started,release;
  const gate=new Promise(resolve=>{started=resolve;}),resume=new Promise(resolve=>{release=resolve;});
  const writer=make('shared',async checkpoint=>{if(pause&&checkpoint==='journal-durable'){started();await resume;}});
  const initial=await writer.ensure();
  const reader=make('shared');
  pause=true;
  const write=writer.apply({mode:'none'},initial.revision);
  await gate;
  let readFinished=false;
  const read=reader.current().then(value=>{readFinished=true;return value;});
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(readFinished,false,'A reader must not recover another writer live journal');
  release();await write;
  assert.equal((await read).active.mode,'none');
  assert.equal((await reader.history()).total,1);

  const exporting=make('export');await exporting.ensure();
  const state=await exporting.current();
  const metadata=await exporting.readAssetInfo(info.sha256);metadata.uploadedAt='2000-01-01T00:00:00.000Z';
  await writeFile(exporting.path('blobs',info.sha256),JSON.stringify(metadata));
  await unlink(exporting.path('leases',info.sha256)).catch(error=>{if(error.code!=='ENOENT')throw error;});
  const stream=await exportWallpaperArchive(exporting,{scope:'current'});
  const removed=await exporting.apply({mode:'none'},state.revision);
  await exporting.clearHistory(removed.revision);
  assert.deepEqual((await exporting.readAsset(info.sha256)).bytes,bytes,'Ongoing export pins assets when current/history are cleared');
  const chunks=[],streamReader=stream.getReader();
  for(;;){const next=await streamReader.read();if(next.done)break;chunks.push(next.value);}
  const files=unzipSync(Buffer.concat(chunks));
  assert.ok(files[`records/snapshots/${state.activeHash}.json`]);
  assert.deepEqual(Buffer.from(files[`blobs/${info.sha256}.${info.extension}`]),bytes);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await readdir(exporting.folder('leases'))).length,0,'Completed exports release their leases');
  await exporting.locked(async()=>exporting.collectGarbage(await exporting.readStateLocked()));
  await assert.rejects(exporting.readAsset(info.sha256));

  const cancelled=make('cancel');await cancelled.ensure();
  const cancelledStream=await exportWallpaperArchive(cancelled);
  await cancelledStream.cancel();await new Promise(resolve=>setImmediate(resolve));
  const remaining=await readdir(cancelled.folder('leases'));
  for(const name of remaining){const lease=JSON.parse(await readFile(join(cancelled.folder('leases'),name),'utf8'));assert.notEqual(lease.kind,'export');}
  console.log('Consistency checks passed: coherent client revisions, locked journal reads, shared Profile writes, export during clear, cancellation and lease cleanup.');
} finally {
  for(const store of stores)await store.close();
  if(await realpath(root)!==rootReal)throw new Error('Fixture path changed');
  await rm(rootReal,{recursive:true,force:true});
}
