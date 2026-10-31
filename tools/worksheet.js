/* ---------- worksheet / test builder (inlined into index.html by tools/build_index.py) ----------
   Uses the page's DATA, val(), $ and esc. Worksheets live in localStorage and can be exported as a file.
   Layout: each page is 816 x 1056 px (US Letter at 96 dpi). A box is a question or a text box at (x, y) in sheet
   coordinates with a uniform scale s; its content is laid out at a fixed natural width and scaled, so resizing
   scales text and images together. */
const WS=(()=>{
const ZOOM=typeof CSS!=='undefined'&&CSS.supports&&CSS.supports('zoom','1');
const PW=816,PH=1056,GAP=28,MARGIN=48,W0=700,STEP=14,KEY='chem-worksheets-v1';
let store=load(),Z=1,sel=null,asked=false,dragId=null,autoFit=true;
function blank(t){return {title:t,pages:1,numbers:true,key:false,keyWhy:true,boxes:[]}}
function fresh(){const id='w'+Date.now().toString(36);return {cur:id,sheets:{[id]:blank('Worksheet 1')}}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.sheets&&s.sheets[s.cur])return s}catch(e){}return fresh()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}badge()}
const sh=()=>store.sheets[store.cur];
const uid=()=>'b'+Math.random().toString(36).slice(2,9);
const dOf=id=>DATA.find(x=>x.id===id);
const has=id=>sh().boxes.some(b=>b.qid===id);
const PGH=PH+GAP;
const cw=b=>b.type==='text'?(b.w||600):W0;
const pageOf=b=>Math.max(0,Math.min(sh().pages-1,Math.floor((b.y+4)/PGH)));
const snap=v=>Math.round(v/4)*4;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function badge(){const n=sh().boxes.filter(b=>b.type==='q').length;const el=$('#wsN');if(el){el.textContent=n;el.hidden=!n}}

/* ----- content ----- */
function loadImg(src){return new Promise(r=>{const i=new Image();i.onload=()=>r({w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>r({w:600,h:300});i.src=src})}
function imgDims(b,src,grid){const n=(b.sizes&&b.sizes[src])||{w:600,h:300};let w=/^AP\d{4}F/.test(b.qid||'')?n.w*96/110:n.w/2;w=Math.min(w,grid?W0/2-24:W0);return {w:Math.round(w),h:Math.round(w*n.h/n.w)}}
async function snapshot(d){
  const mc=d.f==='Multiple choice';
  const stem=d.c==='ap'?'':(val(d,mc?'stem':'question')||'');
  const op=mc?val(d,'options'):null;
  const opts=mc?d.o.map((o,i)=>o.t==='img'?{t:'img',v:o.v}:{t:'text',v:(op&&op[i]!=null?op[i]:o.v)}):[];
  const b={id:uid(),type:'q',qid:d.id,fmt:mc?'MC':'FR',stem,opts,im:d.im||'',s:1,lines:0,x:MARGIN,y:MARGIN,sizes:{}};
  const srcs=[b.im,...opts.filter(o=>o.t==='img').map(o=>o.v)].filter(Boolean);
  const dims=await Promise.all(srcs.map(loadImg));srcs.forEach((s,i)=>b.sizes[s]=dims[i]);
  return b}
function numbers(){const q=sh().boxes.filter(b=>b.type==='q').sort((a,b)=>a.y-b.y||a.x-b.x);const m={};q.forEach((b,i)=>m[b.id]=i+1);return m}
function inner(b,num){
  if(b.type==='text')return `<div class="wstext" data-f="text" style="font-size:${b.fs||16}px">${esc(b.text)}</div>`;
  let h=`<div class="wsrow">${sh().numbers?`<span class="wsnum">${num}.</span>`:''}<div class="wsstem" data-f="stem">${esc(b.stem)}</div></div>`;
  if(b.im){const z=imgDims(b,b.im);h+=`<img class="wsimg" src="${esc(b.im)}" width="${z.w}" height="${z.h}" alt="">`}
  if(b.fmt==='MC'){
    const imgs=b.opts.some(o=>o.t==='img');
    h+=`<div class="wsopts${imgs?' g2':''}">`+b.opts.map((o,i)=>{const L='ABCD'[i];
      if(o.t==='img'){const z=imgDims(b,o.v,true);return `<div class="wsopt wsoi"><img src="${esc(o.v)}" width="${z.w}" height="${z.h}" alt="Choice ${L}"></div>`}
      return `<div class="wsopt"><b>${L})</b> <span data-f="opt" data-i="${i}">${esc(o.v)}</span></div>`}).join('')+'</div>'}
  else if(b.lines)h+=`<div class="wslines">${'<div></div>'.repeat(b.lines)}</div>`;
  return h}
function tmp(b){const m=$('#wsmeasure');m.innerHTML=`<div class="wscontent" style="width:${cw(b)}px">${inner(b,numbers()[b.id]||1)}</div>`;return m.firstChild}
const hOf=b=>tmp(b).offsetHeight*b.s;

/* ----- placement ----- */
function place(b){
  const others=sh().boxes.filter(o=>o!==b);let y=MARGIN;
  others.forEach(o=>{y=Math.max(y,o.y+hOf(o)+STEP)});
  let h=hOf(b);const room=PH-2*MARGIN;
  if(h>room){b.s=Math.max(.3,Math.floor(b.s*room/h*100)/100);h=hOf(b)}
  let pg=Math.floor(y/PGH);const top=pg*PGH;
  if(y+h>top+PH-MARGIN&&y>top+MARGIN){pg++;y=pg*PGH+MARGIN}
  b.x=MARGIN;b.y=y;sh().pages=Math.max(sh().pages,Math.floor(y/PGH)+1)}
function arrange(){
  let y=MARGIN,pg=0;sh().boxes.forEach(b=>{
    let h=hOf(b);const top=pg*PGH;if(h>PH-2*MARGIN){b.s=Math.max(.3,Math.floor(b.s*(PH-2*MARGIN)/h*100)/100);h=hOf(b)}
    if(y+h>top+PH-MARGIN&&y>top+MARGIN){pg++;y=pg*PGH+MARGIN}
    b.x=MARGIN;b.y=y;y+=h+STEP});
  sh().pages=Math.max(1,pg+1);save();draw()}

/* ----- add / remove ----- */
async function add(d){if(has(d.id))return;const b=await snapshot(d);sh().boxes.push(b);place(b);save();syncBtns(d.id)}
function removeQ(id){sh().boxes=sh().boxes.filter(b=>b.qid!==id);save();syncBtns(id);if(!$('#ws').hidden)draw()}
function btn(d){if(d.k!=='question')return '';return `<button class="btn small${has(d.id)?' on':''}" data-ws="${esc(d.id)}">${has(d.id)?'In worksheet (remove)':'+ Worksheet'}</button>`}
function syncBtns(id){document.querySelectorAll(`[data-ws="${CSS.escape(id)}"]`).forEach(x=>{const on=has(id);x.textContent=on?'In worksheet (remove)':'+ Worksheet';x.classList.toggle('on',on)});if(!$('#ws').hidden)draw()}
function syncAll(){document.querySelectorAll('[data-ws]').forEach(x=>{const on=has(x.dataset.ws);x.textContent=on?'In worksheet (remove)':'+ Worksheet';x.classList.toggle('on',on)})}
function addText(kind){
  const b={id:uid(),type:'text',text:kind==='header'?'Name: ____________________    Date: ____________    Period: ______':'Type here',w:kind==='header'?700:420,fs:kind==='header'?16:16,s:1,x:MARGIN,y:MARGIN};
  sh().boxes.push(b);place(b);sel=b.id;save();draw()}

/* ----- drawing the editor ----- */
function boxEl(b,num){
  const el=document.createElement('div');el.className='wsbox'+(b.type==='text'?' txt':'');el.dataset.id=b.id;el.tabIndex=0;
  el.style.left=b.x+'px';el.style.top=b.y+'px';el.style.width=cw(b)*b.s+'px';
  el.innerHTML=`<div class="wsgrip" title="Drag to move"><span class="wsmove">&#8942;&#8942; Move</span><span class="wstools"><button data-t="smaller" title="Smaller" aria-label="Smaller">&minus;</button><button data-t="bigger" title="Bigger" aria-label="Bigger">+</button>${b.type==='q'&&b.fmt==='FR'?`<button data-t="lm" title="Fewer answer lines" aria-label="Fewer answer lines">&#8722;&#9776;</button><button data-t="lp" title="More answer lines" aria-label="More answer lines">+&#9776;</button>`:''}<button data-t="del" title="Remove" aria-label="Remove">&times;</button></span></div><div class="wscontent" style="width:${cw(b)}px;transform:scale(${b.s})">${inner(b,num)}</div><div class="wsresize" title="Drag to resize"></div><div class="wswarnmsg">Crosses a page edge</div>`;
  const c=el.querySelector('.wscontent');
  el.querySelectorAll('[data-f]').forEach(t=>{t.contentEditable='plaintext-only';if(t.contentEditable!=='plaintext-only')t.contentEditable='true';t.spellcheck=true});
  fit(el,b);return el}
function fit(el,b){const c=el.querySelector('.wscontent');const h=c.offsetHeight*b.s;el.style.height=h+'px';el.style.width=cw(b)*b.s+'px';flags()}
function flags(){
  const els=[...document.querySelectorAll('#wssheet .wsbox')],R=els.map(e=>({e,x:parseFloat(e.style.left)||0,y:parseFloat(e.style.top)||0,w:parseFloat(e.style.width)||0,h:parseFloat(e.style.height)||0}));
  R.forEach(r=>{const pg=Math.floor((r.y+4)/PGH),edge=r.y+r.h>pg*PGH+PH||r.x+r.w>PW+1;
    const over=R.some(o=>o!==r&&r.x<o.x+o.w-1&&o.x<r.x+r.w-1&&r.y<o.y+o.h-1&&o.y<r.y+r.h-1);
    r.e.classList.toggle('warn',edge);r.e.classList.toggle('over',!edge&&over);
    const m=r.e.querySelector('.wswarnmsg');if(m)m.textContent=edge?'Crosses a page edge':'Overlaps another box'})}
function draw(){
  const s=sh(),box=$('#wssheet');if(!box)return;
  const H=s.pages*PH+(s.pages-1)*GAP,nums=numbers();
  box.style.width=PW+'px';box.style.height=H+'px';
  let h='';for(let k=0;k<s.pages;k++)h+=`<div class="wspage" style="top:${k*PGH}px"><span class="wspn">Page ${k+1}</span></div>`;
  box.innerHTML=h;
  s.boxes.forEach(b=>{const el=boxEl(b,nums[b.id]||'');box.appendChild(el);fit(el,b);if(b.id===sel)el.classList.add('sel')});
  $('#wsscale').style.width=PW*Z+'px';$('#wsscale').style.height=H*Z+'px';box.style.transform=`scale(${Z})`;
  list();controls()}
function list(){
  const nums=numbers();
  $('#wslist').innerHTML=sh().boxes.map((b,i)=>{
    const lab=b.type==='text'?'Text: '+(b.text||'').slice(0,28):`${nums[b.id]}. ${b.qid}`;
    return `<li draggable="true" data-i="${i}" class="${b.id===sel?'sel':''}" data-id="${b.id}"><span class="wsgrab">&#8942;</span><span class="wslab">${esc(lab)}</span><button data-o="up" aria-label="Move up">&#9650;</button><button data-o="dn" aria-label="Move down">&#9660;</button></li>`}).join('')||'<li class="wsempty">Nothing yet. Go back to the questions and click <b>+ Worksheet</b> on any question.</li>'}
function controls(){
  const s=sh();$('#wstitle').value=s.title;$('#wsnum').checked=s.numbers;$('#wskey').checked=s.key;$('#wskeywhy').checked=s.keyWhy;$('#wskeywhy').disabled=!s.key;
  const sel_=$('#wspick');sel_.innerHTML=Object.entries(store.sheets).map(([id,w])=>`<option value="${id}"${id===store.cur?' selected':''}>${esc(w.title)} (${w.boxes.filter(b=>b.type==='q').length})</option>`).join('')}
function select(id){sel=id;document.querySelectorAll('.wsbox').forEach(e=>e.classList.toggle('sel',e.dataset.id===id));document.querySelectorAll('#wslist li').forEach(e=>e.classList.toggle('sel',e.dataset.id===id))}

/* ----- pointer interaction ----- */
function bindSheet(){
  const area=$('#wssheet');
  area.addEventListener('pointerdown',e=>{
    const el=e.target.closest('.wsbox');if(!el){select(null);return}
    const b=sh().boxes.find(x=>x.id===el.dataset.id);select(b.id);
    if(e.target.closest('.wsgrip')&&!e.target.closest('button'))startDrag(e,el,b);
    else if(e.target.closest('.wsresize'))startResize(e,el,b)});
  area.addEventListener('input',e=>{
    const el=e.target.closest('.wsbox');if(!el)return;const b=sh().boxes.find(x=>x.id===el.dataset.id),f=e.target.dataset.f;
    if(f==='stem')b.stem=e.target.innerText;else if(f==='text')b.text=e.target.innerText;else if(f==='opt')b.opts[+e.target.dataset.i].v=e.target.innerText;
    fit(el,b);save();$('#wslist li.sel .wslab')&&list()});
  area.addEventListener('click',e=>{
    const t=e.target.closest('[data-t]');if(!t)return;const el=t.closest('.wsbox'),b=sh().boxes.find(x=>x.id===el.dataset.id),k=t.dataset.t;
    if(k==='del'){sh().boxes=sh().boxes.filter(x=>x!==b);if(b.qid)syncAll();save();draw();return}
    if(k==='smaller'||k==='bigger'){b.s=clamp(+(b.s+(k==='bigger'?.1:-.1)).toFixed(2),.25,Math.min(1.6,(PW-b.x)/cw(b)));}
    if(k==='lp')b.lines=Math.min(14,(b.lines||0)+1);
    if(k==='lm')b.lines=Math.max(0,(b.lines||0)-1);
    save();draw();select(b.id)});
  area.addEventListener('keydown',e=>{
    const el=e.target.closest('.wsbox');if(!el||e.target!==el)return;const b=sh().boxes.find(x=>x.id===el.dataset.id),d={ArrowLeft:[-4,0],ArrowRight:[4,0],ArrowUp:[0,-4],ArrowDown:[0,4]}[e.key];
    if(d){e.preventDefault();b.x=clamp(b.x+d[0],0,PW-cw(b)*b.s);b.y=Math.max(0,b.y+d[1]);el.style.left=b.x+'px';el.style.top=b.y+'px';fit(el,b);save()}
    else if(e.key==='Delete'){sh().boxes=sh().boxes.filter(x=>x!==b);if(b.qid)syncAll();save();draw()}})}
function startDrag(e,el,b){
  e.preventDefault();const g=el.querySelector('.wsgrip');g.setPointerCapture(e.pointerId);
  const sx=e.clientX,sy=e.clientY,bx=b.x,by=b.y,w=cw(b)*b.s,H=sh().pages*PGH;
  const mv=ev=>{b.x=snap(clamp(bx+(ev.clientX-sx)/Z,0,PW-w));b.y=snap(clamp(by+(ev.clientY-sy)/Z,0,H-el.offsetHeight));el.style.left=b.x+'px';el.style.top=b.y+'px';fit(el,b)};
  const up=()=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);g.removeEventListener('pointercancel',up);save();list()};
  g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)}
function startResize(e,el,b){
  e.preventDefault();const g=el.querySelector('.wsresize');g.setPointerCapture(e.pointerId);
  const sx=e.clientX,w0=cw(b)*b.s,c=el.querySelector('.wscontent');
  const mv=ev=>{b.s=+clamp((w0+(ev.clientX-sx)/Z)/cw(b),.25,Math.min(1.6,(PW-b.x)/cw(b))).toFixed(3);c.style.transform=`scale(${b.s})`;fit(el,b)};
  const up=()=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);g.removeEventListener('pointercancel',up);save()};
  g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)}

/* ----- the answer key ----- */
function keyItems(){
  const nums=numbers();
  return sh().boxes.filter(b=>b.type==='q').sort((a,b)=>nums[a.id]-nums[b.id]).map(b=>{
    const d=dOf(b.qid)||{};let ans='';let img='';
    if(b.fmt==='MC'){const L=d.oa||'';const i='ABCD'.indexOf(L),o=b.opts[i];ans=`${L}${o&&o.t==='text'?') '+o.v:''}`;if(o&&o.t==='img')img=o.v}
    else{ans=val(d,'answer')||d.a||'';img=d.am||''}
    return {n:nums[b.id],id:b.qid,ans,img,why:sh().keyWhy?(d.w?val(d,d.f==='Multiple choice'?'why':'explanation'):''):''}})}
const kdim={};
async function prepKey(){for(const it of keyItems())if(it.img&&!kdim[it.img])kdim[it.img]=await loadImg(it.img)}
function keyImg(src){const n=kdim[src]||{w:400,h:200};const w=Math.min(340,Math.round(n.w/2));return `<div><img src="${esc(src)}" width="${w}" height="${Math.round(w*n.h/n.w)}"></div>`}
function keyHTML(it){return `<div class="wskeyi"><b>${it.n}.</b> <span class="wskid">${esc(it.id)}</span> <span>${esc(it.ans)}</span>${it.img?keyImg(it.img):''}${it.why?`<div class="wskw">${esc(it.why)}</div>`:''}</div>`}

/* ----- PDF (the browser's print dialog, so "Save as PDF" matches the page exactly) ----- */
function buildPrint(){
  const root=$('#wsprint'),s=sh(),nums=numbers();root.innerHTML='';
  for(let k=0;k<s.pages;k++){
    const p=document.createElement('div');p.className='pp';
    s.boxes.filter(b=>pageOf(b)===k).forEach(b=>{const e=document.createElement('div');e.className='ppbox';e.style.cssText=`left:${b.x}px;top:${b.y-k*PGH}px;width:${cw(b)*b.s}px`;
      e.innerHTML=`<div class="wscontent" style="width:${cw(b)}px;${ZOOM?`zoom:${b.s}`:`transform:scale(${b.s})`}">${inner(b,nums[b.id]||'')}</div>`;p.appendChild(e)});
    root.appendChild(p)}
  if(s.key){
    const items=keyItems();let p=null;
    const newPage=(first)=>{p=document.createElement('div');p.className='pp ppkey';p.style.height='auto';p.innerHTML=first?`<h2>${esc(s.title)}: Answer key</h2>`:'';root.appendChild(p)};
    newPage(true);
    items.forEach(it=>{const d=document.createElement('div');d.innerHTML=keyHTML(it);const el=d.firstChild;p.appendChild(el);
      if(p.offsetHeight>PH-MARGIN+48&&p.children.length>1){p.removeChild(el);newPage(false);p.appendChild(el)}});
    root.querySelectorAll('.ppkey').forEach(k=>k.style.height=PH+'px')}
}
const imgsReady=()=>Promise.all([...document.querySelectorAll('#wsprint img')].map(i=>(i.complete&&i.naturalWidth?Promise.resolve():new Promise(r=>{i.onload=i.onerror=r})).then(()=>i.decode?i.decode().catch(()=>0):0)));
async function printPdf(){syncTitle();if(sh().key)await prepKey();buildPrint();await imgsReady();setTimeout(()=>window.print(),80)}

/* ----- Word (.docx written here, no libraries) ----- */
const enc=new TextEncoder();
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=crcT[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zip(files){
  const parts=[],cen=[];let off=0;const le=(n,b)=>{const a=new Uint8Array(b);for(let i=0;i<b;i++)a[i]=(n>>>(8*i))&255;return a};
  files.forEach(f=>{const nm=enc.encode(f.name),crc=crc32(f.data),sz=f.data.length;
    const lh=[le(0x04034b50,4),le(20,2),le(0,2),le(0,2),le(0,2),le(0x21,2),le(crc,4),le(sz,4),le(sz,4),le(nm.length,2),le(0,2),nm];
    parts.push(...lh,f.data);
    cen.push([le(0x02014b50,4),le(20,2),le(20,2),le(0,2),le(0,2),le(0,2),le(0x21,2),le(crc,4),le(sz,4),le(sz,4),le(nm.length,2),le(0,2),le(0,2),le(0,2),le(0,2),le(0,4),le(off,4),nm]);
    off+=30+nm.length+sz});
  let cs=0;const cparts=[];cen.forEach(c=>c.forEach(x=>{cparts.push(x);cs+=x.length}));
  const end=[le(0x06054b50,4),le(0,2),le(0,2),le(files.length,2),le(files.length,2),le(cs,4),le(off,4),le(0,2)];
  return new Blob([...parts,...cparts,...end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}
const X=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function run(t,o){o=o||{};const sz=o.sz?`<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>`:'';
  const lines=String(t).split('\n');
  return `<w:r><w:rPr>${o.b?'<w:b/>':''}${o.i?'<w:i/>':''}${sz}</w:rPr>${lines.map((l,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${X(l)}</w:t>`).join('')}</w:r>`}
function para(inner,o){o=o||{};return `<w:p><w:pPr><w:spacing w:before="${o.before||0}" w:after="${o.after==null?80:o.after}"/>${o.ind?`<w:ind w:left="${o.ind}"/>`:''}${o.keep?'<w:keepNext/>':''}${o.border?'<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="888888"/></w:pBdr>':''}</w:pPr>${inner}</w:p>`}
let missing=[];
async function docx(){missing=[];
  const s=sh(),nums=numbers(),imgs=[],rels=[];let nid=0;
  const getImg=async src=>{let f=imgs.find(i=>i.src===src);if(f)return f;
    let buf;try{const r=await fetch(src);if(!r.ok)throw 0;buf=new Uint8Array(await r.arrayBuffer())}catch(e){missing.push(src);return null}
    f={src,data:buf,rid:'rId'+(10+imgs.length),name:`image${imgs.length+1}.png`};imgs.push(f);return f};
  const pic=(f,w,h)=>{const cx=Math.round(w*9525),cy=Math.round(h*9525),id=++nid;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Picture ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${f.name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${f.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`};
  const MAXW=Math.round(6.5*96);
  const sizeOf=(b,src,grid)=>{const z=imgDims(b,src,grid);const k=b.s;let w=Math.min(z.w*k,grid?3*96:MAXW);let h=w*z.h/z.w;const MAXH=Math.round(8.6*96);if(h>MAXH){w=w*MAXH/h;h=MAXH}return {w,h}};
  let body='';const sorted=[...s.boxes].sort((a,b)=>pageOf(a)-pageOf(b)||a.y-b.y||a.x-b.x);let curPg=0;
  body+=para(run(s.title,{b:true,sz:36}),{after:160});
  for(const b of sorted){
    const pg=pageOf(b);if(pg>curPg){body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';curPg=pg}
    const k=Math.max(.6,Math.min(1.6,b.s));
    if(b.type==='text'){body+=para(run(b.text,{sz:Math.round(22*(b.fs||16)/16*b.s)}),{after:120});continue}
    const sz=Math.round(22*k);
    body+=para((s.numbers?run(nums[b.id]+'. ',{b:true,sz}):'')+run(b.stem,{sz}),{before:120,keep:true});
    if(b.im){const f=await getImg(b.im);if(f){const z=sizeOf(b,b.im);body+=para(pic(f,z.w,z.h),{after:60})}}
    if(b.fmt==='MC'){
      if(b.opts.some(o=>o.t==='img')){
        const cell=async(o,i)=>{let c=`<w:p>${o.t==='img'?'':run('ABCD'[i]+') ',{b:true,sz})}`;if(o.t==='img'){const f=await getImg(o.v);if(f){const z=sizeOf(b,o.v,true);c+=pic(f,z.w,z.h)}}else c+=run(o.v,{sz});return `<w:tc><w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>${c}</w:p></w:tc>`};
        let tb='<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/></w:tblPr>';
        for(let r=0;r<b.opts.length;r+=2)tb+=`<w:tr>${await cell(b.opts[r],r)}${b.opts[r+1]?await cell(b.opts[r+1],r+1):'<w:tc><w:p/></w:tc>'}</w:tr>`;
        body+=tb+'</w:tbl>'+para('',{after:60})}
      else b.opts.forEach((o,i)=>{body+=para(run('ABCD'[i]+')  ',{b:true,sz})+run(o.v,{sz}),{ind:360,after:20})})}
    else for(let i=0;i<(b.lines||0);i++)body+=para('',{border:true,after:200})}
  if(s.key){
    body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>'+para(run(s.title+': Answer key',{b:true,sz:32}),{after:160});
    for(const it of keyItems()){
      body+=para(run(it.n+'. ',{b:true})+run(it.id+'  ',{i:true,sz:18})+run(it.ans),{before:60,after:40});
      if(it.img){const f=await getImg(it.img);if(f)body+=para(pic(f,300,300*0.5),{after:40})}
      if(it.why)body+=para(run(it.why,{i:true,sz:20}),{ind:360,after:60})}}
  const ns='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns}><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const files=[
    {name:'[Content_Types].xml',data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')},
    {name:'_rels/.rels',data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')},
    {name:'word/document.xml',data:enc.encode(doc)},
    {name:'word/_rels/document.xml.rels',data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+imgs.map(i=>`<Relationship Id="${i.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${i.name}"/>`).join('')+'</Relationships>')},
    ...imgs.map(i=>({name:'word/media/'+i.name,data:i.data}))];
  return zip(files)}
async function wordExport(){
  if(!asked){if(!confirm('About the Word file: it keeps your question order, your edited text and the sizes you set, but NOT the exact positions of boxes on the page. For an exact copy of the layout, use the PDF button.\n\nDownload the Word file?'))return;asked=true}
  syncTitle();let blob;try{blob=await docx()}catch(e){alert('The Word file could not be made: '+e.message);return}
  if(missing.length)alert('Heads up: '+missing.length+' picture(s) could not be read, so they are left out of the Word file. This happens when the page is opened as a local file. Open the index from the website to include pictures.');
  download(blob,fname()+'.docx')}
const fname=()=>(sh().title||'worksheet').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')||'worksheet';
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}

/* ----- sheets: new, switch, file ----- */
function syncTitle(){sh().title=$('#wstitle').value||'Worksheet';save()}
function newSheet(){const id='w'+Date.now().toString(36);store.sheets[id]=blank('Worksheet '+(Object.keys(store.sheets).length+1));store.cur=id;sel=null;save();syncAll();draw()}
function fileOut(){download(new Blob([JSON.stringify({chemWorksheet:1,sheet:sh()},null,1)],{type:'application/json'}),fname()+'.worksheet.json')}
function fileIn(f){const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!j.sheet||!Array.isArray(j.sheet.boxes))throw 0;const id='w'+Date.now().toString(36);store.sheets[id]=Object.assign(blank('Imported'),j.sheet);store.cur=id;sel=null;save();syncAll();draw()}catch(e){alert('That file is not a worksheet file.')}};r.readAsText(f)}

/* ----- the panel ----- */
function mount(){
  const css=document.createElement('div');
  document.body.insertAdjacentHTML('beforeend',`<div id="wsmeasure" aria-hidden="true"></div><div id="wsprint"></div>
<div id="ws" hidden role="dialog" aria-label="Worksheet builder">
 <div class="wsbar"><button class="btn" id="wsback">&larr; Back to questions</button><b>Worksheet builder</b>
  <span class="wsz"><button class="btn small" id="wszo" aria-label="Zoom out">&minus;</button><span id="wszv"></span><button class="btn small" id="wszi" aria-label="Zoom in">+</button><button class="btn small" id="wszf">Fit</button></span></div>
 <div class="wsbody">
  <aside class="wsside">
   <label class="wsl">Worksheet <select id="wspick" class="btn"></select></label>
   <div class="wsrow2"><button class="btn small" id="wsnew">New</button><button class="btn small" id="wsdel">Delete</button></div>
   <label class="wsl">Title <input id="wstitle" type="text"></label>
   <label class="wsc"><input type="checkbox" id="wsnum"> Number the questions</label>
   <label class="wsc"><input type="checkbox" id="wskey"> Add an answer key at the end</label>
   <label class="wsc wsind"><input type="checkbox" id="wskeywhy"> Include explanations</label>
   <div class="wsh">Add</div>
   <div class="wsrow2"><button class="btn small" id="wsaddt">Text box</button><button class="btn small" id="wsaddh">Name / date line</button></div>
   <div class="wsh">Layout</div>
   <div class="wsrow2"><button class="btn small" id="wsarr">Arrange in list order</button><button class="btn small" id="wsap">Add page</button><button class="btn small" id="wsrp">Remove last page</button></div>
   <div class="wsh">Order (drag to reorder)</div><ol id="wslist"></ol>
   <div class="wsh">Export</div>
   <div class="wsrow2"><button class="btn primary" id="wspdf">PDF</button><button class="btn primary" id="wsdoc">Word</button></div>
   <p class="wsnote"><b>PDF</b> matches the page exactly: choose "Save as PDF" in the print window.<br><b>Word</b> keeps the order, text and sizes but <b>not the exact box positions</b>; fix the layout in Word if you need to.</p>
   <div class="wsrow2"><button class="btn small" id="wssave">Save as file</button><button class="btn small" id="wsopen">Open file</button><input type="file" id="wsfile" accept=".json,application/json" hidden></div>
   <p class="wsnote">Worksheets are saved in this browser automatically. Use "Save as file" to move one to another computer.</p>
  </aside>
  <div class="wsmain" id="wsmain"><div id="wsscale"><div id="wssheet"></div></div></div>
 </div></div>`);
  bindSheet();
  const open=()=>{$('#ws').hidden=false;document.body.classList.add('wsopen');fitZoom();draw()},close=()=>{$('#ws').hidden=true;document.body.classList.remove('wsopen')};
  $('#wsBtn').onclick=open;$('#wsback').onclick=close;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#ws').hidden&&!e.target.isContentEditable)close()});
  const zoom=z=>{autoFit=false;Z=clamp(z,.3,1.6);$('#wszv').textContent=Math.round(Z*100)+'%';draw()};
  function fitZoom(){Z=clamp(($('#wsmain').clientWidth-36)/PW,.3,1);$('#wszv').textContent=Math.round(Z*100)+'%'}
  $('#wszo').onclick=()=>zoom(Z-.1);$('#wszi').onclick=()=>zoom(Z+.1);$('#wszf').onclick=()=>{autoFit=true;fitZoom();draw()};
  addEventListener('resize',()=>{if(!$('#ws').hidden&&autoFit){fitZoom();draw()}});
  $('#wstitle').oninput=()=>{sh().title=$('#wstitle').value;save();const o=$('#wspick').selectedOptions[0];if(o)o.textContent=sh().title+' ('+sh().boxes.filter(b=>b.type==='q').length+')'};
  $('#wsnum').onchange=e=>{sh().numbers=e.target.checked;save();draw()};
  $('#wskey').onchange=e=>{sh().key=e.target.checked;save();controls()};
  $('#wskeywhy').onchange=e=>{sh().keyWhy=e.target.checked;save()};
  $('#wspick').onchange=e=>{store.cur=e.target.value;sel=null;save();syncAll();draw()};
  $('#wsnew').onclick=newSheet;
  $('#wsdel').onclick=()=>{if(!confirm('Delete this worksheet?'))return;delete store.sheets[store.cur];if(!Object.keys(store.sheets).length)store=fresh();else store.cur=Object.keys(store.sheets)[0];save();syncAll();draw()};
  $('#wsaddt').onclick=()=>addText('text');$('#wsaddh').onclick=()=>addText('header');
  $('#wsarr').onclick=arrange;
  $('#wsap').onclick=()=>{sh().pages++;save();draw()};
  $('#wsrp').onclick=()=>{const n=sh().pages;if(n<2)return;if(sh().boxes.some(b=>pageOf(b)>=n-1)){alert('Move the boxes off the last page first.');return}sh().pages--;save();draw()};
  $('#wspdf').onclick=printPdf;$('#wsdoc').onclick=wordExport;
  $('#wssave').onclick=fileOut;$('#wsopen').onclick=()=>$('#wsfile').click();$('#wsfile').onchange=e=>{if(e.target.files[0])fileIn(e.target.files[0]);e.target.value=''};
  const L=$('#wslist');
  L.addEventListener('click',e=>{const li=e.target.closest('li[data-id]');if(!li)return;const i=+li.dataset.i,b=sh().boxes;
    const o=e.target.closest('[data-o]');
    if(o){const j=o.dataset.o==='up'?i-1:i+1;if(j<0||j>=b.length)return;[b[i],b[j]]=[b[j],b[i]];save();draw();return}
    select(li.dataset.id);const el=document.querySelector(`.wsbox[data-id="${li.dataset.id}"]`);el&&el.scrollIntoView({block:'center',behavior:'smooth'})});
  L.addEventListener('dragstart',e=>{const li=e.target.closest('li[data-i]');if(!li)return;dragId=+li.dataset.i;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(dragId))}catch(x){}});
  L.addEventListener('dragover',e=>{e.preventDefault()});
  L.addEventListener('drop',e=>{e.preventDefault();const li=e.target.closest('li[data-i]');if(!li||dragId==null)return;const to=+li.dataset.i,b=sh().boxes,[m]=b.splice(dragId,1);b.splice(to,0,m);dragId=null;save();draw()});
  document.addEventListener('click',e=>{const x=e.target.closest('[data-ws]');if(!x)return;const d=dOf(x.dataset.ws);if(!d)return;
    if(has(d.id)){removeQ(d.id);x.textContent='+ Worksheet'}else{x.textContent='Adding...';add(d).then(()=>{x.textContent='In worksheet (remove)'})}});
  badge()}
return {btn,mount,syncAll}})();
WS.mount();
