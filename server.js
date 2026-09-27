const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-5.6-luna';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const XAI_VIDEO_MODEL = process.env.XAI_VIDEO_MODEL || 'grok-imagine-video-1.5';
const publicDir = path.join(__dirname, 'public');
const renderJobs = new Map();
const musicAssets = new Map();
const workRoot = path.join(os.tmpdir(), 'mentorclick-studio');
fs.mkdirSync(workRoot, { recursive: true });

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req, maxBytes = 2_000_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}



function readBinaryBody(req, maxBytes = 30_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) { reject(new Error('payload_too_large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function requireKey(res) {
  if (!OPENAI_API_KEY) {
    send(res, 503, {
      error: 'OPENAI_API_KEY ยังไม่ได้ตั้งค่า',
      hint: 'ตั้ง Environment Variable OPENAI_API_KEY บนเครื่องหรือแพลตฟอร์ม Deploy แล้วรีสตาร์ตระบบ',
    });
    return false;
  }
  return true;
}

async function openaiJson(endpoint, options = {}) {
  const response = await fetch(`https://api.openai.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : (payload.error?.message || JSON.stringify(payload));
    throw new Error(`OpenAI ${response.status}: ${message}`);
  }
  return payload;
}



function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-4000)}`)));
  });
}

async function probeDuration(file) {
  const { stdout } = await run('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', file]);
  const n = Number(stdout.trim());
  return Number.isFinite(n) && n > 0 ? n : 8;
}

function srtEscape(text) {
  return String(text || '').replace(/\r/g, '').trim();
}

async function fetchVideoToFile(videoId, dest) {
  const id = safeId(videoId);
  if (!id) throw new Error('videoId ไม่ถูกต้อง');
  const response = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}/content`, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  });
  if (!response.ok) throw new Error(`Video download ${response.status}: ${await response.text()}`);
  fs.writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
}

async function createTtsFile(text, voice, instructions, dest) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: voice || 'coral',
      input: String(text || '').slice(0, 4096),
      instructions: instructions || 'พูดภาษาไทยชัดเจน เป็นธรรมชาติ จังหวะกระชับ',
      response_format: 'mp3',
    }),
  });
  if (!response.ok) throw new Error(`TTS ${response.status}: ${await response.text()}`);
  fs.writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
}

async function buildFinalVideo(jobId, payload) {
  const job = renderJobs.get(jobId);
  const dir = path.join(workRoot, jobId);
  fs.mkdirSync(dir, { recursive: true });
  try {
    job.status = 'processing'; job.progress = 3;
    const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
    if (!scenes.length) throw new Error('ไม่มีฉากสำหรับ Export');
    if (scenes.some(s => !s.videoId)) throw new Error('ทุกฉากต้องสร้างวิดีโอสำเร็จก่อน Export MP4');
    const segmentFiles = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      job.message = `กำลังเตรียมฉาก ${i+1}/${scenes.length}`;
      job.progress = 5 + Math.round((i / scenes.length) * 70);
      const video = path.join(dir, `scene-${i}.mp4`);
      const voice = path.join(dir, `voice-${i}.mp3`);
      const srt = path.join(dir, `scene-${i}.srt`);
      const out = path.join(dir, `segment-${i}.mp4`);
      await fetchVideoToFile(scene.videoId, video);
      await createTtsFile(scene.dialogue || '', payload.voice || 'coral', payload.voiceInstructions || '', voice);
      const vd = await probeDuration(video);
      const ad = await probeDuration(voice);
      const duration = Math.max(vd, ad + 0.2);
      const subtitle = srtEscape(scene.on_screen_text || '');
      fs.writeFileSync(srt, subtitle ? `1\n00:00:00,000 --> ${formatSrtTime(duration)}\n${subtitle}\n` : '', 'utf8');
      const width = payload.ratio === '16:9' ? 1280 : payload.ratio === '1:1' ? 1080 : 720;
      const height = payload.ratio === '16:9' ? 720 : payload.ratio === '1:1' ? 1080 : 1280;
      const vf = [
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
        `tpad=stop_mode=clone:stop_duration=${Math.max(0, duration-vd).toFixed(3)}`,
        subtitle ? `subtitles=${srt.replace(/:/g,'\\:')}:force_style='FontName=Noto Sans Thai,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00111111,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=72'` : null,
        'fps=30'
      ].filter(Boolean).join(',');
      await run('ffmpeg', ['-y','-i',video,'-i',voice,'-filter_complex',`[0:v]${vf}[v];[1:a]apad=pad_dur=${duration.toFixed(3)},atrim=0:${duration.toFixed(3)}[a]`,'-map','[v]','-map','[a]','-t',duration.toFixed(3),'-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',out]);
      segmentFiles.push(out);
    }
    job.progress = 78; job.message = 'กำลังรวม Timeline';
    const list = path.join(dir, 'concat.txt');
    fs.writeFileSync(list, segmentFiles.map(f => `file '${f.replace(/'/g,"'\\''")}'`).join('\n'));
    const joined = path.join(dir, 'joined.mp4');
    await run('ffmpeg', ['-y','-f','concat','-safe','0','-i',list,'-c','copy',joined]);
    let final = path.join(dir, 'MentorClick-Final.mp4');
    const bgm = payload.bgmId && musicAssets.get(safeId(payload.bgmId));
    if (bgm && fs.existsSync(bgm.path)) {
      job.progress = 88; job.message = 'กำลังผสมเพลง Background';
      await run('ffmpeg', ['-y','-i',joined,'-stream_loop','-1','-i',bgm.path,'-filter_complex','[0:a]volume=1.0[voice];[1:a]volume=0.12[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]','-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',final]);
    } else {
      fs.copyFileSync(joined, final);
    }
    job.status = 'completed'; job.progress = 100; job.message = 'Export MP4 สำเร็จ'; job.file = final; job.completedAt = Date.now();
  } catch (error) {
    job.status = 'failed'; job.error = error.message; job.message = 'Export ไม่สำเร็จ';
  }
}

function formatSrtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(milli).padStart(3,'0')}`;
}

function getOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n');
}

function extractJson(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error('AI ส่งผลลัพธ์กลับมาไม่ใช่ JSON ที่อ่านได้');
}

const studioDirections = {
  movie: 'สร้างหนังสั้น AI ที่มีเรื่อง ตัวละคร ฉาก บทพูด บทพากย์ และ video prompt ต่อฉาก',
  faceless: 'สร้างคลิป Faceless มี Hook บทพากย์ Timeline B-roll คำขึ้นจอ และ video prompt',
  product: 'สร้างวิดีโอสินค้า เน้นการโชว์สินค้า จุดขาย CTA และ shot list',
  tiktok: 'สร้างคลิป TikTok/Reels แนวตั้ง มี Hook 3 วินาที บทพูด ฉาก คำขึ้นจอ และ CTA',
  knowledge: 'สร้างคลิปความรู้ที่อธิบายง่าย มีประเด็นหลัก ตัวอย่าง และสรุป',
  comedy: 'สร้างคลิปตลก มี setup escalation punchline และจังหวะภาพ',
  horror: 'สร้างเรื่องผีสั้น บรรยากาศหลอน มีจุดหักมุมและเสียงประกอบ',
  cartoon: 'สร้างการ์ตูน AI มี character lock บทพูด ฉาก และ image/video prompts',
  podcast: 'สร้าง Podcast มีชื่อ ตอน opening segment main discussion closing และแนวเสียง',
  novel: 'สร้าง Blueprint เรื่อง/นิยาย มีตัวละคร ปม เรื่องย่อ และแผนตอน',
  image: 'สร้างคำสั่งภาพ AI ที่ละเอียด พร้อม style camera lighting composition negative notes',
  business: 'ช่วยงานธุรกิจด้านการขาย การตลาด โปรโมชั่น ลูกค้า และ action plan',
  content: 'สร้างคอนเทนต์ Facebook TikTok และออนไลน์ พร้อม Hook Caption CTA Hashtag',
  ebook: 'วางโครง E-book ชื่อหนังสือ กลุ่มเป้าหมาย สารบัญ บทนำ และตัวอย่างบท',
  music: 'สร้างแนวเพลง เนื้อร้องแบบต้นฉบับ โครงเพลง mood และ MV scenes',
  avatar: 'สร้าง Avatar profile และ character consistency prompts จากรายละเอียดผู้ใช้',
  basket: 'สร้างคลิปปักตะกร้า เน้น Hook ปัญหา ประโยชน์ หลักฐาน CTA และ shot list',
};

function buildPrompt(input) {
  const studio = input.studio || 'tiktok';
  const direction = studioDirections[studio] || studioDirections.tiktok;
  const sceneCount = Math.max(1, Math.min(12, Number(input.sceneCount || 3)));
  return `คุณคือ Creative Director และ Prompt Engineer ภาษาไทยระดับมืออาชีพ\n\nงาน: ${direction}\nหัวข้อ: ${input.topic || '-'}\nกลุ่มเป้าหมาย: ${input.audience || 'คนทั่วไป'}\nเป้าหมาย: ${input.goal || 'ให้เข้าใจและนำไปใช้ได้'}\nโทน: ${input.tone || 'กระชับ สมจริง น่าเชื่อถือ'}\nแพลตฟอร์ม: ${input.platform || 'TikTok / Reels'}\nอัตราส่วน: ${input.ratio || '9:16'}\nความยาวรวม: ${input.duration || '30 วินาที'}\nจำนวนฉาก: ${sceneCount}\nข้อมูลเพิ่มเติม: ${input.details || '-'}\nตัวละคร: ${JSON.stringify(input.characters || [])}\n\nกติกาสำคัญ:\n- เขียนภาษาไทยธรรมชาติ ไม่เวิ่นเว้อ\n- แยก “บทพูด/บทพากย์” ออกจาก “คำขึ้นจอ” ชัดเจน ห้ามคัดลอกกันทั้งประโยค\n- ให้ prompt ภาพและ prompt วิดีโอแต่ละฉากละเอียด ใช้งานกับ AI generator ได้ทันที\n- ความต่อเนื่องของตัวละคร เสื้อผ้า สถานที่ แสง และสไตล์ต้องสม่ำเสมอ\n- หากเป็นคำแนะนำด้านกฎหมาย/การเงิน/ประกัน ให้เขียนแบบให้ข้อมูลทั่วไปและแนะนำตรวจเงื่อนไขจริงก่อนใช้\n- หลีกเลี่ยงการกล่าวอ้างเกินจริง\n\nส่งกลับเป็น JSON เท่านั้น ตามโครงสร้างนี้:\n{\n  "title": "ชื่อโปรเจกต์",\n  "hook": "ประโยคเปิด",\n  "summary": "แนวคิดรวม",\n  "creative_direction": "ทิศทางภาพและอารมณ์",\n  "caption": "แคปชั่นพร้อมใช้",\n  "hashtags": ["#tag1", "#tag2"],\n  "scenes": [\n    {\n      "id": 1,\n      "duration": "0-10s",\n      "scene_title": "ชื่อฉาก",\n      "visual": "สิ่งที่เห็น",\n      "dialogue": "บทพูดหรือบทพากย์",\n      "on_screen_text": "คำขึ้นจอสั้นๆ",\n      "image_prompt": "prompt สร้างภาพ",\n      "video_prompt": "prompt สร้างวิดีโอ พร้อม camera movement/action/lighting",\n      "audio_direction": "แนวเสียงและ SFX",\n      "camera": "มุมกล้อง"\n    }\n  ],\n  "final_cta": "CTA ปิดท้าย",\n  "production_notes": ["ข้อควรระวัง 1", "ข้อควรระวัง 2"]\n}\nต้องมี scenes จำนวน ${sceneCount} ฉากพอดี`;
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') {
    return send(res, 200, {
      ok: true,
      openaiConfigured: Boolean(OPENAI_API_KEY),
      models: { text: OPENAI_TEXT_MODEL, image: OPENAI_IMAGE_MODEL, tts: OPENAI_TTS_MODEL, video: OPENAI_VIDEO_MODEL },
    });
  }

  if (url.pathname === '/api/generate' && req.method === 'POST') {
    if (!requireKey(res)) return;
    try {
      const input = JSON.parse(await readBody(req));
      const response = await openaiJson('/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OPENAI_TEXT_MODEL,
          input: buildPrompt(input),
        }),
      });
      const data = extractJson(getOutputText(response));
      return send(res, 200, { ok: true, data });
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }

  if (url.pathname === '/api/tts' && req.method === 'POST') {
    if (!requireKey(res)) return;
    try {
      const body = JSON.parse(await readBody(req));
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OPENAI_TTS_MODEL,
          voice: body.voice || 'coral',
          input: String(body.text || '').slice(0, 4096),
          instructions: body.instructions || 'พูดภาษาไทยชัดเจน เป็นธรรมชาติ จังหวะกระชับ',
          response_format: 'mp3',
        }),
      });
      if (!response.ok) throw new Error(`TTS ${response.status}: ${await response.text()}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length, 'Cache-Control': 'no-store' });
      return res.end(buffer);
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }

  if (url.pathname === '/api/image' && req.method === 'POST') {
    if (!requireKey(res)) return;
    try {
      const body = JSON.parse(await readBody(req));
      const payload = await openaiJson('/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt: body.prompt,
          size: body.size || '1024x1536',
          quality: body.quality || 'medium',
          output_format: 'png',
        }),
      });
      const item = payload.data?.[0] || {};
      return send(res, 200, { ok: true, b64_json: item.b64_json || null, url: item.url || null });
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }

  if (url.pathname === '/api/video/start' && req.method === 'POST') {
  if (!process.env.XAI_API_KEY) {
    return send(res, 500, { error: 'XAI_API_KEY is not configured' });
  }

  try {
    const body = JSON.parse(await readBody(req));

    const payload = {
      model: XAI_VIDEO_MODEL,
      prompt: body.prompt || '',
      duration: Number(body.seconds || 8),
      aspect_ratio: body.ratio || '9:16',
      resolution: '720p'
    };

    const response = await fetch('https://api.x.ai/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('XAI VIDEO START ERROR:', data);
      return send(res, response.status, {
        error: data?.error?.message || data?.error || 'xAI video generation failed'
      });
    }

    return send(res, 200, {
      ok: true,
      video: {
        id: data.request_id,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('VIDEO START ERROR:', error);
    return send(res, 500, { error: error.message });
  }
}
    if (!requireKey(res)) return;
    try {
      const body = JSON.parse(await readBody(req));
      const form = new FormData();
      form.set('model', body.model || OPENAI_VIDEO_MODEL);
      form.set('prompt', body.prompt || '');
      form.set('seconds', String(body.seconds || '8'));
      form.set('size', body.size || '720x1280');
      const payload = await openaiJson('/v1/videos', { method: 'POST', body: form });
      return send(res, 200, { ok: true, video: payload });
    } catch (error) {
  console.error('VIDEO START ERROR:', error);
  return send(res, 500, { error: error.message });
}
    
  

  if (url.pathname.startsWith('/api/video/status/') && req.method === 'GET') {
  if (!process.env.XAI_API_KEY) {
    return send(res, 500, { error: 'XAI_API_KEY is not configured' });
  }

  try {
    const id = decodeURIComponent(url.pathname.split('/').pop());

    const response = await fetch(
      `https://api.x.ai/v1/videos/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('XAI VIDEO STATUS ERROR:', data);
      return send(res, response.status, {
        error: data?.error?.message || data?.error || 'xAI video status failed'
      });
    }

    let status = data.status || 'pending';

    // แปลงสถานะให้ frontend เดิมใช้ต่อได้
    if (status === 'done') {
      status = 'completed';
    }

    return send(res, 200, {
      ok: true,
      video: {
        id,
        status,
        url: data?.video?.url || null,
        duration: data?.video?.duration || null,
        error:
          data.status === 'failed' || data.status === 'expired'
            ? (data?.error?.message || data?.error || data.status)
            : null
      }
    });

  } catch (error) {
    console.error('VIDEO STATUS ERROR:', error);
    return send(res, 500, { error: error.message });
  }
}
    if (!requireKey(res)) return;
    try {
      const id = encodeURIComponent(url.pathname.split('/').pop());
      const payload = await openaiJson(`/v1/videos/${id}`, { method: 'GET' });
      return send(res, 200, { ok: true, video: payload });
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }

  if (url.pathname.startsWith('/api/video/content/') && req.method === 'GET') {
    if (!requireKey(res)) return;
    try {
      const id = encodeURIComponent(url.pathname.split('/').pop());
      const response = await fetch(`https://api.openai.com/v1/videos/${id}/content`, {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      });
      if (!response.ok) throw new Error(`Video download ${response.status}: ${await response.text()}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {
        'Content-Type': response.headers.get('content-type') || 'video/mp4',
        'Content-Disposition': `attachment; filename="${id}.mp4"`,
        'Content-Length': buffer.length,
      });
      return res.end(buffer);
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }


  if (url.pathname === '/api/music/upload' && req.method === 'POST') {
    try {
      const id = crypto.randomUUID();
      const ext = ((req.headers['x-filename'] || '').toString().split('.').pop() || 'mp3').replace(/[^a-z0-9]/gi,'').slice(0,5) || 'mp3';
      const raw = await readBinaryBody(req, 30_000_000);
      const file = path.join(workRoot, `music-${id}.${ext}`);
      fs.writeFileSync(file, raw);
      musicAssets.set(id, { path: file, createdAt: Date.now() });
      return send(res, 200, { ok: true, id });
    } catch (error) { return send(res, 500, { error: error.message }); }
  }

  if (url.pathname === '/api/render/start' && req.method === 'POST') {
    if (!requireKey(res)) return;
    try {
      const payload = JSON.parse(await readBody(req, 5_000_000));
      const id = crypto.randomUUID();
      renderJobs.set(id, { id, status: 'queued', progress: 0, message: 'เข้าคิวแล้ว', createdAt: Date.now() });
      buildFinalVideo(id, payload);
      return send(res, 202, { ok: true, job: renderJobs.get(id) });
    } catch (error) { return send(res, 500, { error: error.message }); }
  }

  if (url.pathname.startsWith('/api/render/status/') && req.method === 'GET') {
    const id = safeId(url.pathname.split('/').pop());
    const job = renderJobs.get(id);
    if (!job) return send(res, 404, { error: 'Render job not found' });
    return send(res, 200, { ok: true, job: { id: job.id, status: job.status, progress: job.progress, message: job.message, error: job.error || null } });
  }

  if (url.pathname.startsWith('/api/render/content/') && req.method === 'GET') {
    const id = safeId(url.pathname.split('/').pop());
    const job = renderJobs.get(id);
    if (!job || job.status !== 'completed' || !job.file || !fs.existsSync(job.file)) return send(res, 404, { error: 'ไฟล์ MP4 ยังไม่พร้อม' });
    const stat = fs.statSync(job.file);
    res.writeHead(200, { 'Content-Type':'video/mp4', 'Content-Disposition':'attachment; filename="MentorClick-Final.mp4"', 'Content-Length': stat.size, 'Cache-Control':'no-store' });
    return fs.createReadStream(job.file).pipe(res);
  }

  return send(res, 404, { error: 'API route not found' });
}

function serveStatic(req, res, url) {
  let requestPath = decodeURIComponent(url.pathname);
  if (requestPath === '/') requestPath = '/index.html';
  const normalized = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(publicDir, normalized);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    let target = filePath;
    if (err || !stat.isFile()) target = path.join(publicDir, 'index.html');
    fs.readFile(target, (readErr, content) => {
      if (readErr) { res.writeHead(404); return res.end('Not found'); }
      const ext = path.extname(target).toLowerCase();
      const type = ({ '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg' })[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
      res.end(content);
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`MentorClick AI Studio running on http://localhost:${PORT}`);
  console.log(`OpenAI configured: ${Boolean(OPENAI_API_KEY)}`);
});
