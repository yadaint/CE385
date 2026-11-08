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
];

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
  },
];

const roundTo100 = (value: number): number => Math.round(value / 100) * 100;

async function main(): Promise<void> {
  console.log("🌱 กำลัง seed ฐานข้อมูล...");

  // --- บัญชีทดลอง -------------------------------------------------------
  const adminPassword = await bcrypt.hash("Admin1234", 12);
  const userPassword = await bcrypt.hash("User1234", 12);

  await prisma.user.upsert({
    where: { email: "admin@concerthub.dev" },
    update: {},
    create: {
      email: "admin@concerthub.dev",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ บัญชีแอดมินพร้อมใช้งาน: admin@concerthub.dev / Admin1234");

  await prisma.user.upsert({
    where: { email: "user@concerthub.dev" },
    update: {},
    create: {
      email: "user@concerthub.dev",
      password: userPassword,
      role: "USER",
    },
  });
  console.log("✅ บัญชีผู้ใช้พร้อมใช้งาน: user@concerthub.dev / User1234");

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
          // คอนเสิร์ตตัวอย่างเปิดขายทันที (คอนที่สร้างใหม่ผ่าน API จะเป็น DRAFT เสมอ)
          saleStatus: "OPEN",
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
      `✅ สร้างคอนเสิร์ต ${SEED_CONCERTS.length} งาน (โซนมาจากผังสถานที่ + ที่นั่งรายที่นั่ง)`,
    );
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
