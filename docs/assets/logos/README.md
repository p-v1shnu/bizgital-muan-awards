# Brand Assets — โลโก้ Muan Awards

ไฟล์ต้นฉบับที่ทีมส่งมา (13 ส.ค. 2026) — แตกจาก `Logos.zip` และเปลี่ยนชื่อไฟล์เป็น kebab-case

## รูปแบบโลโก้ 4 แบบ × 3 สี

| แบบ | องค์ประกอบ | ขนาดต้นฉบับ | สัดส่วน |
|---|---|---|---|
| **main** | brandmark + tagline ลาว + wordmark (แนวตั้ง) | 1481 × 1481 | 1:1 |
| **brandmark** | สัญลักษณ์ "ມ" อย่างเดียว ไม่มีตัวอักษร | 1480 × 1481 | 1:1 |
| **horizontal** | brandmark + wordmark วางข้างกัน | 2251 × 1025 | ~2.2:1 |
| **wordmark** | tagline + ตัวอักษร the MUAN AWARDS อย่างเดียว | 2251 × 1025 | ~2.2:1 |

สีที่มี: `full-color` (ไล่เฉด holographic ชมพู-ม่วง), `black`, `white` — ทุกไฟล์เป็น PNG RGBA พื้นหลังโปร่งใส

## การใช้งานบนเว็บ (เสนอ — รอยืนยัน)

| ตำแหน่ง | ไฟล์ที่ใช้ |
|---|---|
| Nav bar (desktop) | `horizontal-black` หรือ `horizontal-white` ตามพื้นหลัง |
| Nav bar (mobile) | `brandmark-*` (ประหยัดพื้นที่) |
| Footer | `horizontal-white` (บนพื้นเข้ม) |
| Favicon / app icon | `brandmark-*` — **ต้องทำเวอร์ชันย่อ (simplified)** ดูข้อจำกัดด้านล่าง |
| OG image (แชร์ Facebook) | `main-full-color` บนพื้นหลังกลางของแบรนด์ |
| หน้าปีที่มี key visual รายปี | `full-color` ใช้ได้ตามอัตลักษณ์ปีนั้น |

## ข้อจำกัดที่ต้องแก้ก่อนเริ่มพัฒนา

1. **ไม่มีไฟล์เวกเตอร์** — มีแต่ PNG ต้องขอ SVG / AI / EPS สำหรับโลโก้บน nav และ favicon (PNG จะเบลอบนจอ retina และไฟล์ใหญ่เกินจำเป็น)
2. **brandmark ซับซ้อนเกินไปสำหรับ favicon** — เป็นลายเส้นบางจำนวนมาก ที่ขนาด 32×32 px จะกลายเป็นก้อนเลอะ ต้องมีเวอร์ชันย่อที่ตัดรายละเอียดออก
3. **`full-color` เป็นเฉด holographic อ่อน** — คอนทราสต์ต่ำบนพื้นขาว ตามทิศทางข้อ 6.0 (โทนกลาง) ควรใช้ `black`/`white` เป็นหลักในส่วน chrome ของเว็บ (nav/footer) และเก็บ `full-color` ไว้ใช้จุดที่ต้องการเน้น
