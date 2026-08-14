# การขึ้นเซิร์ฟเวอร์จริง (Deployment)

> **สถานะความมั่นใจ:** compose ทั้งสองไฟล์ผ่าน `docker compose config` และทุกตัวแปรถูกส่งครบ
> แต่ **`docker compose up` ยังไม่เคยถูกรันจริง** เพราะเครื่องที่พัฒนาไม่มี docker daemon
> เอกสารนี้จึงเป็นลำดับขั้นตอน + จุดที่ต้องหยุดตรวจ ไม่ใช่บันทึกการ deploy ที่สำเร็จแล้ว

---

## ก่อนเริ่ม

| ต้องมี | หมายเหตุ |
|---|---|
| เซิร์ฟเวอร์ Linux + Docker + Docker Compose | Caddy ติดตั้งอยู่แล้วบนเครื่อง |
| โดเมน `muanawards.com` ชี้มาที่ IP เซิร์ฟเวอร์ | ต้องชี้ก่อน Caddy จะขอใบรับรอง TLS ได้ |
| DigitalOcean Spaces (หรือ S3 ที่เข้ากันได้) | สร้าง bucket + ตั้งให้อ่านสาธารณะได้ |

---

## 1. เตรียม `.env`

```bash
cp .env.example .env
```

สร้างความลับสองตัว **คนละค่า** — ระบบจะไม่ยอมสตาร์ทถ้าสั้นกว่า 32 ตัวอักษร:

```bash
openssl rand -base64 48   # → JWT_SECRET
openssl rand -base64 48   # → REFRESH_TOKEN_SECRET
openssl rand -base64 32   # → REVALIDATE_SECRET
```

**จุดที่พลาดกันบ่อย** — สามตัวนี้ต้องเป็นค่าของ production ไม่ใช่ค่าตัวอย่าง:

| ตัวแปร | ค่าตอน dev | ค่าที่ต้องเป็นบน production |
|---|---|---|
| `S3_ENDPOINT` | `http://minio:9000` | `https://sgp1.digitaloceanspaces.com` (หรือ region ที่ใช้) |
| `S3_PUBLIC_URL` | `http://localhost:9000/muan-awards` | URL ของ CDN เช่น `https://muan.sgp1.cdn.digitaloceanspaces.com` |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | เหมือน `S3_PUBLIC_URL` | **ต้องตรงกับ `S3_PUBLIC_URL`** |

> `NEXT_PUBLIC_*` ถูก **ฝังตอน build** ไม่ใช่ตอนรัน — แก้แล้วต้อง `docker compose build` ใหม่
> และ `NEXT_PUBLIC_IMAGE_BASE_URL` ยังเป็นตัวกำหนดว่า `next/image` ยอมดึงรูปจากโฮสต์ไหน
> ถ้าตั้งผิด รูปจะขึ้น 400 ทั้งเว็บ

ตัวที่เหลือ:

```bash
NEXT_PUBLIC_API_URL=https://muanawards.com/api/v1
NEXT_PUBLIC_SITE_URL=https://muanawards.com
CORS_ORIGINS=https://muanawards.com,https://www.muanawards.com
SETUP_ENABLED=true     # เปิดไว้แค่รอบแรก
DATABASE_URL="mysql://muan:<รหัสจริง>@mysql:3306/muan_awards"
```

---

## 2. ขึ้นระบบ

```bash
docker compose up -d --build
docker compose ps            # ทั้งสามต้องเป็น running / healthy
docker compose logs -f backend
```

Migration รันเองตอน container สตาร์ท (`prisma migrate deploy` อยู่ใน `CMD`) — ไม่ต้องสั่งเอง

> **ถ้า build เว็บตอน API ยังไม่ขึ้น** หน้าที่เป็น static (`/`, `/winners`, `/about`, `/submit`)
> จะถูกอบตอนที่ยังไม่มีข้อมูล — build ไม่ error (ตั้งใจให้ build ได้โดยไม่ต้องมี DB)
> แต่หน้าจะว่างจนกว่าจะ revalidate รอบถัดไป (60 วิ) **ถ้าเห็นหน้าแรกว่างหลัง deploy
> ให้ยิง `POST /api/revalidate` ตามข้อ 6 แทนที่จะ build ใหม่ทั้งหมด**
>
> ส่วนหน้าปี/สาขา/โปรไฟล์ ไม่ถูกอบไว้ — ถ้า API ล่ม หน้าพวกนี้จะขึ้น **500 (ลองใหม่ภายหลัง)**
> ไม่ใช่ 404 โดยตั้งใจ เพราะ 404 จะทำให้ Google ถอดหน้าออกจากดัชนีถาวร

---

## 3. ตั้ง Caddy

```bash
sudo cp Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile        # แก้โดเมนให้ตรง
sudo caddy reload --config /etc/caddy/Caddyfile
```

Caddy ขอใบรับรอง TLS เองอัตโนมัติ

---

## 4. เช็กลิสต์หลัง deploy — หยุดตรวจทีละข้อ

```bash
# ── ระบบขึ้นแล้วจริง ──
curl -s https://muanawards.com/api/v1/health
#   คาดหวัง: {"data":{"status":"ok",...}}

# ── หน้าเว็บเสิร์ฟได้ ──
curl -s -o /dev/null -w '%{http_code}\n' https://muanawards.com/
curl -s https://muanawards.com/robots.txt
curl -s https://muanawards.com/sitemap.xml | head -5

# ── 301 จาก URL เก่ายังทำงาน (ข้อ 9) ──
for u in /muan/our-projects /muan/about-us /muan/faq /muan/contact; do
  printf '%-22s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "https://muanawards.com$u")"
done
#   คาดหวัง: 301 ทุกอัน
```

**IP ของผู้ใช้ต้องอ่านได้ถูก** — ถ้าอ่านผิด rate limit ของฟอร์มจะใช้ถังเดียวกันทั้งประเทศ
และ `ipHash` จะเหมือนกันหมดจนไร้ความหมาย:

```bash
docker compose logs backend | grep -i "trust proxy" || true
# ทดสอบตรงๆ: ยิงฟอร์มเกิน 10 ครั้งใน 1 นาทีจากเครื่องเดียว ต้องได้ 429
# แล้วลองจากเน็ตอื่น (มือถือ) ต้องยังส่งได้ — ถ้าโดน 429 ด้วย แปลว่า trust proxy ไม่ทำงาน
```

**อัปโหลดรูปจริง** (จุดที่พังบ่อยที่สุดเพราะ CORS ของ bucket):

1. เข้า `/admin` → คลังครีเอเตอร์ → เพิ่มคน → อัปโหลดรูป
2. รูปต้องขึ้นทันทีในหน้าแก้ไข
3. ถ้าไม่ขึ้น: เปิด DevTools ดู request `PUT` ไป Spaces — มักเป็น **CORS ของ bucket**
   ต้องอนุญาต `PUT` จาก `https://muanawards.com`

**รูปถูกย่อจริง** (ข้อ 10):

```bash
curl -s -o /dev/null -w '%{content_type} %{size_download}\n' \
  -H 'Accept: image/avif,image/webp,*/*' \
  'https://muanawards.com/_next/image?url=<URL รูปที่ encode แล้ว>&w=640&q=75'
#   คาดหวัง: image/avif และเล็กกว่าไฟล์ต้นฉบับมาก
#   ถ้าได้ 400 → NEXT_PUBLIC_IMAGE_BASE_URL ไม่ตรงกับโฮสต์จริงของรูป ต้อง build ใหม่
```

**แคสล้างทันทีตอนกดบันทึก** (ข้อ 9):

1. `/admin/site` → แก้ข้อความแบรนด์ → บันทึก
2. เปิดหน้าแรกใหม่ภายใน 5 วินาที — ข้อความต้องเปลี่ยนแล้ว
3. ถ้าไม่เปลี่ยน: `REVALIDATE_SECRET` ของสอง container ไม่ตรงกัน
   ดู `docker compose logs backend | grep "refresh the site"`

---

## 5. สร้างบัญชีผู้ดูแลคนแรก แล้วปิดประตู

1. เปิด `https://muanawards.com/admin/setup`
2. กรอกอีเมล + รหัสผ่าน (อย่างน้อย 12 ตัวอักษร)
3. **ตั้ง `SETUP_ENABLED=false` ใน `.env` แล้ว `docker compose up -d backend`**

> API ปฏิเสธการสร้าง super admin คนที่สองอยู่แล้วแม้ไม่ปิดแฟลก แต่ปิดไว้เป็นชั้นที่สอง

---

## 6. สำรองข้อมูล — **ยังไม่ได้ทำ ต้องตั้งเอง**

ยังไม่มีระบบสำรองข้อมูลอัตโนมัติในโปรเจกต์นี้ ตัวอย่างที่ใช้ได้ทันที:

```bash
# /etc/cron.daily/muan-backup
docker compose -f /srv/muan/docker-compose.yml exec -T mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" muan_awards \
  | gzip > /srv/backups/muan-$(date +%F).sql.gz
find /srv/backups -name 'muan-*.sql.gz' -mtime +30 -delete
```

รูปภาพอยู่บน Spaces ซึ่งมีความทนทานของตัวเอง แต่ **ไม่มี version history**
ถ้าลบผิดคือหายถาวร — ควรเปิด versioning ที่ bucket

---

## เมื่อมีอะไรผิดพลาด

| อาการ | ตรวจตรงไหน |
|---|---|
| API ไม่ขึ้นเลย | `docker compose logs backend` — มักเป็น `JWT_SECRET` สั้นกว่า 32 ตัว หรือ `DATABASE_URL` ผิด |
| เข้าเว็บได้แต่หลังบ้านล็อกอินแล้วเด้งออก | `CORS_ORIGINS` ไม่มีโดเมนจริง หรือเข้าผ่าน `www.` ที่ไม่ได้ใส่ไว้ |
| รูปขึ้น 400 ทั้งเว็บ | `NEXT_PUBLIC_IMAGE_BASE_URL` ไม่ตรงกับโฮสต์รูป → ต้อง build ใหม่ |
| อัปโหลดรูปไม่ผ่าน | CORS ของ bucket ไม่อนุญาต `PUT` จากโดเมนเว็บ |
| หน้าเว็บไม่อัปเดตหลังกดบันทึก | `REVALIDATE_SECRET` สองฝั่งไม่ตรงกัน |
| ฟอร์มส่งรายชื่อโดน 429 ทั้งที่คนละคน | `trust proxy` ไม่ทำงาน — Caddy ต้องส่ง `X-Forwarded-For` |
