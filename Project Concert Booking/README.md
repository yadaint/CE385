# 🎟️ BOOKING TICKET CONCERT — ระบบจองตั๋วคอนเสิร์ตออนไลน์

ระบบจองตั๋วคอนเสิร์ตแบบ Full Stack ภาษาไทยทั้งระบบ พร้อม**ผังที่นั่งรายที่นั่ง เลือกโซนราคาไม่เท่ากัน ชำระเงินแนบสลิปรอแอดมินตรวจสอบ** และจองพร้อมกันอย่างปลอดภัยด้วย **Prisma Interactive Transaction**

## ระบบแยกชัดเจน 2 ส่วน

| ระบบ | ฟีเจอร์ |
| --- | --- |
| 👤 **ผู้ใช้ทั่วไป (USER)** | สมัครสมาชิก → เข้าสู่ระบบ → เลือกคอนเสิร์ต/โซน/ที่นั่ง → จอง → **ชำระเงินแนบสลิป** → รอตรวจสอบ → เมื่อแอดมินอนุมัติ ขึ้น **"จองสำเร็จ"** พร้อม**รูปหน้าตั๋ว** · เช็คสถานะบัตรได้ทุกเมื่อ (เช็คตั๋ว / ตั๋วของฉัน) |
| 🛠️ **แอดมิน (ADMIN)** | **ไม่มีการจอง** — ดูแลหลังบ้านทั้งหมด: สถิติภาพรวม (รายได้/การจอง/ผู้ใช้), ตรวจสลิป อนุมัติ/ปฏิเสธพร้อมเหตุผล, การจองทั้งหมดของทุกผู้ใช้, สร้างคอนเสิร์ตใหม่ |

## Tech Stack

| Layer   | Technologies                                                    |
| ------- | --------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Zod, Tailwind CSS, Axios, React Router, Vite |
| Backend  | Node.js, Express, TypeScript, Zod, Prisma ORM, PostgreSQL, JWT, bcrypt |

## Project Structure

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # User / Concert / Zone / Seat / Booking / Payment models
│   │   └── seed.ts              # ข้อมูลตัวอย่าง + บัญชี demo
│   ├── uploads/slips/           # สลิปที่ผู้ใช้อัปโหลด (เสิร์ฟผ่าน /uploads)
│   └── src/
│       ├── app.ts               # Express app + static /uploads + middleware
│       ├── server.ts            # HTTP server + graceful shutdown
│       ├── config/env.ts        # validate .env ด้วย Zod
│       ├── config/upload.ts     # Multer (อัปโหลดสลิป, จำกัดชนิด/ขนาดไฟล์)
│       ├── lib/prisma.ts        # PrismaClient singleton
│       ├── errors/AppError.ts   # HttpError class
│       ├── types/express.d.ts   # เพิ่ม req.user ให้ Express Request
│       ├── utils/asyncHandler.ts · utils/seats.ts (generate ที่นั่ง)
│       ├── middlewares/         # auth (JWT), authorize, validate (Zod), error handler
│       ├── schemas/             # Zod request schemas (auth / concert / booking / admin)
│       ├── controllers/         # auth / concert / booking / admin logic
│       └── routes/              # /auth /concerts /bookings /admin
└── frontend/
    └── src/
        ├── App.tsx              # Router + layout
        ├── main.tsx
        ├── context/AuthContext.tsx
        ├── services/            # api.ts (Axios instance + interceptors) + services
        ├── schemas/             # Zod validation ฝั่ง client
        ├── utils/               # format (THB/date), validation helpers
        ├── components/          # Navbar, ConcertCard, ProtectedRoute, ...
        └── pages/               # Login, Register, Home, Detail, MyBookings, Admin
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (ถ้าไม่มี ใช้ Docker ได้: `docker run --name concert-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=concert_booking -p 5432:5432 -d postgres:16`)

### 1) Backend

```bash
cd backend
npm install
npx prisma migrate dev      # สร้างตารางในฐานข้อมูล
npm run prisma:seed         # สร้างข้อมูลตัวอย่าง + บัญชี demo
npm run dev                 # รันที่ http://localhost:4000
```

> ✅ **บนเครื่องนี้ตั้งค่าไว้แล้ว**: `backend/.env` ชี้ไปที่ PostgreSQL 17 ที่ติดตั้งไว้ (`localhost:5433`) ฐานข้อมูล `concert_booking` ถูกสร้าง, migrate (`prisma/migrations/20261107080356_init`) และ seed เรียบร้อยแล้ว แค่ `npm run dev` ก็ใช้งานได้ทันที
>
> หมายเหตุ: ชื่อตารางใน PostgreSQL เป็น PascalCase ตามชื่อ Model (`"User"`, `"Concert"`, `"Booking"`) หากจะเขียน SQL ตรง ๆ ให้คร่อมด้วยเครื่องหมายคำพูด หรือจะเพิ่ม `@@map` ใน schema เพื่อเปลี่ยนเป็น snake_case ก็ได้

### 2) Frontend

```bash
cd frontend
npm install
npm run dev                 # รันที่ http://localhost:5173
```

> `frontend/.env` (VITE_API_BASE_URL) ตั้งค่าไว้แล้วให้ชี้มาที่ API ของ backend เครื่องนี้

## Demo Accounts (จาก seed)

| Role  | Email                | Password   |
| ----- | -------------------- | ---------- |
| ADMIN | admin@concerthub.dev | Admin1234  |
| USER  | user@concerthub.dev  | User1234   |

> 🔐 บัญชี ADMIN สร้างได้เฉพาะจาก seed เท่านั้น (ผู้สมัครใหม่ผ่าน `/register` จะได้ role `USER` เสมอ ซึ่งเป็นแนวปฏิบัติที่ปลอดภัย)
>
> 💬 ข้อความทั้งหมดของระบบ (หน้าเว็บ, ข้อความ error/success จาก API, วันที่แบบ พ.ศ.) เป็นภาษาไทยทั้งหมด

## API Endpoints (base: `/api/v1`)

| Method | Path                    | Description                        | Auth          |
| ------ | ----------------------- | ---------------------------------- | ------------- |
| POST   | `/auth/register`        | สมัครสมาชิก (bcrypt hashing)       | Public        |
| POST   | `/auth/login`           | เข้าสู่ระบบ → คืนค่า JWT           | Public        |
| GET    | `/auth/me`              | ข้อมูลผู้ใช้ปัจจุบัน                | JWT           |
| GET    | `/concerts`             | รายการคอนเสิร์ต (กรองได้: `?origin=THAI&artistType=SOLO`) | Public  |
| GET    | `/concerts/:id`         | รายละเอียดคอนเสิร์ต + ผังที่นั่งรายที่นั่ง | Public        |
| POST   | `/concerts`             | สร้างคอนเสิร์ต + โซนที่นั่งหลายโซน  | ADMIN         |
| POST   | `/bookings`             | จองตั๋ว (body: `seatIds`) → สถานะ "รอชำระเงิน" — Interactive Transaction | JWT (USER) |
| POST   | `/bookings/:id/slip`    | แนบสลิปการชำระเงิน (multipart: `slipImage`) → รอตรวจสอบ | JWT (เจ้าของ, USER) |
| GET    | `/bookings/check/:id`   | เช็คสถานะตั๋ว + สถานะสลิปด้วยรหัสการจอง | Public        |
| GET    | `/bookings/my-bookings` | ประวัติการจองของตัวเอง + สลิป            | JWT           |
| PATCH  | `/bookings/:id/cancel`  | ยกเลิกการจอง + คืนที่นั่ง                | JWT (USER, เจ้าของ) |
| GET    | `/admin/stats`          | สถิติภาพรวม (รายได้, การจอง, ผู้ใช้)     | ADMIN         |
| GET    | `/admin/bookings`       | การจองทั้งหมดของทุกผู้ใช้ (กรอง `?status=`) | ADMIN      |
| GET    | `/admin/payments`       | สลิปทั้งหมด (กรอง `?status=`)            | ADMIN         |
| PATCH  | `/admin/payments/:id/approve` | อนุมัติสลิป → บัตร "จองสำเร็จ"     | ADMIN         |
| PATCH  | `/admin/payments/:id/reject`  | ปฏิเสธสลิป (ระบุเหตุผลได้)        | ADMIN         |

## Key Implementation Notes

- **ระบบชำระเงินแนบสลิป** — จองแล้วบัตรอยู่สถานะ `PENDING` (ที่นั่งถูกถือไว้) → ผู้ใช้อัปโหลดสลิป (Multer: เฉพาะ JPG/PNG/WEBP, ≤ 5MB, เก็บที่ `backend/uploads/slips/`) → สถานะ `PENDING_VERIFICATION` → แอดมินอนุมัติ → `COMPLETED` และแสดง**รูปหน้าตั๋ว** / ปฏิเสธ → `REJECTED` พร้อมเหตุผล ผู้ใช้ส่งสลิปใหม่ได้ การอนุมัติ/ปฏิเสธทำใน transaction พร้อมบันทึกว่าใครตรวจ (`reviewedBy`)
- **แบ่งสิทธิ์ชัดเจน** — USER จอง/ส่งสลิป/ยกเลิก (แอดมินจองไม่ได้ → 403), ADMIN เข้าถึงหลังบ้าน `/admin/*` ทั้งหมด (สถิติ, สลิป, การจองทุกคน, สร้างคอนเสิร์ต)
- **โซนที่นั่งราคาไม่เท่ากัน + เลือกที่นั่งรายที่นั่ง** — แต่ละคอนเสิร์ตมีหลาย `Zone` (เช่น VIP, Platinum, Gold, Standing, Balcony) โซนละราคาและ seat pool ของตัวเอง พร้อมตำแหน่งบนผัง (`side` = ซ้าย/กลาง/ขวา, `sortOrder` = เลขแถว, `wide` = โซนกว้าง) หน้าเว็บแสดง**ผังที่นั่งทั้งหมดแบบผังสนามจริง** ให้เลือกโซน → คลิกเลือกที่นั่งเฉพาะตัว → คิดราคาตามโซน × จำนวนที่นั่งที่เลือก (สูงสุด 10 ที่นั่ง/การจอง, ต้องอยู่โซนเดียวกัน)
- **ประเภทคอนเสิร์ต + หน้าเช็คตั๋ว** — คอนเสิร์ตมี `origin` (คอนไทย/คอนต่างประเทศ) และ `artistType` (คอนเดี่ยว/คอนกลุ่ม) หน้าแรกมีแถบกรองที่กรองฝั่ง API (`?origin=...&artistType=...`) และมีเมนู "เช็คตั๋ว" ให้ตรวจสถานะบัตรด้วยรหัสการจองแบบไม่ต้องเข้าสู่ระบบ (`GET /bookings/check/:id` — ไม่เปิดเผยข้อมูลส่วนตัวผู้จอง)
- **ที่นั่งไม่มีทางซ้ำ/ติดลบ (No overselling)** — `POST /bookings` รับ `seatIds` แล้วใช้ `prisma.$transaction` ระดับ isolation `SERIALIZABLE`: โหลดที่นั่งทั้งหมด → ตรวจว่าอยู่โซนเดียวกันและว่างจริง (`isAvailable`) → mark ที่นั่งเป็น taken → decrement ตัวนับโซน → สร้าง Booking + BookingSeat ภายใน transaction เดียว ถ้า DB ยกเลิกเพราะ concurrent write (error `P2034`) จะ retry อัตโนมัติสูงสุด 3 ครั้ง การยกเลิกจองปล่อยที่นั่งเดิมคืน (`isAvailable: true` + คืนตัวนับโซน) แบบ atomic
- **JWT + bcrypt** — รหัสผ่านถูก hash ด้วย bcrypt (12 rounds), middleware `authenticate` ตรวจ token และดึง role จาก DB ทุกครั้ง, `authorize("ADMIN")` ป้องกันเส้นทางสำหรับแอดมิน
- **Zod ทั้งสองฝั่ง** — backend validate request body/params; frontend validate ฟอร์มก่อนส่ง เพื่อ UX ที่ดีและ defense-in-depth
- **Axios Interceptor** — แนบ `Authorization: Bearer <token>` อัตโนมัติจาก localStorage และ logout + redirect ไปหน้า login เมื่อได้รับ 401
- **Session restore** — ตอนเปิดเว็บ frontend จะเรียก `GET /auth/me` เพื่อตรวจว่า token ยังใช้ได้จริงก่อนแสดงสถานะ logged-in

## Scripts

| Command                 | Project  | Description              |
| ----------------------- | -------- | ------------------------ |
| `npm run dev`           | backend  | รัน dev server (nodemon) |
| `npm run build`         | backend  | คอมไพล์ TypeScript       |
| `npm run prisma:migrate`| backend  | สร้าง/อัปเดตตาราง        |
| `npm run prisma:seed`   | backend  | สร้างข้อมูลตัวอย่าง      |
| `npm run dev`           | frontend | รัน Vite dev server      |
| `npm run build`         | frontend | typecheck + production build |
