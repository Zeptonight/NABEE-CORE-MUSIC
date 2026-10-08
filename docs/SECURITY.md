# Security Model — NABEE CORE

## Authentication
- **GitHub OAuth เท่านั้น** — ไม่มี public registration / username+password / default admin / guest
- Owner ตรวจสอบจาก **immutable numeric GitHub user ID** (`GITHUB_OWNER_ID`) ไม่ใช้ username
- บทบาท: `owner` > `admin` > `user` (read-only) — ทุก endpoint ตรวจสิทธิ์**ฝั่ง server** ทุกคำขอ

## Session
- Session id = `sha256(pepper + ':' + random_token)` — DB leak เพียงอย่างเดียวสร้าง session ปลอมไม่ได้ (pepper มาจาก scrypt ของ root secret นอก DB)
- Cookie: `httpOnly`, `SameSite=Lax`, `Secure` (production), TTL 7 วัน, revoke ได้ทั้งหมดจากหน้าความปลอดภัย
- ทุก login สร้าง session ใหม่ (rotation) + บันทึก audit

## CSRF
- Double-submit: cookie `nbee_csrf` (ไม่ httpOnly) ต้องตรงกับ header `x-csrf-token` ในทุก POST/PUT/DELETE ของ `/api/*` (ยกเว้น `/api/auth/*` ซึ่งเป็น GET redirect และมี `state` parameter ของ OAuth คุมอยู่)
- ซ้อนกันสองชั้นกับ `SameSite=Lax`

## Secrets / Credentials
- เข้ารหัส **AES-256-GCM** (key มาจาก scrypt ของ root secret) — เก็บ `iv|tag|ciphertext`
- UI แสดงเฉพาะ mask (••••+4 ตัวท้าย) — plaintext **ไม่เคย**ออกจาก server
- Add / Update / Rotate / Disable / Delete / Test พร้อม **audit log ทุกครั้ง**

## Injection / XSS
- SQL ทั้งหมด parameterized (ไม่มี string concatenation)
- React escape ตามค่าเริ่มต้น + CSP strict: `default-src 'self'`, `script-src 'self'`, `connect-src 'self'` (อนุญาตเฉพาะ fonts.googleapis.com / fonts.gstatic.com / CDN รูปภาพที่จำเป็น)

## Headers
`X-Content-Type-Options: nosniff` • `Referrer-Policy: no-referrer` • `Permissions-Policy` (ปิดกล้อง/ไมค์/GPS) • `Content-Security-Policy` • HSTS (production) • `X-Frame-Options: DENY` เมื่อไม่ได้เปิด `ALLOW_IFRAME` (โหมด preview/sandbox เปิดไว้เพื่อ embed ได้)

## Rate limiting
- Global: 300 คำขอ/นาที ต่อ IP
- OAuth start/callback: 20 ครั้ง/15 นาที

## OAuth hardening
- `state` random ≥16 chars, เก็บใน httpOnly cookie 10 นาที, เทียบแบบ timing-safe, ใช้ครั้งเดียว (clear ทันที)
- `allow_signup=false`
- Callback ตรวจ `error` จาก GitHub ก่อนแลก code

## Database
- SQLite โหมด dev ใช้ WAL; PostgreSQL เมื่อตั้ง `DATABASE_URL` — ทั้งคู่เป็น disk-backed database จริง
- Backups: dump JSON ทั้ง 9 ตาราง (owner only, audit ทุกการดาวน์โหลด)

## ข้อจำกัดที่ควรทำเพิ่มใน production จริง
- ตั้ง `SESSION_SECRET` ที่ harden (ปัจจุบัน auto-generate + persist ใน `.data/secret.key` chmod 600 แล้ว)
- รันหลัง reverse proxy ที่ terminate TLS
- เปลี่ยน `ALLOW_IFRAME=0`
