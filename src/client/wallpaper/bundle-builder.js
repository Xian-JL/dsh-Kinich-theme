import * as React from "react";
import { normalizeKinichWallpaperImage } from "./image.js";
import { WALLPAPER_DEFAULT_PARAMETERS } from "../../shared/wallpaper.js";

const h=React.createElement;

/** The user explicitly creates and applies a data-only local package. No source paths survive. */
export function WallpaperBundleBuilder({wallpaper,disabled,onError,onMessage,t}) {
	const [items,setItems]=React.useState([]),[name,setName]=React.useState(""),[representative,setRepresentative]=React.useState(""),[busy,setBusy]=React.useState(false);
	const input=React.useRef(null);
	const patch=(id,values)=>setItems(previous=>previous.map(item=>item.id===id?{...item,...values}:item));
	const move=(index,delta)=>setItems(previous=>{const next=[...previous],target=index+delta;if(target<0||target>=next.length)return previous;[next[index],next[target]]=[next[target],next[index]];return next;});
	const create=async()=>{
		setBusy(true);onError("");
		try{
			if(!items.length||items.length>256)throw new Error(t("builder.limit","请选择 1–256 张 PNG/JPEG/WebP 图像"));
			const groups=new Map();let representativeAssetId="",sampledAccent="";
			for(let index=0;index<items.length;index++){
				const item=items[index],selected=item.id===(representative||items[0].id);
				onMessage(`${t("builder.prepare","准备并保存图像")} ${index+1}/${items.length}`);
				const image=await normalizeKinichWallpaperImage(item.file,{sampleAccent:selected});const asset=await wallpaper.upload(image.blob);
				if(selected){representativeAssetId=asset.sha256;sampledAccent=image.accent??"";}
				const key=item.project.trim()||t("builder.projectDefault","本地项目");if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...item,hash:asset.sha256});
			}
			const entries=[...groups.entries()];const projects=entries.map(([title,images],index)=>({id:`local-project-${index+1}`,title,headline:title,description:images[0].description,role:t("builder.role","用户提供的本地图像"),contributor:"",coverId:images[0].hash,heroId:images[0].hash,assetIds:[...new Set(images.map(image=>image.hash))],largeImageIds:images.map(image=>image.hash),thumbnailAssetIds:images.map(image=>image.hash),imageGaps:images.map(image=>image.gap),galleryCaptions:images.map(image=>image.caption),nextProjectId:`local-project-${(index+1)%entries.length+1}`}));
			onMessage(t("builder.save","保存素材包与当前快照…"));
			const bundle=await wallpaper.uploadBundle({schemaVersion:1,id:`local-${crypto.randomUUID()}`,version:"1",name:name.trim()||t("builder.defaultName","本地动态壁纸"),representativeAssetId,sampledAccent,projects});
			await wallpaper.apply({mode:"dynamic",bundleHash:bundle.bundleHash,projectId:projects[0].id,templateId:"work",parameters:{...WALLPAPER_DEFAULT_PARAMETERS},autoPalette:true,paletteCaptured:true,reason:"create-local-bundle"});
			setItems([]);setRepresentative("");onMessage(t("builder.done","本地动态壁纸已应用；原壁纸保存在历史中。"));
		}catch(error){onError(error.message);}finally{setBusy(false);}
	};
	return h("details",{className:"dsh-kinich-wallpaper-builder"},h("summary",null,t("builder.title","制作本地动态壁纸包")),
		h("p",null,t("builder.description","按顺序排列图像，同名项目会合并为一组。每组首图作为封面，可选择固定代表图、填写说明和图间留白。点击应用后才替换当前壁纸。")),
		h("input",{ref:input,type:"file",multiple:true,hidden:true,accept:"image/png,image/jpeg,image/webp",disabled:disabled||busy,onChange:event=>{const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value="";if(items.length+files.length>256){onError(t("builder.limit","请选择 1–256 张 PNG/JPEG/WebP 图像"));return;}setItems(previous=>previous.concat(files.map(file=>({id:crypto.randomUUID(),file,project:t("builder.projectDefault","本地项目"),description:"",caption:file.name.slice(0,128),gap:40}))));}}),
		h("button",{type:"button",className:"dsh-kinich-action",disabled:disabled||busy,onClick:()=>input.current?.click()},t("builder.add","添加图像")),
		items.length>0&&h(React.Fragment,null,h("label",null,t("builder.name","素材包名称"),h("input",{value:name,maxLength:128,disabled:busy,onChange:event=>setName(event.target.value)})),
			h("ol",null,items.map((item,index)=>h("li",{key:item.id},
				h("strong",null,`${index+1}. ${item.file.name}`),
				h("label",null,t("builder.project","项目名称"),h("input",{value:item.project,maxLength:128,disabled:busy,onChange:event=>patch(item.id,{project:event.target.value})})),
				h("label",null,t("builder.caption","图像说明"),h("input",{value:item.caption,maxLength:512,disabled:busy,onChange:event=>patch(item.id,{caption:event.target.value})})),
				h("label",null,t("builder.descriptionLabel","项目说明（采用首图的说明）"),h("textarea",{value:item.description,maxLength:2048,disabled:busy,onChange:event=>patch(item.id,{description:event.target.value})})),
				h("label",null,h("input",{type:"radio",name:"kinich-wallpaper-representative",checked:item.id===(representative||items[0].id),disabled:busy,onChange:()=>setRepresentative(item.id)}),t("builder.representative","固定代表图（一次采色）")),
				h("select",{"aria-label":t("builder.gap","图后留白"),value:item.gap,disabled:busy,onChange:event=>patch(item.id,{gap:Number(event.target.value)})},h("option",{value:40},t("builder.shortGap","短留白 · 40 px")),h("option",{value:320},t("builder.longGap","长留白 · 320 px"))),
				h("button",{type:"button",disabled:busy||index===0,onClick:()=>move(index,-1)},t("builder.up","上移")),h("button",{type:"button",disabled:busy||index===items.length-1,onClick:()=>move(index,1)},t("builder.down","下移")),h("button",{type:"button",disabled:busy,onClick:()=>{setItems(previous=>previous.filter(value=>value.id!==item.id));if(representative===item.id)setRepresentative("");}},t("builder.remove","移除"))
			))),h("button",{type:"button",className:"dsh-kinich-action","data-tone":"accent",disabled:disabled||busy,onClick:create},busy?t("builder.processing","正在创建…"):t("builder.apply","创建并应用动态包"))));
}
