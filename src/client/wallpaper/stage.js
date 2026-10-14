import * as react from "react";
import { wallpaperAssetUrl, wallpaperElementCount, wallpaperMotionAllowed, wallpaperDisplayAllowed, wallpaperMultiplier, wallpaperScale } from "../../shared/wallpaper.js";
import { coverCrop as safeCoverCrop, detailGeometry, detailFooterGeometry, detailRailGeometry, interpolatePlanes, clamp01, referenceEase, dampedProgress } from "./geometry.js";
import { extractDominantKinichAccent } from "../background/palette.js";

const VERTEX_SOURCE = "precision highp float;attribute vec2 p;attribute vec2 v;varying vec2 uv;void main(){uv=v;gl_Position=vec4(p,0.0,1.0);}";
const FRAGMENT_SOURCE = "precision mediump float;uniform sampler2D image;uniform vec4 crop;uniform float alpha;varying vec2 uv;void main(){vec4 c=texture2D(image,crop.xy+uv*crop.zw);gl_FragColor=vec4(c.rgb,c.a*alpha);}";

function compile(gl, type, source) {
	const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
	if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const issue=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(issue||"Wallpaper shader failed");}
	return shader;
}
function createRenderer(gl) {
	const program=gl.createProgram(),vertex=compile(gl,gl.VERTEX_SHADER,VERTEX_SOURCE),fragment=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT_SOURCE);
	gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
	if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||"Wallpaper renderer failed");
	gl.useProgram(program);
	gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
	const buffer=gl.createBuffer(),vertices=new Float32Array([-1,-1,0,1,1,-1,1,1,-1,1,0,0,-1,1,0,0,1,-1,1,1,1,1,1,0]);
	gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
	const p=gl.getAttribLocation(program,"p"),v=gl.getAttribLocation(program,"v");
	gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(v);gl.vertexAttribPointer(v,2,gl.FLOAT,false,16,8);
	return {program,buffer,alpha:gl.getUniformLocation(program,"alpha"),crop:gl.getUniformLocation(program,"crop"),textures:new Map()};
}
function getTexture(gl, renderer, id, image) {
	if(renderer.textures.has(id))return renderer.textures.get(id);
	const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
	for(const [parameter,value]of[[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR]])gl.texParameteri(gl.TEXTURE_2D,parameter,value);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
	const record={texture,width:image.naturalWidth,height:image.naturalHeight};renderer.textures.set(id,record);return record;
}
function drawTexture(gl,renderer,image,box,viewport,opacity,magnitude=0,offset=0,offsetY=0) {
	if(renderer.collect){if(image&&opacity>0)renderer.collect.push({image,box:{...box},opacity,magnitude,offset,offsetY});return;}
	if(!image||opacity<=0)return;
	const x=Math.round(box.x*viewport.width),y=Math.round(box.y*viewport.height),w=Math.max(1,Math.round(box.w*viewport.width)),h=Math.max(1,Math.round(box.h*viewport.height));
	gl.viewport(x,viewport.height-y-h,w,h);gl.uniform1f(renderer.alpha,opacity);
	gl.uniform4fv(renderer.crop,safeCoverCrop(image.width,image.height,w,h,1+0.25*magnitude,offset,offsetY));gl.bindTexture(gl.TEXTURE_2D,image.texture);gl.drawArrays(gl.TRIANGLES,0,6);
}
function drawText(ctx,text,x,y) {
	if(ctx.wallpaperLabels&&ctx.globalAlpha>0&&y>-200&&y<innerHeight+200)ctx.wallpaperLabels.push({text,x,y,font:ctx.font,opacity:ctx.globalAlpha,align:ctx.textAlign,baseline:ctx.textBaseline,tracking:ctx.letterSpacing,color:ctx.fillStyle});
	ctx.fillText(text,x,y);
}
function drawLabel(ctx,text,x,y,px,opacity=1,align="center",letterSpacing="0px") {
	ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle="#fff";ctx.textAlign=align;ctx.textBaseline="middle";ctx.letterSpacing=letterSpacing;
	ctx.font="400 "+px+"px 'Sohne Buch','Helvetica Neue',Arial,sans-serif";
	const reveal=ctx.wallpaperReveal??1,shift=px*(ctx.wallpaperMask??1.1)*(ctx.wallpaperAmplitude??1)*(1-reveal);ctx.beginPath();ctx.rect(0,y-px*.7,ctx.canvas.width,px*1.4);ctx.clip();drawText(ctx,text,x,y+shift);ctx.restore();
}
function drawWrapped(ctx,text,x,y,maxWidth,px,opacity=1,lineHeight=1.5,align="left",letterSpacing="0px") {
	ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=ctx.wallpaperTextColor??"#fff";ctx.textAlign=align;ctx.textBaseline="top";ctx.letterSpacing=letterSpacing;ctx.font="400 "+px+"px 'Sohne Buch','Helvetica Neue',Arial,sans-serif";
	let line="",top=y;for(const unit of Array.from(String(text))){if(unit==="\n"){if(line)drawText(ctx,line,x,top);line="";top+=px*lineHeight;continue;}const candidate=line+unit;if(line&&ctx.measureText(candidate).width>maxWidth){drawText(ctx,line,x,top);line=unit;top+=px*lineHeight;}else line=candidate;}if(line)drawText(ctx,line,x,top);ctx.restore();return top+px*lineHeight;
}
function wrapTextRows(ctx,text,maxWidth,px,letterSpacing="0px") {
	ctx.save();ctx.letterSpacing=letterSpacing;ctx.font="400 "+px+"px 'Sohne Buch','Helvetica Neue',Arial,sans-serif";const rows=[];let line="";
	for(const unit of Array.from(String(text))){if(unit==="\n"){rows.push(line);line="";continue;}const candidate=line+unit;if(line&&ctx.measureText(candidate).width>maxWidth){rows.push(line);line=unit;}else line=candidate;}
	if(line||!rows.length)rows.push(line);ctx.restore();return rows;
}
function drawCascadeText(ctx,text,x,y,maxWidth,px,opacity,lineHeight,align,letterSpacing,timeMs,staggerMs,durationMs,offsetPx) {
	const rows=wrapTextRows(ctx,text,maxWidth,px,letterSpacing),linePx=px*lineHeight;ctx.save();ctx.fillStyle=ctx.wallpaperTextColor??"#fff";ctx.textAlign=align;ctx.textBaseline="top";ctx.letterSpacing=letterSpacing;ctx.font="400 "+px+"px 'Sohne Buch','Helvetica Neue',Arial,sans-serif";
	for(let i=0;i<rows.length;i++){const rowY=y+i*linePx,key=`${ctx.wallpaperRevealScope??""}:${text}:${i}`;let age=timeMs;
		if(typeof ctx.wallpaperLineReveals?.has==="function"&&opacity>0){if(rowY<(ctx.wallpaperViewportHeight??innerHeight)&&rowY+linePx>0&&!ctx.wallpaperLineReveals.has(key))ctx.wallpaperLineReveals.set(key,ctx.wallpaperRevealStatic?ctx.wallpaperRevealClock-durationMs-i*staggerMs:ctx.wallpaperRevealClock);age=ctx.wallpaperLineReveals.has(key)?ctx.wallpaperRevealClock-ctx.wallpaperLineReveals.get(key):0;}
		const local=Math.max(0,Math.min(1,(age-i*staggerMs)/durationMs));if(local<1&&opacity>0&&rowY+linePx>0&&rowY<innerHeight)ctx.wallpaperRevealPending=true;const ease=1-(1-local)**3;ctx.save();ctx.beginPath();ctx.rect(0,y+i*linePx,ctx.canvas.width,linePx);ctx.clip();ctx.globalAlpha=opacity*ease;drawText(ctx,rows[i],x,y+i*linePx+offsetPx*(1-ease));ctx.restore();}
	ctx.restore();return {bottom:y+rows.length*linePx,rows:rows.length};
}

/** One Profile-owned WebGL scene stays passive behind DSH; input exists only on browse-scoped controls. */
export function KinichWallpaperStage({ wallpaper, ambientMotion=true, visualStyle }) {
	const reportFailure=message=>{if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("kinich-wallpaper-render-status",{detail:{error:message}}));};
	const live=react.useRef(null);
	const redraw=react.useRef(null);
	const loadedBundles=react.useRef(new Set());
	const [titleHovered,setTitleHovered]=react.useState(false);
	const [,setViewportRevision]=react.useState(0);
	const current=wallpaper.current,active=current?.active,manifest=current?.manifest;
	const imagePool=manifest?[...new Set([...manifest.projects.map(project=>project.coverId),...manifest.projects.flatMap(project=>project.assetIds)])]:[];
	const view=wallpaper.view ?? "work",page=wallpaper.page ?? 0;

	const mounted=wallpaperDisplayAllowed(active,wallpaper.dynamicEnabled);
	react.useEffect(()=>{if(!mounted)return;const update=()=>setViewportRevision(value=>value+1);addEventListener("resize",update);return()=>removeEventListener("resize",update);},[mounted]);
	const visible=mounted&&(wallpaper.calibration||active.parameters.visibility>0);
		live.current={wallpaper,current,active,manifest,ambientMotion,view:wallpaper.browsing?view:"work",page,browsing:wallpaper.browsing,calibration:wallpaper.calibration,browseAutoPlay:wallpaper.browseAutoPlay,titleHovered,viewPosition:wallpaper.viewPosition ?? active?.normalizedViewPosition ?? 0};

	(0,react.useEffect)(()=>{
		if(!mounted||!current||!manifest||!document.body)return;
		const body=document.body,layer=document.createElement("div"),canvas=document.createElement("canvas"),text=document.createElement("canvas"),fallback=document.createElement("img");
		const configuredProject=manifest.projects.find(project=>project.id===active.projectId)??manifest.projects[0];
		const selectedProject=view==="detail"?manifest.projects[Math.min(page,manifest.projects.length-1)]??configuredProject:configuredProject;
		const selectedGallery=selectedProject.largeImageIds?.length?selectedProject.largeImageIds:selectedProject.assetIds.filter(id=>id!==selectedProject.heroId);
		const selectedThumbnails=selectedProject.thumbnailAssetIds?.length?selectedProject.thumbnailAssetIds:(selectedProject.largeImageIds?.length?selectedProject.assetIds.filter(id=>id!==selectedProject.heroId&&!selectedGallery.includes(id)):selectedGallery);
		const nextProjectCover=manifest.projects[(Math.min(page,manifest.projects.length-1)+1)%manifest.projects.length]?.coverId;
		const requestedParameters=wallpaper.calibration?{...active.parameters,rhythm:50,amplitude:50,elementDensity:50,visibility:100}:active.parameters;
		const selectedDensity=wallpaperElementCount(requestedParameters.elementDensity,selectedThumbnails.length);
		const firstBundleLoad=active.mode==="dynamic"&&!loadedBundles.current.has(active.bundleHash);
		const viewAssets=active.mode==="static"?[configuredProject.heroId]:view==="detail"?[selectedProject.heroId,nextProjectCover,...selectedGallery.slice(0,2),...selectedThumbnails.slice(0,selectedDensity)]:view==="about"?[]:imagePool.slice(0,Math.max(8,wallpaperElementCount(active.parameters.elementDensity,Infinity)));
		const neededAssets=[...new Set([...(firstBundleLoad?manifest.loaderAssetIds:[]),...viewAssets,manifest.representativeAssetId,...manifest.projects.map(project=>project.coverId)])];
		const neededFonts=manifest.fontAssetIds??[];
		layer.className="dsh-kinich-wallpaper-stage";layer.setAttribute("aria-hidden","true");
		layer.style.cssText="position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;contain:strict";layer.style.opacity=String(requestedParameters.visibility/100);
		canvas.style.cssText=text.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
		fallback.alt="";fallback.setAttribute("aria-hidden","true");fallback.src=wallpaperAssetUrl(manifest.representativeAssetId);fallback.style.cssText=`display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;pointer-events:none`;
		layer.append(fallback,canvas,text);body.insertBefore(layer,body.firstChild);
		const previous=body.dataset.kinichWallpaperMode;body.dataset.kinichWallpaperMode=requestedParameters.visibility>0?active.mode:"none";
		let gl,engine,ink,last=performance.now(),elapsed=0,frame=0,closed=false,loaded=false,preparedResources=0;
		const motionQuery=matchMedia("(prefers-reduced-motion: reduce)");
		const images=new Map(),decodedImages=new Map(),fontFaces=[];
		let paletteToCapture=null,transition=null,lastPlanes=[],lastLabels=[],hoverProgress=0,loaderStartedAt=null,contextLost=false,aboutClock=0,detailClock=0,previousView=null;
		const aboutRowReveals=new Map();
		let lastAboutPosition=null;
		let aboutMiniStable=false;
		let lastConfiguredProject=active.projectId;
		const pendingImages=new Map();
		const failedImages=new Set();
		const navigate=event=>{const detail=event.detail,model=live.current;if(!detail||!model?.browsing||model.active?.mode!=="dynamic")return;
			const parameters=model.calibration?{rhythm:50,amplitude:50}:model.active.parameters;
			transition=parameters.rhythm>0&&parameters.amplitude>0&&model.ambientMotion&&!motionQuery.matches?{from:lastPlanes.map(plane=>({...plane,box:{...plane.box}})),fromLabels:lastLabels.map(label=>({...label})),elapsed:0,direction:detail.direction??1,vertical:detail.fromView==="detail"||detail.toView==="detail",toView:detail.toView}:null;if(!transition){loaderStartedAt=null;aboutClock=detailClock=Infinity;}
		};
		window.addEventListener("kinich-wallpaper-transition-start",navigate);
		try{
			gl=canvas.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:false});ink=text.getContext("2d");
			if(!gl||!ink)throw new Error("WebGL or Canvas renderer is unavailable");
			engine=createRenderer(gl);
		}catch(error){fallback.style.display="block";reportFailure(error.message);return()=>{window.removeEventListener("kinich-wallpaper-transition-start",navigate);layer.remove();if(previous===undefined)delete body.dataset.kinichWallpaperMode;else body.dataset.kinichWallpaperMode=previous;};}
		const ensureImage=async hash=>{
			if(images.has(hash)||closed||contextLost||failedImages.has(hash))return;
			if(pendingImages.has(hash))return pendingImages.get(hash);
			const promise=(async()=>{try{const image=new Image();image.decoding="async";image.src=wallpaperAssetUrl(hash);await image.decode();if(closed)return;
				decodedImages.set(hash,image);if(!contextLost)images.set(hash,getTexture(gl,engine,hash,image));
				const snapshot=live.current?.active;if(hash===manifest.representativeAssetId&&!snapshot?.paletteCaptured&&!snapshot?.sampledAccent&&!paletteToCapture){
					const sampler=document.createElement("canvas"),ctx=sampler.getContext("2d",{willReadFrequently:true});if(ctx){const factor=Math.min(1,160/image.naturalWidth,100/image.naturalHeight);sampler.width=Math.max(1,Math.round(image.naturalWidth*factor));sampler.height=Math.max(1,Math.round(image.naturalHeight*factor));ctx.drawImage(image,0,0,sampler.width,sampler.height);paletteToCapture={color:extractDominantKinichAccent(ctx.getImageData(0,0,sampler.width,sampler.height).data)??"",representativeAssetId:hash,algorithmVersion:"kinich-dominant-v1"};}
				}
			}catch(error){failedImages.add(hash);if(!closed){fallback.style.display="block";canvas.style.visibility="hidden";text.style.visibility="hidden";reportFailure(error.message); }throw error;}
			finally{pendingImages.delete(hash);if(!closed&&!contextLost)redraw.current?.();}})();pendingImages.set(hash,promise);return promise;
		};
		const draw=time=>{
			frame=0;if(closed)return;
			const model=live.current;if(!model?.manifest)return;
			if(model.active.projectId!==lastConfiguredProject){elapsed=0;transition=null;lastConfiguredProject=model.active.projectId;}
			const visibility=model.calibration?100:model.active.parameters.visibility;layer.style.opacity=String(visibility/100);body.dataset.kinichWallpaperMode=visibility>0?model.active.mode:"none";if(contextLost)return;
			const browseHost=model.browsing?document.querySelector(".dsh-kinich-wallpaper-hit-area"):null;
			if(browseHost&&layer.parentNode!==browseHost)browseHost.appendChild(layer);else if(!model.browsing&&layer.parentNode!==body)body.insertBefore(layer,body.firstChild);
			const cssWidth=Math.max(1,innerWidth),cssHeight=Math.max(1,innerHeight),pixelRatio=1.5;
			const width=Math.max(1,Math.floor(cssWidth*pixelRatio)),height=Math.max(1,Math.floor(cssHeight*pixelRatio));
			if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;text.width=width;text.height=height;gl.viewport(0,0,width,height);}
			const values=model.calibration?{rhythm:50,amplitude:50,elementDensity:50,visibility:100}:model.active.parameters,reduced=motionQuery.matches;
			body.dataset.kinichWallpaperMode=values.visibility>0?model.active.mode:"none";
			const renderActive=model.calibration?{...model.active,parameters:values}:model.active;
			const moving=wallpaperMotionAllowed(renderActive,{ambientMotion:model.ambientMotion,reducedMotion:reduced})&&(!model.browsing||model.browseAutoPlay);
			const dt=Math.max(0,time-last);last=time;
			const animationAllowed=wallpaperMotionAllowed(renderActive,{ambientMotion:model.ambientMotion,reducedMotion:reduced});
			if(loaded&&loaderStartedAt!==null&&animationAllowed)loaderStartedAt+=dt*wallpaperMultiplier(values.rhythm);
			if(`${model.view}:${model.page}`!==previousView){aboutRowReveals.clear();lastAboutPosition=null;aboutMiniStable=false;aboutClock=animationAllowed?0:Infinity;detailClock=animationAllowed?0:Infinity;previousView=`${model.view}:${model.page}`;}
			if(reduced||!model.ambientMotion||values.amplitude===0)loaderStartedAt=null;
			if(animationAllowed){if(model.view==="about")aboutClock+=dt*wallpaperMultiplier(values.rhythm);if(model.view==="detail")detailClock+=dt*wallpaperMultiplier(values.rhythm);}
			if(loaded&&moving&&(loaderStartedAt===null||loaderStartedAt>=5300))elapsed+=dt/1000*wallpaperMultiplier(values.rhythm);

			if(transition&&(values.amplitude===0||reduced||!model.ambientMotion||transition.elapsed>=2600))transition=null;
			if(animationAllowed){const target=model.titleHovered?1:0;hoverProgress+=Math.sign(target-hoverProgress)*Math.min(Math.abs(target-hoverProgress),dt*wallpaperMultiplier(values.rhythm)/(target?1200:300));}else if(values.amplitude===0||reduced||!model.ambientMotion)hoverProgress=model.titleHovered?1:0;
			fallback.style.opacity="1";layer.style.opacity=String(values.visibility/100);
			const projects=model.manifest.projects,configured=Math.max(0,projects.findIndex(item=>item.id===model.active.projectId));
			const coverPool=projects.map(project=>project.coverId),elementPool=imagePool,density=wallpaperElementCount(values.elementDensity,elementPool.length);
			const transitionDuration=1.29,stableDwell=12,transitionAllowed=values.amplitude>0&&!reduced&&density>0;
			const cycleLength=stableDwell+(transitionAllowed?3*transitionDuration:0);
			const autoCycle=model.active.mode==="dynamic"&&model.view==="work"&&(!model.browsing||model.browseAutoPlay);
			const cyclePhase=autoCycle?elapsed%cycleLength:0,cycleStep=autoCycle?Math.floor(elapsed/cycleLength):0;
			const fixedPage=model.view==="detail"||model.browsing&&!model.browseAutoPlay;
			const index=projects.length?(fixedPage?Math.min(model.page,projects.length-1):(Math.max(0,model.page??configured)+cycleStep)%projects.length):0;
			const activeProject=projects[index],nextProject=projects[(index+1)%Math.max(1,projects.length)];
			const desired=new Set([...coverPool,manifest.representativeAssetId]);
			if(model.view==="detail"&&activeProject){const layout=detailGeometry(activeProject,model.current.assets,cssWidth,cssHeight),scroll=layout.maxScroll*model.viewPosition;desired.add(activeProject.heroId);desired.add((projects.find(project=>project.id===activeProject.nextProjectId)??nextProject)?.coverId);for(const item of layout.images)if(item.y+item.height>scroll-cssHeight&&item.y<scroll+2*cssHeight)desired.add(item.id);for(const id of activeProject.thumbnailAssetIds.filter((_,i,list)=>{const count=(model.calibration?list.length:wallpaperElementCount(values.elementDensity,list.length));return Array.from({length:count},(_,slot)=>Math.floor(slot*(list.length-1)/Math.max(1,count-1))).includes(i);}))desired.add(id);}
			else for(const id of elementPool.slice(0,Math.max(8,density)))desired.add(id);
			for(const hash of desired)if(hash&&!images.has(hash))void ensureImage(hash).catch(()=>{});
			if(transition&&animationAllowed&&(model.view==="about"||images.has(model.view==="detail"?activeProject.heroId:activeProject.coverId)))transition.elapsed+=dt*wallpaperMultiplier(values.rhythm);
			if(loaderStartedAt!==null&&loaderStartedAt<5300)for(const id of manifest.loaderAssetIds)desired.add(id);
			if(loaded&&!transition){for(const [hash,texture]of engine.textures)if(!desired.has(hash)){gl.deleteTexture(texture.texture);engine.textures.delete(hash);images.delete(hash);decodedImages.delete(hash);}}

			const enteringOverview=autoCycle&&transitionAllowed&&cyclePhase>=stableDwell&&cyclePhase<stableDwell+transitionDuration;
			const movingOverview=autoCycle&&transitionAllowed&&cyclePhase>=stableDwell+transitionDuration&&cyclePhase<stableDwell+2*transitionDuration;
			const leavingOverview=autoCycle&&transitionAllowed&&cyclePhase>=stableDwell+2*transitionDuration;
			const transitionProgress=enteringOverview?(cyclePhase-stableDwell)/transitionDuration:movingOverview?(cyclePhase-stableDwell-transitionDuration)/transitionDuration:leavingOverview?(cyclePhase-stableDwell-2*transitionDuration)/transitionDuration:0;
			const overview=model.view==="overview"||enteringOverview||movingOverview||leavingOverview;
			const viewport={width,height},alpha=1,amount=wallpaperMultiplier(values.amplitude);
			const coverCount=Math.min(density,projects.length),queueStart=Math.max(0,Math.min(index-Math.floor(coverCount/2),projects.length-coverCount)),wrapQueue=autoCycle&&index===projects.length-1&&coverCount===projects.length&&projects.length>1,activeSlot=wrapQueue?coverCount-2:index-queueStart,overviewIds=Array.from({length:coverCount},(_,i)=>projects[wrapQueue?(i+1)%projects.length:queueStart+i].coverId);
			overviewIds.push(...elementPool.filter(id=>!coverPool.includes(id)).slice(0,density-coverCount));
			const pageIndex=leavingOverview?(index+1)%Math.max(1,projects.length):index;
			const cardWidth=Math.round(350*wallpaperScale(cssWidth,cssHeight).image),cardHeight=Math.round(cardWidth*500/350),cardGap=Math.round(30*wallpaperScale(cssWidth,cssHeight).image),cardX=slot=>cssWidth/2+(slot-activeSlot)*(cardWidth+cardGap)-cardWidth/2,cardY=(cssHeight-cardHeight)/2;
			const drawOverviewCards=(mode="stable",progress=1)=>{const eased=dampedProgress(progress);for(let i=0;i<overviewIds.length;i++){const id=overviewIds[i],targetX=cardX(i);let x=targetX,y=cardY,w=cardWidth,h=cardHeight,opacity=alpha,magnitude=amount,offset=-Math.max(-1,Math.min(1,i-activeSlot))*.25*amount;if(mode==="enter"){const delay=i===activeSlot?0:Math.min(.24,i*.04),local=Math.max(0,Math.min(1,(progress*transitionDuration-delay)/Math.max(.01,transitionDuration-delay))),localEase=dampedProgress(local);if(i===activeSlot){x=(cssWidth-cardWidth)/2*localEase;y=cardY*localEase;w=cssWidth+(cardWidth-cssWidth)*localEase;h=cssHeight+(cardHeight-cssHeight)*localEase;}else{const startX=i<activeSlot?-cardWidth-12+i*6:cssWidth+12+(i-activeSlot)*6,startY=cardY+(i%2?-cardHeight*.15:cardHeight*.15);x=startX+(targetX-startX)*localEase;y=startY+(cardY-startY)*localEase;opacity=alpha*localEase;offset=(i-activeSlot)*.25*(1-localEase);}}else if(mode==="move"){x=targetX-eased*(cardWidth+cardGap);offset=-(i-activeSlot)*.25*amount;}else if(mode==="leave"){x=targetX-(cardWidth+cardGap);opacity=alpha*(1-progress);}
			drawTexture(gl,engine,images.get(id),{x:x/cssWidth,y:y/cssHeight,w:w/cssWidth,h:h/cssHeight},viewport,opacity,magnitude,offset);}};
			gl.viewport(0,0,width,height);gl.clearColor(20/255,20/255,20/255,alpha);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(engine.program);gl.bindBuffer(gl.ARRAY_BUFFER,engine.buffer);engine.collect=[];
			ink.setTransform(pixelRatio,0,0,pixelRatio,0,0);ink.clearRect(0,0,cssWidth,cssHeight);ink.wallpaperViewportHeight=cssHeight;ink.wallpaperLabels=[];ink.wallpaperLineReveals=null;ink.wallpaperAmplitude=amount;ink.wallpaperReveal=1;
			const introReveal=delay=>loaderStartedAt===null?1:clamp01((loaderStartedAt-delay)/1500);
			if(!loaded){
				const loaderIds=firstBundleLoad?manifest.loaderAssetIds:[];const tiles=loaderIds.length?loaderIds.map(id=>images.get(id)).filter(Boolean):[...engine.textures.values()].slice(0,25),gap=8*wallpaperScale(cssWidth,cssHeight).image,tileWidth=Math.min(cssWidth/5,cssHeight/5),tileHeight=tileWidth*9/16;
				for(let i=0;i<tiles.length;i++){const column=i%5,row=Math.floor(i/5),x=(cssWidth-5*tileWidth-4*gap)/2+column*(tileWidth+gap),y=cssHeight*0.22+row*(tileHeight+gap);drawTexture(gl,engine,tiles[i],{x:x/cssWidth,y:y/cssHeight,w:tileWidth/cssWidth,h:tileHeight/cssHeight},viewport,alpha);}
				const totalResources=neededAssets.length+neededFonts.length,percentage=totalResources?Math.round(preparedResources/totalResources*100):100;
				drawLabel(ink,`${percentage}%`,cssWidth/2,cssHeight/2,18*wallpaperScale(cssWidth,cssHeight).text,alpha,"center","0.05em");
				const planes=engine.collect;lastPlanes=planes;engine.collect=null;if(values.visibility>0)for(const plane of planes)drawTexture(gl,engine,plane.image,plane.box,viewport,Math.min(alpha,plane.opacity),plane.magnitude,plane.offset,plane.offsetY);
				if(moving)frame=requestAnimationFrame(draw);return;
			}
			if(activeProject){
				if(model.active.mode==="static")drawTexture(gl,engine,images.get(activeProject.heroId),{x:0,y:0,w:1,h:1},viewport,alpha);
				else if(enteringOverview&&density>0){const p=transitionProgress;drawTexture(gl,engine,images.get(activeProject.coverId),{x:0,y:0,w:1,h:1},viewport,alpha*(1-p),amount*(1-p));drawOverviewCards("enter",p);drawLabel(ink,activeProject.headline,cssWidth/2,cssHeight/2,60*wallpaperScale(cssWidth,cssHeight).text,alpha*(1-p),"center","-0.015em");}
				else if(movingOverview&&density>0)drawOverviewCards("move",transitionProgress);
				else if(leavingOverview&&density>0){const p=transitionProgress;drawOverviewCards("leave",p);const width=cardWidth+(cssWidth-cardWidth)*p,height=cardHeight+(cssHeight-cardHeight)*p,x=(cssWidth-width)/2,y=(cssHeight-height)/2;drawTexture(gl,engine,images.get(nextProject?.coverId),{x:x/cssWidth,y:y/cssHeight,w:width/cssWidth,h:height/cssHeight},viewport,alpha,amount*(1-p));drawLabel(ink,nextProject?.headline??"",cssWidth/2,cssHeight/2,60*wallpaperScale(cssWidth,cssHeight).text,alpha*p,"center","-0.015em");}
				else if(model.view==="overview"&&model.active.mode==="dynamic"&&density>0){drawOverviewCards("stable",1);}
				else if(!overview||density===0){const heroOpacity=model.view==="detail"?clamp01(1-(model.viewPosition??0)*detailGeometry(activeProject,model.current.assets,cssWidth,cssHeight).maxScroll/cssHeight):model.view==="about"?0:1;drawTexture(gl,engine,images.get(model.view==="detail"?activeProject.heroId:activeProject.coverId),{x:0,y:0,w:1,h:1},viewport,alpha*heroOpacity,model.view==="detail"?.6*amount*clamp01((model.viewPosition??0)*detailGeometry(activeProject,model.current.assets,cssWidth,cssHeight).maxScroll/cssHeight):0,0,model.view==="detail"?-.3*amount*clamp01((model.viewPosition??0)*detailGeometry(activeProject,model.current.assets,cssWidth,cssHeight).maxScroll/cssHeight):0);}
				ink.wallpaperReveal=Math.min(introReveal(3200),transition?clamp01(transition.elapsed/1500):1);ink.wallpaperMask=1.4;
				if(model.active.mode==="dynamic"&&model.view==="work"&&!enteringOverview&&!movingOverview&&!leavingOverview){const headline=leavingOverview?nextProject?.headline:activeProject.headline;drawLabel(ink,headline??"",cssWidth/2,cssHeight/2,overview?26:60*wallpaperScale(cssWidth,cssHeight).text,alpha, "center",overview?"0px":"-0.015em");if(hoverProgress>0&&!overview){ink.save();ink.font=`400 ${Math.round(60*wallpaperScale(cssWidth,cssHeight).text)}px 'Sohne Buch'`;const x=cssWidth/2+ink.measureText(headline??"").width/2+12;ink.wallpaperReveal=hoverProgress;ink.wallpaperMask=1.12;drawLabel(ink,String(activeProject.largeImageIds?.length??activeProject.assetIds.length).padStart(2,"0"),x,cssHeight/2-25*wallpaperScale(cssWidth,cssHeight).text,12,alpha,"left");ink.restore();}}
			}
			ink.wallpaperReveal=1;ink.wallpaperMask=1.1;
			if(model.active.mode==="dynamic"&&(model.view==="work"||model.view==="overview")){
				ink.lineWidth=1.5;const crossAlpha=alpha*introReveal(3500);const crossSets=enteringOverview?[[cssWidth*0.161979+11,cssWidth*(1-0.161979)-11,crossAlpha*(1-transitionProgress)],[cssWidth/2,0,crossAlpha*transitionProgress]]:[[overview?cssWidth/2:cssWidth*0.161979+11,overview?0:cssWidth*(1-0.161979)-11,crossAlpha]];
				for(const [first,second,opacity]of crossSets){ink.strokeStyle="rgba(255,255,255,"+opacity+")";ink.beginPath();for(const x of second? [first,second]:[first]){ink.save();ink.translate(x,cssHeight/2);ink.rotate((transition?transition.direction*clamp01(transition.elapsed/1290):0)*Math.PI/2*amount);ink.moveTo(-11,0);ink.lineTo(11,0);ink.moveTo(0,-11);ink.lineTo(0,11);ink.restore();}ink.stroke();}
				ink.wallpaperReveal=introReveal(3800);
				drawLabel(ink,"Work",cssWidth/2-43,47,16,alpha);drawLabel(ink,"About",cssWidth/2+43,47,16,alpha*.3);
				const thumbCount=model.view==="overview"?0:Math.min(density,elementPool.length),thumbWidth=Math.round(76*wallpaperScale(cssWidth,cssHeight).image),thumbHeight=Math.round(thumbWidth*9/16),thumbGap=Math.round(5*wallpaperScale(cssWidth,cssHeight).image),total=thumbCount*thumbWidth+Math.max(0,thumbCount-1)*thumbGap,decorAlpha=enteringOverview?alpha*(1-transitionProgress):movingOverview?0:leavingOverview?alpha*transitionProgress:alpha;
				for(let i=0;i<thumbCount;i++){const id=i<projects.length?projects[i].coverId:elementPool[i],x=cssWidth-total-40+i*(thumbWidth+thumbGap);drawTexture(gl,engine,images.get(id),{x:x/cssWidth,y:(cssHeight-40-thumbHeight)/cssHeight,w:thumbWidth/cssWidth,h:thumbHeight/cssHeight},viewport,decorAlpha,0);}
				if(cssWidth>999)drawLabel(ink,`${pageIndex+1} — ${projects.length}`,cssWidth/2,cssHeight-46,16,decorAlpha);
			}
			if(model.view==="detail"&&activeProject){
				const galleryAssets=activeProject.largeImageIds?.length?activeProject.largeImageIds:activeProject.assetIds.filter(id=>id!==activeProject.heroId),thumbnailAssets=activeProject.thumbnailAssetIds?.length?activeProject.thumbnailAssetIds:(activeProject.largeImageIds?.length?activeProject.assetIds.filter(id=>id!==activeProject.heroId&&!galleryAssets.includes(id)):galleryAssets);
								const detailDensity=wallpaperElementCount(values.elementDensity,thumbnailAssets.length),gallery=[...galleryAssets];
				const layout=detailGeometry(activeProject,model.current.assets,cssWidth,cssHeight);
				const footer=detailFooterGeometry(layout,cssWidth,cssHeight,model.viewPosition),scrollTop=footer.scroll;
				for(const item of layout.images){const y=item.y-scrollTop;if(y+item.height>0&&y<cssHeight)drawTexture(gl,engine,images.get(item.id),{x:item.x/cssWidth,y:y/cssHeight,w:item.width/cssWidth,h:item.height/cssHeight},viewport,alpha,0,0);}
				const rail=detailRailGeometry(activeProject,model.current.assets,cssWidth,cssHeight,model.viewPosition,model.calibration?gallery.length:detailDensity);
				if(rail.shown){for(const item of rail.items){const id=thumbnailAssets[item.index]??gallery[item.index];drawTexture(gl,engine,images.get(id),{x:item.x/cssWidth,y:item.y/cssHeight,w:item.width/cssWidth,h:item.height/cssHeight},viewport,alpha,0);}ink.strokeStyle=`rgba(255,255,255,${.5*alpha})`;ink.lineWidth=1.34;ink.strokeRect(rail.frame.x,rail.frame.y,rail.frame.width,rail.frame.height);}
				const heroAlpha=clamp01(1-scrollTop/cssHeight);ink.wallpaperReveal=(reduced||!model.ambientMotion||values.amplitude===0)?1:clamp01((detailClock-800)/1500);
				ink.wallpaperReveal=(reduced||!model.ambientMotion||values.amplitude===0)?1:clamp01((detailClock-1100)/1500);drawLabel(ink,"Back",40,47,16,alpha,"left");ink.wallpaperReveal=(reduced||!model.ambientMotion||values.amplitude===0)?1:clamp01((detailClock-800)/1500);drawCascadeText(ink,activeProject.headline,cssWidth*.65625,37,cssWidth*.21875,60*wallpaperScale(cssWidth,cssHeight).text,alpha*heroAlpha,64/60,"left","-0.02em",(reduced||!model.ambientMotion||values.amplitude===0)?Infinity:Math.max(0,detailClock-800),70,1500,60*wallpaperScale(cssWidth,cssHeight).text*1.1*amount);
				drawWrapped(ink,activeProject.description,cssWidth*0.65625,cssHeight*.3+42,Math.min(cssWidth*0.21875,420),16,alpha*heroAlpha*0.5,1.3125,"left");
				if(cssHeight>620){drawWrapped(ink,activeProject.role,cssWidth*.65625,cssHeight*.3,Math.min(cssWidth*.21875,420),16,alpha*heroAlpha,21/16,"left");drawWrapped(ink,activeProject.contributor,cssWidth*.65625,cssHeight*.55,Math.min(cssWidth*.21875,420),16,alpha*heroAlpha*.5,21/16,"left");}
				drawLabel(ink,`${index+1} — ${projects.length}`,cssWidth-39,45,16,alpha*heroAlpha,"right");
				if(footer.y<cssHeight){const next=projects.find(project=>project.id===activeProject.nextProjectId)??projects[(index+1)%projects.length],footerAlpha=alpha;drawTexture(gl,engine,images.get(next?.coverId),{x:footer.x/cssWidth,y:footer.y/cssHeight,w:footer.width/cssWidth,h:footer.height/cssHeight},viewport,footerAlpha,(footer.scale-1)*4);const centerY=footer.y+footer.height/2;drawLabel(ink,`${projects.findIndex(project=>project.id===next?.id)+1} — ${projects.length}`,cssWidth-39,45,16,footerAlpha*footer.progress,"right");const title=next?.headline??"",t=wallpaperScale(cssWidth,cssHeight).text,titleY=centerY-58*t;ink.save();ink.font=`400 ${60*t}px 'Sohne Buch'`;const titleWidth=ink.measureText(title).width;ink.restore();drawWrapped(ink,title,cssWidth/2,titleY,cssWidth*.9,60*t,footerAlpha,64/60,"center","-0.02em");drawWrapped(ink,"Next Project",cssWidth/2,titleY+64*t,cssWidth*.9,30*t,footerAlpha,52/30,"center");drawWrapped(ink,String(Math.round(footer.progress*100)),cssWidth/2+titleWidth/2+cssWidth*.005,titleY-5.75*t,80,18*t,footerAlpha,22.5/18,"left");ink.strokeStyle="rgba(255,255,255,"+(0.65*footerAlpha*footer.progress)+")";ink.lineWidth=1;ink.beginPath();ink.moveTo(cssWidth*0.4,cssHeight-40);ink.lineTo(cssWidth*(0.4+0.2*footer.progress),cssHeight-40);ink.stroke();}
				ink.wallpaperReveal=1;drawLabel(ink,"Scroll down",cssWidth*.65625,cssHeight-47,16,alpha*heroAlpha,"left");ink.strokeStyle=`rgba(255,255,255,${.5*alpha*heroAlpha})`;ink.beginPath();ink.ellipse(cssWidth-62.5,cssHeight-66.5,23.5,27.5,0,0,Math.PI*2);ink.stroke();ink.beginPath();ink.moveTo(cssWidth-62.5,cssHeight-83);ink.lineTo(cssWidth-62.5,cssHeight-51);ink.moveTo(cssWidth-70,cssHeight-60);ink.lineTo(cssWidth-62.5,cssHeight-51);ink.lineTo(cssWidth-55,cssHeight-60);ink.stroke();
				ink.fillStyle=`rgba(255,255,255,${.85*alpha})`;ink.fillRect(0,0,3,cssHeight*model.viewPosition);
			}
			let aboutRevealRemaining=false;
			if(model.view==="about"){
				ink.wallpaperRevealStatic=values.rhythm===0&&model.viewPosition!==lastAboutPosition;lastAboutPosition=model.viewPosition;
				if(ink.wallpaperRevealStatic)aboutMiniStable=true;
				ink.wallpaperReveal=1;drawLabel(ink,"Work",cssWidth/2-43,47,16,alpha*.3);drawLabel(ink,"About",cssWidth/2+43,47,16,alpha);
				const sections=model.manifest.about,progress=model.viewPosition??0,rightX=cssWidth*0.5-64,rightWidth=cssWidth*0.501042,mainTop=cssWidth*0.177083;
				const headingSize=cssWidth*0.028125,headingLine=cssWidth*0.036458,bodySize=cssWidth*0.022917,bodyLine=cssWidth*0.027604,sectionGap=cssWidth*0.145833,bottomGap=cssWidth*0.177083;
				const revealEnabled=model.browsing&&values.amplitude>0&&model.ambientMotion&&!reduced,revealAllowed=revealEnabled&&values.rhythm>0,revealTime=revealEnabled?aboutClock:Infinity;
				ink.wallpaperRevealClock=aboutClock;ink.wallpaperRevealPending=false;
				const renderMain=(offset,opacity,timeMs=Infinity)=>{let y=mainTop-offset,rowIndex=0;const draw=(value,x,top,maxWidth,px,a,lineHeight,align,tracking)=>{if(timeMs===Infinity){const rows=wrapTextRows(ink,value,maxWidth,px,tracking).length;rowIndex+=rows;return drawWrapped(ink,value,x,top,maxWidth,px,a,lineHeight,align,tracking);}const result=drawCascadeText(ink,value,x,top,maxWidth,px,a,lineHeight,align,tracking,timeMs-rowIndex*100,100,1500,80*amount);rowIndex+=result.rows;return result.bottom;};for(let i=0;i<sections.length;i++){const section=sections[i];ink.wallpaperRevealScope=`main-${i}`;ink.wallpaperLineReveals=timeMs===Infinity?null:aboutRowReveals;y=draw(section.heading,rightX,y,rightWidth,headingSize,opacity,headingLine/headingSize,"left","-0.02em");for(const paragraph of section.paragraphs){ink.wallpaperTextColor=i===5?"#666667":undefined;y=draw(paragraph,rightX,y,rightWidth,i===5?cssWidth*.0125:i===0?headingSize:bodySize,opacity,i===5?1.33336:i===0?headingLine/headingSize:bodyLine/bodySize,"left","-0.02em");}ink.wallpaperTextColor=undefined;
					for(let linkIndex=0;linkIndex<(section.links??[]).length;linkIndex++){const link=section.links[linkIndex],linkY=y;y=draw(link.label,rightX,y,rightWidth,cssWidth*.0125,opacity*.85,1.33336,"left","0px");if(opacity>0){const anchor=document.querySelector(`[data-wallpaper-link="${i}-${linkIndex}"]`);if(anchor){anchor.style.left=`${rightX}px`;anchor.style.top=`${linkY}px`;anchor.style.width=`${rightWidth}px`;anchor.style.height=`${cssWidth*.016667}px`;anchor.style.pointerEvents=linkY>=0&&linkY<cssHeight?"auto":"none";anchor.tabIndex=linkY>=0&&linkY<cssHeight?0:-1;}}}if(i<sections.length-1)y+=sectionGap;}return {end:y,rows:rowIndex};};
				const measuredMain=renderMain(0,0),scrollOffset=progress*Math.max(0,measuredMain.end+bottomGap-cssHeight),drawnMain=renderMain(scrollOffset,alpha,revealTime);
				ink.wallpaperLineReveals=null;
				const miniRevealTime=aboutMiniStable?Infinity:revealTime;
				const miniX=40+cssWidth*0.032813,miniWidth=cssWidth*0.096354,miniTop=cssWidth*0.153446,miniSize=cssWidth*0.005409,miniLine=cssWidth*0.007011,miniFactor=miniWidth/rightWidth,miniBodySize=bodySize*miniFactor,miniBodyLine=bodyLine*miniFactor,miniSectionGap=sectionGap*miniFactor;
				let miniEnd=miniTop;ink.save();for(let i=0;i<sections.length;i++){const section=sections[i];miniEnd=drawWrapped(ink,section.heading,miniX,miniEnd,miniWidth,miniSize,0,miniLine/miniSize,"left");for(const paragraph of section.paragraphs)miniEnd=drawWrapped(ink,paragraph,miniX,miniEnd,miniWidth,i===5?cssWidth*.0125*miniFactor:i===0?headingSize*miniFactor:miniBodySize,0,i===5?1.33336:i===0?headingLine/headingSize:miniBodyLine/miniBodySize,"left");for(const link of section.links??[])miniEnd=drawWrapped(ink,link.label,miniX,miniEnd,miniWidth,cssWidth*.0125*miniFactor,0,1.33336,"left");if(i<sections.length-1)miniEnd+=miniSectionGap;}ink.restore();
				const frameHeight=cssHeight*0.192308,miniRange=Math.max(0,miniEnd-miniTop-frameHeight),miniOffset=progress*miniRange;let miniY=miniTop-miniOffset;
				let miniRows=0;for(let i=0;i<sections.length;i++){const section=sections[i],drawMini=(value,top,px=miniSize,lineHeight=miniLine/miniSize)=>{if(miniRevealTime===Infinity){const rows=wrapTextRows(ink,value,miniWidth,px).length;miniRows+=rows;return drawWrapped(ink,value,miniX,top,miniWidth,px,alpha*0.85,lineHeight,"left");}const result=drawCascadeText(ink,value,miniX,top,miniWidth,px,alpha*0.85,lineHeight,"left","0px",miniRevealTime-miniRows*50,50,1500,80*amount);miniRows+=result.rows;return result.bottom;};miniY=drawMini(section.heading,miniY);for(const paragraph of section.paragraphs)miniY=drawMini(paragraph,miniY,i===5?cssWidth*.0125*miniFactor:i===0?headingSize*miniFactor:miniBodySize,i===5?1.33336:i===0?headingLine/headingSize:miniBodyLine/miniBodySize);for(const link of section.links??[])miniY=drawMini(link.label,miniY,cssWidth*.0125*miniFactor,1.33336);if(i<sections.length-1)miniY+=miniSectionGap;}
				const frameY=miniTop+progress*miniRange;ink.strokeStyle="rgba(255,255,255,"+(0.2*alpha)+")";ink.lineWidth=1.34;ink.strokeRect(40,frameY,cssWidth*0.15,frameHeight);
				const revealComplete=Math.max(Math.max(0,drawnMain.rows-1)*100+1500,Math.max(0,miniRows-1)*50+1500);aboutRevealRemaining=revealAllowed&&(revealTime<revealComplete||ink.wallpaperRevealPending);
			}
			let targetPlanes=engine.collect;engine.collect=null;
			if(loaderStartedAt!==null&&loaderStartedAt<3200){const p=clamp01(loaderStartedAt/3200),q=wallpaperScale(cssWidth,cssHeight).image,tileWidth=Math.min(cssWidth/5,cssHeight/5),tileHeight=tileWidth*9/16,gap=8*q;const grid=manifest.loaderAssetIds.map((id,i)=>({image:images.get(id),box:{x:((cssWidth-5*tileWidth-4*gap)/2+(i%5)*(tileWidth+gap))/cssWidth,y:(cssHeight*.22+Math.floor(i/5)*(tileHeight+gap))/cssHeight,w:tileWidth/cssWidth,h:tileHeight/cssHeight},opacity:alpha,magnitude:0,offset:0})).filter(item=>item.image);targetPlanes=interpolatePlanes(grid,targetPlanes,p,1,false,.04/3.2);}

			const planes=transition?interpolatePlanes(transition.from,targetPlanes,clamp01(transition.elapsed/1290),transition.direction,transition.vertical,model.view==="overview"?.04/1.29:0,transition.vertical?referenceEase:dampedProgress):targetPlanes;
			lastPlanes=planes;lastLabels=ink.wallpaperLabels??[];ink.wallpaperLabels=null;
			if(transition){for(let i=0;i<(transition.fromLabels??[]).length;i++){const label=transition.fromLabels[i],progress=clamp01((transition.elapsed-i*(transition.vertical?26:20))/600);if(progress>=1)continue;ink.save();ink.font=label.font;ink.fillStyle=label.color;ink.textAlign=label.align;ink.textBaseline=label.baseline;ink.letterSpacing=label.tracking;ink.globalAlpha=Math.min(alpha,label.opacity)*(1-progress);const fontSize=parseFloat(label.font.split(" ")[1])||16;ink.beginPath();ink.rect(0,label.y-fontSize,cssWidth,fontSize*2);ink.clip();ink.fillText(label.text,label.x,label.y-progress*fontSize*1.1*amount);ink.restore();}}
			if(values.visibility>0)for(const plane of planes)drawTexture(gl,engine,plane.image,plane.box,viewport,Math.min(alpha,plane.opacity),plane.magnitude,plane.offset,plane.offsetY);
			if(moving||aboutRevealRemaining||loaderStartedAt!==null&&loaderStartedAt<5300&&animationAllowed||model.view==="detail"&&detailClock<2600&&animationAllowed||transition&&animationAllowed||animationAllowed&&Math.abs(hoverProgress-(model.titleHovered?1:0))>.001)frame=requestAnimationFrame(draw);
		};
		redraw.current=()=>{if(closed)return;if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
		const load=async()=>{
			try{
				for(const hash of neededAssets){if(closed)return;await ensureImage(hash);preparedResources++;redraw.current?.();}
				for(const hash of neededFonts){if(closed)return;const face=new FontFace("Sohne Buch",`url("${wallpaperAssetUrl(hash)}") format("woff2")`,{style:"normal",weight:"400"});await face.load();if(closed)return;document.fonts.add(face);fontFaces.push(face);preparedResources++;redraw.current?.();}
				if(!closed){loaded=true;loaderStartedAt=firstBundleLoad&&wallpaperMotionAllowed(live.current.active,{ambientMotion:live.current.ambientMotion,reducedMotion:motionQuery.matches})?0:null;if(active.mode==="dynamic")loadedBundles.current.add(active.bundleHash);last=performance.now();redraw.current?.();if(paletteToCapture)void live.current.wallpaper.capturePalette(paletteToCapture).catch(error=>reportFailure(error.message));}
			}catch(error){if(!closed){fallback.style.display="block";canvas.style.visibility="hidden";text.style.visibility="hidden";reportFailure(error.message);}}
		};
		const resize=()=>{if(!closed){if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);}};
		const motionChange=()=>resize();
		const lose=event=>{event.preventDefault();contextLost=true;transition=null;lastPlanes=[];lastLabels=[];if(frame)cancelAnimationFrame(frame);frame=0;fallback.style.display="block";canvas.style.visibility="hidden";reportFailure("Wallpaper graphics context was lost");};
		const restore=()=>{try{contextLost=false;engine=createRenderer(gl);images.clear();for(const [hash,image] of decodedImages)images.set(hash,getTexture(gl,engine,hash,image));fallback.style.display="none";canvas.style.visibility="visible";text.style.visibility="visible";reportFailure("");resize();}catch(error){fallback.style.display="block";canvas.style.visibility="hidden";reportFailure(error.message||"Wallpaper graphics context could not be restored");}};
		canvas.addEventListener("webglcontextlost",lose);canvas.addEventListener("webglcontextrestored",restore);addEventListener("resize",resize);motionQuery.addEventListener("change",motionChange);reportFailure("");frame=requestAnimationFrame(draw);void load();
		return()=>{closed=true;redraw.current=null;if(frame)cancelAnimationFrame(frame);removeEventListener("resize",resize);removeEventListener("kinich-wallpaper-transition-start",navigate);motionQuery.removeEventListener("change",motionChange);canvas.removeEventListener("webglcontextlost",lose);canvas.removeEventListener("webglcontextrestored",restore);for(const face of fontFaces)document.fonts.delete(face);for(const texture of engine.textures.values())gl.deleteTexture(texture.texture);gl.deleteBuffer(engine.buffer);gl.deleteProgram(engine.program);layer.remove();if(previous===undefined)delete body.dataset.kinichWallpaperMode;else body.dataset.kinichWallpaperMode=previous;};
	},[mounted,active?.bundleHash,active?.mode,wallpaper.renderRevision]);
	(0,react.useEffect)(()=>{redraw.current?.();},[current?.activeHash,active?.parameters,view,page,ambientMotion,wallpaper.viewPosition,wallpaper.browsing,wallpaper.calibration,wallpaper.browseAutoPlay,titleHovered]);
	(0,react.useEffect)(()=>{
		if(!mounted||!wallpaper.browsing||typeof document==="undefined")return;
		const isWallpaperFocus=()=>document.activeElement?.closest?.(".dsh-kinich-wallpaper-hit-area,.dsh-kinich-wallpaper-play,.dsh-kinich-wallpaper-nav,.dsh-kinich-wallpaper-work-thumb-rail,.dsh-kinich-wallpaper-thumb-rail,.dsh-kinich-wallpaper-about-mini-map,.dsh-kinich-wallpaper-browse-exit");
		const exit=()=>{wallpaper.exitBrowse();document.getElementById("dsh-kinich-wallpaper-browse-entry")?.focus({preventScroll:true});};
		const focusEntry=document.getElementById("dsh-kinich-wallpaper-browse-entry");
		if(document.activeElement===focusEntry)document.querySelector(".dsh-kinich-wallpaper-nav button")?.focus({preventScroll:true});
		const keydown=event=>{if(event.key==="Escape"&&isWallpaperFocus()){event.preventDefault();event.stopPropagation();exit();}};
		document.addEventListener("keydown",keydown,true);
		return()=>{document.removeEventListener("keydown",keydown,true);};
	},[mounted,wallpaper.browsing,wallpaper.exitBrowse]);

	if(!mounted||active?.mode!=="dynamic"||!manifest||!wallpaper.browsing)return null;
	const selected=manifest.projects[Math.min(page,manifest.projects.length-1)];
	const chinese=typeof document!=="undefined"&&/^zh(?:-|$)/i.test(document.documentElement.lang||navigator.language||"");
	const labels=chinese?{nav:"壁纸浏览",back:"返回作品",previous:"上一个项目",next:"下一个项目",about:"关于",work:"作品",overview:"总览",openDetails:"打开项目详情",details:"详情",exit:"退出壁纸浏览",play:"播放自动演示",pause:"暂停自动演示"}:{nav:"Wallpaper browsing",back:"Back to Work",previous:"Previous project",next:"Next project",about:"About",work:"Work",overview:"Overview",openDetails:"Open project details",details:"Details",exit:"Exit wallpaper browsing",play:"Play autoplay demo",pause:"Pause autoplay demo"};
	const action=(key,label,onClick,pressed=false,visual=label)=>react.createElement("button",{key,type:"button",className:"dsh-kinich-wallpaper-nav__button","aria-label":label,"aria-pressed":pressed,onClick},visual);
	const galleryThumbs=selected?.thumbnailAssetIds?.length?selected.thumbnailAssetIds:(selected?.largeImageIds?.length?selected.assetIds.filter(id=>id!==selected.heroId&&!selected.largeImageIds.includes(id)):selected?.assetIds.filter(id=>id!==selected.heroId)??[]);
	const railHeight=typeof window==="undefined"?0:window.innerHeight;
	const railGeometry=typeof window==="undefined"?null:detailRailGeometry(selected,current.assets,window.innerWidth,window.innerHeight,wallpaper.viewPosition,wallpaper.calibration?galleryThumbs.length:wallpaperElementCount(active.parameters.elementDensity,galleryThumbs.length));
	const workThumbCount=Math.min(wallpaperElementCount(wallpaper.calibration?50:active.parameters.elementDensity,imagePool.length),imagePool.length);
	const workThumbIds=Array.from({length:workThumbCount},(_,i)=>i<manifest.projects.length?manifest.projects[i].coverId:imagePool[i]);
	const workThumbWidth=typeof window==="undefined"?0:Math.round(76*wallpaperScale(window.innerWidth,window.innerHeight).image),workThumbHeight=Math.round(workThumbWidth*9/16),workThumbGap=typeof window==="undefined"?0:Math.round(5*wallpaperScale(window.innerWidth,window.innerHeight).image);
	const workThumbTotal=workThumbIds.length*workThumbWidth+Math.max(0,workThumbIds.length-1)*workThumbGap;
	const aboutMiniLeft=typeof window==="undefined"?0:40+window.innerWidth*0.032813,aboutMiniTop=typeof window==="undefined"?0:window.innerWidth*0.153446,aboutMiniWidth=typeof window==="undefined"?0:window.innerWidth*0.096354,aboutMiniHeight=typeof window==="undefined"?0:Math.max(1,window.innerHeight-aboutMiniTop-40);
	const overviewCount=Math.min(manifest.projects.length,wallpaperElementCount(wallpaper.calibration?50:active.parameters.elementDensity,imagePool.length)),overviewStart=Math.max(0,Math.min(page-Math.floor(overviewCount/2),manifest.projects.length-overviewCount));
	const setAboutPointerPosition=event=>{const rect=event.currentTarget.getBoundingClientRect();wallpaper.setViewPosition(Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height))));};
	const controls=[];
	if(view==="detail"){
		controls.push(action("work",labels.back,()=>wallpaper.setView("work"),false,chinese?"返回":"Back"));
		controls.push(action("prev",labels.previous,()=>wallpaper.setPage((page-1+manifest.projects.length)%manifest.projects.length),false,"‹"));
		controls.push(react.createElement("span",{key:"title",className:"dsh-kinich-wallpaper-nav__title"},selected?.title??""));
		controls.push(action("next",labels.next,()=>wallpaper.setPage((page+1)%manifest.projects.length),false,"›"));
		controls.push(action("about",labels.about,()=>wallpaper.setView("about")));
	}else if(view==="about"){
		controls.push(action("work",labels.work,()=>wallpaper.setView("work")));
		controls.push(action("overview",labels.overview,()=>wallpaper.setView("overview")));
		controls.push(react.createElement("span",{key:"title",className:"dsh-kinich-wallpaper-nav__title"},labels.about));
	}else{
		controls.push(action("work",labels.work,()=>wallpaper.setView("work"),view==="work"));
		controls.push(action("overview",labels.overview,()=>wallpaper.setView("overview"),view==="overview"));
		controls.push(action("about",labels.about,()=>wallpaper.setView("about")));
		controls.push(action("prev",labels.previous,()=>wallpaper.setPage((page-1+manifest.projects.length)%manifest.projects.length),false,"‹"));
		controls.push(react.createElement("button",{key:"open-project",type:"button",className:"dsh-kinich-wallpaper-nav__button dsh-kinich-wallpaper-nav__title--action","aria-label":chinese?"打开当前项目":labels.openDetails,onClick:()=>wallpaper.setView("detail"),onPointerEnter:()=>setTitleHovered(true),onPointerLeave:()=>setTitleHovered(false),onFocus:()=>setTitleHovered(true),onBlur:()=>setTitleHovered(false)},selected?.title??""));
		controls.push(action("detail",labels.openDetails,()=>wallpaper.setView("detail"),false,labels.details));
		controls.push(action("next",labels.next,()=>wallpaper.setPage((page+1)%manifest.projects.length),false,"›"));
	}
	return react.createElement(react.Fragment,null,
		react.createElement("div",{className:"dsh-kinich-wallpaper-hit-area",tabIndex:0,role:"region","aria-label":labels.nav,onWheel:event=>{event.preventDefault();if(view==="detail"||view==="about"){const range=view==="detail"?detailGeometry(selected,current.assets,window.innerWidth,window.innerHeight).maxScroll:window.innerHeight*5;wallpaper.setViewPosition(clamp01(wallpaper.viewPosition+event.deltaY/Math.max(1,range)));}else if(Math.abs(event.deltaY)>5)wallpaper.setPage(page+(event.deltaY>0?1:-1));},onKeyDown:event=>{if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();wallpaper.setPage(page+(event.key==="ArrowRight"?1:-1));}else if((view==="detail"||view==="about")&&["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"].includes(event.key)){event.preventDefault();wallpaper.setViewPosition(event.key==="Home"?0:event.key==="End"?1:clamp01(wallpaper.viewPosition+(["ArrowUp","PageUp"].includes(event.key)?-.05:.05)));}}}),
		(view==="work"||view==="overview"||view==="about")&&react.createElement("div",{className:"dsh-kinich-wallpaper-reference-nav"},react.createElement("button",{type:"button","aria-label":labels.work,onClick:()=>wallpaper.setView("work"),style:{left:"calc(50% - 65px)"}},react.createElement("span",{className:"dsh-kinich-wallpaper-sr-only"},"Work")),react.createElement("button",{type:"button","aria-label":labels.about,onClick:()=>wallpaper.setView("about"),style:{left:"calc(50% + 21px)"}},react.createElement("span",{className:"dsh-kinich-wallpaper-sr-only"},"About"))),
		view==="overview"&&Array.from({length:overviewCount},(_,slot)=>{const index=overviewStart+slot,q=wallpaperScale(window.innerWidth,window.innerHeight).image,w=350*q,h=500*q,gap=30*q;return react.createElement("button",{key:`card-${index}`,type:"button",className:"dsh-kinich-wallpaper-card-hit","aria-label":manifest.projects[index].title,style:{left:`${window.innerWidth/2+(index-page)*(w+gap)-w/2}px`,top:`${(window.innerHeight-h)/2}px`,width:`${w}px`,height:`${h}px`},onClick:()=>{wallpaper.setPage(index);wallpaper.setView("detail");}});}),
		view==="work"&&react.createElement("button",{type:"button",className:"dsh-kinich-wallpaper-project-hit","aria-label":labels.openDetails,onPointerEnter:()=>setTitleHovered(true),onPointerLeave:()=>setTitleHovered(false),onFocus:()=>setTitleHovered(true),onBlur:()=>setTitleHovered(false),onClick:()=>wallpaper.setView("detail")}),
		view==="work"&&react.createElement("button",{type:"button",className:"dsh-kinich-wallpaper-overview-hit","aria-label":labels.overview,onClick:()=>wallpaper.setView("overview")}),
		view==="detail"&&react.createElement("button",{type:"button",className:"dsh-kinich-wallpaper-scroll-hit","aria-label":wallpaper.viewPosition>=.99?labels.next:(chinese?"向下浏览画廊":"Explore gallery"),onClick:()=>{if(wallpaper.viewPosition>=.99){wallpaper.setPage(manifest.projects.findIndex(project=>project.id===selected.nextProjectId));return;}const layout=detailGeometry(selected,current.assets,window.innerWidth,window.innerHeight),first=window.innerHeight/layout.maxScroll;wallpaper.setViewPosition(wallpaper.viewPosition<first?first:Math.min(1,wallpaper.viewPosition+.08));}}),
		view==="about"&&manifest.about.flatMap((section,index)=>(section.links??[]).map((link,linkIndex)=>react.createElement("a",{key:`${index}-${linkIndex}`,href:link.url,target:"_blank",rel:"noopener noreferrer",className:"dsh-kinich-wallpaper-about-link","data-wallpaper-link":`${index}-${linkIndex}`,"aria-label":link.label},react.createElement("span",{className:"dsh-kinich-wallpaper-sr-only"},link.label)))),
		react.createElement("nav",{className:"dsh-kinich-wallpaper-nav","aria-label":labels.nav,onKeyDown:event=>{if(!["ArrowLeft","ArrowRight"].includes(event.key))return;const buttons=Array.from(event.currentTarget.querySelectorAll("button:not(:disabled)")),index=buttons.indexOf(document.activeElement);if(index<0)return;event.preventDefault();buttons[(index+(event.key==="ArrowRight"?1:buttons.length-1))%buttons.length]?.focus({preventScroll:true});}},controls),
		view==="work"&&workThumbIds.length>0&&react.createElement("div",{className:"dsh-kinich-wallpaper-work-thumb-rail",role:"group","aria-label":chinese?"作品缩略图":"Work thumbnails"},workThumbIds.map((id,index)=>react.createElement("button",{key:id,type:"button",className:"dsh-kinich-wallpaper-work-thumb-rail__button","aria-label":`${String(index+1).padStart(2,"0")} · ${manifest.projects[index]?.title??(chinese?"附加图片":"Additional image")}`,"aria-pressed":index<manifest.projects.length&&index===page,style:{left:`${Math.max(0,window.innerWidth-workThumbTotal-40+index*(workThumbWidth+workThumbGap))}px`,top:`${window.innerHeight-40-workThumbHeight}px`,width:`${workThumbWidth}px`,height:`${workThumbHeight}px`},onClick:()=>{if(index<manifest.projects.length)wallpaper.setPage(index);}},null))),
		view==="about"&&react.createElement("div",{className:"dsh-kinich-wallpaper-about-mini-map",role:"slider","aria-label":chinese?"About 微缩导航":"About miniature navigation","aria-orientation":"vertical","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round(wallpaper.viewPosition*100),tabIndex:0,style:{left:`${aboutMiniLeft}px`,top:`${aboutMiniTop}px`,width:`${aboutMiniWidth}px`,height:`${aboutMiniHeight}px`},onPointerDown:event=>{event.currentTarget.setPointerCapture(event.pointerId);setAboutPointerPosition(event);},onPointerMove:event=>{if(event.buttons&1)setAboutPointerPosition(event);},onWheel:event=>{event.preventDefault();wallpaper.setViewPosition(Math.max(0,Math.min(1,wallpaper.viewPosition+event.deltaY/Math.max(1,aboutMiniHeight))));},onKeyDown:event=>{const step=event.shiftKey?0.1:0.02;let next=null;if(event.key==="ArrowDown"||event.key==="ArrowRight")next=wallpaper.viewPosition+step;else if(event.key==="ArrowUp"||event.key==="ArrowLeft")next=wallpaper.viewPosition-step;else if(event.key==="PageDown")next=wallpaper.viewPosition+0.1;else if(event.key==="PageUp")next=wallpaper.viewPosition-0.1;else if(event.key==="Home")next=0;else if(event.key==="End")next=1;if(next!==null){event.preventDefault();wallpaper.setViewPosition(Math.max(0,Math.min(1,next)));}}}),
		view==="detail"&&railGeometry?.shown&&react.createElement("div",{className:"dsh-kinich-wallpaper-thumb-rail",role:"group","aria-label":chinese?"画廊缩略图导航":"Gallery thumbnail navigation",style:{inset:0,maxHeight:"none"},onWheel:event=>{event.preventDefault();wallpaper.setViewPosition(clamp01(wallpaper.viewPosition+event.deltaY/detailGeometry(selected,current.assets,window.innerWidth,window.innerHeight).maxScroll));}},railGeometry.items.map(item=>react.createElement("button",{key:galleryThumbs[item.index],type:"button",className:"dsh-kinich-wallpaper-thumb-rail__button","aria-label":`${item.index+1}. ${selected.galleryCaptions?.[item.index]??selected.title}`,"aria-current":item.index===railGeometry.selectedIndex?"true":undefined,style:{position:"absolute",left:`${item.x}px`,top:`${item.y}px`,width:`${item.width}px`,height:`${item.height}px`},onClick:()=>wallpaper.setViewPosition(detailGeometry(selected,current.assets,window.innerWidth,window.innerHeight).imagePosition(item.index))},null))),
		react.createElement("button",{type:"button",className:"dsh-kinich-wallpaper-play","aria-label":wallpaper.browseAutoPlay?labels.pause:labels.play,"aria-pressed":wallpaper.browseAutoPlay,"onClick":()=>wallpaper.setBrowseAutoPlay(!wallpaper.browseAutoPlay)},wallpaper.browseAutoPlay?labels.pause:labels.play),
		react.createElement("button",{type:"button",className:"dsh-kinich-wallpaper-browse-exit","aria-label":labels.exit,onClick:()=>{wallpaper.exitBrowse();document.getElementById("dsh-kinich-wallpaper-browse-entry")?.focus({preventScroll:true});}},chinese?"退出浏览":"Exit browse")
	);
}
