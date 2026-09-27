const studios = [
  ['horror','👻','เรื่องผี 1 นาที','วิดีโอ','สร้างเรื่องผี บทพากย์ ฉากหลอน และ Video Prompts'],
  ['movie','🎬','สร้างหนังด้วย AI','วิดีโอ','พัฒนาไอเดียเป็นเรื่อง ตัวละคร ฉาก บท และคำสั่งสร้างวิดีโอ'],
  ['faceless','👤','คลิป Faceless','วิดีโอ','Hook บทพากย์ Timeline B-roll และคำสั่งต่อช็อต'],
  ['cartoon','🎨','การ์ตูน AI','ภาพ / การ์ตูน','สร้างตัวละคร ฉาก บทพูด และ Character Lock'],
  ['product','📦','วิดีโอสินค้า','วิดีโอ','ออกแบบคลิปโชว์สินค้า พร้อม Shot List และ CTA'],
  ['basket','🛍️','คลิปปักตะกร้า','การตลาด','สร้างบทขาย ฉาก คำสั่งวิดีโอ และแคปชั่น'],
  ['knowledge','💡','คลิปความรู้','วิดีโอ','เปลี่ยนความรู้ยากให้เป็นคลิปที่มือใหม่เข้าใจ'],
  ['comedy','😂','คลิปตลก','วิดีโอ','วาง Setup, Punchline, บท และจังหวะภาพ'],
  ['ebook','📚','สร้าง E-book ด้วย AI','เขียน / เอกสาร','วางโครงหนังสือ สารบัญ เนื้อหา และต้นฉบับ'],
  ['business','📢','AI ช่วยงานธุรกิจ','การตลาด','ช่วยคิดงานขาย การตลาด โปรโมชั่น ลูกค้า และ Action Plan'],
  ['content','📝','ช่วยทำคอนเทนต์','การตลาด','สร้างโพสต์ Facebook, TikTok, Caption และ CTA'],
  ['image','🖼️','สร้างภาพด้วย AI','ภาพ / การ์ตูน','สร้าง Prompt ภาพสินค้า คน ปก และโพสต์ พร้อมกด Generate'],
  ['tiktok','📱','ทำคลิป TikTok','วิดีโอ','สร้างหัวข้อ บทพูด ฉาก คำขึ้นจอ และ Video Prompt'],
  ['podcast','🎙️','ทำ Podcast','เสียง / เพลง','สร้างชื่อ ตอน บทพูด และแนวเสียงพร้อมพากย์'],
  ['novel','📖','เขียนเรื่อง / นิยาย','เขียน / เอกสาร','สร้างตัวละคร ปม เรื่องย่อ และ Blueprint'],
  ['music','🎵','สร้างเพลงและ MV','เสียง / เพลง','วางแนวเพลง เนื้อร้องต้นฉบับ และฉาก MV'],
  ['avatar','🧑','สร้างอวตาร','ภาพ / การ์ตูน','สร้าง Avatar Profile และ Character Consistency Pack'],
].map(([id,icon,name,cat,desc])=>({id,icon,name,cat,desc}));

const voicePresets = [
  ['coral','หญิง-มั่นใจ','เสียงผู้หญิงไทยมั่นใจ เป็นกันเอง ออกเสียงชัด'],
  ['shimmer','หญิง-สดใส','เสียงสดใส เป็นมิตร จังหวะกระชับ'],
  ['nova','หญิง-นุ่มนวล','เสียงนุ่มนวล อบอุ่น ฟังง่าย'],
  ['marin','หญิง-พรีเมียม','เสียงพรีเมียม สุขุม เหมาะงานธุรกิจ'],
  ['onyx','ชาย-เข้ม','เสียงผู้ชายเข้ม สุขุม น่าเชื่อถือ'],
  ['echo','ชาย-เป็นกันเอง','เสียงผู้ชายเป็นกันเอง ธรรมชาติ'],
  ['cedar','ชาย-มืออาชีพ','เสียงมืออาชีพ ชัดเจน ไม่รีบ'],
  ['ash','ชาย-กระฉับกระเฉง','เสียงกระฉับกระเฉง เหมาะคลิปสั้น'],
  ['ballad','เล่าเรื่อง','เสียงเล่าเรื่องมีอารมณ์และจังหวะ'],
  ['verse','วัยรุ่น-สดใหม่','เสียงสดใหม่ คล่องแคล่ว เป็นธรรมชาติ'],
];

const state = {
  view:'explore', studio:null, category:'ทั้งหมด', search:'', result:null, loading:false,
  chars:[], health:null, toast:'', modal:null, projects: loadProjects(),
  form:{topic:'',audience:'ผู้ประกอบการและคนทั่วไป',goal:'ให้เข้าใจและนำไปใช้ได้ทันที',tone:'สมจริง กระชับ น่าเชื่อถือ',platform:'TikTok / Facebook Reels',ratio:'9:16',duration:'30 วินาที',sceneCount:3,details:''},
  sceneMedia:{}, renderJob:null, renderTimer:null, bgmId:null,
};

function loadProjects(){ try{return JSON.parse(localStorage.getItem('mentor_projects')||'[]')}catch{return[]} }
function persistProjects(){ localStorage.setItem('mentor_projects',JSON.stringify(state.projects.slice(0,50))) }
function el(id){ return document.getElementById(id) }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])) }
function toast(msg){ state.toast=msg; render(); setTimeout(()=>{state.toast='';render()},2600) }
function studioById(id){ return studios.find(x=>x.id===id)||studios[0] }

async function checkHealth(){ try{state.health=await (await fetch('/api/health')).json();render()}catch{state.health={ok:false,openaiConfigured:false};render()} }

function render(){
  document.getElementById('app').innerHTML = `<div class="shell">${topbar()}<main class="main">${state.view==='explore'?exploreView():state.view==='projects'?projectsView():studioView()}</main>${state.modal?modalView():''}${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}</div>`;
  bind();
}

function topbar(){
  return `<header class="topbar"><div class="brand"><div class="logo">M</div><div>MentorClick <small>AI CREATION STUDIO</small></div></div><nav class="nav"><button data-nav="explore" class="${state.view==='explore'?'active':''}">สตูดิโอ AI</button><button data-nav="projects" class="${state.view==='projects'?'active':''}">งานของฉัน</button><button data-action="health">สถานะระบบ</button></nav><button class="primary" data-action="new">+ สร้างงานใหม่</button></header>`;
}

function exploreView(){
  const cats=['ทั้งหมด','วิดีโอ','ภาพ / การ์ตูน','เขียน / เอกสาร','การตลาด','เสียง / เพลง'];
  const filtered=studios.filter(s=>(state.category==='ทั้งหมด'||s.cat===state.category)&&(!state.search||`${s.name} ${s.desc}`.toLowerCase().includes(state.search.toLowerCase())));
  return `<section class="hero"><div class="eyebrow">MENTORCLICK STUDIO EXPLORER</div><h1>วันนี้อยากสร้างอะไรด้วย AI?</h1><p>เลือกเครื่องมือ แล้วรับสคริปต์ บทพากย์ Prompt ภาพ และ Video Prompt พร้อมนำไปผลิตต่อได้ทันที</p><div class="searchbar"><input id="search" value="${esc(state.search)}" placeholder="ค้นหาสิ่งที่อยากทำ... เช่น คลิปขายสินค้า, ประกัน, การ์ตูน"><button class="ghost" data-action="search">🔎 ค้นหา</button></div><div class="filters">${cats.map(c=>`<button class="chip ${state.category===c?'active':''}" data-cat="${c}">${c}</button>`).join('')}</div></section><section><div class="cards">${filtered.map(cardHtml).join('')}</div></section>`;
}
function cardHtml(s){return `<article class="card" data-studio="${s.id}"><div class="card-icon">${s.icon}</div><div class="badge">ใช้งานได้แล้ว</div><h3>${s.name}</h3><p>${s.desc}</p><footer><span>${s.cat}</span><b>เปิด Studio →</b></footer></article>`}

function projectsView(){
  return `<section class="hero"><div class="eyebrow">MY PROJECTS</div><h1>งานของฉัน</h1><p>โปรเจกต์ถูกเก็บใน Browser ของเครื่องนี้ กดเปิดเพื่อแก้ไขหรือสร้างต่อได้</p></section><div class="project-list">${state.projects.length?state.projects.map((p,i)=>`<div class="project-row"><div><b>${esc(p.result?.title||p.form?.topic||'ไม่มีชื่อ')}</b><div class="muted">${esc(studioById(p.studio).name)} • ${new Date(p.savedAt).toLocaleString('th-TH')}</div></div><div><button class="ghost" data-open-project="${i}">เปิด</button> <button class="danger" data-delete-project="${i}">ลบ</button></div></div>`).join(''):`<div class="empty"><div><div class="big">📁</div><h2>ยังไม่มีงานที่บันทึก</h2><p>สร้างงานจาก Studio แล้วกด “บันทึกโปรเจกต์”</p></div></div>`}</div>`;
}

function studioView(){
  const s=studioById(state.studio);
  const f=state.form;
  const status = state.health ? (state.health.openaiConfigured?'<div class="status ok">● OpenAI พร้อมใช้งาน</div>':'<div class="status error">● ยังไม่ได้ตั้ง OPENAI_API_KEY</div>'):'<div class="status">กำลังตรวจสอบระบบ...</div>';
  return `<button class="back" data-nav="explore">← กลับ Studio Explorer</button><div class="workspace"><aside class="sidepanel"><div class="studio-title"><span>${s.icon}</span><div><h2>${s.name}</h2><div class="muted">${s.cat}</div></div></div><div class="steps"><div class="step active">① ข้อมูล</div><button type="button" class="step ${state.result?'active':''}" data-action="generate">② AI สร้าง</button><div class="step ${state.result?'active':''}">③ ตรวจสอบ</div><div class="step ${state.result?'active':''}">④ พร้อมใช้</div></div>${status}<div class="field"><label>หัวข้อ / ไอเดียหลัก</label><textarea id="topic" placeholder="ตัวอย่าง: รถโม่ปูนทำปูนหกใส่รถเรา ประกันช่วยอย่างไร">${esc(f.topic)}</textarea></div><div class="field"><label>กลุ่มเป้าหมาย</label><input id="audience" value="${esc(f.audience)}"></div><div class="field"><label>เป้าหมาย</label><input id="goal" value="${esc(f.goal)}"></div><div class="two"><div class="field"><label>ความยาว</label><select id="duration">${['15 วินาที','30 วินาที','45 วินาที','60 วินาที','90 วินาที'].map(x=>`<option ${f.duration===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>จำนวนฉาก</label><select id="sceneCount">${[1,2,3,4,5,6,8,10,12].map(x=>`<option ${Number(f.sceneCount)===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="two"><div class="field"><label>อัตราส่วน</label><select id="ratio">${['9:16','16:9','1:1','4:5'].map(x=>`<option ${f.ratio===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>แพลตฟอร์ม</label><select id="platform">${['TikTok / Facebook Reels','YouTube Shorts','YouTube','Facebook','Instagram'].map(x=>`<option ${f.platform===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><label>โทน</label><input id="tone" value="${esc(f.tone)}"></div><div class="field"><label>ข้อมูลเพิ่มเติม / เงื่อนไข</label><textarea id="details" placeholder="สินค้า ราคา แบรนด์ ข้อห้าม หรือรายละเอียดเคส">${esc(f.details)}</textarea></div><div class="field"><label>ตัวละคร</label><div class="char-list">${state.chars.map((c,i)=>`<div class="char"><span><b>${esc(c.name)}</b><br><small class="muted">${esc(c.detail)}</small></span><button class="danger" data-del-char="${i}">ลบ</button></div>`).join('')}</div><button class="ghost" style="width:100%;margin-top:8px" data-action="add-char">+ เพิ่มตัวละคร</button></div><button class="primary" style="width:100%;padding:14px" data-action="generate">${state.loading?'<span class="spinner"></span> กำลังสร้าง...':'✨ สร้างชุด Prompt พร้อมใช้'}</button></aside><section class="contentpanel">${state.result?resultView():emptyResult()}</section></div>`;
}

function emptyResult(){return `<div class="empty"><div><div class="big">✨</div><h2>พร้อมสร้างงาน</h2><p>กรอกหัวข้อทางซ้าย แล้วกด “สร้างชุด Prompt พร้อมใช้”<br>ระบบจะแยกบทพูด คำขึ้นจอ Prompt ภาพ และ Prompt วิดีโอให้แต่ละฉาก</p></div></div>`}
function resultView(){
  const r=state.result;
  return `<div class="result-head"><div><h2>${esc(r.title||'โปรเจกต์ AI')}</h2><div class="muted">${esc(r.summary||'')}</div></div><div class="toolbar"><button class="ghost" data-action="save">💾 บันทึกโปรเจกต์</button><button class="ghost" data-action="download-json">⬇ JSON</button><button class="ghost" data-action="copy-all">📋 Copy ทั้งหมด</button><button class="primary" data-action="export-mp4">🎬 Export MP4 รวม</button></div></div><div class="hook"><b>HOOK</b><div>${esc(r.hook||'-')}</div></div><div class="timeline">${(r.scenes||[]).map((x,i)=>`<div class="timeline-item"><b>ฉาก ${i+1}</b><br><small>${esc(x.duration||'')}</small><div>${esc(x.scene_title||'')}</div></div>`).join('')}</div><div class="scene-list">${(r.scenes||[]).map(sceneHtml).join('')}</div><div class="hook"><b>CTA</b><div>${esc(r.final_cta||'-')}</div></div><div class="grid2"><div class="box"><b>CAPTION</b><p>${esc(r.caption||'')}</p></div><div class="box"><b>HASHTAGS</b><p>${esc((r.hashtags||[]).join(' '))}</p></div></div>`;
}
function sceneHtml(s,i){
  const m=state.sceneMedia[i]||{};
  return `<article class="scene"><div class="scene-head"><strong>🎬 ฉาก ${i+1}: ${esc(s.scene_title||'')}</strong><span class="pill">${esc(s.duration||'')}</span></div><div class="scene-body"><div class="grid2"><div class="box"><b>ภาพ / เหตุการณ์</b><p>${esc(s.visual||'')}</p></div><div class="box"><b>มุมกล้อง</b><p>${esc(s.camera||'')}</p></div><div class="box"><b>บทพูด / บทพากย์</b><p>${esc(s.dialogue||'')}</p></div><div class="box"><b>คำขึ้นจอ</b><p>${esc(s.on_screen_text||'')}</p></div></div><div class="promptbox"><b>Prompt ภาพ</b><textarea data-scene-field="image_prompt" data-i="${i}">${esc(s.image_prompt||'')}</textarea></div><div class="promptbox"><b>Prompt วิดีโอ</b><textarea data-scene-field="video_prompt" data-i="${i}">${esc(s.video_prompt||'')}</textarea></div><div class="scene-actions"><button class="ghost" data-copy-scene="${i}">📋 Copy</button><button class="ghost" data-image-scene="${i}">🖼️ สร้างภาพ</button><button class="ghost" data-tts-scene="${i}">🎙️ สร้างเสียงพากย์</button><button class="ghost" data-video-scene="${i}">🎞️ สร้างวิดีโอ</button></div>${m.loading?'<div class="status"><span class="spinner"></span> กำลังประมวลผลสื่อ...</div>':''}${m.image?`<div class="media-preview"><img src="${m.image}" alt="AI generated"></div>`:''}${m.audio?`<div class="media-preview"><audio controls src="${m.audio}"></audio><div><a class="ghost" href="${m.audio}" download="scene-${i+1}.mp3">ดาวน์โหลดเสียง</a></div></div>`:''}${m.videoId?`<div class="media-preview"><div class="status">Video Job: ${esc(m.videoId)} • ${esc(m.videoStatus||'queued')}</div>${m.videoStatus==='completed' && m.videoUrl
  ? `<div class="media-preview">
      <video controls playsinline src="${esc(m.videoUrl)}"></video>
      <a class="ghost"
         href="${esc(m.videoUrl)}"
         target="_blank"
         rel="noopener noreferrer">
         ⬇️ ดาวน์โหลด MP4
      </a>
     </div>`
  : `<button class="ghost" data-check-video="${i}">
       🔄 ตรวจสถานะวิดีโอ
     </button>`
}</div>`:''}</div></article>`;
}

function modalView(){
if(state.modal==='new')return `<div class="modal"><div class="modal-card">
<h3>✨ สร้างงานใหม่</h3>
<p class="muted">เลือก Studio และใส่หัวข้อที่ต้องการให้ AI ช่วยสร้าง</p>

<div class="field">
<label>หัวข้องาน</label>
<input id="newTopic" placeholder="เช่น คลิปขายประกันรถยนต์, คอนเทนต์ Facebook">
</div>

<div class="field">
<label>เลือก Studio</label>
<select id="newStudio">
${studios.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
</select>
</div>

<div class="toolbar" style="margin-top:14px">
<button class="primary" data-action="start-new">เริ่มสร้างงาน →</button>
<button class="ghost" data-action="close-modal">ยกเลิก</button>
</div>
</div></div>`;
  if(state.modal==='char')return `<div class="modal"><div class="modal-card"><h3>เพิ่มตัวละคร</h3><div class="field"><label>ชื่อตัวละคร</label><input id="charName" placeholder="เช่น โค้ชบอย"></div><div class="field"><label>รายละเอียด Character Lock</label><textarea id="charDetail" placeholder="เพศ อายุโดยประมาณ เสื้อผ้า ทรงผม บุคลิก รูปร่าง"></textarea></div><div class="toolbar"><button class="primary" data-action="save-char">เพิ่มตัวละคร</button><button class="ghost" data-action="close-modal">ยกเลิก</button></div></div></div>`;
  if(state.modal==='voice')return `<div class="modal"><div class="modal-card"><h3>เลือกเสียงพากย์</h3><div class="field"><label>Voice preset</label><select id="voicePreset">${voicePresets.map((v,i)=>`<option value="${i}">${v[1]}</option>`).join('')}</select></div><div class="field"><label>คำสั่งสไตล์เสียง</label><textarea id="voiceInstructions">${voicePresets[0][2]}</textarea></div><div class="toolbar"><button class="primary" data-action="voice-confirm">สร้างเสียง</button><button class="ghost" data-action="close-modal">ยกเลิก</button></div></div></div>`;
  if(state.modal==='render')return `<div class="modal"><div class="modal-card"><h3>Export MP4 ไฟล์เดียว</h3><p class="muted">ระบบจะรวมวิดีโอทุกฉาก + สร้างเสียงพากย์ใหม่จากบทพูด + ใส่คำขึ้นจอ + ผสมเพลง Background</p><div class="field"><label>เสียงพากย์</label><select id="renderVoice">${voicePresets.map((v,i)=>`<option value="${i}">${v[1]}</option>`).join('')}</select></div><div class="field"><label>สไตล์เสียง</label><textarea id="renderVoiceInstructions">${voicePresets[0][2]}</textarea></div><div class="field"><label>เพลง Background (ไม่ใส่ก็ได้)</label><input id="bgmFile" type="file" accept="audio/*"></div><div class="status">ทุกฉากต้องมีวิดีโอสถานะ completed ก่อน Export</div><div class="toolbar" style="margin-top:14px"><button class="primary" data-action="render-start">เริ่ม Export MP4</button><button class="ghost" data-action="close-modal">ยกเลิก</button></div></div></div>`;
  if(state.modal==='render-progress')return `<div class="modal"><div class="modal-card"><h3>กำลัง Export MP4</h3><div class="progressbar"><div style="width:${Number(state.renderJob?.progress||0)}%"></div></div><p>${esc(state.renderJob?.message||'กำลังประมวลผล...')}</p><div class="status">${Number(state.renderJob?.progress||0)}%</div>${state.renderJob?.status==='completed'?`<div class="toolbar" style="margin-top:14px"><a class="primary" href="/api/render/content/${encodeURIComponent(state.renderJob.id)}">⬇ ดาวน์โหลด MP4 สำเร็จรูป</a><button class="ghost" data-action="close-modal">ปิด</button></div>`:state.renderJob?.status==='failed'?`<div class="status error">${esc(state.renderJob.error||'Export ไม่สำเร็จ')}</div><button class="ghost" data-action="close-modal">ปิด</button>`:`<button class="ghost" data-action="close-modal">ซ่อนหน้าต่าง</button>`}</div></div>`;
  if(state.modal==='health')return `<div class="modal"><div class="modal-card"><h3>สถานะระบบ</h3><div class="status ${state.health?.openaiConfigured?'ok':'error'}">OpenAI API: ${state.health?.openaiConfigured?'พร้อมใช้งาน':'ยังไม่ได้ตั้งค่า'}</div>${state.health?.models?`<p class="muted">Text: ${esc(state.health.models.text)}<br>Image: ${esc(state.health.models.image)}<br>TTS: ${esc(state.health.models.tts)}<br>Video: ${esc(state.health.models.video)}</p>`:''}<button class="ghost" data-action="close-modal">ปิด</button></div></div>`;
  return '';
}

function syncForm(){ ['topic','audience','goal','tone','platform','ratio','duration','sceneCount','details'].forEach(k=>{const n=el(k);if(n)state.form[k]=k==='sceneCount'?Number(n.value):n.value}) }
async function generate(){ if(state.loading)return; syncForm(); if(!state.form.topic.trim())return toast('กรุณาใส่หัวข้อก่อน'); state.loading=true;render(); try{const resp=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...state.form,studio:state.studio,characters:state.chars})});const out=await resp.json();if(!resp.ok)throw new Error(out.error||'Generate failed');state.result=out.data;state.sceneMedia={};toast('สร้างชุด Prompt สำเร็จ')}catch(e){toast(`ผิดพลาด: ${e.message}`)}finally{state.loading=false;render()} }
function saveProject(){syncForm();state.projects.unshift({savedAt:Date.now(),studio:state.studio,form:{...state.form},chars:[...state.chars],result:state.result});persistProjects();toast('บันทึกโปรเจกต์แล้ว')}
function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function copy(text){await navigator.clipboard.writeText(text);toast('คัดลอกแล้ว')}
function sceneToText(s){return `ฉาก ${s.id||''} ${s.scene_title||''}\nบทพูด: ${s.dialogue||''}\nคำขึ้นจอ: ${s.on_screen_text||''}\nPrompt ภาพ: ${s.image_prompt||''}\nPrompt วิดีโอ: ${s.video_prompt||''}`}
async function createImage(i){const s=state.result.scenes[i];state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:true};render();try{const resp=await fetch('/api/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:s.image_prompt,size:state.form.ratio==='16:9'?'1536x1024':state.form.ratio==='1:1'?'1024x1024':'1024x1536'})});const out=await resp.json();if(!resp.ok)throw new Error(out.error||'Image failed');const src=out.b64_json?`data:image/png;base64,${out.b64_json}`:out.url;state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:false,image:src};toast('สร้างภาพสำเร็จ')}catch(e){state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:false};toast(`สร้างภาพไม่สำเร็จ: ${e.message}`)}render()}
let pendingTtsScene=null;
async function createTts(i,voiceIndex=0,instructions=null){const s=state.result.scenes[i];const v=voicePresets[voiceIndex];state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:true};render();try{const resp=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:s.dialogue,voice:v[0],instructions:instructions||v[2]})});if(!resp.ok){const out=await resp.json();throw new Error(out.error||'TTS failed')}const blob=await resp.blob();const url=URL.createObjectURL(blob);state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:false,audio:url};toast('สร้างเสียงพากย์สำเร็จ')}catch(e){state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:false};toast(`สร้างเสียงไม่สำเร็จ: ${e.message}`)}render()}
async function startVideo(i){const s=state.result.scenes[i];state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:true};render();try{const seconds=String(Math.min(12,Math.max(4,Math.round(parseInt(state.form.duration)||8)/(state.form.sceneCount||1))));const allowed=[4,8,12].reduce((a,b)=>Math.abs(b-seconds)<Math.abs(a-seconds)?b:a);const resp=await fetch('/api/video/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:s.video_prompt,seconds:String(allowed),size:state.form.ratio==='16:9'?'1280x720':'720x1280'})});const out=await resp.json();if(!resp.ok)throw new Error(out.error||'Video failed');const v=out.video||{};state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:false,videoId:v.id,videoStatus:v.status||'queued'};toast('ส่งงานสร้างวิดีโอแล้ว')}catch(e){state.sceneMedia[i]={...(state.sceneMedia[i]||{}),loading:false};toast(`สร้างวิดีโอไม่สำเร็จ: ${e.message}`)}render()}
async function checkVideo(i){
  const m=state.sceneMedia[i];
  if(!m?.videoId)return;

  state.sceneMedia[i].loading=true;
  render();

  try{
    const resp=await fetch(
      `/api/video/status/${encodeURIComponent(m.videoId)}`
    );

    const out=await resp.json();

    if(!resp.ok){
      throw new Error(out.error||'Status failed');
    }

    const video=out.video||{};

    state.sceneMedia[i]={
      ...state.sceneMedia[i],
      loading:false,
      videoStatus:video.status||'processing',
      videoUrl:video.url||state.sceneMedia[i].videoUrl||null
    };

    if(video.status==='completed'){
      toast('สร้างวิดีโอสำเร็จแล้ว');
    }else if(video.status==='failed'||video.status==='expired'){
      toast(`สร้างวิดีโอไม่สำเร็จ: ${video.error||video.status}`);
    }else{
      toast(`สถานะ: ${video.status||'processing'}`);
    }

  }catch(e){
    state.sceneMedia[i].loading=false;
    toast(`ตรวจสอบวิดีโอไม่สำเร็จ: ${e.message}`);
  }

  render();
}


async function uploadBgm(file){
  if(!file)return null;
  const resp=await fetch('/api/music/upload',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-Filename':file.name||'bgm.mp3'},body:file});
  const out=await resp.json();
  if(!resp.ok)throw new Error(out.error||'อัปโหลดเพลงไม่สำเร็จ');
  return out.id;
}

async function startFinalRender(){
  if(!state.result?.scenes?.length)return toast('ยังไม่มีฉากสำหรับ Export');
  const incomplete=state.result.scenes.some((_,i)=>state.sceneMedia[i]?.videoStatus!=='completed'||!state.sceneMedia[i]?.videoId);
  if(incomplete)return toast('กรุณาสร้างวิดีโอทุกฉากและรอให้สถานะ completed ก่อน');
  try{
    const idx=Number(el('renderVoice')?.value||0);
    const voice=voicePresets[idx]||voicePresets[0];
    const instructions=el('renderVoiceInstructions')?.value||voice[2];
    const file=el('bgmFile')?.files?.[0];
    let bgmId=null;
    if(file){ toast('กำลังอัปโหลดเพลง Background...'); bgmId=await uploadBgm(file); }
    const scenes=state.result.scenes.map((s,i)=>({videoId:state.sceneMedia[i].videoId,dialogue:s.dialogue||'',on_screen_text:s.on_screen_text||''}));
    const resp=await fetch('/api/render/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenes,voice:voice[0],voiceInstructions:instructions,bgmId,ratio:state.form.ratio})});
    const out=await resp.json();
    if(!resp.ok)throw new Error(out.error||'เริ่ม Export ไม่สำเร็จ');
    state.renderJob=out.job; state.modal='render-progress'; render();
    pollRender(out.job.id);
  }catch(e){toast(`Export ไม่สำเร็จ: ${e.message}`)}
}

async function pollRender(id){
  clearTimeout(state.renderTimer);
  try{
    const resp=await fetch(`/api/render/status/${encodeURIComponent(id)}`);
    const out=await resp.json();
    if(!resp.ok)throw new Error(out.error||'อ่านสถานะ Export ไม่สำเร็จ');
    state.renderJob=out.job;
    if(state.modal==='render-progress')render();
    if(out.job.status==='completed'){toast('Export MP4 สำเร็จ พร้อมดาวน์โหลด');return}
    if(out.job.status==='failed'){toast(`Export ไม่สำเร็จ: ${out.job.error||''}`);return}
    state.renderTimer=setTimeout(()=>pollRender(id),2000);
  }catch(e){state.renderTimer=setTimeout(()=>pollRender(id),3000)}
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{state.view=b.dataset.nav;render()});
  document.querySelectorAll('[data-studio]').forEach(b=>b.onclick=()=>{state.studio=b.dataset.studio;state.view='studio';state.result=null;state.sceneMedia={};render();checkHealth()});
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;render()});
  const search=el('search');if(search)search.oninput=e=>{state.search=e.target.value};
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
    const a=b.dataset.action;
    if(a==='new'){state.modal='new';render();return;}
    if(a==='start-new'){const topic=el('newTopic')?.value.trim();const studio=el('newStudio')?.value;if(!topic){toast('กรุณาใส่หัวข้องาน');return;}state.form.topic=topic;state.studio=studio;state.result=null;state.sceneMedia={};state.modal=null;state.view='studio';render();checkHealth();return;}
    if(a==='search'){if(search)state.search=search.value;render()}
    if(a==='generate')generate();
    if(a==='save')saveProject();
    if(a==='download-json')download(`${(state.result?.title||'project').replace(/[^\w\u0E00-\u0E7F]+/g,'-')}.json`,JSON.stringify(state.result,null,2));
    if(a==='copy-all')copy(JSON.stringify(state.result,null,2));
    if(a==='export-mp4'){state.modal='render';render()}
    if(a==='render-start')startFinalRender();
    if(a==='add-char'){state.modal='char';render()}
    if(a==='save-char'){const name=el('charName')?.value.trim();if(name){state.chars.push({name,detail:el('charDetail')?.value.trim()||''});state.modal=null;render()}}
    if(a==='close-modal'){state.modal=null;render()}
    if(a==='health'){await checkHealth();state.modal='health';render()}
    if(a==='voice-confirm'){const idx=Number(el('voicePreset').value);const ins=el('voiceInstructions').value;state.modal=null;const i=pendingTtsScene;pendingTtsScene=null;render();createTts(i,idx,ins)}
  });
  const vp=el('voicePreset');if(vp)vp.onchange=e=>{el('voiceInstructions').value=voicePresets[Number(e.target.value)][2]};
  const rvp=el('renderVoice');if(rvp)rvp.onchange=e=>{el('renderVoiceInstructions').value=voicePresets[Number(e.target.value)][2]};
  document.querySelectorAll('[data-del-char]').forEach(b=>b.onclick=()=>{state.chars.splice(Number(b.dataset.delChar),1);render()});
  document.querySelectorAll('[data-scene-field]').forEach(n=>n.onchange=()=>{state.result.scenes[Number(n.dataset.i)][n.dataset.sceneField]=n.value});
  document.querySelectorAll('[data-copy-scene]').forEach(b=>b.onclick=()=>copy(sceneToText(state.result.scenes[Number(b.dataset.copyScene)])));
  document.querySelectorAll('[data-image-scene]').forEach(b=>b.onclick=()=>createImage(Number(b.dataset.imageScene)));
  document.querySelectorAll('[data-tts-scene]').forEach(b=>b.onclick=()=>{pendingTtsScene=Number(b.dataset.ttsScene);state.modal='voice';render()});
  document.querySelectorAll('[data-video-scene]').forEach(b=>b.onclick=()=>startVideo(Number(b.dataset.videoScene)));
  document.querySelectorAll('[data-check-video]').forEach(b=>b.onclick=()=>checkVideo(Number(b.dataset.checkVideo)));
  document.querySelectorAll('[data-open-project]').forEach(b=>b.onclick=()=>{const p=state.projects[Number(b.dataset.openProject)];state.studio=p.studio;state.form={...state.form,...p.form};state.chars=p.chars||[];state.result=p.result;state.sceneMedia={};state.view='studio';render();checkHealth()});
  document.querySelectorAll('[data-delete-project]').forEach(b=>b.onclick=()=>{state.projects.splice(Number(b.dataset.deleteProject),1);persistProjects();render()});
}

render();checkHealth();
