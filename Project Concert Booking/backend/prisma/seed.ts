import fs from "fs";
import path from "path";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { buildSeatRows } from "../src/utils/seats";

const prisma = new PrismaClient();

/* ─── สถานที่จัดคอนเสิร์ต + ผังโซน FIX ประจำสถานที่ ─────────────────────────
 * ผังของแต่ละสถานที่ตายตัว (โซนไหน แถวไหน ฝั่งไหน กี่แถว แถวละกี่ที่นั่ง)
 * basePrice = ราคาพื้นฐานประกอบการคำนวณราคาของแต่ละคอนเสิร์ต (× priceMultiplier)
 */
/** ผังมาตรฐาน — ใช้ร่วมกันทุกสถานที่ (Standard End Stage: โซนยืนชิดเวที → ที่นั่งไล่หลัง) */
const STANDARD_ZONES: Array<{
  name: string;
  code: string;
  side: "LEFT" | "CENTER" | "RIGHT";
  wide: boolean;
  mapRow: number;
  rowCount: number;
  seatsPerRow: number;
  basePrice: number;
}> = [
  { name: "Standing", code: "ST", side: "CENTER", wide: true, mapRow: 1, rowCount: 8, seatsPerRow: 20, basePrice: 1500 },
  { name: "VIP", code: "VP", side: "CENTER", wide: false, mapRow: 2, rowCount: 3, seatsPerRow: 12, basePrice: 6500 },
  { name: "Platinum L", code: "PA", side: "LEFT", wide: false, mapRow: 3, rowCount: 4, seatsPerRow: 8, basePrice: 4500 },
  { name: "Platinum R", code: "PB", side: "RIGHT", wide: false, mapRow: 3, rowCount: 4, seatsPerRow: 8, basePrice: 4500 },
  { name: "Gold L", code: "GA", side: "LEFT", wide: false, mapRow: 4, rowCount: 5, seatsPerRow: 10, basePrice: 3000 },
  { name: "Gold C", code: "GD", side: "CENTER", wide: false, mapRow: 4, rowCount: 5, seatsPerRow: 12, basePrice: 3200 },
  { name: "Gold R", code: "GC", side: "RIGHT", wide: false, mapRow: 4, rowCount: 5, seatsPerRow: 10, basePrice: 3000 },
  { name: "Silver L", code: "SA", side: "LEFT", wide: false, mapRow: 5, rowCount: 6, seatsPerRow: 10, basePrice: 2000 },
  { name: "Silver R", code: "SB", side: "RIGHT", wide: false, mapRow: 5, rowCount: 6, seatsPerRow: 10, basePrice: 2000 },
  { name: "Balcony L", code: "BA", side: "LEFT", wide: false, mapRow: 6, rowCount: 4, seatsPerRow: 10, basePrice: 1000 },
  { name: "Balcony R", code: "BB", side: "RIGHT", wide: false, mapRow: 6, rowCount: 4, seatsPerRow: 10, basePrice: 1000 },
];

const SEED_VENUES: Array<{
  name: string;
  zones: Array<{
    name: string;
    code: string;
    side: "LEFT" | "CENTER" | "RIGHT";
    wide: boolean;
    mapRow: number;
    rowCount: number;
    seatsPerRow: number;
    basePrice: number;
  }>;
}> = [
  {
    // ผังมาตรฐานเดียวกันทุกสถานที่ — สนามกีฬากลางแจ้ง
    name: "รามอินทรา สเตเดียม กรุงเทพฯ",
    zones: STANDARD_ZONES,
  },
  {
    // ผังมาตรฐานเดียวกันทุกสถานที่ — อารีน่าในร่ม
    name: "อิมแพ็ค อารีน่า เมืองทองธานี",
    zones: STANDARD_ZONES,
  },
  {
    // ผังมาตรฐานเดียวกันทุกสถานที่ — ฮอลล์ชายหาด
    name: "สกายบีชฮอลล์ พัทยา",
    zones: STANDARD_ZONES,
  },
  {
    // ผังมาตรฐานเดียวกันทุกสถานที่ — หอประชุม
    name: "ศูนย์วัฒนธรรมแห่งประเทศไทย กรุงเทพฯ",
    zones: STANDARD_ZONES,
  },
  {
    // ผังมาตรฐานเดียวกันทุกสถานที่ — เฟสติวัลกลางแจ้ง
    name: "สิงห์ปาร์ค เชียงราย",
    zones: STANDARD_ZONES,
  },
];

type SaleStatus = "OPEN" | "DRAFT" | "SOLD_OUT";

const SEED_CONCERTS: Array<{
  name: string;
  nameEn: string;
  description: string;
  dates: Date[];
  venueName: string;
  priceMultiplier: number;
  origin: "THAI" | "INTERNATIONAL";
  artistType: "SOLO" | "GROUP";
  emoji: string;
  imageUrl: string;
  /** รหัสโซนที่ "ไม่เปิดขาย" สำหรับคอนเสิร์ตนี้ (แสดงเป็นสีเทาบนผัง) */
  offSaleCodes: string[];
  /** สถานะการขาย — ปกติ OPEN, มี DRAFT (แบบร่าง) และ SOLD_OUT (บัตรหมด) ให้เห็นกรณีศึกษา */
  saleStatus?: SaleStatus;
}> = [
  {
    name: "คอนเสิร์ตตำนานร็อค 2026",
    nameEn: "Rock Legend Live 2026",
    description:
      "ค่ำคืนร็อคที่ยิ่งใหญ่ที่สุดแห่งปี รวมศิลปินระดับตำนานจากทั่วโลก เตรียมพบกับพลังของดนตรีร็อคสุดมันส์ จอ LED ยักษ์ และโชว์แสงสุดอลังการ",
    dates: [new Date("2026-12-12T19:00:00.000Z"), new Date("2026-12-13T19:00:00.000Z")],
    venueName: "รามอินทรา สเตเดียม กรุงเทพฯ",
    priceMultiplier: 1.2,
    origin: "THAI",
    artistType: "GROUP",
    emoji: "🎸",
    imageUrl: "/uploads/covers/cover-rock.svg",
    offSaleCodes: ["BA", "BB"], // ดาดฟ้าปิดปรับปรุง — โชว์โซนสีเทาบนผัง
  },
  {
    name: "เทศกาล EDM — NEON PULSE",
    nameEn: "NEON PULSE EDM Festival",
    description:
      "เทศกาลดนตรี EDM ที่ใหญ่ที่สุดในไทยกลับมาอีกครั้ง พร้อมดีเจระดับโลก สเตจดีไซน์สุดอลังการ และบรรยากาศนีออนสุดฮิปโนติกยาวจนถึงเที่ยงคืน",
    dates: [new Date("2027-01-09T17:00:00.000Z")],
    venueName: "อิมแพ็ค อารีน่า เมืองทองธานี",
    priceMultiplier: 1.1,
    origin: "INTERNATIONAL",
    artistType: "GROUP",
    emoji: "🎧",
    imageUrl: "/uploads/covers/cover-edm.svg",
    offSaleCodes: [],
  },
  {
    name: "คอนเสิร์ตเดี่ยว แจ๊สใต้แสงดาว",
    nameEn: "Jazz Under the Stars",
    description:
      "คอนเสิร์ตเดี่ยวของนักร้องแจ๊สระดับตำนาน ขับกล่อมด้วยเสียงร้องอันละมุน สมทบด้วยวงบิ๊กแบนด์สด กลางแจ้งใต้ท้องฟ้ายามค่ำคืน พร้อมอาหารฝีมือเลิศ",
    dates: [new Date("2026-12-24T18:30:00.000Z")],
    venueName: "สกายบีชฮอลล์ พัทยา",
    priceMultiplier: 0.9,
    origin: "THAI",
    artistType: "SOLO",
    emoji: "🎤",
    imageUrl: "/uploads/covers/cover-jazz.svg",
    offSaleCodes: [],
  },
  {
    name: "คอนเสิร์ต K-POP WAVE",
    nameEn: "K-POP WAVE Live in Bangkok",
    description:
      "ไอดอล K-POP คนโปรดของคุณพร้อมโชว์เพลงฮิตในคอนเสิร์ตเดียว บูธของสะสมทางการเปิดตั้งแต่ 14:00 น.",
    dates: [
      new Date("2027-02-14T16:00:00.000Z"),
      new Date("2027-02-15T16:00:00.000Z"),
      new Date("2027-02-16T16:00:00.000Z"),
    ],
    venueName: "อิมแพ็ค อารีน่า เมืองทองธานี",
    priceMultiplier: 1.3,
    origin: "INTERNATIONAL",
    artistType: "GROUP",
    emoji: "💜",
    imageUrl: "/uploads/covers/cover-kpop.svg",
    offSaleCodes: [],
  },
  {
    name: "คอนเสิร์ตเดี่ยวเปียโนคลาสสิก — ค่ำคืนบทเพลงอมตะ",
    nameEn: "Timeless Classics — Piano Recital",
    description:
      "คอนเสิร์ตเดี่ยวเปียโนโดยนักเปียโนระดับโลก บรรเลงบทเพลงคลาสสิกอมตะของ Beethoven และ Chopin ในห้องแสดงดนตรีที่มีคุณภาพเสียงสมบูรณ์แบบ",
    dates: [new Date("2027-01-30T19:30:00.000Z")],
    venueName: "ศูนย์วัฒนธรรมแห่งประเทศไทย กรุงเทพฯ",
    priceMultiplier: 0.8,
    origin: "INTERNATIONAL",
    artistType: "SOLO",
    emoji: "🎹",
    imageUrl: "/uploads/covers/cover-piano.svg",
    offSaleCodes: [],
  },
  {
    name: "อินดี้ซันไรส์ เฟสติวัล",
    nameEn: "Indie Sunrise Festival",
    description:
      "สองสเตจ ยี่สิบวงอินดี้ และไฟนาเล่สุดอบอุ่นพร้อมแสงเช้า เต็นท์แคมป์ รถเข็นอาหาร และอาร์ตอินสตอลล์ทั้งคืน",
    dates: [new Date("2027-03-07T15:00:00.000Z"), new Date("2027-03-08T15:00:00.000Z")],
    venueName: "สิงห์ปาร์ค เชียงราย",
    priceMultiplier: 0.6,
    origin: "THAI",
    artistType: "GROUP",
    emoji: "🌅",
    imageUrl: "/uploads/covers/cover-indie.svg",
    offSaleCodes: [],
    saleStatus: "DRAFT", // กรณีศึกษา: แบบร่าง — ยังไม่เปิดขาย ผู้ใช้ทั่วไปมองไม่เห็น
  },
  {
    name: "ซิมโฟนีออฟไฟร์เวิร์คส์ — บัตรหมดยกโหล",
    nameEn: "Symphony of Fireworks — Sold Out",
    description:
      "คอนเสิร์ตสมเกียรติบรรเลงสดประกอบดนตรีพลุ บัตรขายหมดภายใน 10 นาที — ใช้เป็นกรณีศึกษา 'บัตรหมด' (SOLD_OUT) บนผังทุกโซน",
    dates: [new Date("2027-04-10T18:00:00.000Z")],
    venueName: "รามอินทรา สเตเดียม กรุงเทพฯ",
    priceMultiplier: 1.0,
    origin: "INTERNATIONAL",
    artistType: "SOLO",
    emoji: "🎆",
    imageUrl: "/uploads/covers/cover-symphony.svg",
    offSaleCodes: [],
    saleStatus: "SOLD_OUT", // กรณีศึกษา: บัตรหมดทุกโซน
  },
];

const roundTo100 = (value: number): number => Math.round(value / 100) * 100;

/* ─── บัญชีแอดมินเดโม่ ────────────────────────────────────────────────────
 * ล็อกอินหลังบ้านด้วย "อีเมลกลาง admin@concerthub.dev + รหัสผ่านส่วนตัวของแต่ละคน"
 * รหัสผ่านของแอดมินแต่ละคน "ห้ามซ้ำกัน" ระบบจึงระบุตัวตนได้
 */
const DEMO_ADMINS = [
  { email: "admin@concerthub.dev", password: "Admin1234", employeeId: "0000", firstName: "อภิชาติ", lastName: "ดูแลระบบ", phone: "0299900001", dob: "1985-03-15" },
  { email: "admin0001@concerthub.dev", password: "Admin0001", employeeId: "0001", firstName: "สมชาย", lastName: "ตรวจบัตร", phone: "0299900002", dob: "1992-07-20" },
  { email: "admin0002@concerthub.dev", password: "Staff1234", employeeId: "0002", firstName: "สมหญิง", lastName: "ตรวจงาน", phone: "0299900003", dob: "1995-11-02" },
  { email: "admin0003@concerthub.dev", password: "Admin0003", employeeId: "0003", firstName: "มาลี", lastName: "จัดการคอน", phone: "0299900004", dob: "1993-02-14" },
];

/* ─── บัญชีลูกค้าเดโม่ (รหัสผ่านใช้ซ้ำกันได้ — เฉพาะแอดมินที่ห้ามซ้ำ) ─── */
const DEMO_USERS = [
  { email: "user@concerthub.dev", password: "User1234", firstName: "ผู้ใช้", lastName: "ทดลอง", phone: "0899990001", nationalId: "1100100000001", nationalIdBack: "JT000000001", dob: "2000-05-10" },
  { email: "somchai@example.com", password: "User1234", firstName: "สมชาย", lastName: "ใจดี", phone: "0812345001", nationalId: "1100200000002", nationalIdBack: "JT000000002", dob: "1998-03-22" },
  { email: "malee@example.com", password: "User1234", firstName: "มาลี", lastName: "รักคอน", phone: "0812345002", nationalId: "1100300000003", nationalIdBack: "JT000000003", dob: "2001-09-30" },
  { email: "prakan@example.com", password: "User1234", firstName: "ประกาย", lastName: "ฟ้าใส", phone: "0812345003", nationalId: "1100400000004", nationalIdBack: "JT000000004", dob: "1997-12-05" },
  { email: "nok@example.com", password: "User1234", firstName: "นก", lastName: "สีฟ้า", phone: "0812345004", nationalId: "1100500000005", nationalIdBack: "JT000000005", dob: "2002-06-18" },
];

async function main(): Promise<void> {
  console.log("🌱 กำลัง seed ฐานข้อมูล...");

  // --- คัดลอกสลิปตัวอย่างไปที่ uploads/slips (ให้หน้าตรวจสลิปแสดงภาพได้) ---
  const demoAssetDir = path.join(__dirname, "demo-assets");
  const slipDir = path.join(__dirname, "..", "uploads", "slips");
  fs.mkdirSync(slipDir, { recursive: true });
  for (const name of ["demo-slip-approved.png", "demo-slip-pending.png", "demo-slip-rejected.png"]) {
    const src = path.join(demoAssetDir, name);
    if (fs.existsSync(src) && !fs.existsSync(path.join(slipDir, name))) {
      fs.copyFileSync(src, path.join(slipDir, name));
    }
  }

  // --- บัญชีแอดมินเดโม่ (ล็อกอินด้วยอีเมลกลาง + รหัสผ่านส่วนตัว) ------------
  const adminPassword = await bcrypt.hash("Admin1234", 12);
  for (const admin of DEMO_ADMINS) {
    const hashed = admin.email === "admin@concerthub.dev" ? adminPassword : await bcrypt.hash(admin.password, 12);
    await prisma.user.upsert({
      where: { email: admin.email },
      // update: ไม่แตะรหัสผ่าน (ถ้าบัญชีมีอยู่แล้ว) — เติมข้อมูลประวัติให้ครบ
      update: {
        firstName: admin.firstName,
        lastName: admin.lastName,
        employeeId: admin.employeeId,
        phone: admin.phone,
        dateOfBirth: new Date(admin.dob),
      },
      create: {
        email: admin.email,
        password: hashed,
        role: "ADMIN",
        firstName: admin.firstName,
        lastName: admin.lastName,
        employeeId: admin.employeeId,
        phone: admin.phone,
        dateOfBirth: new Date(admin.dob),
      },
    });
  }
  console.log("✅ แอดมิน 4 คน (ล็อกอินด้วยอีเมลกลาง admin@concerthub.dev + รหัสผ่านส่วนตัว):");
  for (const admin of DEMO_ADMINS) {
    console.log(`   - รหัส ${admin.employeeId} ${admin.firstName} ${admin.lastName} → ${admin.password}`);
  }

  // --- บัญชีลูกค้าเดโม่ ------------------------------------------------------
  const userPassword = await bcrypt.hash("User1234", 12);
  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        nationalId: user.nationalId,
        nationalIdBack: user.nationalIdBack,
        dateOfBirth: new Date(user.dob),
      },
      create: {
        email: user.email,
        password: userPassword,
        role: "USER",
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        nationalId: user.nationalId,
        nationalIdBack: user.nationalIdBack,
        dateOfBirth: new Date(user.dob),
      },
    });
  }
  console.log(`✅ ลูกค้าเดโม่ ${DEMO_USERS.length} คน (รหัสผ่านทุกคน: User1234)`);

  // --- สถานที่จัดงาน (ผังโซน FIX ประจำสถานที่) -----------------------------
  const venueCount = await prisma.venue.count();
  if (venueCount === 0) {
    for (const venue of SEED_VENUES) {
      await prisma.venue.create({
        data: {
          name: venue.name,
          zones: {
            // basePrice เป็นข้อมูลสำหรับคำนวณราคาของคอนเสิร์ตเท่านั้น ไม่เก็บในตาราง
            create: venue.zones.map(({ basePrice: _basePrice, ...zone }) => zone),
          },
        },
      });
    }
    console.log(`✅ สร้างสถานที่จัดงาน ${SEED_VENUES.length} แห่ง (ผังโซน FIX ประจำสถานที่)`);
  } else {
    console.log(`ℹ️ ข้ามการ seed สถานที่ (มี ${venueCount} แห่งแล้ว)`);
  }

  // --- คอนเสิร์ตตัวอย่าง (โซนมาจากผังของสถานที่ + ราคา/เปิดขายรายโซน) -------
  const seatCount = await prisma.seat.count();
  if (seatCount === 0) {
    // ลบคอนเสิร์ตเก่า (cascade ลบ booking/zone/seat ของคอนเสิร์ตนั้นด้วย)
    await prisma.concert.deleteMany({});

    const venues = await prisma.venue.findMany({ include: { zones: true } });

    // แผนที่ราคาพื้นฐาน: venueName -> (zoneCode -> basePrice) จากข้อมูล seed
    const basePriceMaps = new Map<string, Map<string, number>>();
    for (const venue of SEED_VENUES) {
      basePriceMaps.set(
        venue.name,
        new Map(venue.zones.map((zone) => [zone.code, zone.basePrice])),
      );
    }

    for (const concert of SEED_CONCERTS) {
      const venue = venues.find((v) => v.name === concert.venueName);
      if (!venue) {
        console.warn(`⚠️ ไม่พบสถานที่ "${concert.venueName}" — ข้ามคอนเสิร์ตนี้`);
        continue;
      }
      const basePrices = basePriceMaps.get(venue.name) ?? new Map<string, number>();

      await prisma.concert.create({
        data: {
          name: concert.name,
          nameEn: concert.nameEn,
          description: concert.description,
          dates: concert.dates,
          venueId: venue.id,
          origin: concert.origin,
          artistType: concert.artistType,
          emoji: concert.emoji,
          imageUrl: concert.imageUrl,
          // OPEN = เปิดขาย · DRAFT = แบบร่าง · SOLD_OUT = บัตรหมด (กรณีศึกษา)
          saleStatus: concert.saleStatus ?? "OPEN",
          zones: {
            create: venue.zones.map((venueZone) => {
              const totalSeats = venueZone.rowCount * venueZone.seatsPerRow;
              const isOnSale = !concert.offSaleCodes.includes(venueZone.code);

              return {
                name: venueZone.name,
                code: venueZone.code,
                side: venueZone.side,
                wide: venueZone.wide,
                sortOrder: venueZone.mapRow,
                price: roundTo100((basePrices.get(venueZone.code) ?? 0) * concert.priceMultiplier),
                totalSeats,
                availableSeats: isOnSale ? totalSeats : 0,
                isOnSale,
                seats: isOnSale
                  ? { create: buildSeatRows(totalSeats, venueZone.seatsPerRow) }
                  : undefined,
              };
            }),
          },
        },
      });
    }
    console.log(
      `✅ สร้างคอนเสิร์ต ${SEED_CONCERTS.length} งาน (THAI/INTL × SOLO/GROUP ครบ + OPEN/DRAFT/SOLD_OUT)`,
    );

    // --- การจองสาธิต: กรณีศึกษาครบ (อนุมัติ / รอตรวจ / ไม่อนุมัติ / รอชำระ / ยกเลิก / บัตรหมด) ---
    const userIdOf = async (email: string): Promise<string> => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error(`ไม่พบผู้ใช้ ${email}`);
      return user.id;
    };

    const somchaiId = await userIdOf("somchai@example.com");
    const maleeId = await userIdOf("malee@example.com");
    const prakanId = await userIdOf("prakan@example.com");
    const nokId = await userIdOf("nok@example.com");
    const reviewerId = await userIdOf("admin0001@concerthub.dev");

    const concertByName = async (name: string) => {
      const found = await prisma.concert.findFirst({ where: { name } });
      if (!found) throw new Error(`ไม่พบคอนเสิร์ต "${name}"`);
      return found;
    };

    const rock = await concertByName("คอนเสิร์ตตำนานร็อค 2026");
    const edm = await concertByName("เทศกาล EDM — NEON PULSE");
    const jazz = await concertByName("คอนเสิร์ตเดี่ยว แจ๊สใต้แสงดาว");
    const kpop = await concertByName("คอนเสิร์ต K-POP WAVE");
    const soldOut = await concertByName("ซิมโฟนีออฟไฟร์เวิร์คส์ — บัตรหมดยกโหล");

    /** สร้างการจองสาธิต: เลือกที่นั่งว่างในโซน → จอง + รหัสตั๋วรายที่นั่ง + ปรับที่นั่งคงเหลือ */
    const createDemoBooking = async (opts: {
      userId: string;
      concert: { id: string; origin: "THAI" | "INTERNATIONAL"; dates: Date[] };
      zoneCode: string;
      quantity: number;
      status: "PENDING" | "PENDING_VERIFICATION" | "COMPLETED" | "REJECTED" | "CANCELLED";
      reviewerId?: string;
      note?: string;
    }): Promise<void> => {
      const zone = await prisma.zone.findFirst({
        where: { concertId: opts.concert.id, code: opts.zoneCode },
      });
      if (!zone) throw new Error(`ไม่พบโซน ${opts.zoneCode}`);
      const seats = await prisma.seat.findMany({
        where: { zoneId: zone.id, isAvailable: true },
        orderBy: { seatNumber: "asc" },
        take: opts.quantity,
      });
      if (seats.length < opts.quantity) throw new Error(`ที่นั่งโซน ${opts.zoneCode} ไม่พอ`);

      // ถือที่นั่ง + หักจำนวนคงเหลือ (เหมือน flow จองจริง)
      await prisma.seat.updateMany({
        where: { id: { in: seats.map((seat) => seat.id) } },
        data: { isAvailable: false },
      });
      await prisma.zone.update({
        where: { id: zone.id },
        data: { availableSeats: { decrement: opts.quantity } },
      });

      // รหัสตั๋วรายที่นั่ง: {THA|NAT} + รหัสโซน + รหัสที่นั่ง (แถว+เลข เช่น A08) + เลข 2 ตัว (10 ตัวอักษร)
      // ใช้ seat.code ซึ่งไม่ซ้ำกันในโซน (seatNumber เริ่ม 1 ใหม่ทุกแถว ใช้ไม่ได้) — เรียงตามที่นั่งเรียงไว้
      const prefix = (opts.concert.origin === "THAI" ? "THA" : "NAT") + zone.code;
      const rand2 = String((Date.now() + seats.length) % 100).padStart(2, "0");
      const seatTicketCodes = seats.map((seat) => `${prefix}${seat.code}${rand2}`);

      const hasPayment = opts.status !== "PENDING" && opts.status !== "CANCELLED";

      await prisma.booking.create({
        data: {
          userId: opts.userId,
          concertId: opts.concert.id,
          zoneId: zone.id,
          showDate: opts.concert.dates[0] ?? new Date("2027-06-01"),
          ticketCode: seatTicketCodes[0],
          quantity: opts.quantity,
          totalPrice: zone.price * opts.quantity,
          status: opts.status,
          seats: {
            create: seats.map((seat, index) => ({
              seatId: seat.id,
              ticketCode: seatTicketCodes[index],
            })),
          },
          payment: hasPayment
            ? {
                create: {
                  // สลิปตัวอย่างจริง — ไฟล์อยู่ที่ uploads/slips/demo-slip-*.png (seed คัดลอกให้อัตโนมัติ)
                  slipImage:
                    opts.status === "COMPLETED"
                      ? "/uploads/slips/demo-slip-approved.png"
                      : opts.status === "REJECTED"
                        ? "/uploads/slips/demo-slip-rejected.png"
                        : "/uploads/slips/demo-slip-pending.png",
                  status:
                    opts.status === "COMPLETED"
                      ? "APPROVED"
                      : opts.status === "REJECTED"
                        ? "REJECTED"
                        : "PENDING_VERIFICATION",
                  reviewedAt:
                    opts.status === "COMPLETED" || opts.status === "REJECTED"
                      ? new Date()
                      : null,
                  reviewedBy: opts.reviewerId ?? null,
                  note: opts.note ?? null,
                },
              }
            : undefined,
        },
      });
    };

    // 1) อนุมัติแล้ว (COMPLETED + สลิป APPROVED — มีชื่อแอดมินผู้ตรวจ)
    await createDemoBooking({
      userId: somchaiId,
      concert: rock,
      zoneCode: "VP",
      quantity: 2,
      status: "COMPLETED",
      reviewerId,
    });
    console.log("   กรณีศึกษา: อนุมัติแล้ว (สมชาย — ร็อค โซน VIP 2 ที่นั่ง)");

    // 2) รอตรวจสอบสลิป (PENDING_VERIFICATION)
    await createDemoBooking({
      userId: maleeId,
      concert: kpop,
      zoneCode: "GD",
      quantity: 1,
      status: "PENDING_VERIFICATION",
    });
    console.log("   กรณีศึกษา: รอตรวจสลิป (มาลี — K-POP โซน Gold C 1 ที่นั่ง)");

    // 3) ไม่อนุมัติ / บัตรเสีย (REJECTED — สลิปไม่ผ่าน พร้อมเหตุผลจากแอดมิน)
    await createDemoBooking({
      userId: prakanId,
      concert: rock,
      zoneCode: "GD",
      quantity: 2,
      status: "REJECTED",
      reviewerId,
      note: "สลิปไม่ชัด ยอดโอนไม่ตรงกับยอดที่ต้องชำระ กรุณาแนบสลิปใหม่",
    });
    console.log("   กรณีศึกษา: ไม่อนุมัติ/บัตรเสีย (ประกาย — ร็อค โซน Gold C 2 ที่นั่ง พร้อมเหตุผล)");

    // 4) รอชำระเงิน (PENDING — ยังไม่แนบสลิป)
    await createDemoBooking({
      userId: somchaiId,
      concert: edm,
      zoneCode: "ST",
      quantity: 1,
      status: "PENDING",
    });
    console.log("   กรณีศึกษา: รอชำระเงิน (สมชาย — EDM โซน Standing 1 ที่นั่ง)");

    // 5) ยกเลิกแล้ว (CANCELLED — ที่นั่งถูกคืนกลับระบบ)
    await createDemoBooking({
      userId: nokId,
      concert: jazz,
      zoneCode: "PA",
      quantity: 1,
      status: "CANCELLED",
    });
    console.log("   กรณีศึกษา: ยกเลิกการจอง (นก — แจ๊ส โซน Platinum L 1 ที่นั่ง)");

    // 6) บัตรหมด (SOLD_OUT) — มีลูกค้าจองสำเร็จ 1 รายการ แล้วปิดที่นั่งทั้งโซน
    await createDemoBooking({
      userId: maleeId,
      concert: soldOut,
      zoneCode: "VP",
      quantity: 1,
      status: "COMPLETED",
      reviewerId,
    });
    const soldOutZones = await prisma.zone.findMany({ where: { concertId: soldOut.id } });
    for (const zone of soldOutZones) {
      await prisma.seat.updateMany({
        where: { zoneId: zone.id },
        data: { isAvailable: false },
      });
      await prisma.zone.update({ where: { id: zone.id }, data: { availableSeats: 0 } });
    }
    console.log("   กรณีศึกษา: บัตรหมด (ซิมโฟนี — ทุกโซน SOLD_OUT ที่นั่งเหลือ 0)");

    console.log("✅ การจองสาธิต 6 กรณีศึกษา (อนุมัติ / รอตรวจ / ไม่อนุมัติ / รอชำระ / ยกเลิก / บัตรหมด)");
  } else {
    console.log(`ℹ️ ข้ามการ seed ที่นั่ง (มีที่นั่งในระบบแล้ว ${seatCount} ที่นั่ง)`);
  }

  console.log("🌱 Seed เสร็จสมบูรณ์!");
}

main()
  .catch(async (error) => {
    console.error("❌ Seed ล้มเหลว:", error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
