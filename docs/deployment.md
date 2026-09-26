# การขึ้นเซิร์ฟเวอร์จริง (Deployment)

> **สถานะ (8 ก.ย. 2026):** ขั้นตอนในเอกสารนี้ถูกรันจริงแล้วบนเซิร์ฟเวอร์ —
> stack รันอยู่ที่ `uat.muanawards.com` (`/home/automation-hub-sgp01/muan-awards`,
> host port `3030`/`3031`) ทั้งสาม container ขึ้นและ healthy
> ก่อนหน้านี้บรรทัดนี้เขียนว่า `docker compose up` ยังไม่เคยถูกรัน ซึ่งจริงตอนที่เขียน
> เพราะเครื่องที่พัฒนาไม่มี docker daemon
>
> **`muanawards.com` ยังเป็นเว็บเก่า ไม่ใช่ repo นี้** — วันที่จะย้ายขึ้นโดเมนหลัก
> อ่าน [`production-cutover.md`](production-cutover.md) ก่อน มีของที่พังแบบไม่มีใครรู้อยู่หลายอย่าง

---

## ก่อนเริ่ม

| ต้องมี | หมายเหตุ |
|---|---|
| เซิร์ฟเวอร์ Linux + Docker + Docker Compose | Caddy ติดตั้งอยู่แล้วบนเครื่อง |
| โดเมน `muanawards.com` ชี้มาที่ IP เซิร์ฟเวอร์ | ต้องชี้ก่อน Caddy จะขอใบรับรอง TLS ได้ |
| DigitalOcean Spaces (หรือ S3 ที่เข้ากันได้) | สร้าง bucket เปล่าไว้ก่อนพอ — bucket ACL ปล่อยเป็น `private` (ค่า default) **ไม่ต้องตั้ง policy อะไรเลย** โค้ดจัดการสิทธิ์อ่านให้เองตอนอัปโหลด (**อ่านไฟล์ได้ แต่ list ไม่ได้** — ดูข้อ 2.1) |
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

> **อย่าสั่งบรรทัดข้างล่างทันที** — ทำตามหัวข้อ **"Deploy รอบถัดไป — ทำตามลำดับทุกครั้ง"**
> (ต่อจากข้อ 6) ก่อน · บรรทัดนี้คือขั้น ง. ของหัวข้อนั้น แต่ถ้าสั่งโดยไม่เช็ก `.env` ก่อน
> ตัวแปรที่ PR ใหม่บังคับจะหลุดไปรู้ตอน backend ไม่ยอมสตาร์ท — ซึ่งคือตอนเว็บล่มแล้ว

```bash
cd /srv/muan && git pull origin main && docker compose up -d --build --force-recreate
```

> **`--force-recreate` ห้ามลืม** — เจอมาแล้วจริงบนเครื่อง production: `--build` เพียวๆ
> build image ใหม่เสร็จ (ดูจาก `docker images` timestamp ก็ใหม่) แต่ container ที่รันอยู่
> **ไม่ถูกสั่งให้สร้างใหม่** ยังใช้ image เก่าต่อไปเรื่อยๆ — `docker compose ps` จะยังโชว์
> `CREATED`/`STATUS` เป็นของหลายวันก่อน ทั้งที่ build ผ่านไม่มี error เลย หน้าเว็บเลย
> ไม่เปลี่ยนแม้ deploy "สำเร็จ" ทุกครั้ง `--force-recreate` คือตัวบังคับให้ swap container
> ไปใช้ image ใหม่จริง ๆ
>
> **`/srv/muan` เป็นเพียงตัวอย่าง** — เอกสารนี้ใช้ที่อยู่นี้ตลอดทั้งไฟล์ แต่เครื่องจริงอยู่ที่ไหน
> ก็ได้ · **ลืมว่าอยู่ไหน ให้ถาม docker:**
>
> ```bash
> docker compose ls          # คอลัมน์ CONFIG FILES บอกที่อยู่ของ compose.yml
> ```
>
> `cd` ผิดที่แล้วสั่งต่อ ไม่ error ให้เห็นชัด ๆ — `git pull` จะบอกว่าไม่ใช่ repo,
> `docker compose` จะไปสร้าง project เปล่าอีกตัว และคำสั่งที่อ่าน `.env` จะได้ค่าว่าง
> **วิธีตรวจว่าโค้ดใหม่ขึ้นจริง ไม่ใช่ดูว่าคำสั่งไม่ error แต่ดูสองอย่างนี้:**
>
> ```bash
> docker compose ps                                           # CREATED ต้องเป็น "seconds/minutes ago"
> docker compose logs backend | grep -c "migrations found"    # มีบรรทัดนี้ทุกครั้งที่ backend สตาร์ท
> docker compose logs backend | grep "migrations found" | tail -1
> ```
>
> ตัวเลขในบรรทัดล่าสุดต้องเท่ากับจำนวนโฟลเดอร์ใน `backend/prisma/migrations`
> (ไม่นับ `migration_lock.toml`) · น้อยกว่านั้น = **container ยังรันโค้ดเก่า** ยังไม่ได้ build ใหม่
> · `CREATED` เป็นวันก่อนๆทั้งที่พึ่ง deploy = ลืม `--force-recreate` ข้างบน

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

สร้างความลับห้าตัว **คนละค่ากันทั้งหมด** — ระบบจะไม่ยอมสตาร์ทถ้าสั้นกว่า 32 ตัวอักษร หรือถ้าซ้ำกัน:

```bash
openssl rand -base64 48   # → JWT_SECRET
openssl rand -base64 48   # → REFRESH_TOKEN_SECRET
openssl rand -base64 48   # → IP_HASH_SALT
openssl rand -base64 32   # → REVALIDATE_SECRET
openssl rand -base64 48   # → INTERNAL_API_SECRET
```

> **`INTERNAL_API_SECRET` จำเป็นบน production** — frontend ใช้ยืนยันกับ API ว่าเป็นเซิร์ฟเวอร์ของเว็บเอง
> ไม่ใช่ผู้เข้าชม ถ้าไม่มี rate limit จะนับผู้เข้าชมทุกคนเป็นคนเดียว และใครก็ทำให้หน้าเว็บล่มได้
> ถ้าไม่ได้ตั้ง backend จะไม่ยอมสตาร์ท

> **`IP_HASH_SALT` ตั้งครั้งเดียวแล้วห้ามเปลี่ยน** — มันคือสิ่งที่ทำให้ที่อยู่ของผู้ใช้ที่เก็บไว้
> อ่านกลับไม่ได้ · ถ้าเปลี่ยน ระบบกันส่งซ้ำรายวันและระบบจำกัดจำนวนต่อที่อยู่จะรีเซ็ตทั้งหมด
> เหตุผลที่ต้องแยกจาก `JWT_SECRET` อยู่ใน [`docs/threat-model.md`](threat-model.md) ข้อ 3

**จุดที่พลาดกันบ่อย** — สามตัวนี้ต้องเป็นค่าของ production ไม่ใช่ค่าตัวอย่าง:

| ตัวแปร | ค่าตอน dev | ค่าที่ต้องเป็นบน production |
|---|---|---|
| `S3_ENDPOINT` | `http://minio:9000` | `https://sgp1.digitaloceanspaces.com` (หรือ region ที่ใช้) |
| `S3_PUBLIC_URL` | `http://localhost:9000/muan-awards` | `https://<bucket>.<region>.digitaloceanspaces.com` (โดเมนต้นทาง — ดูคำเตือนข้างล่าง) |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | เหมือน `S3_PUBLIC_URL` | **ต้องตรงกับ `S3_PUBLIC_URL`** |
| `NEXT_PUBLIC_GA_ID` | **เว้นว่าง** | รหัส GA4 จริง (`G-XXXXXXX`) — ใส่แล้วเว็บเริ่มนับทันทีที่คนเปิดหน้า |

> `NEXT_PUBLIC_*` ถูก **ฝังตอน build** ไม่ใช่ตอนรัน — แก้แล้วต้อง `docker compose build` ใหม่
> และ `NEXT_PUBLIC_IMAGE_BASE_URL` ยังเป็นตัวกำหนดว่า `next/image` ยอมดึงรูปจากโฮสต์ไหน
> ถ้าตั้งผิด รูปจะขึ้น 400 ทั้งเว็บ

> **ระบบจะไม่ยอมเริ่มถ้าค่าเหล่านี้ว่าง:** backend (เมื่อ `NODE_ENV=production`) จะไม่สตาร์ทถ้า `S3_ENDPOINT`,
> `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` หรือ `S3_PUBLIC_URL` ว่าง · และ `docker compose`
> **ทุกคำสั่ง** (รวม `exec` ที่ `backup.sh` ใช้) จะหยุดทันทีถ้า `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`
> หรือ `NEXT_PUBLIC_IMAGE_BASE_URL` ว่าง — ดีกว่าได้เว็บที่ดูปกติแต่ล็อกอินไม่ได้หรือลิงก์ชี้ผิดโดเมน

> **⚠️ อย่าใส่โดเมน `.cdn.` จนกว่าจะกดเปิด CDN ในหน้า Spaces จริงแล้ว** — Space ทุกอันมีโดเมน
> `<bucket>.<region>.digitaloceanspaces.com` (ต้นทาง) ใช้ได้ทันทีตั้งแต่สร้าง bucket แต่โดเมน
> `<bucket>.<region>.cdn.digitaloceanspaces.com` **มีอยู่ก็ต่อเมื่อกด Enable CDN ในแท็บ Settings
> ของ Space นั้นแล้วเท่านั้น** — ถ้ายังไม่เปิดแล้วตั้งค่าเป็นโดเมนนี้ไว้ก่อน DNS จะหาไม่เจอเลย
>
> **สองอาการนี้แยกกันเด็ดขาด อย่าไล่แก้ปนกัน:**
> | เจอ | แปลว่า | แก้ตรงไหน |
> |---|---|---|
> | `403 Forbidden` (เซิร์ฟเวอร์ตอบจริง แค่ปฏิเสธ) | ปัญหาสิทธิ์อ่านไฟล์ — ดูข้อ 2.1 | โค้ด/ACL ของไฟล์ |
> | `DNS_PROBE_POSSIBLE` / เชื่อมต่อไม่ได้เลย | โดเมนไม่มีอยู่จริง — มักเป็นเพราะยังไม่เปิด CDN | `.env` สองบรรทัดข้างบน |
>
> เริ่มด้วยโดเมนต้นทางไปก่อนเสมอ ใช้ได้แน่นอนไม่ต้องเปิดอะไรเพิ่ม — ค่อยเปลี่ยนเป็น `.cdn.`
> ทีหลังตอนกด Enable CDN แล้วจริงๆ (แก้ทีเดียวสองบรรทัด แล้ว build frontend ใหม่)

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
> ให้ล้างแคชตามข้อ 2.2 แทนที่จะ build ใหม่ทั้งหมด**
>
> ส่วนหน้าปี/สาขา/โปรไฟล์ ไม่ถูกอบไว้ — ถ้า API ล่ม หน้าพวกนี้จะขึ้น **500 (ลองใหม่ภายหลัง)**
> ไม่ใช่ 404 โดยตั้งใจ เพราะ 404 จะทำให้ Google ถอดหน้าออกจากดัชนีถาวร

### 2.1 สิทธิ์อ่านของ bucket — อ่านได้ แต่ห้าม list

> **⚠️ `docs/storage-policy.json` ใช้ไม่ได้กับ DigitalOcean Spaces เลย** — เขียนไว้ตอนแรกโดย
> คิดว่า Spaces รองรับ bucket policy JSON แบบ AWS เต็มรูปแบบ ทดสอบจริงแล้ว `PutBucketPolicy`
> ตอบ **403** แม้ใช้กุญแจสิทธิ์เต็ม (ไฟล์นี้ยังใช้ได้กับ MinIO ที่เครื่องพัฒนา — ดู
> `docker-compose.local.yml`)

**สามอย่างที่ลองแล้วไม่ได้ผล ก่อนจะเจอของจริง — ทุกอย่างทดสอบกับ bucket จริง ไม่ใช่เดา:**

| ลองแล้ว | ผล |
|---|---|
| `PutBucketPolicy` (policy JSON) | ❌ 403 ทุกครั้ง แม้กุญแจสิทธิ์เต็ม |
| เซ็น URL แล้วให้**เบราว์เซอร์** PUT ตรงไป bucket พร้อม ACL แนบใน URL | ❌ Spaces เงียบๆ ไม่ยอมให้ ACL นั้นมีผล — อัปโหลดผ่าน (200) แต่ไฟล์ยังอ่านไม่ได้ |
| bucket ACL `public-read` (ทั้งถัง) | ❌ ให้แค่สิทธิ์ **list** ไม่ได้ทำให้ไฟล์แต่ละไฟล์อ่านได้เลย — และเปิดช่องให้ไล่ดูไฟล์ทั้งหมดด้วย |

**bucket ACL ต้องเป็น `private` เสมอ** — ไม่ช่วยเรื่องอ่านไฟล์ มีแต่จะเปิดความเสี่ยงเรื่อง list

**ของจริงที่ใช้ได้ — ให้เซิร์ฟเวอร์เป็นคนอัปโหลดเอง ไม่ใช่เบราว์เซอร์**

กุญแจ Read/Write/Delete ของแอปเอง **ตั้ง ACL ให้ไฟล์ได้จริง** ถ้าเป็นเซิร์ฟเวอร์เรียก
`PutObjectCommand` เอง (auth ผ่าน header) — ต่างจากเซ็น URL ให้เบราว์เซอร์ไปยิงเอง (auth ผ่าน
query string) ซึ่ง Spaces ปฏิบัติกับสองแบบนี้ไม่เหมือนกัน ยืนยันแล้วทั้งสองด้าน ไม่ใช่แค่ทฤษฎี

ระบบตอนนี้เลยทำงานแบบ **ไฟล์วิ่งผ่าน API** (`storage.controller.ts` / `storage.service.ts`) —
เบราว์เซอร์ส่งไฟล์มาที่ backend ทาง `multipart/form-data`, backend เป็นคนอัปโหลดเข้า bucket เอง
พร้อม `ACL: 'public-read'` **ไม่ต้องมีกุญแจสิทธิ์เต็มอยู่ในระบบเลยสักตัว** กุญแจของแอปที่จำกัดแค่
bucket นี้พอแล้ว

**ยืนยันว่าทำงาน:**

```bash
curl -s -o /dev/null -w "list ทั้งถัง (ต้องไม่ใช่ 200)  %{http_code}\n" "https://<bucket>.<region>.digitaloceanspaces.com/"
```

แล้วลองอัปโหลดรูปจริงในหน้าหลังบ้าน — ต้องขึ้นทันที ไม่ต้องรอ

> **ทำไมต้องห้าม list:** ทีมอัปโหลดรูปผู้ชนะ **ก่อน**ประกาศผลเสมอ (นั่นคือวิธีทำงานตามข้อ 4.1)
> ถ้า bucket ยอมให้ list ใครก็ตามไล่ดูไฟล์ทั้งหมดได้ → รู้ผลก่อนประกาศ ทั้งที่ API กันไว้อย่างดีแล้ว
> — bucket ACL อยู่ที่ `private` เสมอ กันเรื่องนี้ไว้ได้แน่นอน เพราะการให้สิทธิ์อ่านตอนนี้ทำที่ระดับ
> ไฟล์ ไม่ใช่ระดับถัง

### 2.1.1 ถ้ามีไฟล์ค้างจากก่อนแก้ (เช่น รูปที่อัปโหลดผ่านทาง presigned URL แบบเก่า)

ไฟล์ที่อัปโหลดไปแล้ว**ก่อน**แก้เป็นทาง server-upload จะยังอ่านไม่ได้ค้างอยู่ (เพราะตอนอัปโหลด
ไม่มี ACL ติดไปด้วย) — มีสคริปต์ `scripts/grant-public-read.js` ไว้ซ่อมทีเดียวจบ **ใช้แค่ครั้งเดียว
ไม่ต้องตั้ง cron** เพราะไฟล์ใหม่ตั้งแต่นี้ไปได้ ACL ถูกต้องตั้งแต่ตอนอัปโหลดอยู่แล้ว

1. สร้างกุญแจชั่วคราวแบบ **All Buckets (Full Access)** — ใช้เสร็จลบทิ้งได้เลย ไม่ต้องเก็บถาวร
2. รัน:
   ```bash
   cd /home/automation-hub-sgp01/muan-awards
   read -p  "Access Key ID: " S3_ADMIN_ACCESS_KEY
   read -sp "Secret Key   : " S3_ADMIN_SECRET_KEY; echo
   docker compose exec -T \
     -e S3_ADMIN_ACCESS_KEY -e S3_ADMIN_SECRET_KEY \
     backend node scripts/grant-public-read.js
   unset S3_ADMIN_ACCESS_KEY S3_ADMIN_SECRET_KEY
   ```
   คาดหวัง: `done — granted N, already public M, failed 0`
3. **ลบกุญแจ Full Access ตัวนั้นทิ้ง** — งานเสร็จแล้ว ไม่มีเหตุผลให้เก็บไว้ต่อ

### 2.2 ล้างแคชหน้าเว็บด้วยมือ

ปกติ**ไม่ต้องสั่งเอง** — API ยิงให้ทุกครั้งที่ทีมกดบันทึกในหลังบ้าน · ที่ต้องสั่งเองมีสองกรณี:
build เว็บเสร็จตอน API ยังไม่ขึ้น (กล่องข้างบน) และตอนเพิ่ง deploy โค้ดที่เปลี่ยนหน้าตาของหน้า
ที่ถูกอบไว้ ซึ่งหน้าเก่ายังถูกเสิร์ฟอยู่ได้ถึง 60 วิ

**หลัง `up -d --build` ไม่ต้องสั่ง** — container ใหม่เริ่มด้วยแคชเปล่าอยู่แล้ว

รันบนเครื่องเซิร์ฟเวอร์ ในโฟลเดอร์ที่มี `compose.yml` (ดูกล่อง "`/srv/muan` เป็นเพียงตัวอย่าง"
ในข้อ 0) — ทั้งคีย์และพอร์ตอ่านจาก `.env` ทั้งคู่ คีย์จึงไม่ไปค้างใน shell history และพอร์ตก็ตรง
กับเครื่องที่ย้าย `FRONTEND_HOST_PORT` ไปแล้ว:

```bash
curl -fsS -X POST \
  "http://127.0.0.1:$(grep '^FRONTEND_HOST_PORT=' .env | cut -d= -f2- || echo 3000)/api/revalidate" \
  -H "x-revalidate-secret: $(grep '^REVALIDATE_SECRET=' .env | cut -d= -f2-)"
```

คาดหวัง: `{"revalidated":true,"at":"…"}`

| ได้อะไร | หมายความว่า |
|---|---|
| 401 | คีย์ไม่ตรง — หรือ `grep` ไม่เจอไฟล์ `.env` จึงส่ง header เปล่า (**cd ผิดโฟลเดอร์**) |
| 503 | ยังไม่ได้ตั้ง `REVALIDATE_SECRET` ใน `.env` — ถ้าไม่ตั้ง ปลายทางนี้ปิดตาย ไม่ได้เปิดให้ใครก็ยิงได้ |
| 404 | พอร์ตนั้นไม่ใช่เว็บนี้ — บนเครื่องที่รันหลายเว็บ 3000 อาจเป็นของคนอื่น ตรวจ `FRONTEND_HOST_PORT` ใน `.env` |
| curl: (7) | ไม่มีอะไรฟังพอร์ตนั้น — `docker compose ps` ดูว่า frontend ขึ้นอยู่ไหม |

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

> **`www.` ต้องเป็น redirect ไม่ใช่เว็บอีกชุด** — `Caddyfile.example` มี block
> `www.muanawards.com { redir https://muanawards.com{uri} permanent }` แยกไว้ ให้เติมทั้งสอง block
> อย่ารวบเป็น `muanawards.com, www.muanawards.com {` · API ตั้ง cookie ล็อกอินโดยไม่ระบุ Domain
> cookie จึงอยู่กับ `muanawards.com` ที่เดียว ถ้า `www.` เสิร์ฟเว็บเอง แอดมินที่เข้าทาง `www.`
> จะดูปีที่ยังเป็นร่างไม่ได้ (404) · ตรวจ: `curl -sI https://www.muanawards.com/` ต้องได้ `301`

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
แก้ `.env` แล้ว `restart` เฉยๆ **ไม่มีผล** ต้อง `docker compose up -d --build --force-recreate frontend`

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
docker compose up -d --build --force-recreate frontend
docker compose up -d --force-recreate backend        # ถ้าแก้ CORS_ORIGINS ด้วย
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

**อัปโหลดรูปจริง**

รูปวิ่งผ่าน API เอง (`POST /admin/uploads` แบบ `multipart/form-data`) ไม่ได้ยิงตรงไป Spaces
จากเบราว์เซอร์แล้ว — จึงไม่มีเรื่อง CORS ของ bucket ให้ต้องตั้งอีกต่อไป (ข้อ 4 ที่เคยเขียนไว้เรื่อง
CORS Configurations เป็นของยุคเก่า ไม่ต้องทำแล้ว)

1. เข้า `/admin` → คลังครีเอเตอร์ → เพิ่มคน → อัปโหลดรูป
2. รูปต้องขึ้น**ทันที**ในหน้าแก้ไข — ไม่ต้องรอ ไม่ต้องซ่อมทีหลัง
3. ถ้าไม่ขึ้น: เปิด DevTools ดู response ของ `POST /api/v1/admin/uploads` โดยตรง — ข้อความ error
   จะบอกสาเหตุตรงๆ (ชนิดไฟล์ไม่รองรับ, ไฟล์ใหญ่เกิน 8 MB, หรือ bucket ต่อไม่ติด)

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

**ตั้ง cron ตัวที่สองด้วย: เฝ้าดิสก์** — ดิสก์เต็มคือสาเหตุที่พบบ่อยที่สุดของการล่มเงียบบนเครื่องเล็ก
และ MySQL ต้องมีที่ว่างแม้แต่จะสตาร์ท

```bash
*/30 * * * *  cd /srv/muan && DISK_HEARTBEAT_URL='https://uptime.betterstack.com/api/v1/heartbeat/yyyy' \
              ./scripts/watch-disk.sh >> /var/log/muan-disk.log 2>&1
```

สคริปต์ **ยิง heartbeat เฉพาะเมื่อดิสก์ยังไม่เต็ม** — เงียบคือผิด เหมือนกับ backup · ตอนเต็มมันพิมพ์
`du` 6 อันดับแรกลง log ให้ด้วย · รายละเอียดและค่าที่ปรับได้อยู่ใน
[`docs/monitoring.md`](monitoring.md) ข้อ 13

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

## Deploy รอบถัดไป — ทำตามลำดับทุกครั้ง

ข้อ 0–6 คือการติดตั้งครั้งแรก ทำครั้งเดียว · หัวข้อนี้คือทุกรอบหลังจากนั้น

**ทำไมต้องเช็กก่อนสั่ง:** deploy วันที่ 26 ก.ย. 2026 (ขึ้น PR #81 + #82 พร้อมกัน) เครื่องจริง**ไม่มี
`INTERNAL_API_SECRET`** เพราะตัวแปรนี้เพิ่งถูกบังคับใน PR #81 หลังจาก production deploy ครั้งก่อน ·
จับได้ที่ขั้น ข. ก่อนแตะ container — ถ้าสั่ง `up --build` ไปเลยตามบรรทัดเดียวในข้อ 0
backend จะไม่ยอมสตาร์ทและเว็บล่มทั้งเว็บ

ตัวอย่างใช้ `/srv/muan` และ `<โดเมน>` — แทนด้วยของจริง (ตอนนี้คือที่อยู่ในกล่องสถานะบนสุดของไฟล์นี้)

### ก. จดเวอร์ชันปัจจุบัน แล้วดูว่ารอบนี้มีอะไรขึ้นไป

```bash
cd /srv/muan
git rev-parse HEAD | tee ~/muan-before-deploy.txt     # ใช้ตอนย้อนกลับ (ขั้น ฉ.)
git fetch origin main
git log --oneline HEAD..origin/main                   # PR ที่จะขึ้นไปรอบนี้ — อาจมากกว่าหนึ่ง
git diff --name-status HEAD origin/main -- backend/prisma/migrations
git diff HEAD origin/main -- .env.example | grep -E '^\+[A-Z_]+='    # ตัวแปรใหม่ที่ต้องเติมใน .env
```

| ผลของ migration | แปลว่า |
|---|---|
| ว่าง | ไม่แตะฐานข้อมูล · ย้อนกลับได้ด้วยการย้อนโค้ดอย่างเดียว |
| `A` (เพิ่ม) | ฐานข้อมูลจะถูกแก้ตอน backend สตาร์ท · **ขั้น ค. (backup) ห้ามข้าม** · ย้อนโค้ดแล้วฐานข้อมูลไม่ย้อนตาม |
| `M` (แก้ไฟล์ที่มีอยู่แล้ว) | **ไฟล์ที่ production รันไปแล้วจะไม่ถูกรันซ้ำ และ `migrate deploy` ไม่เตือนอะไรเลย** — สิ่งที่แก้จะไม่ถึงฐานข้อมูลจริง อ่าน commit ที่แก้ว่าย้ายของไปไว้ใน migration ใหม่ (`A`) หรือเปล่า · 26 ก.ย. 2026 เจอแบบนี้กับ `zz_category_image` — ย้ายไป `zz_category_templates_image` ที่เช็กก่อนว่ามีคอลัมน์หรือยัง จำลองประวัติเดียวกับ production แล้ว deploy ผ่านและข้ามได้ถูก |

### ข. ดึงโค้ด แล้วเช็ก `.env` — ก่อนแตะ container

`git pull` ยังไม่เปลี่ยนอะไรที่รันอยู่ · เว็บใช้โค้ดเก่าต่อจนถึงขั้น ง.

```bash
git pull origin main

# 1) ตัวแปรที่ compose อ้างถึงแต่ .env ไม่มี
docker compose config 2>&1 >/dev/null | grep -i "variable is not set" || echo "✓ ไม่มีตัวแปรที่ขาด"

# 2) ตัวแปรที่บังคับว่าต้องมี — ขาดตัวไหน compose หยุดพร้อมบอกชื่อ
docker compose config > /dev/null && echo "✓ compose ผ่าน"

# 3) ค่าที่ backend ต้องมีบน production (ไม่พิมพ์ค่า secret ออกมา)
docker compose config \
  | grep -E '^\s+(S3_ENDPOINT|S3_BUCKET|S3_ACCESS_KEY|S3_SECRET_KEY|S3_PUBLIC_URL|INTERNAL_API_SECRET|ERROR_SPIKE_THRESHOLD|SWAGGER_ENABLED):' \
  | sed -E '/: ""$/{s/: ""$/: ❌ ว่าง/;b};/(ERROR_SPIKE_THRESHOLD|SWAGGER_ENABLED)/b;s/: .+$/: ✓ มีค่า/'

# 4) URL ที่จะถูกอบลงไฟล์ JS
grep -E '^NEXT_PUBLIC_(API|SITE|IMAGE_BASE)_URL=' .env
```

| ต้องเห็น | ถ้าไม่ใช่ |
|---|---|
| `✓ ไม่มีตัวแปรที่ขาด` | เติมตัวที่ขึ้นชื่อใน `.env` |
| `✓ compose ผ่าน` | เติม `NEXT_PUBLIC_*` ตัวที่ error บอก |
| `S3_*` ครบ 5 ตัว และ `INTERNAL_API_SECRET` เป็น `✓ มีค่า` | backend จะไม่สตาร์ท (`env.validation.ts` บังคับเมื่อ `NODE_ENV=production`) |
| `ERROR_SPIKE_THRESHOLD` เป็นจำนวนเต็ม และ**ไม่ใช่ `"0"`** | 0 = เตือนตลอดเวลา (มีไว้ทดสอบ — `monitoring.md` ข้อ 12) · ตัวอักษร = backend ไม่สตาร์ท |
| `SWAGGER_ENABLED: "false"` | `"true"` เปิด API docs ให้ทุกคนดู — ใช้เฉพาะตอน debug |
| `NEXT_PUBLIC_*` เป็น `https://<โดเมน>…` | ค่าผิดตรงนี้หน้าเว็บจะดูปกติ แต่ล็อกอิน/อัปโหลด/ฟอร์มพัง — ดูข้อ 4.0 |

**เติม secret ที่ขาด** (ตัวอย่าง `INTERNAL_API_SECRET`):

```bash
grep -c '^INTERNAL_API_SECRET' .env      # ต้องได้ 0 — ถ้ามีบรรทัดว่างอยู่แล้วให้แก้บรรทัดนั้นแทน
printf '\nINTERNAL_API_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
```

hex ไม่มีตัวอักษรพิเศษที่ `.env` อาจอ่านเพี้ยน · `\n` ข้างหน้ากันกรณีบรรทัดสุดท้ายของ `.env`
ไม่มีขึ้นบรรทัดใหม่ แล้วค่าไปต่อท้ายบรรทัดก่อน · เติมแล้ว**รันข้อ 1–3 ซ้ำ**

> **เพิ่มตัวแปรที่บังคับตัวใหม่ในโค้ดเมื่อไหร่ ให้เพิ่มชื่อในรายการของข้อ 3 ด้วย** — รายการนี้ครบ
> ณ 26 ก.ย. 2026 เท่านั้น

### ค. สำรองฐานข้อมูล

```bash
read -rsp 'MySQL root password: ' MYSQL_ROOT_PASSWORD; echo; export MYSQL_ROOT_PASSWORD
./scripts/backup.sh
```

- บรรทัดสุดท้ายต้องเป็น `… ok <ขนาด> /srv/backups/muan/muan-<วันที่>.sql.gz` · `FAILED` = **หยุด ยังไม่ deploy**
- `[Warning] Using a password on the command line interface` เป็นปกติ ไม่ใช่ error
- `read -s` ทำให้รหัสผ่านไม่ค้างใน shell history
- ไม่ได้ล็อกอินเป็น root และเขียน `/srv/backups` ไม่ได้ → `BACKUP_DIR="$HOME/backups/muan" ./scripts/backup.sh`

### ง. Deploy

```bash
BUILDKIT_PROGRESS=plain docker compose up -d --build --force-recreate
```

`--force-recreate` และ `BUILDKIT_PROGRESS=plain` — เหตุผลอยู่ในข้อ 0 และ "เมื่อมีอะไรผิดพลาด" ·
image ใหม่ build เสร็จก่อนแล้วค่อยสลับ container แต่ช่วงสลับ + backend รัน migration
เว็บจะตอบไม่ได้ชั่วครู่ — เลือกเวลาที่คนเข้าน้อย

### จ. ตรวจหลัง deploy

```bash
docker compose ps
docker compose logs backend | grep "migrations found" | tail -1
ls -d backend/prisma/migrations/*/ | wc -l
curl -s https://<โดเมน>/api/v1/health; echo
curl -s https://<โดเมน>/api/v1/health/errors; echo
curl -s -o /dev/null -w '%{http_code}\n' https://<โดเมน>/api/docs
```

| ตรวจ | ที่ถูกต้อง |
|---|---|
| `docker compose ps` | สามตัว `Up (healthy)` · CREATED เป็น "minutes ago" (`health: starting` = รอแล้วดูใหม่) |
| `migrations found` เทียบ `wc -l` | เท่ากัน |
| `/api/v1/health` | `"status":"ok"` |
| `/api/v1/health/errors` | `"threshold"` ตรงกับ `.env` (หรือ 10 ถ้าไม่ได้ตั้ง) — ยืนยันว่าค่าจาก `.env` ถึง backend จริง |
| `/api/docs` | `404` |
| URL ที่อบในไฟล์ JS | ตามข้อ 4.0 — ได้ `https://<โดเมน>/api/v1` ค่าเดียว |
| ในเบราว์เซอร์ (incognito) | ล็อกอินหลังบ้าน **อัปโหลดรูปหนึ่งรูปแล้วเปิดดู** (ยืนยันค่า S3) · หน้าแรกและหน้าปีแสดงผลปกติ |
| ที่เหลือ | เช็กลิสต์ข้อ 4 · และ monitor ใน Better Stack ต้องเขียว (`monitoring.md`) |

### ฉ. ย้อนกลับ

```bash
git checkout "$(cat ~/muan-before-deploy.txt)"
BUILDKIT_PROGRESS=plain docker compose up -d --build --force-recreate
# แก้เสร็จแล้วกลับมาที่ main:  git checkout main && git pull origin main
```

**ย้อนได้แค่โค้ด** — ถ้าขั้น ก. มี migration `A` ฐานข้อมูลยังอยู่ในสภาพใหม่ · ถ้าโค้ดเก่าใช้กับ
schema ใหม่ไม่ได้ ให้กู้จาก backup ของขั้น ค. ด้วย `scripts/restore.sh` (ข้อ 6 — ต้อง `I_MEAN_IT=yes`
เพราะเขียนทับฐานข้อมูลจริง)

---

## เมื่อมีอะไรผิดพลาด

| อาการ | ตรวจตรงไหน |
|---|---|
| API ไม่ขึ้นเลย | `docker compose logs backend` — มักเป็น `JWT_SECRET` สั้นกว่า 32 ตัว หรือ `DATABASE_URL` ผิด |
| log ของ backend ขึ้น `Missing required environment variables: …` | เติมตัวที่ขึ้นชื่อใน `.env` แล้ว `docker compose up -d --force-recreate backend` — ไม่ต้อง build ใหม่ · รอบหน้าขั้น ข. ของ "Deploy รอบถัดไป" จับได้ก่อน |
| log ของ backend ขึ้น `ERROR_SPIKE_THRESHOLD must be a whole number` | แก้เป็นจำนวนเต็มใน `.env` แล้ว recreate backend แบบแถวบน |
| `docker compose` ทุกคำสั่ง (รวม `backup.sh`) ขึ้น `required variable NEXT_PUBLIC_… is missing a value` | เติมค่านั้นใน `.env` แล้วสั่งใหม่ |
| `/api/v1/health/errors` ตอบ 503 ทั้งที่ `serverErrors` เป็น 0 | `ERROR_SPIKE_THRESHOLD=0` ค้างจากการทดสอบ — แก้กลับเป็น 10 แล้ว recreate backend |
| เข้าเว็บได้แต่หลังบ้านล็อกอินแล้วเด้งออก | `CORS_ORIGINS` ไม่มีโดเมนจริง หรือเข้าผ่าน `www.` ที่ไม่ได้ใส่ไว้ |
| ล็อกอินหลังบ้านได้ แต่เปิดปีที่ยังเป็นร่างแล้วขึ้น 404 (เฉพาะตอนเข้าทาง `www.`) | Caddy เสิร์ฟ `www.` เป็นเว็บเองแทนที่จะ redirect — แยก block redirect ตาม `Caddyfile.example` ดูข้อ 3 |
| รูปขึ้น 400 ทั้งเว็บ | `NEXT_PUBLIC_IMAGE_BASE_URL` ไม่ตรงกับโฮสต์รูป → ต้อง build ใหม่ |
| อัปโหลดผ่านแต่รูปเปิดไม่ขึ้น (403) | ไฟล์ค้างจากก่อนแก้เป็น server-upload — ดูข้อ 2.1.1 |
| อัปโหลดผ่าน รูปเปิดไม่ขึ้น แต่ error เป็น `DNS_PROBE_POSSIBLE`/เชื่อมต่อไม่ได้เลย (ไม่ใช่ 403) | คนละเรื่องกับแถวบน — `NEXT_PUBLIC_IMAGE_BASE_URL`/`S3_PUBLIC_URL` ชี้ไปโดเมน `.cdn.` ที่ยังไม่ได้เปิด CDN ดูข้อ 1 |
| อัปโหลดปฏิเสธตรงๆ (error ขึ้นทันที) | อ่านข้อความจาก API ตรงๆ — บอกชนิดไฟล์/ขนาด/bucket ต่อไม่ติด |
| หน้าเว็บไม่อัปเดตหลังกดบันทึก | `REVALIDATE_SECRET` สองฝั่งไม่ตรงกัน |
| ฟอร์มส่งรายชื่อโดน 429 ทั้งที่คนละคน | `trust proxy` ไม่ทำงาน — Caddy ต้องส่ง `X-Forwarded-For` |
| `docker compose up --build` จบด้วย `panic: runtime error: makeslice: len out of range` ใน `progressui`/`vt100` | **ไม่ใช่ build พัง** — ดูข้อล่าง |

### build จบด้วย panic ใน progressui / vt100

```
panic: runtime error: makeslice: len out of range
github.com/tonistiigi/vt100.NewVT100(0x6, 0xfffffffffffffff8)
```

ตัวที่พังคือ **ตัวแสดงความคืบหน้าแบบกราฟิกของ buildx** ไม่ใช่ตัว build เอง —
`NewVT100(6, -8)` คือมันถามความกว้างของ terminal แล้วได้ค่า 0 (session ที่ไม่มีขนาดจริง
เช่น ต่อผ่าน SSH ที่ไม่ได้ขอ TTY, รันผ่านตัวช่วยบางตัว, หรือหน้าต่างถูกย่อระหว่าง build)
แล้วเอาไปลบเป็นค่าติดลบ · สังเกตว่าบรรทัดก่อน panic มักขึ้น `Building (30/30)` แล้ว —
**image ส่วนใหญ่ build เสร็จไปแล้ว** แต่คำสั่งตายก่อนจะได้สั่ง `up`

แก้ด้วยการสั่งไม่ให้ใช้ตัวแสดงผลแบบนั้น:

```bash
BUILDKIT_PROGRESS=plain docker compose up -d --build --force-recreate
```

(หรือ `docker compose up -d --build --force-recreate --progress plain` · `plain` พิมพ์ log
ทีละบรรทัด ไม่ต้องรู้ความกว้างจอ จึงไม่มีทางพังแบบนี้ และอ่านย้อนหลังได้ดีกว่าเวลา build ล้ม)

ตรวจว่าขึ้นจริงหลังจากนั้น:

```bash
docker compose ps                                          # ต้อง Up ทั้งสามตัว
docker compose logs backend | grep "migrations found" | tail -1
```

---

## 6.1 กฎเวลาเขียน migration ที่แตะข้อความในคอลัมน์ JSON

**ห้ามใช้ `CHAR(10)` เปล่า ๆ ข้างใน `JSON_OBJECT` / `JSON_SET` / `JSON_ARRAY_APPEND`**
ให้เขียน `CHAR(10 USING utf8mb4)` หรือใช้ `'\n'` ในสตริงแทน

`CHAR()` คืนค่าเป็นสตริง **binary** · `CONCAT` ที่มี argument เป็น binary จะคืน binary ทั้งก้อน ·
และ JSON ที่ได้ค่าเป็น binary จะเก็บเป็น **opaque scalar** แล้วแสดงผลออกมาเป็นข้อความ
`base64:type15:4LuA4Lqb…` แทนตัวหนังสือจริง — MySQL ไม่ฟ้อง error ใด ๆ

```sql
SELECT JSON_OBJECT('a', CONCAT('ກ', CHAR(10), 'ຂ'));
-- {"a": "base64:type15:4LqBCuC6gg=="}          ← พัง
SELECT JSON_OBJECT('a', CONCAT('ກ', CHAR(10 USING utf8mb4), 'ຂ'));
-- {"a": "ກ\nຂ"}                                ← ถูก
```

เกิดขึ้นจริงกับ `16_faq_policy_answers` (คำตอบ FAQ 2 ข้อกลายเป็น base64 บนเว็บที่ deploy
แล้ว) แก้ด้วย `zz_repair_faq_answer_encoding` · **การเขียนลงคอลัมน์ TEXT/VARCHAR
ตรง ๆ ไม่มีปัญหานี้** (ไบต์เป็น UTF-8 อยู่แล้ว) — เฉพาะตอนค่าถูกยัดเข้า JSON เท่านั้น

> เทสต์จับบั๊กนี้ไม่ได้ เพราะชุดทดสอบสร้างแถว `site_settings` ของตัวเอง ส่วน migration
> ตัวที่พังทำงานเฉพาะกับแถวที่ **มีอยู่ก่อนแล้ว** — จับได้ทางเดียวคืออ่าน SQL ตอนเขียน

## 6.2 ตั้งชื่อโฟลเดอร์ migration ใหม่เป็น `zzz_<timestamp>_<ชื่อ>`

Prisma รัน migration **เรียงตามชื่อโฟลเดอร์แบบตัวอักษร** ไม่ใช่ตามวันที่สร้าง ชื่อที่มีอยู่ตอนนี้จึงเรียงแบบนี้
บนฐานข้อมูลใหม่ (CI, เครื่อง dev ที่เพิ่ง clone):

```
0_init → 10_… → 11_… → … → 19_… → 1_edition_activities → 20_… → 2_… → … → 9_… → zz_*
```

`10_` รันก่อน `1_` และ `zz_*` เรียงกันเองตามตัวอักษรของชื่อ — ต่างจากลำดับที่ production รันจริง
(ทีละตัวตามวันที่ deploy) ตอนนี้ยังไม่พังเพราะ migration แต่ละตัวไม่ได้พึ่งกัน และ CI รันจากศูนย์ทุกครั้งเลยพิสูจน์ได้

**ชื่อ default ของ Prisma (`20260926143000_x`) ก็ใช้ไม่ได้** — ขึ้นต้นด้วย `2` จึงไปแทรกอยู่ระหว่าง `1_…` กับ `20_…`
แล้วรัน**ก่อน** `2_`–`9_` และ `zz_*` ทั้งหมด ถ้า migration ใหม่แตะตารางหรือคอลัมน์ที่ตัวพวกนั้นสร้าง
ฐานข้อมูลใหม่จะ migrate ไม่ผ่าน

**กติกา: migration ใหม่ทุกตัวขึ้นต้นด้วย `zzz_` ตามด้วย timestamp** — `zzz_` เรียงหลังทุกชื่อที่มีอยู่
และ timestamp ทำให้ตัวใหม่ ๆ เรียงตามเวลาที่สร้างเสมอ

```bash
cd backend
npx prisma migrate dev --create-only --name add_something   # สร้างโฟลเดอร์ แต่ยังไม่ apply
mv prisma/migrations/20260926143000_add_something prisma/migrations/zzz_20260926143000_add_something
npx prisma migrate dev                                       # apply ด้วยชื่อใหม่
```

`--create-only` สำคัญ — ถ้า apply ไปก่อนแล้วค่อยเปลี่ยนชื่อ ฐานข้อมูล dev จะจำชื่อเก่าไว้แล้วมองว่าเป็นคนละ migration

> **ห้ามเปลี่ยนชื่อโฟลเดอร์ที่มีอยู่แล้ว** — production บันทึกชื่อไว้ในตาราง `_prisma_migrations`
> เปลี่ยนเมื่อไหร่ `migrate deploy` จะมองเป็น migration ใหม่แล้วพยายามรันซ้ำ ตัวที่ `ALTER TABLE ADD COLUMN`
> จะ error และ backend จะ start ไม่ขึ้น

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
