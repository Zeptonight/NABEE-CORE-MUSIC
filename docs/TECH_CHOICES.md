# Technology Selection — NABEE CORE

เปรียบเทียบทางเลือกจริงก่อนเขียนโค้ด (ตามข้อบังคับ ZERO GUESSING — เวอร์ชันทุกตัวตรวจสอบจาก npm registry ณ วันติดตั้ง)

## 1. Backend Framework

| เกณฑ์ | Option A: **Fastify 5.12** | Option B: Express 5 | Option C: NestJS 11 |
|---|---|---|---|
| Security | plugin ทางการครบ (cookie, rate-limit, static) | ต้องประกอบเองทั้งหมด | ครบแต่ผ่าน layer เพิ่ม |
| Performance | ตัวเร็วสุดในกลุ่ม (schema-based serialization) | ช้ากว่า | ช้ากว่า (overhead DI) |
| Reliability | TypeScript-first, hooks ชัดเจน | stable แต่ legacy patterns | stable |
| Maintenance | ขนาดเล็ก อ่านจบ | เล็ก | ใหญ่ boilerplate มาก |
| Documentation | ชัดเป็นระบบ | ดี | ดี |
| Production readiness | สูง | สูง | สูง |

**เลือก Fastify** — security plugin ทางการ + ประสิทธิภาพ + เหมาะกับขนาดโปรเจกต์นี้

## 2. Frontend

| เกณฑ์ | Option A: **Vite 7 + React 19 + CSS เขียนเอง** | Option B: Next.js 15 |
|---|---|---|
| Pixel control ของ UI | เต็ม 100% (ไม่มี styling framework บังคับโครง) | เต็มเช่นกัน |
| ความเหมาะสม | SPA หลัง login ไม่ต้องการ SSR/SEO | SSR เกินความจำเป็น, โครงหนัก |
| Bundle | เล็ก (355 KB raw / 105 KB gzip) | ใหญ่กว่า |
| Build/test tooling | เร็วมาก | ดี |

**เลือก Vite + React** — dashboard ภายใต้ authentication ไม่ต้องใช้ SSR และคุมดีไซน์จากภาพได้ 1:1 (CSS เขียนเองทั้งหมด ไม่ใช้ UI kit ภายนอก)

## 3. Database

| เกณฑ์ | Option A: **PostgreSQL 16** | Option B: SQLite (node:sqlite ในตัว Node 22) |
|---|---|---|
| Concurrency | ระดับ production, multi-instance | กระบวนการเดียว |
| ความเหมาะกับโจทย์ในภาพ | ภาพระบุ PostgreSQL 16.2 | — |
| Zero-config dev | ต้อง provisioning | ทำงานทันที |

**เลือกทั้งคู่อย่างตรงไปตรงมา:** ถ้าตั้ง `DATABASE_URL` → PostgreSQL (ผ่าน `pg`, schema เดียวกัน); ถ้าไม่ตั้ง → SQLite จริง (ไม่ใช่ mock/in-memory) เพื่อให้ระบบใช้งานได้จริงทันทีทุกสภาพแวดล้อม ทุก query เป็น parameterized และ schema ถูกสร้างด้วย DDL คู่กันทั้งสอง dialect

## 4. Music Engine

| เกณฑ์ | Option A: **@discordjs/voice 0.19 + play-dl + ffmpeg** | Option B: Lavalink v4 |
|---|---|---|
| Dependencies | Node process เดียว | ต้องรัน Java server แยก |
| Filters | ผ่าน ffmpeg `-af` (bass boost, HQ) ควบคุมเองได้เต็ม | มีให้พร้อม |
| Reliability | ขึ้นกับ provider (youtube) — มี error surfacing ตรงไปตรงมา | แข็งแรงกว่า |
| Production readiness | เหมาะกับสเกลกลาง | เหมาะสเกลใหญ่ |

**เลือก @discordjs/voice** — ไม่มี external dependency, pipeline: source stream → ffmpeg (filters) → s16le 48k stereo → volume transformer → Opus; source เปลี่ยนได้ผ่าน interface `source.ts` (สลับไป Lavalink ภายหลังได้โดยไม่แตะ engine)

## 5. Authentication

GitHub OAuth App (authorization code flow) ตามเอกสารทางการของ GitHub:
- `GET github.com/login/oauth/authorize` พร้อม `state` แบบ random (ป้องกัน CSRF ของ OAuth)
- `POST github.com/login/oauth/access_token` (Accept: application/json)
- `GET api.github.com/user` → **numeric `id` เท่านั้น** ที่ใช้ตรวจสิทธิ์ Owner (ผ่าน `GITHUB_OWNER_ID`) — ไม่ใช้ username เพราะเปลี่ยนได้

## เวอร์ชันที่ใช้ (ตรวจจาก registry จริง)

fastify 5.12.5 • @fastify/cookie 11.1.2 • @fastify/rate-limit 11.2.0 • @fastify/static 10.1.5 • discord.js 14.27.0 • @discordjs/voice 0.19.2 • libsodium-wrappers 0.8.4 • play-dl 1.9.7 • pg 8.16.3 • react 19.3.0 • react-router-dom 7.18.4 • vite 7.3.1 • typescript 5.9.3 • vitest 5.0.3
