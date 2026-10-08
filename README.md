# NABEE CORE — MUSIC

**Production-Grade Discord Music Bot + Web Control Platform**

แผงควบคุมเว็บสำหรับบอทดิสคอร์ดเพลง NABEE HEX TEAM — โครงสร้าง UI ถูกสร้างตรงตามภาพออกแบบต้นฉบับ (หน้าแรก: hero banner, สถานะบอท, สถิติรวม, การ์ดระบบ 5 ตัว, เครื่องเล่นเพลง + ฟิลเตอร์เสียง, คิวเพลง, เซิร์ฟเวอร์, กิจกรรมล่าสุด, องค์ประกอบระบบ, กราฟทรัพยากร, สถานะซิสเทม) พร้อม responsive layout ตาม mockup แท็บเล็ต/มือถือในภาพเดียวกัน

## ความสามารถจริง (ไม่มี mock / ไม่มี fake data)
- **GitHub Login** — OAuth flow จริง, Owner ตรวจด้วย `GITHUB_OWNER_ID` (numeric id)
- **Discord Bot** — discord.js v14, slash commands (`/play /skip /queue /volume /filter ...`)
- **Music Engine** — @discordjs/voice + play-dl + ffmpeg filters (บาสบูสต์, เสียงคุณภาพสูง), queue persist ใน DB
- **Live Metrics** — CPU / RAM / Database latency / Disk / Network วัดจากระบบจริงทุก 2 วินาที ผ่าน SSE
- **Credentials** — เข้ารหัส AES-256-GCM, mask ใน UI, test/rotate/disable/delete + audit
- **Users / Permissions / Logs / Sessions / Backups / Webhooks / Embeds** — ทำงานจริงทั้งหมด
- สถานะที่ยังไม่ได้ตั้งค่าจะแสดง **NOT CONFIGURED / OFFLINE / NO DATA** ตามความจริง

## เอกสาร
- [docs/TECH_CHOICES.md](docs/TECH_CHOICES.md) — เปรียบเทียบและเหตุผลการเลือกเทคโนโลยี
- [docs/SECURITY.md](docs/SECURITY.md) — โมเดลความปลอดภัยทั้งหมด
- [docs/SETUP.md](docs/SETUP.md) — การติดตั้ง/ตั้งค่า OAuth/Bot/DB

## Quick start
```bash
npm install
npm run build && npm start   # → http://localhost:8787
```

Stack: Fastify 5 • React 19 + Vite 7 • discord.js 14 + @discordjs/voice • PostgreSQL 16 (หรือ SQLite ในตัว) • ศิลป์ทั้งหมดเป็น SVG ที่เขียนด้วยโค้ด
