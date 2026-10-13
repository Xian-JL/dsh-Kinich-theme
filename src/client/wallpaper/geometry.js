import { wallpaperScale } from "../../shared/wallpaper.js";

export const clamp01 = value => Math.min(1, Math.max(0, value));
export const mix = (from, to, progress) => from + (to - from) * progress;
export function referenceEase(progress, x1=.64, y1=0, x2=.12, y2=1) {
	const target=clamp01(progress),component=(u,a,b)=>3*(1-u)**2*u*a+3*(1-u)*u*u*b+u**3;
	let low=0,high=1;for(let i=0;i<24;i++){const middle=(low+high)/2;if(component(middle,x1,x2)<target)low=middle;else high=middle;}
	return target===0||target===1?target:component((low+high)/2,y1,y2);
}
export function dampedProgress(progress,duration=1290) {
	const decay=milliseconds=>(1-.083)**(milliseconds/(1000/60));
	return (1-decay(clamp01(progress)*duration))/(1-decay(duration));
}

// Recompute the source crop for every interpolated plane. Pixels are never stretched.
export function coverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight, zoom = 1, offsetX = 0, offsetY = 0) {
	const sourceRatio = sourceWidth / sourceHeight, targetRatio = targetWidth / targetHeight;
	let width = Math.min(1, targetRatio / sourceRatio), height = Math.min(1, sourceRatio / targetRatio);
	width /= Math.max(1, zoom); height /= Math.max(1, zoom);
	return new Float32Array([Math.min(1-width, Math.max(0, (1-width)/2+offsetX)), Math.min(1-height, Math.max(0, (1-height)/2+offsetY)), width, height]);
}

export function detailGeometry(project, assets, width, height) {
	const ids = project.largeImageIds?.length ? project.largeImageIds : project.assetIds.filter(id => id !== project.heroId);
	const galleryWidth = width > 1700 ? 900 : width * .529412;
	let top = height + width * .208333;
	const images = ids.map((id, index) => {
		top += project.imageGaps[index] ?? 40;
		const asset = assets[id], imageHeight = galleryWidth * (asset?.height / asset?.width || 2/3);
		const result = { id, index, x: (width-galleryWidth)/2, y: top, width: galleryWidth, height: imageHeight };
		top += imageHeight; return result;
	});
	const footerStart = top + width * .208333;
	const maxScroll = footerStart + 1.5 * height;
	return { images, footerStart, maxScroll, imagePosition: index => clamp01(((images[index]?.y ?? 0) - 40) / maxScroll) };
}

/** Reference Scroll clamps page translation at the footer, then expands over 1.5H. */
export function detailFooterGeometry(layout, width, height, position) {
	const rawScroll = clamp01(position) * layout.maxScroll;
	const scroll = Math.min(rawScroll, layout.footerStart);
	const expansion = clamp01((rawScroll - scroll) / (1.5 * height));
	const progress = clamp01((expansion - .15) / .85) ** 2;
	const q = wallpaperScale(width, height).image, initialWidth = 350 * q, initialHeight = 500 * q;
	const frameWidth = initialWidth + (width + 2 - initialWidth) * progress;
	const frameHeight = initialHeight + (height + 2 - initialHeight) * progress;
	return { scroll, progress, x:(width-frameWidth)/2, y:layout.footerStart-scroll+(height-frameHeight)/2, width:frameWidth, height:frameHeight, scale:1.25-.25*progress };
}

export function detailRailGeometry(project, assets, width, height, position, count) {
	const gallery=detailGeometry(project,assets,width,height),scroll=Math.min(position*gallery.maxScroll,gallery.footerStart);
	const previewWidth=60,first=gallery.images[0]?.y||height;
	const end=gallery.images.at(-1),span=end?end.y+end.height-first:0;
	const thumbnails=project.thumbnailAssetIds??[];let miniHeight=0;
	const miniature=gallery.images.map(image=>{miniHeight+=(project.imageGaps[image.index]??40)/15;const asset=assets[thumbnails[image.index]]??assets[image.id],h=60*(asset?.height/asset?.width||2/3),item={index:image.index,y:miniHeight,height:h};miniHeight+=h;return item;});
	const ratio=miniHeight/Math.max(1,span),parallax=Math.max(miniHeight+80-height,0),previewMax=Math.max(0,span-miniHeight),start=height+width*.208333-40,finish=start+previewMax+parallax,areaMax=(parallax>0?span-(height-80):previewMax)*ratio;
	let previewShift,frameShift;
	if(scroll<start){previewShift=frameShift=scroll;}
	else if(scroll<=finish){const p=clamp01((scroll-start)/Math.max(1,finish-start));previewShift=start+parallax*p;frameShift=start-(areaMax-parallax)*p;}
	else{previewShift=scroll-previewMax;frameShift=scroll-previewMax-areaMax;}
	const top=height+width*.208333-previewShift,x=width-40-previewWidth;
	const total=gallery.images.length,visible=Math.min(count,total);
	const indices=Array.from({length:visible},(_,i)=>Math.floor(i*(total-1)/Math.max(1,visible-1)));
	let selectedIndex=0,distance=Infinity;
	for(const image of gallery.images){const next=Math.abs(image.y+image.height/2-scroll-height/2);if(next<distance){distance=next;selectedIndex=image.index;}}
	return {shown:count>0&&top<height&&top+miniHeight>0,selectedIndex,
		items:indices.map(index=>({...miniature[index],x,y:top+miniature[index].y,width:previewWidth})),
		frame:{x:x-7,y:height+width*.208333-7-frameShift,width:74,height:height*ratio+7}};
}

export function overviewGeometry(width, height, slot, centerSlot) {
	const q = wallpaperScale(width, height).image, w = Math.round(350*q), h = Math.round(500*q), gap = Math.round(30*q);
	return { x: (width/2+(slot-centerSlot)*(w+gap)-w/2)/width, y: (height-h)/2/height, w: w/width, h: h/height };
}

// Retarget from the last visible planes, including halfway through a previous transition.
export function interpolatePlanes(from, to, progress, direction = 1, vertical = false, stagger = 0, easing = dampedProgress) {
	const unused = new Set(from.map((_, index) => index)), result = [];
	for (let i=0; i<to.length; i++) {
		const target = to[i];
		let sourceIndex = -1, distance = Infinity;
		for (const index of unused) if (from[index].image === target.image) {
			const candidate = Math.abs(from[index].box.w-target.box.w)+Math.abs(from[index].box.x-target.box.x);
			if (candidate < distance) { distance=candidate; sourceIndex=index; }
		}
		const local=clamp01((progress-i*stagger)/Math.max(.01,1-i*stagger));
		const eased=easing(local);
		const source = sourceIndex < 0 ? { ...target, opacity: 0, box: { ...target.box, [vertical ? "y" : "x"]: target.box[vertical ? "y" : "x"]+direction } } : from[sourceIndex];
		unused.delete(sourceIndex);
		result.push({ ...target, box: Object.fromEntries(Object.keys(target.box).map(key=>[key,mix(source.box[key],target.box[key],eased)])), opacity:mix(source.opacity,target.opacity,eased), magnitude:mix(source.magnitude,target.magnitude,eased), offset:mix(source.offset,target.offset,eased), offsetY:mix(source.offsetY??0,target.offsetY??0,eased) });
	}
	for (const index of unused) { const source=from[index]; result.unshift({ ...source, opacity:source.opacity*(1-progress), box:{ ...source.box, [vertical ? "y" : "x"]:source.box[vertical ? "y" : "x"]-direction*progress } }); }
	return result;
}
