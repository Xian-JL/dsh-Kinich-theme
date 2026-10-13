import { open, writeFile } from 'node:fs/promises';
const asarPath='E:/Deepseek-harness/resources/app.asar';
const file=await open(asarPath,'r');
let versions=[];
try {
  const prefix=Buffer.alloc(16);await file.read(prefix,0,16,0);
  const headerSize=prefix.readUInt32LE(4),jsonSize=prefix.readUInt32LE(12);
  if(jsonSize>64*1024*1024||jsonSize>headerSize)throw new Error('Unexpected ASAR header size');
  const bytes=Buffer.alloc(jsonSize);await file.read(bytes,0,jsonSize,16);
  const tree=JSON.parse(bytes.toString('utf8'));
  async function walk(node,path='') {
    for(const [name,entry] of Object.entries(node.files??{})) {
      const next=path?path+'/'+name:name;
      if(entry.files){await walk(entry,next);continue;}
      if(name!=='package.json'||entry.unpacked||entry.size>1024*1024)continue;
      if(next!=='package.json'&&!/deepseek|dsh/i.test(next))continue;
      const content=Buffer.alloc(entry.size);await file.read(content,0,content.length,8+headerSize+Number(entry.offset));
      let pkg;try{pkg=JSON.parse(content.toString('utf8'));}catch{continue;}
      if(next==='package.json'||/^@deepseek-ai\/dsh(?:$|-)/.test(pkg.name??''))versions.push({path:next,name:pkg.name,version:pkg.version});
    }
  }
  await walk(tree);
} finally {await file.close();}
const response=await fetch('https://api.github.com/repos/deepseek-ai/deepseek-harness/releases?per_page=100',{headers:{'user-agent':'Kinich-version-audit'}});
if(!response.ok)throw new Error('Official release API failed: '+response.status);
const releases=(await response.json()).map(({tag_name,prerelease,published_at,html_url})=>({tag_name,prerelease,published_at,html_url}));
const stable020=releases.filter(item=>!item.prerelease&&/^(dsh-|desktop-)?v?0\.2\.0$/.test(item.tag_name));
const record={date:'2026-10-13',timezone:'Asia/Shanghai',asarPath,versions,officialSource:'https://api.github.com/repos/deepseek-ai/deepseek-harness/releases?per_page=100',releases,stable020,conclusion:stable020.length?'Official stable release found; installed version still requires exact comparison':'No official stable 0.2.0 release found; installed rc must not be called stable'};
await writeFile('docs/wallpaper-reference/2026-10-13/DSH_VERSION_AUDIT.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({versions:versions.filter(item=>['@deepseek-ai/dsh','@deepseek-ai/dsh-desktop','@deepseek-ai/dsh-desktop-runtime'].includes(item.name)),stable020,conclusion:record.conclusion},null,2));
