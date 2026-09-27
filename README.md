# MentorClick AI Creation Studio v1.1

AI Creation Studio แบบ Full-stack สร้างใหม่จากศูนย์ โดยยึด workflow หลาย Studio จากเว็บอ้างอิง แต่ไม่คัดลอก source code ของเว็บนั้น

## ฟังก์ชันหลัก

- Studio Explorer 17 เครื่องมือ + Search + Category filter
- Workflow 4 ขั้น: ข้อมูล → AI สร้าง → ตรวจสอบ → พร้อมใช้
- Storyboard / Script / คำขึ้นจอ / Image Prompt / Video Prompt แยกต่อฉาก
- Character Lock เพิ่ม/ลบตัวละคร
- Timeline ต่อฉาก
- สร้างภาพผ่าน OpenAI Images API
- สร้างเสียงพากย์ผ่าน OpenAI TTS พร้อม 10 preset
- สร้างวิดีโอผ่าน OpenAI Videos API + เช็กสถานะ + ดาวน์โหลด MP4 รายฉาก
- Export MP4 รวมทั้งโปรเจกต์ด้วย FFmpeg
  - รวมวิดีโอทุกฉาก
  - สร้างเสียงพากย์จากบทพูดบน Server
  - ใส่คำขึ้นจอภาษาไทย
  - ยืดเฟรมท้ายเมื่อเสียงยาวกว่าวิดีโอ เพื่อไม่ตัดบทพากย์
  - รองรับอัปโหลดเพลง Background และ Mix อัตโนมัติ
  - Render Job มี progress/status/error จริง
  - ดาวน์โหลดไฟล์ Final MP4 เมื่อ Render สำเร็จเท่านั้น
- บันทึกโปรเจกต์ใน LocalStorage
- Export JSON / Copy Prompt
- API Key อยู่ฝั่ง Server
- Responsive ใช้งานมือถือและคอมพิวเตอร์

## รันด้วย Docker (แนะนำ)

```bash
docker build -t mentorclick-studio .
docker run --rm -p 3000:3000 -e OPENAI_API_KEY="sk-proj-..." mentorclick-studio
```

เปิด http://localhost:3000

Dockerfile จะติดตั้ง FFmpeg และฟอนต์ Noto Sans Thai ให้ครบ

## รันตรงด้วย Node

ต้องมี Node.js 20+ และ FFmpeg/ffprobe ใน PATH

```bash
export OPENAI_API_KEY="sk-proj-..."
node server.js
```

## Deploy บน Render

โปรเจกต์มี `render.yaml` และ `Dockerfile` พร้อมใช้

1. อัปโหลดโฟลเดอร์นี้ขึ้น GitHub
2. Render → New → Blueprint หรือ Web Service
3. เลือก Repository นี้
4. Runtime ใช้ Docker
5. ตั้ง Environment Variable `OPENAI_API_KEY`
6. Deploy
7. Health Check ใช้ `/api/health`

ไม่ควรใส่ API Key ลงใน GitHub หรือไฟล์ `.env` ที่ commit ขึ้น repository

## วิธี Export MP4 รวม

1. สร้าง Prompt/Storyboard
2. กดสร้างวิดีโอให้ทุกฉาก
3. รอแต่ละฉากจนสถานะเป็น `completed`
4. กด `Export MP4 รวม`
5. เลือกเสียงพากย์และสไตล์เสียง
6. เลือกเพลง Background หากต้องการ
7. กด `เริ่ม Export MP4`
8. ระบบจะแสดง progress จริง
9. เมื่อสำเร็จจะแสดงปุ่ม `ดาวน์โหลด MP4 สำเร็จรูป`

## หมายเหตุด้าน Production

Render Job และไฟล์ Render ปัจจุบันเก็บชั่วคราวใน local disk ของ container และ memory ของ process เหมาะกับ single-instance deployment หากต้องการ scale หลาย instance หรือเก็บไฟล์ถาวร ควรต่อ Redis/queue และ object storage เช่น S3/R2 ในเฟสถัดไป
