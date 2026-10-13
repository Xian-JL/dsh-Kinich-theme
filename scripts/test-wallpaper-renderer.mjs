import assert from "node:assert/strict";
import { build } from "esbuild";
import { runInNewContext } from "node:vm";
import { coverCrop, detailGeometry, detailFooterGeometry, detailRailGeometry, interpolatePlanes } from "../src/client/wallpaper/geometry.js";
import { validateWallpaperManifest, WALLPAPER_DEFAULT_PARAMETERS, validateWallpaperSnapshot } from "../src/shared/wallpaper.js";

// Changing plane aspect ratios and extreme offsets must never sample outside the image.
for(const target of [[1920,1080],[350,500],[2560,1080],[800,600]])for(const source of [[1920,1080],[1200,1800]])for(const zoom of [1,1.25,1.75])for(const offset of [-.75,0,.75]){
	const [x,y,w,h]=coverCrop(...source,...target,zoom,offset,offset);
	assert.ok(x>=0&&y>=0&&x+w<=1.000001&&y+h<=1.000001);
	assert.ok(Math.abs((source[0]*w)/(source[1]*h)-target[0]/target[1])<.000001);
}
const texture={},from=[{image:texture,box:{x:0,y:0,w:1,h:1},opacity:1,magnitude:0,offset:0}],to=[{image:texture,box:{x:.4,y:.2,w:.2,h:.6},opacity:1,magnitude:1,offset:0}];
const midway=interpolatePlanes(from,to,.4);assert.equal(midway.length,1);assert.ok(midway[0].box.w<1&&midway[0].box.w>.2);
assert.deepEqual(interpolatePlanes(midway,from,0)[0].box,midway[0].box);
assert.deepEqual(interpolatePlanes(midway,from,1)[0].box,from[0].box);

const ids=Array.from({length:4},(_,i)=>String(i+1).repeat(64));
const manifest=validateWallpaperManifest({schemaVersion:1,id:"renderer-test",projects:[
	{id:"one",title:"One",coverId:ids[0],heroId:ids[0],assetIds:[ids[0],ids[2],ids[3]],largeImageIds:[ids[2],ids[3]],imageGaps:[40,320]},
	{id:"two",title:"Two",coverId:ids[1],heroId:ids[1],assetIds:[ids[1]]}
]});
const assets=Object.fromEntries(ids.map(id=>[id,{width:1920,height:1080}]));
const layout=detailGeometry(manifest.projects[0],assets,1440,900);
assert.equal(layout.images[0].y,900+1440*.208333+40);
assert.ok(Math.abs(layout.images[1].y-layout.images[0].y-layout.images[0].height-320)<.000001);
assert.equal(layout.imagePosition(1),(layout.images[1].y-40)/layout.maxScroll);
assert.equal(layout.maxScroll,layout.footerStart+1350);
const lastImage=layout.images.at(-1),beforeFooter=detailFooterGeometry(layout,1440,900,lastImage.y/layout.maxScroll);
assert.ok(beforeFooter.y>lastImage.height,"Next preview follows the last image plus the real margin");
const atFooter=detailFooterGeometry(layout,1440,900,layout.footerStart/layout.maxScroll);
assert.equal(atFooter.scroll,layout.footerStart);assert.equal(atFooter.progress,0);assert.equal(atFooter.scale,1.25);
const fullFooter=detailFooterGeometry(layout,1440,900,1);assert.equal(fullFooter.progress,1);assert.equal(fullFooter.width,1442);assert.equal(fullFooter.height,902);assert.equal(fullFooter.scale,1);assert.equal(fullFooter.y,-1);


const firstRail=detailRailGeometry(manifest.projects[0],assets,1440,900,layout.imagePosition(0),2);
assert.equal(firstRail.selectedIndex,0);assert.equal(firstRail.items[0].width,60);assert.equal(firstRail.frame.width,74);
const lastRail=detailRailGeometry(manifest.projects[0],assets,1440,900,layout.imagePosition(1),2);assert.equal(lastRail.selectedIndex,1);
assert.equal(detailRailGeometry(manifest.projects[0],assets,1440,900,0,2).shown,false);
assert.equal(detailRailGeometry(manifest.projects[0],assets,1440,900,1,2).shown,false);

let now=0,nextFrame=0,hookIndex=0,rendererCount=0;
const hooks=[],effects=[],frames=new Map(),listeners=new Map(),layers=[];
const react={createElement:(type,props,...children)=>({type,props,children}),Fragment:"fragment",
	useRef:initial=>{const index=hookIndex++;return hooks[index]??=( {current:initial} );},
	useState:initial=>{const index=hookIndex++;hooks[index]??={value:initial};return [hooks[index].value,value=>{hooks[index].value=typeof value==="function"?value(hooks[index].value):value;}];},
	useEffect:(effect,deps)=>{const index=hookIndex++,old=hooks[index];if(!old||deps.some((value,i)=>value!==old.deps[i]))effects.push(()=>{old?.cleanup?.();hooks[index]={deps,cleanup:effect()};});}
};
let currentTexture,crop,opacity,viewport,draws=[],clearAlpha,blendFactors;
const gl=new Proxy({blendFuncSeparate:(...values)=>{blendFactors=values;},createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),createTexture:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_,name)=>name,getAttribLocation:()=>0,
	bindTexture:(_,texture)=>{currentTexture=texture;},texImage2D:(...args)=>{currentTexture.id=args.at(-1).src;},uniform1f:(_,value)=>{opacity=value;},uniform4fv:(_,value)=>{crop=Array.from(value);},viewport:(...values)=>{viewport=values;},clearColor:(_r,_g,_b,a)=>{clearAlpha=a;},clear:()=>{draws=[];},drawArrays:()=>{draws.push({id:currentTexture.id,crop:[...crop],opacity,viewport:[...viewport]});}
},{get:(target,key)=>key in target?target[key]:typeof key==="string"&&key===key.toUpperCase()?key:()=>{}});
function element(tag){const result={tag,style:{},dataset:{},children:[],width:1920,height:1080,setAttribute:()=>{},append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}},insertBefore(child){child.parentNode=this;this.children.push(child);if(!layers.includes(child))layers.push(child);},remove(){const index=layers.indexOf(this);if(index>=0)layers.splice(index,1);},addEventListener(type,fn){this.events??=new Map();this.events.set(type,fn);},removeEventListener(type){this.events?.delete(type);}};
	const ink=new Proxy({canvas:result,measureText:text=>({width:String(text).length*10})},{get:(target,key)=>key in target?target[key]:()=>{}});
	result.getContext=type=>{if(type==="webgl"){rendererCount++;return gl;}return ink;};return result;
}
const body=element("body"),document={body,documentElement:{lang:"en"},fonts:{add:()=>{},delete:()=>{}},createElement:element,getElementById:()=>null,querySelector:()=>null,activeElement:null,addEventListener:()=>{},removeEventListener:()=>{}};
const addEventListener=(name,callback)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(callback);};
const removeEventListener=(name,callback)=>listeners.get(name)?.delete(callback);
const window={innerWidth:1920,innerHeight:1080,addEventListener,removeEventListener,dispatchEvent:event=>{for(const listener of listeners.get(event.type)??[])listener(event);}};
const media={matches:false,addEventListener:()=>{},removeEventListener:()=>{}};
const module={exports:{}};
const compiled=await build({entryPoints:["src/client/wallpaper/stage.js"],bundle:true,write:false,format:"cjs",platform:"node",external:["react"],logLevel:"silent"});
runInNewContext(compiled.outputFiles[0].text,{module,exports:module.exports,require:()=>react,document,window,innerWidth:1920,innerHeight:1080,devicePixelRatio:1,performance:{now:()=>now},matchMedia:()=>media,addEventListener,removeEventListener,requestAnimationFrame:callback=>{const id=++nextFrame;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),Image:class{naturalWidth=1920;naturalHeight=1080;async decode(){}},FontFace:class{async load(){return this;}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},console});
let wallpaper={status:"ready",current:{activeHash:"a",active:{mode:"dynamic",bundleHash:"pack",projectId:"one",parameters:{...WALLPAPER_DEFAULT_PARAMETERS,visibility:100},autoPalette:true,paletteCaptured:true},manifest,assets},view:"work",page:0,viewPosition:0,browsing:false,calibration:false,browseAutoPlay:false,capturePalette:async()=>{throw new Error("Already sampled");}};
function render(){hookIndex=0;module.exports.KinichWallpaperStage({wallpaper,ambientMotion:true});while(effects.length)effects.shift()();}
async function tick(count=1){for(let i=0;i<count;i++){now+=20;const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(now);await new Promise(resolve=>setImmediate(resolve));}}
render();await tick(1000);assert.deepEqual(blendFactors,["SRC_ALPHA","ONE_MINUS_SRC_ALPHA","ONE","ONE_MINUS_SRC_ALPHA"]);assert.equal(rendererCount,1);assert.ok(draws.length>0);
wallpaper={...wallpaper,current:{...wallpaper.current,active:{...wallpaper.current.active,parameters:{...wallpaper.current.active.parameters,rhythm:0}}}};render();await tick();const frozen=JSON.stringify(draws);await tick(200);assert.equal(JSON.stringify(draws),frozen);assert.equal(frames.size,0);
wallpaper={...wallpaper,current:{...wallpaper.current,active:{...wallpaper.current.active,parameters:{...wallpaper.current.active.parameters,visibility:0}}}};render();await tick();assert.equal(body.children[0].style.opacity,"0");assert.equal(clearAlpha,1);assert.equal(draws.length,0);assert.equal(rendererCount,1);
wallpaper={...wallpaper,browsing:true,view:"work"};render();await tick(2);assert.equal(rendererCount,1);
wallpaper={...wallpaper,calibration:true};render();await tick(2);assert.equal(wallpaper.current.active.parameters.visibility,0);assert.equal(body.children[0].style.opacity,"1");
wallpaper={...wallpaper,calibration:false,browsing:true,view:"detail",current:{...wallpaper.current,active:{...wallpaper.current.active,parameters:{...wallpaper.current.active.parameters,visibility:100}}}};render();await tick(20);assert.equal(rendererCount,1);assert.ok(draws.length>0);
const canvas=body.children[0].children[1];let prevented=false;canvas.events.get("webglcontextlost")({preventDefault:()=>{prevented=true;}});assert.equal(prevented,true);assert.equal(frames.size,0);canvas.events.get("webglcontextrestored")();await tick();assert.equal(rendererCount,1);assert.ok(draws.length>0);
const savedCurrent=JSON.stringify(wallpaper.current);
wallpaper={...wallpaper,dynamicEnabled:false};render();await tick();
assert.equal(layers.length,0,"Disabled dynamic wallpaper must remove its layer");
assert.equal(frames.size,0,"Disabled dynamic wallpaper must stop its RAF");
assert.ok([...listeners.values()].every(set=>set.size===0),"Disabled renderer listeners must be released");
assert.equal(JSON.stringify(wallpaper.current),savedCurrent,"Toggling must retain the selected snapshot and palette");
wallpaper={...wallpaper,dynamicEnabled:true,browsing:false};render();await tick(20);
assert.equal(layers.length,1);assert.equal(rendererCount,2);assert.ok(draws.length>0);
assert.equal(JSON.stringify(wallpaper.current),savedCurrent);
wallpaper={...wallpaper,current:{...wallpaper.current,active:{...wallpaper.current.active,mode:"static"}},dynamicEnabled:false};render();await tick(20);
assert.equal(layers.length,1,"Disabling dynamic wallpaper must not remove static wallpaper");assert.ok(draws.length>0);
for(const hook of hooks)hook?.cleanup?.();assert.equal(frames.size,0);assert.equal(layers.length,0);assert.ok([...listeners.values()].every(set=>set.size===0));
assert.throws(()=>validateWallpaperSnapshot({schemaVersion:1,mode:"dynamic"}),/invalid-snapshot/);
console.log("Renderer source checks passed: cover crop bounds/aspect, interrupted plane retarget, real gallery positions, single renderer, zero rhythm freeze, zero visibility, view reuse, context recovery and cleanup. No Desktop visual acceptance is implied.");
