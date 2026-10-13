import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, realpath, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { KinichThemeConfigSchema } from '../src/host/settings-schema.js';
import { decodeKinichSettings } from '../src/client/settings/decode.js';
import { writeKinichSettings } from '../src/client/settings/write.js';
import { wallpaperDisplayAllowed } from '../src/shared/wallpaper.js';
import { WallpaperStore } from '../src/host/wallpaper/store.js';
import { loadKinichWallpaperBuiltin } from '../src/host/wallpaper/builtin.js';

const root=await mkdtemp(join(tmpdir(),'kinich-wallpaper-switch-'));
const verifiedRoot=await realpath(root);
assert.ok(verifiedRoot.toLowerCase().startsWith(resolve(tmpdir(),'kinich-wallpaper-switch-').toLowerCase()));
try {
  const profileA=join(root,'A'),profileB=join(root,'B');
  await mkdir(profileA);await mkdir(profileB);
  const configPath=join(profileA,'kinich-config.json');
  const configBPath=join(profileB,'kinich-config.json');
  await writeFile(configBPath,JSON.stringify({dynamicWallpaperEnabled:true}));
  await writeFile(configPath,JSON.stringify({ambientMotion:false,animateAjaw:false}));
  const readConfig=async()=>decodeKinichSettings(JSON.parse(await readFile(configPath,'utf8')));
  assert.equal((await readConfig()).dynamicWallpaperEnabled,true,'Missing field defaults to enabled');
  assert.equal(KinichThemeConfigSchema({dynamicWallpaperEnabled:false}).dynamicWallpaperEnabled.get(),false);
  const store=new WallpaperStore({profileDir:profileA,pluginVersion:'2.0.0-alpha.12',builtin:loadKinichWallpaperBuiltin});
  await store.ensure();
  const before=await store.current();
  const form={mutate:async operations=>{
    const next=JSON.parse(await readFile(configPath,'utf8'));
    for(const operation of operations){assert.equal(operation.op,'set');assert.deepEqual(operation.path,['dynamicWallpaperEnabled']);next[operation.path[0]]=operation.value;}
    await writeFile(configPath,JSON.stringify(next));return true;
  }};
  await writeKinichSettings(form,{dynamicWallpaperEnabled:false},await readConfig());
  assert.equal((await readConfig()).dynamicWallpaperEnabled,false);
  assert.equal(wallpaperDisplayAllowed(before.active,false),false);
  const reopened=new WallpaperStore({profileDir:profileA,pluginVersion:'2.0.0-alpha.12',builtin:loadKinichWallpaperBuiltin});
  await reopened.ensure();
  assert.deepEqual(await reopened.current(),before,'Reopening wallpaper store must retain history, parameters and palette');
  assert.equal((await readConfig()).ambientMotion,false);assert.equal((await readConfig()).animateAjaw,false);
  assert.equal(decodeKinichSettings(JSON.parse(await readFile(configBPath,'utf8'))).dynamicWallpaperEnabled,true,'Another Profile keeps its own preference');
  await writeKinichSettings(form,{dynamicWallpaperEnabled:true},await readConfig());
  assert.equal((await readConfig()).dynamicWallpaperEnabled,true);
  assert.deepEqual(await reopened.current(),before,'Toggle must not create history or change wallpaper revision');
  await assert.rejects(writeKinichSettings({mutate:async()=>false},{dynamicWallpaperEnabled:false},await readConfig()),/refused/);
  assert.equal((await readConfig()).dynamicWallpaperEnabled,true);
  assert.equal(wallpaperDisplayAllowed({...before.active,mode:'static'},false),true);
  assert.equal(wallpaperDisplayAllowed({...before.active,mode:'none'},true),false);
  assert.equal(wallpaperDisplayAllowed({...before.active,parameters:{...before.active.parameters,visibility:0}},true),true);
  console.log('Switch checks passed: Profile configuration file reread, off/on, store reopen/history unchanged, rejection, static/none/V=0. DSH UI restart is left to user review.');
} finally {
  if(await realpath(root)!==verifiedRoot)throw new Error('Temporary test root changed');
  await rm(verifiedRoot,{recursive:true,force:true});
}
