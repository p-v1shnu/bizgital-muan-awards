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
| DigitalOcean Spaces (หรือ S3 ที่เข้ากันได้) | สร้าง bucket + ตั้ง policy ตาม `docs/storage-policy.json` (**อ่านไฟล์ได้ แต่ list ไม่ได้** — ดูข้อ 4.1) |
| GitHub PAT | fine-grained ให้สิทธิ์แค่ **Contents: Read** พอ — เครื่อง production ไม่เคย push |

> **`docker-compose.yml` ตัวนี้ไม่มี MinIO** — production คาดว่าใช้ object storage ข้างนอก
> ถ้ายังไม่มี bucket จริง จะขึ้นระบบไม่ได้ (`docker-compose.local.yml` ที่มี MinIO มีไว้สำหรับเครื่องพัฒนา)

---

## 0. ดึงโค้ดลงเครื่องด้วย PAT

```bash
sudo -i
mkdir -p /srv && cd /srv          # หรือ path ที่ใช้จริงบนเครื่องนั้น

umask 077
printf 'https://<github-user>:<PAT>@github.com\n' > /root/.git-credentials
chmod 600 /root/.git-credentials
git config --global credential.helper store

git clone https://github.com/p-v1shnu/bizgital-muan-awards.git muan
cd muan
git remote -v                     # ต้องเป็น URL เปล่า ไม่มี token โผล่
```

> **อย่า clone แบบ `https://<PAT>@github.com/...`** — token จะถูกเขียนค้างใน `.git/config`
> แบบอ่านได้ตรงๆ แล้วโผล่ทุกที่ที่ URL โผล่: `git remote -v`, ข้อความ error, และ backup
> ของโฟลเดอร์นี้ · แยกไว้ไฟล์เดียวแบบข้างบน เวลาจะเพิกถอนหรือหมุน token ก็แก้ที่เดียว

**Deploy รอบถัดไป:**

```bash
cd /srv/muan && git pull origin main && docker compose up -d --build
```

---

## 1. เตรียม `.env`

```bash
cp .env.example .env
chmod 600 .env      # ไฟล์นี้คือรหัสฐานข้อมูล + ความลับทั้งหมด
```

### 1.0 พอร์ต — ตรวจก่อนว่าว่างจริง

เครื่องที่รันหลายระบบมักมี 3000/3001 ไม่ว่างแล้ว **พอร์ตที่ชนทำให้ `docker compose up`
ล้มทันที** ด้วยข้อความ `port is already allocated`

```bash
ss -lntp | grep -E ':(3000|3001)\b'    # ไม่มีผลลัพธ์ = ว่าง
docker ps --format '{{.Ports}}\t{{.Names}}'   # ดูของ Docker เองด้วย
```

ถ้าไม่ว่าง ย้ายใน `.env`:

```bash
FRONTEND_HOST_PORT=3030
BACKEND_HOST_PORT=3031
```

> **`BACKEND_HOST_PORT` ไม่ใช่ `BACKEND_PORT`** — ตัวหลังคือพอร์ตที่ API ฟังอยู่
> *ข้างในคอนเทนเนอร์* ซึ่ง healthcheck และ frontend เรียกอยู่ ต้องเป็น 3001 เสมอ
> สองตัว `..._HOST_PORT` ย้ายแค่ประตูฝั่งโฮสต์เท่านั้น
>
> **ย้ายแล้วต้องแก้ `Caddyfile` ให้ตรงด้วย** ไม่งั้นได้ 502 ทุก request

สร้างความลับสี่ตัว **คนละค่ากันทั้งหมด** — ระบบจะไม่ยอมสตาร์ทถ้าสั้นกว่า 32 ตัวอักษร หรือถ้าซ้ำกัน:

```bash
openssl rand -base64 48   # → JWT_SECRET
openssl rand -base64 48   # → REFRESH_TOKEN_SECRET
openssl rand -base64 48   # → IP_HASH_SALT
openssl rand -base64 32   # → REVALIDATE_SECRET
```

> **`IP_HASH_SALT` ตั้งครั้งเดียวแล้วห้ามเปลี่ยน** — มันคือสิ่งที่ทำให้ที่อยู่ของผู้ใช้ที่เก็บไว้
> อ่านกลับไม่ได้ · ถ้าเปลี่ยน ระบบกันส่งซ้ำรายวันและระบบจำกัดจำนวนต่อที่อยู่จะรีเซ็ตทั้งหมด
> เหตุผลที่ต้องแยกจาก `JWT_SECRET` อยู่ใน [`docs/threat-model.md`](threat-model.md) ข้อ 3

**จุดที่พลาดกันบ่อย** — สามตัวนี้ต้องเป็นค่าของ production ไม่ใช่ค่าตัวอย่าง:

| ตัวแปร | ค่าตอน dev | ค่าที่ต้องเป็นบน production |
|---|---|---|
| `S3_ENDPOINT` | `http://minio:9000` | `https://sgp1.digitaloceanspaces.com` (หรือ region ที่ใช้) |
| `S3_PUBLIC_URL` | `http://localhost:9000/muan-awards` | URL ของ CDN เช่น `https://muan.sgp1.cdn.digitaloceanspaces.com` |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | เหมือน `S3_PUBLIC_URL` | **ต้องตรงกับ `S3_PUBLIC_URL`** |
| `NEXT_PUBLIC_GA_ID` | **เว้นว่าง** | รหัส GA4 จริง (`G-XXXXXXX`) — ใส่แล้วเว็บเริ่มนับทันทีที่คนเปิดหน้า |

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

### 2.1 สิทธิ์อ่านของ bucket — อ่านได้ แต่ห้าม list

> **⚠️ `docs/storage-policy.json` ใช้ไม่ได้กับ DigitalOcean Spaces** — เขียนไว้ตอนแรกโดย
> คิดว่า Spaces รองรับ bucket policy JSON แบบ AWS เต็มรูปแบบ ทดสอบจริงแล้ว
> `PutBucketPolicy` ตอบ **403** แม้ใช้กุญแจสิทธิ์เต็ม (`Full Access`) — Spaces ใช้ระบบ
> **canned ACL** แบบ S3 ยุคเก่าแทน ไม่ใช่ policy JSON ขั้นตอนข้างล่างนี้คือของจริงที่ใช้ได้

โค้ด (`storage.service.ts`) ตั้ง `ACL: 'public-read'` ให้**ทุกไฟล์เดี่ยว**ตอนเซ็น URL อัปโหลด
อยู่แล้ว — งานที่เหลือของคุณมีแค่อย่างเดียวคือ **ยืนยันว่า bucket เองไม่ใช่ `public-read`**

```bash
# ต้องได้ 403 (หรืออะไรก็ตามที่ไม่ใช่ 200) — ไม่มีใครควร list ทั้งถังได้
curl -s -o /dev/null -w "list ทั้งถัง  %{http_code}\n" "https://<bucket>.<region>.digitaloceanspaces.com/"
```

**ถ้าได้ 200 พร้อม `<ListBucketResult>`** — bucket ถูกตั้งเป็น public เต็มรูปแบบ (ผ่านปุ่มในหน้าเว็บ
DO หรือ `PutBucketAcl` ระดับถัง) ต้องปิดด้วยกุญแจแบบ **Full Access ชั่วคราว** (กุญแจของแอปทำไม่ได้
— นั่นคือจุดประสงค์):

```bash
docker compose exec -T -e ADMIN_KEY='<full-access key>' -e ADMIN_SECRET='<secret>' \
  backend node -e "
const S = require('@aws-sdk/client-s3');
new S.S3Client({ region: process.env.S3_REGION, endpoint: process.env.S3_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: process.env.ADMIN_KEY, secretAccessKey: process.env.ADMIN_SECRET } })
 .send(new S.PutBucketAclCommand({ Bucket: process.env.S3_BUCKET, ACL: 'private' }))
 .then(() => console.log('bucket -> private ✓'))
 .catch(e => console.log('ERR', e.name));
"
```

แล้วลบกุญแจ Full Access ตัวนั้นทิ้งทันที — ใช้ครั้งเดียวตอนตั้งค่า ไม่ใช่ของที่ต้องเก็บไว้

```bash
# ยืนยันอีกรอบ: list ต้องปิด, รูปที่มีจริงยังอ่านได้
curl -s -o /dev/null -w "list  %{http_code}\n" "https://<bucket>.<region>.digitaloceanspaces.com/"
curl -s -o /dev/null -w "รูป   %{http_code}\n" "https://<bucket-url>/site/<ไฟล์ที่มีจริง>.png"
```

> **ทำไมต้องห้าม list:** ทีมอัปโหลดรูปผู้ชนะ **ก่อน**ประกาศผลเสมอ (นั่นคือวิธีทำงานตามข้อ 4.1)
> ถ้า bucket ยอมให้ list ใครก็ตามไล่ดูไฟล์ทั้งหมดได้ → รู้ผลก่อนประกาศ ทั้งที่ API กันไว้อย่างดีแล้ว
> — เจอเรื่องนี้จริงตอน deploy: กด `PutBucketAcl` เป็น `public-read` **ระดับถัง** เพื่อแก้เรื่องอ่าน
> รูปไม่ได้ กลับกลายเป็นเปิด listing ไปด้วยโดยไม่ได้ตั้งใจ — `public-read` บนถังทั้งใบให้ทั้งอ่าน
> **และ** list พร้อมกันในรุ่น ACL แบบเดิม ต่างจากการให้สิทธิ์เฉพาะไฟล์

---

## 3. ตั้ง Caddy

> ### ⛔ ถ้าเครื่องนี้มีเว็บอื่นรันผ่าน Caddy อยู่แล้ว ห้าม `cp` ทับ
>
> `cp Caddyfile.example /etc/caddy/Caddyfile` **ลบ config ของเว็บอื่นทั้งหมดทันที** ใช้ได้
> เฉพาะเซิร์ฟเวอร์เปล่าที่ยังไม่มีอะไรเลย · บนเครื่องที่ใช้ร่วมกันให้**เติม block ต่อท้าย**
> โดยเปิดไฟล์แล้ววาง หรือใช้ `>>` ซึ่งเขียนทับไม่ได้แม้จะอยากก็ตาม
>
> ```bash
> cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%F)
> grep -n "import" /etc/caddy/Caddyfile   # ถ้ามี import ให้สร้างไฟล์แยกในโฟลเดอร์นั้นแทน
> ```

```bash
# 3.1 หน้าที่ผู้ใช้จะเห็นตอนเว็บมีปัญหา — Caddyfile ชี้มาที่ path นี้
sudo mkdir -p /srv/muan/error-pages
sudo cp error-pages/outage.html /srv/muan/error-pages/
sudo chmod 755 /srv/muan /srv/muan/error-pages
sudo chmod 644 /srv/muan/error-pages/outage.html
sudo -u caddy cat /srv/muan/error-pages/outage.html > /dev/null && echo "caddy อ่านได้ ✓"

# 3.2 โฟลเดอร์ log — ต้องมีและ caddy ต้องเขียนได้ ถ้า block มี directive `log`
sudo mkdir -p /var/log/caddy
sudo chown -R caddy:caddy /var/log/caddy       # เช็ก user จริงด้วย: systemctl show caddy -p User
sudo chmod 755 /var/log/caddy

# 3.3 เติม block (ดู Caddyfile.example) แล้วตรวจก่อนโหลดเสมอ
sudo caddy validate --config /etc/caddy/Caddyfile
sudo caddy reload --config /etc/caddy/Caddyfile
```

Caddy ขอใบรับรอง TLS เองอัตโนมัติ

> **ใช้ `caddy reload` ไม่ใช่ `systemctl reload caddy`** — ตัวหลังกลืน error ไปเงียบๆ แล้วคืน
> exit 0 ทั้งที่ config ใหม่ถูกปฏิเสธ · ของจริงที่เกิดขึ้น: โฟลเดอร์ `/var/log/caddy` เขียนไม่ได้
> Caddy จึงทิ้ง config ทั้งก้อน (block ใหม่ไม่ถูกโหลด ไม่มีใบรับรอง เบราว์เซอร์ขึ้น
> `ERR_SSL_PROTOCOL_ERROR`) แต่ terminal ไม่แสดงอะไรเลย · `caddy reload` พ่นสาเหตุออกมาตรงๆ
>
> ยืนยันว่าโหลดจริงหลัง reload ทุกครั้ง — `validate` ผ่านไม่ได้แปลว่าโหลดแล้ว:
> ```bash
> journalctl -u caddy -n 20 --no-pager | grep -i "automatic TLS"   # ต้องเห็นโดเมนใหม่ในรายชื่อ
> curl -s localhost:2019/config/ | grep -c <โดเมน>                  # ต้องได้ ≥1
> ```
>
> **ข้อดีที่ควรรู้:** ถ้า config ใหม่ผิด Caddy จะรันของเดิมต่อ เว็บอื่นบนเครื่องไม่ดับ

> **ถ้าลืมคัดลอก `outage.html`** เวลาเว็บพังผู้ใช้จะเห็นหน้าขาวเปล่า ๆ แทนข้อความภาษาລาว
> — Caddy ไม่ได้ error ตอน reload เพราะไฟล์หายไป มันจะรู้ตอนมีคนเข้าเว็บตอนระบบพังแล้วเท่านั้น
>
> **ถ้า clone repo ไว้ใต้ `/home/<user>/` อย่าชี้ Caddyfile เข้าไปที่นั่นตรงๆ** — Caddy รันเป็น
> user `caddy` ไม่ใช่ root และโฟลเดอร์ home มักเป็น `700` ผลคืออ่านไฟล์ไม่ได้ ซึ่งอาการ
> เหมือนกับลืมคัดลอกทุกประการ: reload ผ่าน แล้วไปรู้ตอนเว็บล่มจริง · คัดลอกมาไว้ที่
> `/srv/muan/error-pages` แบบข้างบนปลอดภัยกว่า และไม่ผูกกับที่อยู่ของ repo

---

## 4. เช็กลิสต์หลัง deploy — หยุดตรวจทีละข้อ

### 4.0 URL ที่ถูกอบไว้ในไฟล์ JS — ตรวจข้อนี้ก่อนเพื่อน

`NEXT_PUBLIC_*` ทุกตัว**ถูกฝังลงในไฟล์ JS ตอน build** ไม่ได้อ่านจาก `.env` ตอนรัน ·
แก้ `.env` แล้ว `restart` เฉยๆ **ไม่มีผล** ต้อง `docker compose up -d --build frontend`

ที่ทำให้ข้อนี้อันตรายคือ**หน้าเว็บจะดูปกติทุกอย่าง**: หน้าสาธารณะเรนเดอร์ที่เซิร์ฟเวอร์
และคุยกับ backend ผ่านเน็ตเวิร์กภายใน Docker ไม่ได้ใช้ค่านี้เลย · ที่พังคือทุกอย่างที่
**เบราว์เซอร์**เป็นคนเรียก — ล็อกอินหลังบ้าน, สร้างแอดมินคนแรก, อัปโหลดรูป, ฟอร์มส่งชื่อ
— ขึ้นเป็น `Failed to fetch` ซึ่งไม่ได้บอกเลยว่าสาเหตุคืออะไร

```bash
# ค่าที่ถูกอบไว้จริง — ต้องเป็นโดเมนที่กำลังเปิดอยู่ ไม่ใช่โดเมนอื่น
curl -s https://<โดเมน>/admin/setup \
  | grep -oE '/_next/static/chunks/[a-zA-Z0-9_.-]+\.js' | sort -u \
  | while read c; do curl -s "https://<โดเมน>$c" \
      | grep -ohE 'https?://[a-zA-Z0-9.:_-]+/api/v1'; done | sort -u
```

ต้องได้ `https://<โดเมนนี้>/api/v1` **ค่าเดียว** · ถ้าได้โดเมนอื่น แก้ `.env` แล้ว

```bash
docker compose up -d --build frontend
docker compose up -d backend        # ถ้าแก้ CORS_ORIGINS ด้วย
```

แล้วเปิดหน้าใน incognito — ไฟล์ JS เก่ายังค้างในเบราว์เซอร์

```bash
# ── ระบบขึ้นแล้วจริง ──
curl -s https://muanawards.com/api/v1/health
#   คาดหวัง: {"data":{"status":"ok",...}}
#   ถ้าได้ HTML ของหน้า outage แทน JSON → Caddy proxy ไปพอร์ตที่ไม่มีใครฟัง
#   เทียบสามอย่าง: docker compose ps · BACKEND_HOST_PORT ใน .env · เลขใน handle /api/*

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
# ทดสอบตรงๆ: ยิงฟอร์ม 31 ครั้งจากเครื่องเดียว ครั้งที่ 31 ต้องได้ 429 (เพดาน 30 ครั้ง/ชม.)
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

**Google Analytics เริ่มนับจริง:**

```bash
curl -s https://muanawards.com/ | grep -o 'gtag/js?id=[A-Z0-9-]*'
#   คาดหวัง: id ตรงกับ property จริง · ถ้าไม่มีเลย = ลืมใส่ NEXT_PUBLIC_GA_ID ตอน build
curl -s https://muanawards.com/admin/login | grep -c googletagmanager
#   คาดหวัง: 0 — หลังบ้านไม่ถูกนับ
```

> ถ้าเปลี่ยนสิ่งที่ GA เก็บ (เช่น เปิด Google signals) **ต้องแก้ข้อความใน `/about#privacy` ให้ตรงด้วย**
> ตอนนี้หน้านั้นเขียนไว้ว่า: นับตั้งแต่เปิดหน้า, เก็บหน้าที่เปิด/อุปกรณ์/ภาษา/ประเทศโดยประมาณ,
> ไม่เก็บชื่อหรืออีเมล และบอกวิธีปิดไว้ให้ผู้ใช้

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

## 6. สำรองข้อมูล + **ซ้อมกู้คืน**

มีสคริปต์ให้แล้วสองตัว ต้องตั้ง cron เอง:

```bash
# ทุกคืนตี 3
0 3 * * *  cd /srv/muan && MYSQL_ROOT_PASSWORD=xxx ./scripts/backup.sh >> /var/log/muan-backup.log 2>&1
```

> **ใส่ `BACKUP_HEARTBEAT_URL` ด้วย** ไม่งั้นวันที่ backup พังจะไม่มีใครรู้ — วิธีตั้งอยู่ใน
> [`docs/monitoring.md`](monitoring.md) ข้อ 8

`scripts/backup.sh` ไม่ได้แค่ dump — **ตรวจไฟล์ที่เพิ่ง dump ทุกครั้ง** (gzip อ่านได้ไหม
และมีตาราง `editions` จริงไหม) ถ้าไม่ผ่านจะ exit 1 เพื่อให้ cron ส่งเมลแจ้ง
ไฟล์เก่ากว่า 30 วันถูกลบอัตโนมัติ

**ซ้อมกู้คืนอย่างน้อยเดือนละครั้ง — backup ที่กู้ไม่ได้เท่ากับไม่มี:**

```bash
MYSQL_ROOT_PASSWORD=xxx ./scripts/restore.sh /srv/backups/muan/muan-<วันที่>.sql.gz muan_restore_test
# สคริปต์จะพิมพ์จำนวนแถวของทุกตารางหลักออกมา → เทียบกับของจริง ต้องตรงกัน
```

สคริปต์ **ปฏิเสธการเขียนทับฐานข้อมูลจริง** เว้นแต่สั่ง `I_MEAN_IT=yes`

> **ซ้อมจริงแล้ว (14 ส.ค. 2026)** บนฐานข้อมูลที่มี 10,002 รายชื่อในคิว:
> dump 868 KB → สร้างฐานใหม่ → กู้คืน → **จำนวนแถวตรงกันทุกตาราง และภาษาลาวไม่เพี้ยน**

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

---

## 7. ข้อจำกัดที่ต้องรู้ก่อนขยายเป็นหลาย container

ระบบนี้ตั้งใจออกแบบให้รัน **API หนึ่ง container** (ตาม PRD ข้อ 9 ที่ตัด Redis/worker ออก)
มีสามอย่างที่เก็บสถานะไว้ในหน่วยความจำของ process — ถ้าเพิ่มเป็นสองตัวเมื่อไหร่ ต้องย้ายก่อน:

| สิ่งที่อยู่ใน memory | ผลถ้ามีหลาย container | ทางแก้เมื่อถึงวันนั้น |
|---|---|---|
| ตัวนับล็อกอินผิด (ล็อก 8 ครั้ง/15 นาที) | คนเดารหัสได้ 8 ครั้ง **ต่อ container** | ย้ายไป Redis |
| Rate limit (100/นาที, ฟอร์ม 10/ชม.) | เพดานคูณจำนวน container | `@nestjs/throttler` + Redis storage |
| แคสหน้าเว็บของ Next (ISR) | แต่ละ container มีสำเนาของตัวเอง อาจไม่ตรงกันชั่วครู่ | shared cache handler หรือ CDN |

**Migration รันตอน container สตาร์ท** (`prisma migrate deploy` อยู่ใน `CMD`) — ปลอดภัยเมื่อมี container เดียว
ถ้าขยายเป็นหลายตัว ต้องแยก migration ออกมาเป็นขั้นตอนก่อน deploy ไม่งั้นสองตัวจะ migrate ชนกัน

**การปิดตัว:** API รับ SIGTERM แล้วปิดงานที่ค้างอยู่ให้จบก่อน (ทดสอบแล้ว — เห็น `Database disconnected` ในล็อก)
`docker compose down` / `restart` จึงไม่ตัดคำขอของผู้ใช้กลางคัน

---

## 8. หลัง deploy เสร็จ — ตั้งระบบแจ้งเตือน

`docker compose up -d` แล้วเว็บขึ้น ยังไม่ถือว่าจบ ตราบใดที่**ยังไม่มีอะไรบอกเราตอนมันล่ม**

ดู [`docs/monitoring.md`](monitoring.md) — ตั้งตัวเฝ้าภายนอกยิงเข้า `/api/v1/health`
แจ้งเตือนเข้า Microsoft Teams พร้อมขั้นตอนที่ต้องทำเมื่อเสียงเตือนดัง
