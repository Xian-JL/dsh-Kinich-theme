import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {DEFAULT_KINICH_SETTINGS} from '../src/shared/settings.js';
import {WALLPAPER_DEFAULT_PARAMETERS,validateWallpaperManifest} from '../src/shared/wallpaper.js';
import {getKinichThemeTokens} from '../src/client/theme/tokens.js';
import {KINICH_LOCALES} from '../src/client/locales.js';

const outDir=resolve('docs/wallpaper-reference/2026-10-14');await mkdir(outDir,{recursive:true});
const styleCode=await build({entryPoints:['src/client/styles.js'],bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent'});
const styleModule={exports:{}},tags=[],cleanups=[];
const styleDocument={head:{appendChild:tag=>tags.push(tag)},createElement:()=>({dataset:{},remove(){const index=tags.indexOf(this);if(index>=0)tags.splice(index,1);}})};
runInNewContext(styleCode.outputFiles[0].text,{module:styleModule,exports:styleModule.exports,document:styleDocument});
const styleCtx={effect:register=>cleanups.push(register())};styleModule.exports.installKinichStyles(styleCtx);styleModule.exports.installKinichStyles(styleCtx);
assert.equal(tags.length,2);cleanups[0]();assert.equal(tags.length,1,'Old fiber cleanup must retain the replacement stylesheet');cleanups[1]();assert.equal(tags.length,0);
const id='1'.repeat(64),manifest=validateWallpaperManifest({schemaVersion:1,id:'ui',name:'UI check',projects:[{id:'one',title:'One',assetIds:[id],coverId:id,heroId:id}]});
const ready={status:'ready',error:'',renderError:'',revision:1,current:{revision:1,activeHash:'x',historyCount:0,manifest,active:{mode:'dynamic',bundleHash:'b',projectId:'one',parameters:WALLPAPER_DEFAULT_PARAMETERS,autoPalette:true,paletteCaptured:true}},history:[],total:0};
const h=(type,props,...children)=>({type,props:{...props,...(children.length?{children}: {})}});
const react={createElement:h,Fragment:'fragment',useState:initial=>[initial?.status==='loading'&&Object.hasOwn(initial,'current')?ready:typeof initial==='function'?initial():initial,()=>{}],useRef:initial=>({current:initial}),useMemo:fn=>fn(),useCallback:fn=>fn,useEffect:()=>{},useSyncExternalStore:(_subscribe,get)=>get()};
const jsx={jsx:h,jsxs:h,Fragment:'fragment'},module={exports:{}};
const code=await build({entryPoints:['src/client/settings/kinich-settings-row.js'],bundle:true,write:false,format:'cjs',platform:'node',external:['react','react/jsx-runtime'],logLevel:'silent'});
const jumps=[];
runInNewContext(code.outputFiles[0].text,{module,exports:module.exports,require:name=>name==='react/jsx-runtime'?jsx:react,console,AbortController,URL,URLSearchParams,Date,document:{getElementById:id=>({scrollIntoView:()=>jumps.push(id)})}});
const writes=[];
const scope={getSnapshot:()=>({value:DEFAULT_KINICH_SETTINGS,writable:true}),subscribe:()=>()=>{},mutate:async operations=>{writes.push(operations);return true;}};
function expand(node){if(node==null||typeof node==='boolean')return null;if(Array.isArray(node))return node.map(expand);if(typeof node!=='object')return node;if(typeof node.type==='function')return expand(node.type(node.props));return {...node,props:{...node.props,children:expand(node.props.children)}};}
const tree=expand(module.exports.KinichSettingsRow({settings:scope,t:key=>KINICH_LOCALES.zh[key]??key}));
const nodes=[];function visit(n){if(Array.isArray(n)){n.forEach(visit);return;}if(n&&typeof n==='object'){nodes.push(n);visit(n.props.children);}}visit(tree);
for(const section of ['01','02','03','04','05','06'])assert.ok(nodes.some(node=>node.props.id==='dsh-kinich-settings-section-'+section));
const nav=nodes.find(node=>node.props.className==='dsh-kinich-settings__navigation');
assert.equal(nav.props.children.length,6);for(const button of nav.props.children)button.props.onClick();assert.deepEqual(jumps,['01','02','03','04','05','06'].map(id=>'dsh-kinich-settings-section-'+id));
const styleChoice=nodes.find(node=>node.props.className==='dsh-kinich-choice'&&node.props.children[0]?.props.children==='主题风格');
assert.ok(styleChoice,'Style selection must be available');const buttons=styleChoice.props.children[1].props.children;assert.equal(buttons.length,3);
for(const button of buttons)await button.props.onClick();
assert.deepEqual(writes.map(operations=>JSON.parse(JSON.stringify(operations))),['jungle','phlogiston','sunlit'].map(value=>[{op:'set',path:['visualStyle'],value}]));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const voidTags=new Set(['input','img','br','hr']);
function html(node){if(node==null)return '';if(Array.isArray(node))return node.map(html).join('');if(typeof node!=='object')return escape(node);if(node.type==='fragment')return html(node.props.children);let attrs='';for(const [key,value] of Object.entries(node.props)){if(key==='children'||key==='ref'||key.startsWith('on')||typeof value==='function'||value==null||value===false)continue;const name=key==='className'?'class':key==='htmlFor'?'for':key;if(key==='style')continue;attrs+=' '+name+'="'+escape(value===true?'':value)+'"';}return '<'+node.type+attrs+'>'+(!voidTags.has(node.type)?html(node.props.children)+'</'+node.type+'>':'');}
const css=await readFile('src/client/styles.css','utf8')+'\n'+await readFile('src/client/styles-v13.css','utf8');
const cases=[];
for(const style of ['jungle','phlogiston','sunlit'])for(const mode of ['light','dark'])for(const visibility of [0,50,100]){
 const tokens=getKinichThemeTokens(style,'#40a080',visibility>0,visibility);
 for(const key of ['--dsw-alias-bg-overlay','--dsw-specific-menu','--kinich-opaque-alias-bg-layer-2'])assert.match(tokens[key][mode],/^#[0-9a-f]{6}$/i);
 cases.push({style,mode,visibility,variables:Object.fromEntries(Object.entries(tokens).map(([key,value])=>[key,value[mode]]))});
}
const fixture=join(outDir,'release-201-ui.html');
const script=`const cases=${JSON.stringify(cases)};try{const results=[];for(const c of cases){document.body.dataset.kinichStyle=c.style;for(const [key,value]of Object.entries(c.variables))document.body.style.setProperty(key,value);for(const id of ['settings','alert','menu','listbox','popover']){const color=getComputedStyle(document.getElementById(id)).backgroundColor;if(color==='transparent'||color.startsWith('rgba(')&&!color.endsWith(', 1)'))throw Error(id+' translucent: '+color);}}
const port=document.querySelector('.hostOptions'),six=document.getElementById('dsh-kinich-settings-section-06');if(port.scrollHeight<=port.clientHeight)throw Error('Missing scrollable content');six.scrollIntoView({block:'start'});const a=port.getBoundingClientRect(),b=six.getBoundingClientRect();if(port.scrollTop<=0||b.top>=a.bottom||b.bottom<=a.top)throw Error('Section 06 unreachable');if(document.querySelectorAll('.dsh-kinich-settings__navigation button').length!==6)throw Error('Section navigation incomplete');document.getElementById('result').textContent=JSON.stringify({passed:true,surfaceCases:cases.length,popupNodes:5,sections:6,scrollTop:port.scrollTop,scrollHeight:port.scrollHeight,clientHeight:port.clientHeight});}catch(error){document.getElementById('result').textContent=JSON.stringify({passed:false,error:error.message});}`;
await writeFile(fixture,`<!doctype html><meta charset="utf-8"><style>${css}</style><style>body{margin:0}.hostPanel{display:flex;width:800px;height:700px;overflow:hidden;position:fixed;top:20px;left:20px;background:var(--dsw-alias-bg-layer-2)}.hostContent{display:flex;flex-direction:column;flex:1;min-width:0}.hostHeader{height:54px;flex:none}.hostOptions{flex:1;min-height:0;padding:0 24px 24px;overflow-y:auto}.popup{position:fixed;left:900px;top:20px;width:100px;height:40px}</style><body data-kinich-style="jungle"><div id="settings" class="hostPanel" role="dialog" aria-modal="true" data-shortcut-modal="settings"><nav style="width:188px;flex:none">Settings</nav><div class="hostContent"><header class="hostHeader">Header</header><div class="hostOptions">${html(tree)}</div></div></div><div id="alert" role="alertdialog" class="popup">Alert</div><div id="menu" role="menu" class="popup">Menu</div><div id="listbox" role="listbox" class="popup">List</div><div id="popover" popover="manual">Popover</div><pre id="result"></pre><script>document.getElementById('popover').showPopover();${script}</script>`);
const browser='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile=join(outDir,'edge-isolated-profile');
const dump=await new Promise((resolve,reject)=>{const child=spawn(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'--virtual-time-budget=2000','--dump-dom',pathToFileURL(fixture).href],{windowsHide:true});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolve(stdout):reject(new Error('Headless check failed: '+code+' '+stderr.slice(-300))));});
const match=dump.match(/<pre id="result">([^<]*)<\/pre>/);assert.ok(match,'Headless browser must return a result');const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));assert.equal(result.passed,true,result.error);await writeFile(join(outDir,'RELEASE_201_UI_CHECK.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
