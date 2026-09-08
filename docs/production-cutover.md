# ย้ายจาก UAT ขึ้นโดเมน production

> **อ่านตอนไหน:** วันที่ตัดสินใจว่า repo นี้จะแทนเว็บเก่าบนโดเมนหลัก
> (`muanawards.com`) แทนที่จะอยู่บน `uat.` ต่อไป
>
> เอกสารนี้ไม่ใช่ขั้นตอน deploy ทั่วไป — [`deployment.md`](deployment.md) คืออันนั้น
> ที่นี่เก็บเฉพาะสิ่งที่**เปลี่ยนเมื่อโดเมนเปลี่ยน** ซึ่งเกือบทุกข้อพังแบบไม่มีใครรู้:
> เว็บขึ้นปกติ ไม่มี error ในล็อก แล้วไปรู้ทีหลังว่าอะไรไม่ทำงานตั้งแต่วันแรก

---

## สถานะวันนี้ (8 ก.ย. 2026 — แก้บรรทัดพวกนี้เมื่อย้ายเสร็จ)

| | |
|---|---|
| repo นี้รันอยู่ที่ | `uat.muanawards.com` |
| โฟลเดอร์บนเซิร์ฟเวอร์ | `/home/automation-hub-sgp01/muan-awards` |
| พอร์ตบน host | frontend `3030`, backend `3031` (`FRONTEND_HOST_PORT` / `BACKEND_HOST_PORT` ใน `.env`) |
| `muanawards.com` ตอนนี้ | **เว็บเก่า ไม่ใช่ repo นี้** — มี Caddy block ของตัวเองอยู่แล้ว |
| Caddy | `/etc/caddy/Caddyfile` เป็นไฟล์**เขียนมือ มีหลายเว็บอยู่ในนั้น** ไม่ใช่ `Caddyfile.example` |

`Caddyfile.example` ใน repo เขียนโดเมนเป็น `muanawards.com, www.muanawards.com` อยู่แล้ว —
เขียนไว้สำหรับปลายทาง ไม่ใช่สภาพวันนี้ จึงไม่ต้องแก้ก่อนย้าย

> ⛔ **ห้าม `cp Caddyfile.example /etc/caddy/Caddyfile`** — ลบ config เว็บอื่นบนเครื่องทันที
> (`deployment.md` §3)

---

## ตัดสินใจก่อนเริ่ม: ย้ายโดเมน หรือ ตั้ง stack ใหม่

**ทางที่แนะนำ — เปลี่ยนโดเมนของ stack เดิม.** container เดิม ฐานข้อมูลเดิม
รูปเดิมใน object storage ทั้งหมดอยู่ต่อ ไม่มีการย้ายข้อมูล ไม่มี migration
สิ่งที่เปลี่ยนคือชื่อโดเมนใน Caddy กับค่าใน `.env` แล้ว build frontend ใหม่

ถ้าเลือกตั้ง stack ใหม่แยกแทน จะมีงานเพิ่มที่เอกสารนี้**ไม่ครอบคลุม**: ย้ายข้อมูล MySQL
(ดู `scripts/backup.sh` / `scripts/restore.sh`), ย้าย/แชร์ bucket, และช่วงที่สองระบบ
เขียนฐานข้อมูลคนละตัวพร้อมกัน — อย่าเลือกทางนี้ถ้าไม่มีเหตุผลชัดเจน

**เว็บเก่าต้องออกจากโดเมนก่อน** สอง Caddy block อ้างโดเมนเดียวกันไม่ได้ ต้องลบหรือ
เปลี่ยนชื่อ block ของเว็บเก่า (ย้ายไป `old.muanawards.com` ก็ได้ ถ้ายังอยากเปิดดูได้)
ใบรับรอง TLS ของ `muanawards.com` มีอยู่แล้วเพราะเว็บเก่าใช้ Caddy ตัวเดียวกัน —
ย้ายโดเมนข้าม block ใน Caddy ตัวเดิมจึงไม่ต้องขอใบใหม่

---

## 5 อย่างที่พังแบบเงียบ — เรียงจากที่แพงที่สุด

### 1. `X-Robots-Tag "noindex, nofollow"` ต้องลบออกจาก Caddy block

บรรทัดนี้อยู่ใน block UAT เพื่อกัน Google เก็บเว็บทดสอบ **ถ้าลืมลบ เว็บ production
จะไม่ถูก index เลย** — เว็บทำงานครบทุกอย่าง ผู้ใช้เข้าได้ แต่ค้นหาไม่เจอ
และไม่มีอะไรในระบบเตือน

`robots.ts` ในโค้ดอนุญาต `/` อยู่แล้ว (ห้ามแค่ `/admin`) ดังนั้น noindex มาจาก
header ของ Caddy ที่เดียว ลบบรรทัดนั้นแล้วจบ ไม่ต้องแก้โค้ด

### 2. `NEXT_PUBLIC_*` ถูกอบลงไฟล์ JS ตอน build

แก้ `.env` แล้ว `restart` **ไม่มีผล** ต้อง build ใหม่ (ดูขั้นตอนข้างล่าง)

อันตรายเพราะ**หน้าสาธารณะดูปกติสมบูรณ์** — มันเรนเดอร์ที่เซิร์ฟเวอร์และคุยกับ backend
ผ่านเน็ตเวิร์กภายใน Docker ไม่ได้ใช้ค่าพวกนี้ ที่พังคือทุกอย่างที่**เบราว์เซอร์**เรียก:
ล็อกอินหลังบ้าน, อัปโหลดรูป, ฟอร์มส่งชื่อ — ขึ้น `Failed to fetch` เฉยๆ

| ตัวแปร | ถ้าผิดจะเกิดอะไร |
|---|---|
| `NEXT_PUBLIC_API_URL` | หลังบ้านล็อกอินไม่ได้, อัปโหลดไม่ได้, ฟอร์มส่งชื่อไม่ทำงาน |
| `NEXT_PUBLIC_SITE_URL` | ป้อน **5 ที่**: `robots.ts` (URL ของ sitemap), `sitemap.ts`, `layout.tsx` (`metadataBase` → OG tag ที่ Facebook อ่าน), `structured-data.tsx` (JSON-LD ทุกหน้า), `llms.txt` — ผิดแล้วลิงก์แชร์และ structured data ชี้โดเมนเก่าทั้งเว็บ |
| `NEXT_PUBLIC_GA_ID` | `.env.example` บอกให้ว่างทุกที่ยกเว้น production — **วันย้ายคือวันที่ต้องใส่ค่าจริง** ไม่ใส่ = ไม่มีสถิติเลย |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | ปกติไม่ต้องเปลี่ยน (object storage คนละโดเมนกับเว็บ) แต่ค่านี้ตัดสินว่า `next/image` ดึงรูปจาก host ไหนได้ — ผิดแล้ว**รูปหายทั้งเว็บ** |

### 3. `CORS_ORIGINS` ต้องเป็นโดเมนใหม่

`bootstrap.ts` ใช้ whitelist ตรงตัว ไม่มี wildcard และห้ามเป็น `*` เพราะ refresh cookie
ต้องส่งพร้อม credentials ผิดตัวนี้ = หลังบ้านล็อกอินไม่ได้ (คนละสาเหตุกับข้อ 2
แต่อาการเหมือนกัน — เช็คทั้งสองอย่าง)

### 4. เว็บกับ API ต้องอยู่ hostname เดียวกัน

refresh cookie เป็น `SameSite=Lax` และ scope ที่ `/api/v1/auth` ถ้าแยกเว็บกับ API
เป็นสองโดเมน เบราว์เซอร์จะทิ้ง cookie แล้วแอดมินหลุดทุกครั้งที่ reload

โครง block ปัจจุบัน (`handle /api/*` + `handle` ในโดเมนเดียว) ถูกอยู่แล้ว —
คัดลอกโครงเดิมไปโดเมนใหม่ อย่าแยก API ออกเป็น `api.muanawards.com`

### 5. ตรวจ `SETUP_ENABLED=false`

ควรเป็น `false` อยู่แล้วหลังสร้างแอดมินคนแรก ถ้าเป็น `true` และในระบบยังไม่มี
SUPER_ADMIN ใครก็สร้างแอดมินคนแรกได้ — ตรวจอีกครั้งตอนขึ้นโดเมนที่คนเห็นจริง

---

## ขั้นตอน

```bash
cd /home/automation-hub-sgp01/muan-awards

# 1. แก้ .env — ทุกตัวที่โดเมนเกี่ยว
#    NEXT_PUBLIC_API_URL=https://muanawards.com/api/v1
#    NEXT_PUBLIC_SITE_URL=https://muanawards.com
#    NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX        ← ใส่ค่าจริงวันนี้
#    CORS_ORIGINS=https://muanawards.com,https://www.muanawards.com
#    SETUP_ENABLED=false
nano .env

# 2. build ใหม่ทั้ง frontend — --build อย่างเดียวไม่พอถ้า image ยังถูก cache
BUILDKIT_PROGRESS=plain docker compose up -d --build --force-recreate frontend
docker compose up -d --build backend        # CORS_ORIGINS อ่านตอนรัน แต่ recreate ให้ชัวร์
```

```bash
# 3. Caddy — เอาเว็บเก่าออกจากโดเมนก่อน แล้วเปลี่ยนชื่อ block ของเรา
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%F)
sudo nano /etc/caddy/Caddyfile
#   ก. block เว็บเก่า: ลบ หรือเปลี่ยนโดเมนเป็น old.muanawards.com
#   ข. block ของเรา: uat.muanawards.com → muanawards.com, www.muanawards.com
#   ค. block ของเรา: ลบ X-Robots-Tag "noindex, nofollow"  ← ข้อ 1
#   ง. ที่เหลือคงเดิม — พอร์ต 3030/3031, handle_errors, header block

sudo caddy validate --config /etc/caddy/Caddyfile
sudo caddy reload --config /etc/caddy/Caddyfile
```

> `caddy reload` ไม่ใช่ `systemctl reload caddy` — ตัวหลังกลืน error แล้วคืน exit 0
> ทั้งที่ config ถูกปฏิเสธ (`deployment.md` §3)

---

## ตรวจหลังย้าย — ห้ามข้าม

```bash
# ค่าที่อบไว้ใน JS จริง ต้องได้โดเมนใหม่ค่าเดียว
curl -s https://muanawards.com/admin/login \
  | grep -oE '/_next/static/chunks/[a-zA-Z0-9_.-]+\.js' | sort -u \
  | while read c; do curl -s "https://muanawards.com$c" \
      | grep -ohE 'https?://[a-zA-Z0-9.:_-]+/api/v1'; done | sort -u
```

```bash
# noindex หายแล้วจริง — บรรทัดนี้ต้อง "ไม่มี" output
curl -sI https://muanawards.com | grep -i x-robots-tag

# header ความปลอดภัยยังอยู่ครบ
curl -sI https://muanawards.com | grep -iE "frame|content-security|strict-transport|nosniff"

# sitemap และ robots ชี้โดเมนใหม่
curl -s https://muanawards.com/robots.txt
curl -s https://muanawards.com/sitemap.xml | head -5
```

แล้วเช็คด้วยมือ:

| เช็ค | ทำไม |
|---|---|
| ล็อกอินหลังบ้าน แล้ว **reload หน้า** | ยังอยู่ในระบบ = refresh cookie ทำงาน (ข้อ 3, 4) |
| อัปโหลดรูป 1 รูป | เบราว์เซอร์ยิง API ได้ (ข้อ 2) |
| ส่งชื่อจากฟอร์มสาธารณะ 1 ครั้ง | เส้นทางที่ผู้ใช้จริงใช้ |
| แชร์ลิงก์หน้าปีลงแชต | รูป OG ขึ้น = `metadataBase` ถูก |
| เปิด `https://muanawards.com/muan/faq` | redirect ไป `/about` — legacy redirect ใน `next.config.ts` เพิ่งเริ่มมีความหมายวันนี้ |
| รูปบนหน้าแรกขึ้นครบ | `NEXT_PUBLIC_IMAGE_BASE_URL` ถูก |

หลังทุกอย่างผ่าน: ส่ง sitemap เข้า Google Search Console — เพิ่งเปิดให้ index วันนี้เป็นวันแรก

---

## ถ้าต้องถอย

Caddy คือสวิตช์ที่เร็วที่สุด — คืน block เดิมแล้ว reload เว็บกลับไปที่เว็บเก่าทันที
ไม่ต้องแตะ container:

```bash
sudo cp /etc/caddy/Caddyfile.bak-<วันที่> /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo caddy reload --config /etc/caddy/Caddyfile
```

ถ้าปัญหาอยู่ที่ค่าที่อบใน JS ให้แก้ `.env` กลับแล้ว
`docker compose up -d --build --force-recreate frontend` — ฐานข้อมูลไม่ถูกแตะในทุกกรณี
เพราะการย้ายโดเมนไม่มี migration

**สิ่งเดียวที่ถอยไม่ได้ง่าย** คือถ้า Google เก็บหน้าเว็บไปแล้วระหว่างที่ config ผิด —
เช่นเปิด index ทั้งที่ `NEXT_PUBLIC_SITE_URL` ยังเป็น `uat.` ทำให้ canonical URL
ทั้งเว็บชี้โดเมนทดสอบ นี่คือเหตุผลที่ข้อ 1 กับข้อ 2 ต้องถูก**ก่อน** ลบ noindex
