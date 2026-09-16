# BuildFit Backend

Backend แยกสำหรับคลังสินค้า PC Affiliate และ Compatibility engine ใช้ D1 เก็บข้อมูล และ R2 เก็บรูปสินค้า

## Local

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000/admin` เพื่อจัดการสินค้า

## Admin

- เข้าสู่ระบบด้วยบัญชี CMS และ session cookie แบบ HttpOnly
- บัญชีใหม่ต้องรอ `manatdev` อนุมัติก่อนใช้งาน
- บัญชีหลักลบไม่ได้ และสามารถอนุมัติหรือลบบัญชีอื่นได้
- ตั้งรหัสเริ่มต้นผ่าน `BOOTSTRAP_ADMIN_PASSWORD` โดยไม่เก็บรหัสผ่านใน source
- เพิ่มและแก้ไขสินค้าในฟอร์มเดียว
- เลือกหมวด CPU, Mainboard, GPU, Memory, Storage, PSU, Case หรือ Cooler
- ฟอร์มคุณสมบัติเปลี่ยนตามหมวดหมู่อัตโนมัติ
- เพิ่มชนิดข้อมูลและตัวเลือกใหม่ เช่น Socket / LGA1700 / AM5 / DDR4 / DDR5
- อัปโหลดรูปแบบ Dropzone ไปยัง R2
- เก็บร้าน ราคา และ Affiliate URL ของสินค้าที่ผู้ดูแลเลือกร้านเอง

## Public API

- `GET /api/v1/health`
- `GET /api/v1/products?category=cpu&sort=price_asc`
- `GET /api/v1/products/:slug`
- `GET /api/v1/schema`
- `POST /api/v1/compatibility/check`
- `GET /api/v1/images/:key`

ตัวอย่างตรวจความเข้ากันได้:

```json
{
  "items": [
    { "category": "cpu", "attributes": { "socket": "am5", "memory_type": ["ddr5"] } },
    { "category": "motherboard", "attributes": { "socket": "am5", "memory_type": ["ddr5"] } }
  ]
}
```

## Data

Schema อยู่ที่ `db/schema.ts` และ migration อยู่ใน `drizzle/` ข้อมูล mock จะถูก seed อัตโนมัติใน environment ใหม่

Admin บน production ใช้ระบบ login ของ CMS เอง ส่วน public API อ่านได้โดยไม่ต้องล็อกอิน

## Cloudflare Git Deploy

โปรเจ็กต์นี้ใช้ Cloudflare Workers runtime, D1 และ R2 จึงเหมาะกับ Cloudflare มากกว่า Vercel แบบตรง ๆ

ตั้งค่าใน Cloudflare app:

```bash
Build command: npm run build
Deploy command: cd dist/server && npx wrangler deploy --config wrangler.json
```

Environment variables ที่ต้องตั้งใน Cloudflare:

```text
NODE_VERSION=22.13.0
BOOTSTRAP_ADMIN_PASSWORD=<owner password>
CLOUDFLARE_D1_DATABASE_ID=<D1 database id>
CLOUDFLARE_D1_DATABASE_NAME=pcbuild-cms-db
CLOUDFLARE_R2_BUCKET_NAME=pcbuild-product-images
```

Binding names ที่โค้ดใช้:

```text
DB -> D1 database
PRODUCT_IMAGES -> R2 bucket
```

`npm run build` จะสร้าง `dist/server/wrangler.json` แล้ว `scripts/patch-cloudflare-deploy.mjs`
จะ patch D1/R2 ในไฟล์นั้นจาก environment variables ด้านบนก่อน deploy
