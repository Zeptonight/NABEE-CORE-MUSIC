# Setup — NABEE CORE

## ความต้องการ
- Node.js ≥ 22.13 (ใช้ `node:sqlite` ในตัวเมื่อไม่ตั้ง DATABASE_URL)
- ffmpeg (สำหรับเสียง/ฟิลเตอร์) — ระบุที่ `FFMPEG_PATH` หรือให้อยู่ใน PATH หรือติดตั้ง `ffmpeg-static`

## รันในเครื่อง (โหมด dev)
```bash
npm install
npm run dev:server   # API + บอท ที่ :8787 (tsx watch)
npm run dev:web      # Vite dev server ที่ :5173 (proxy /api → 8787)
```

## Build + รัน production
```bash
npm run build        # build web → web/dist, build server → server/dist
npm start            # serve ทุกอย่างที่ :8787
npm test             # vitest (security/db/api)
```

## Environment Variables (.env.example)
| ตัวแปร | จำเป็น | ความหมาย |
|---|---|---|
| `PORT` / `HOST` | ไม่ | default 8787 / 0.0.0.0 |
| `BASE_URL` | **ใช่ เพื่อ login** | URL สาธารณะ เช่น https://8787-xxxx.e2b.app (ใช้สร้าง OAuth redirect_uri) |
| `SESSION_SECRET` | แนะนำ | ถ้าไม่ตั้ง ระบบจะ generate + persist ใน .data/secret.key |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | **ใช่ เพื่อ login** | จาก GitHub OAuth App (callback: `${BASE_URL}/api/auth/github/callback`) |
| `GITHUB_OWNER_ID` | **ใช่ เพื่อสิทธิ์ Owner** | **numeric** GitHub user id (api.github.com/user → `id`) |
| `DISCORD_TOKEN` / `DISCORD_CLIENT_ID` | สำหรับบอท | จาก Discord Developer Portal (scopes: bot + applications.commands) |
| `DATABASE_URL` | ไม่ | ตั้งเพื่อใช้ PostgreSQL; ไม่ตั้ง = SQLite ที่ .data/nabee.db |
| `ALLOW_IFRAME` | ไม่ | เปิดเฉพาะเมื่อ embed ใน sandbox preview |
| `FFMPEG_PATH` | ไม่ | path ของ ffmpeg |

## การตั้งค่า GitHub OAuth App
1. github.com → Settings → Developer settings → OAuth Apps → New
2. Homepage URL = `BASE_URL`, Authorization callback URL = `${BASE_URL}/api/auth/github/callback`
3. นำ Client ID / Client Secret มาตั้งค่า env หรือเพิ่มผ่านหน้า **API & Credentials** (key: `github:client_id`, `github:client_secret`)
4. หา numeric id ของคุณ: `curl -s https://api.github.com/users/<login> | grep '"id"'` → ตั้ง `GITHUB_OWNER_ID`

## การตั้งค่า Discord Bot
1. Discord Developer Portal → Applications → Bot → Reset Token → `DISCORD_TOKEN`
2. OAuth2 → scopes `bot` + `applications.commands`
3. สิทธิ์ขั้นต่ำ: View Channels, Send Messages, Embed Links, Connect, Speak
4. invite ด้วย URL จาก OAuth2 URL Generator → เข้าช่องเสียง → ใช้ `/play`

> บอทจะออนไลน์เฉพาะเครือข่ายที่เข้าถึง `gateway.discord.gg` ได้ — หากเครือข่ายปิด แผงควบคุมจะแสดงสถานะ **NOT CONFIGURED / OFFLINE** ตามความจริง (ไม่มีข้อมูลปลอม)

## Docker (PostgreSQL)
```bash
docker compose up -d postgres
DATABASE_URL=postgres://nabee:nabee@localhost:5432/nabee npm start
```
