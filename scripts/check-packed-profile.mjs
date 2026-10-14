import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const profileDir=resolve(process.argv[2]??''),stage=process.argv[3];
if(!profileDir.startsWith(resolve('E:/Codex_workspace/Kinich_archive')+'/')&&!profileDir.toLowerCase().startsWith(resolve('E:/Codex_workspace/Kinich_archive').toLowerCase()+'\\'))throw new Error('Audit Profile must be in the designated Kinich archive');
const packageDir=join(profileDir,'node_modules/dsh-kinich-theme');
const pkg=JSON.parse(await readFile(join(packageDir,'package.json'),'utf8'));
assert.equal(pkg.version,process.argv[4]??'2.0.0-alpha.13');
const host=await import(pathToFileURL(join(packageDir,'lib/index.js')).href);
const legacy={dynamicWallpaperEnabled:false,ambientMotion:false,animateAjaw:false};
assert.equal(host.Config(legacy).dynamicWallpaperEnabled.get(),false);
const routes=new Map(),disposers=[];
const connection={fetch:{register:route=>{routes.set(route.path,route);return()=>routes.delete(route.path);}}};
const settings={get:()=>legacy,configure:()=>()=>{}};
const hostCtx={settings,get:key=>key==='connection'?connection:key==='profileContext'?{dir:profileDir,name:'packed-audit'}:undefined,effect:register=>{const dispose=register();if(dispose)disposers.push(dispose);}};
host.apply({fiber:{id:'packed-audit'},inject:(services,activate)=>{if(services.length===2&&services.includes('connection')&&services.includes('settings')||services.length===1&&services[0]==='settings')activate(hostCtx);}});
const request=async(path,body)=>{
  const route=routes.get(path);assert.ok(route,'Packed route must be registered');
  const response=await route.fetch(new Request('https://profile.test'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined));
  assert.equal(response.status,200,await response.clone().text());return response.json();
};
const checkpoint=join(profileDir,'packed-checkpoint.json');
try {
  let current=await request('/api/kinich-wallpaper/state');
  if(stage==='initial'){
    assert.equal(current.active.mode,'dynamic');assert.equal(current.manifest.projects.length,8);
    await request('/api/kinich-wallpaper/palette',{expectedRevision:current.revision,color:'#40a080',representativeAssetId:current.manifest.representativeAssetId,algorithmVersion:'kinich-dominant-v1'});
    current=await request('/api/kinich-wallpaper/state');
    await request('/api/kinich-wallpaper/apply',{expectedRevision:current.revision,...current.active,parameters:{...current.active.parameters,rhythm:25},viewPosition:current.active.normalizedViewPosition,reason:'packed-audit'});
    current=await request('/api/kinich-wallpaper/state');
    const history=await request('/api/kinich-wallpaper/history');
    await writeFile(checkpoint,JSON.stringify({current,history},null,2));
  }else{
    const saved=JSON.parse(await readFile(checkpoint,'utf8'));
    assert.deepEqual(current,saved.current,'Installed Host must reopen the exact selected snapshot, parameters and palette');
    assert.deepEqual(await request('/api/kinich-wallpaper/history'),saved.history,'Durable history must survive package changes');
  }
  for(const [id,info] of Object.entries(current.assets)){
    const response=await routes.get('/api/kinich-wallpaper/asset').fetch(new Request('https://profile.test/api/kinich-wallpaper/asset?id='+id));
    assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length,info.byteLength);assert.equal(createHash('sha256').update(bytes).digest('hex'),id);
  }
  console.log(JSON.stringify({stage,version:pkg.version,assets:Object.keys(current.assets).length,history:current.historyCount,mode:current.active.mode,rhythm:current.active.parameters.rhythm,sampledAccent:current.active.sampledAccent,dynamicWallpaperEnabled:host.Config(legacy).dynamicWallpaperEnabled.get()}));
}finally{for(const dispose of disposers.reverse())await dispose();}
