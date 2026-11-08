/* สร้างสไลด์นำเสนอโปรเจกต์ BOOKING TICKET CONCERT เป็นไฟล์ .pptx
 * รัน: node make-pptx.cjs (จากโฟลเดอร์ tools)
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

const OUT = path.resolve(__dirname, "..", "BOOKING-TICKET-CONCERT-presentation.pptx");

// โทนสีตามธีมเว็บ (Corporate Navy)
const NAVY = "122A44";
const NAVY2 = "1E4E8C";
const GOLD = "FBBF24";
const INK = "16232F";
const MUTED = "617083";
const SOFT = "E3ECF5";
const WHITE = "FFFFFF";
const SUCCESS = "1E6A41";
const SUCCESS_BG = "E8F5EE";
const WARN = "7A5D1E";
const WARN_BG = "F8F1DF";
const DANGER = "A13327";
const DANGER_BG = "FDECEB";

const FONT = "Segoe UI";

const pptx = new pptxgen();
pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "BOOKING TICKET CONCERT";
pptx.title = "BOOKING TICKET CONCERT — ระบบจองตั๋วคอนเสิร์ตออนไลน์";

const W = 13.33;
const headerBar = (slide, title) => {
  slide.background = { color: "F1F4F8" };
  slide.addShape("rect", { x: 0, y: 0, w: W, h: 0.16, fill: { color: NAVY } });
  slide.addText(title, {
    x: 0.55, y: 0.28, w: W - 1.1, h: 0.7, fontFace: FONT, fontSize: 30, bold: true, color: NAVY,
  });
};

/* ─── Slide 1: ปก ─── */
{
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.22, fill: { color: GOLD } });
  s.addShape("rect", { x: 5.87, y: 1.15, w: 1.6, h: 1.6, fill: { color: "1E4E8C" } });
  s.addText("🎫", { x: 5.87, y: 1.28, w: 1.6, h: 1.3, align: "center", fontSize: 54 });
  s.addText("BOOKING TICKET CONCERT", {
    x: 0.6, y: 3.0, w: W - 1.2, h: 1.1, align: "center", fontFace: FONT,
    fontSize: 48, bold: true, color: WHITE, charSpacing: 4,
  });
  s.addText("ระบบจองตั๋วคอนเสิร์ตออนไลน์ — เลือกโซน เลือกที่นั่ง ชำระเงิน และรับตั๋ว QR ครบในที่เดียว", {
    x: 1.4, y: 4.15, w: W - 2.8, h: 0.8, align: "center", fontFace: FONT, fontSize: 18, color: "B8CBDE",
  });
  s.addText("Web Application Project · React + TypeScript · Express + Prisma + PostgreSQL", {
    x: 1.4, y: 6.4, w: W - 2.8, h: 0.5, align: "center", fontFace: FONT, fontSize: 13, color: "9FB2C5",
  });
}

/* ─── Slide 2: ภาพรวมโปรเจกต์ ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "ภาพรวมโปรเจกต์");
  const cards = [
    ["🎯 โจทย์", "การจองบัตรคอนเสิร์ตผ่านหน้างานหรือโทรศัพท์ มีข้อจำกัดเรื่องผังที่นั่ง คิวยาว และการยืนยันการชำระเงิน"],
    ["💡 โซลูชัน", "เว็บแอปจองตั๋วครบวงจร — ผู้ใช้เลือกผังโซนและที่นั่งเองจากผังจริง ชำระเงินโอนพร้อมแนบสลิป แอดมินตรวจและอนุมัติ"],
    ["🎫 ผลลัพธ์", "บัตรเข้างานพร้อม QR Code รายที่นั่ง รหัสตั๋วมาตรฐาน 10 ตัว และระบบสถิติรายคอนพร้อมรายงาน PDF/CSV"],
  ];
  cards.forEach(([title, desc], i) => {
    const x = 0.55 + i * 4.25;
    s.addShape("roundRect", { x, y: 1.5, w: 3.95, h: 3.2, fill: { color: WHITE }, line: { color: "E2E8F0" }, rectRadius: 0.1 });
    s.addText(title, { x: x + 0.25, y: 1.8, w: 3.45, h: 0.5, fontFace: FONT, fontSize: 18, bold: true, color: NAVY2 });
    s.addText(desc, { x: x + 0.25, y: 2.4, w: 3.45, h: 2.1, fontFace: FONT, fontSize: 13, color: INK, lineSpacingMultiple: 1.2 });
  });
  s.addText("ผู้ใช้เห็นผังโซนแบบวงแหวนรอบเวทีแบบเดียวกับสถานที่จริง ทุกสถานที่ใช้ผังมาตรฐานเดียวกัน (Standing · VIP · Platinum · Gold · Silver · Balcony)", {
    x: 0.55, y: 5.2, w: W - 1.1, h: 0.9, align: "center", fontFace: FONT, fontSize: 14, italic: true, color: MUTED,
  });
}

/* ─── Slide 3: Tech Stack ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "เทคโนโลยีที่ใช้ (Tech Stack)");
  const cols = [
    ["FRONTEND", NAVY2, [
      "React 18 + TypeScript",
      "Tailwind CSS (Design Token)",
      "react-router-dom v6",
      "react-i18next — ไทย / English",
      "react-qr-code — ตั๋ว QR",
      "axios + Vite",
    ]],
    ["BACKEND", "1E6A41", [
      "Node.js + Express + TypeScript",
      "Prisma ORM + PostgreSQL",
      "JWT Authentication",
      "bcrypt (12 rounds)",
      "multer — อัปโหลดสลิป/ปก",
      "Auto-close sales job (60s)",
    ]],
    ["TOOLS & EXPORT", "9A4B2F", [
      "jsPDF + html2canvas — รายงาน PDF",
      "CSV (UTF-8 BOM) สำหรับ Excel",
      "Zod — validate ทั้ง client/server",
      "svg — ปกคอนเซปต์รายคอน",
      "nodemon + ts-node",
      "Slide deck (pptxgenjs)",
    ]],
  ];
  cols.forEach(([title, color, items], i) => {
    const x = 0.55 + i * 4.25;
    s.addShape("roundRect", { x, y: 1.45, w: 3.95, h: 5.2, fill: { color: WHITE }, line: { color: "E2E8F0" }, rectRadius: 0.1 });
    s.addText(title, { x: x + 0.3, y: 1.7, w: 3.35, h: 0.5, fontFace: FONT, fontSize: 16, bold: true, color });
    s.addText(items.map((it) => ({ text: it, options: { bullet: { characterCode: "2713" }, breakLine: true } })), {
      x: x + 0.3, y: 2.3, w: 3.35, h: 4.1, fontFace: FONT, fontSize: 13, color: INK, lineSpacingMultiple: 1.35,
    });
  });
}

/* ─── Slide 4: ฟีเจอร์ผู้ใช้ ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "ฟีเจอร์สำหรับผู้ใช้");
  const rows = [
    ["สมัครสมาชิก + ยืนยันตัวตน", "ชื่อ-นามสกุล · วันเกิด · เบอร์โทร · เลขบัตรประชาชน 13 หลัก (ตรวจ checksum) · เลขหลังบัตร (Laser code)"],
    ["ผังโซนวงแหวนรอบเวที", "Standing ชิดเวทีสุด → VIP → Platinum → Gold → Silver → Balcony พร้อม % การจองรายโซน"],
    ["เลือกที่นั่งรายตัว", "สถานะเรียลไทม์: ว่าง / รอตรวจสอบ / ยืนยันแล้ว — จองได้สูงสุด 4 ที่นั่งต่อรอบ"],
    ["ชำระเงิน + นับถอยหลัง", "โอนเข้าบัญชีกสิกรไทย พร้อมนับถอยหลังชำระ 10 นาที และแนบสลิปเพื่อรอแอดมินตรวจ"],
    ["ตั๋วเข้างาน + QR รายที่นั่ง", "รหัสตั๋วมาตรฐาน 10 ตัว พร้อม QR ตรวจสอบหน้างาน แสดงเมื่อสลิปได้รับอนุมัติ"],
    ["สองภาษา + ลบบัญชีได้เอง", "ไทย / English สลับได้ทันทีทุกหน้า และผู้ใช้สามารถลบบัญชีพร้อมข้อมูลการจองได้ด้วยตัวเอง"],
  ];
  rows.forEach(([title, desc], i) => {
    const y = 1.5 + i * 0.92;
    s.addShape("roundRect", { x: 0.55, y, w: W - 1.1, h: 0.8, fill: { color: i % 2 ? "F8FAFC" : SOFT }, rectRadius: 0.06 });
    s.addText(title, { x: 0.85, y: y + 0.08, w: 3.6, h: 0.6, fontFace: FONT, fontSize: 14, bold: true, color: NAVY2, valign: "middle" });
    s.addText(desc, { x: 4.6, y: y + 0.08, w: W - 5.1, h: 0.6, fontFace: FONT, fontSize: 12.5, color: INK, valign: "middle" });
  });
}

/* ─── Slide 5: Flow การจอง ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "ขั้นตอนการจองบัตร (Booking Flow)");
  const steps = [
    ["1", "เลือกคอนเสิร์ต", "จากหน้าแรก กรองตามประเภท"],
    ["2", "เลือกวันที่แสดง", "รอบการแสดงได้หลายวัน"],
    ["3", "เลือกโซนจากผัง", "วงแหวนราคาตามชั้นบัตร"],
    ["4", "เลือกที่นั่งรายตัว", "สถานะเรียลไทม์ทุกที่นั่ง"],
    ["5", "ยืนยันการจอง", "ถือที่นั่ง + นับถอยหลัง 10 นาที"],
    ["6", "โอนเงิน + แนบสลิป", "รอแอดมินอนุมัติ"],
    ["7", "รับตั๋ว QR", "จองสำเร็จ พร้อมเข้างาน"],
  ];
  steps.forEach(([n, title, desc], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.55 + col * 3.15;
    const y = 1.6 + row * 2.4;
    s.addShape("ellipse", { x: x + 1.0, y, w: 0.75, h: 0.75, fill: { color: NAVY2 } });
    s.addText(n, { x: x + 1.0, y, w: 0.75, h: 0.75, align: "center", valign: "middle", fontFace: FONT, fontSize: 22, bold: true, color: WHITE });
    s.addText(title, { x: x - 0.1, y: y + 0.85, w: 3.0, h: 0.4, align: "center", fontFace: FONT, fontSize: 14.5, bold: true, color: INK });
    s.addText(desc, { x: x - 0.1, y: y + 1.25, w: 3.0, h: 0.6, align: "center", fontFace: FONT, fontSize: 11, color: MUTED });
    if (i < 6 && col < 3) {
      s.addText("→", { x: x + 2.42, y: y + 0.1, w: 0.6, h: 0.55, align: "center", fontSize: 24, bold: true, color: NAVY2 });
    }
  });
  s.addText("หมายเหตุ: ไม่ชำระภายใน 10 นาที → สถานะคงเป็น \"รอชำระเงิน\" พร้อมนับถอยหลังบนหน้า \"ตั๋วของฉัน\" — ผู้ใช้ยกเลิกเองได้", {
    x: 0.55, y: 6.3, w: W - 1.1, h: 0.6, fontFace: FONT, fontSize: 12, italic: true, color: MUTED,
  });
}

/* ─── Slide 6: รหัสตั๋ว 10 ตัว ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "รหัสตั๋วมาตรฐาน 10 ตัวอักษร (1 ที่นั่ง = 1 บัตร)");
  s.addShape("roundRect", { x: 1.2, y: 1.6, w: 10.9, h: 1.35, fill: { color: NAVY }, rectRadius: 0.08 });
  s.addText([
    { text: "THA", options: { color: GOLD, bold: true } },
    { text: "GD", options: { color: "8FB3DD", bold: true } },
    { text: "14", options: { color: "86EFAC", bold: true } },
    { text: "K7X", options: { color: WHITE, bold: true } },
  ], { x: 1.5, y: 1.75, w: 10.3, h: 0.75, align: "center", fontFace: "Consolas", fontSize: 40, charSpacing: 8 });
  s.addText("ตัวอย่าง: THAGD014K7X — Gold ที่นั่งเบอร์ 14 ของคอนไทย", {
    x: 1.5, y: 2.55, w: 10.3, h: 0.4, align: "center", fontFace: FONT, fontSize: 13, color: "B8CBDE",
  });

  const legend = [
    ["THA / NAT", "ประเภทคอนเสิร์ต — คอนไทย / คอนต่างประเทศ", GOLD, "1E3A5F"],
    ["GD", "รหัสโซนที่นั่ง 2 ตัว (Gold Center)", "8FB3DD", "1E3A5F"],
    ["14", "เลขที่นั่ง 2 ตัว (01-99) ตามที่จอง", "86EFAC", "1E3A5F"],
    ["K7X", "รหัสสุ่มจากระบบ 3 ตัว (กันซ้ำ)", WHITE, "334155"],
  ];
  legend.forEach(([code, desc, fg, bg], i) => {
    const y = 3.35 + i * 0.85;
    s.addShape("roundRect", { x: 1.2, y, w: 2.2, h: 0.65, fill: { color: bg }, rectRadius: 0.06 });
    s.addText(code, { x: 1.2, y, w: 2.2, h: 0.65, align: "center", valign: "middle", fontFace: "Consolas", fontSize: 20, bold: true, color: fg });
    s.addText(desc, { x: 3.7, y, w: 8.3, h: 0.65, valign: "middle", fontFace: FONT, fontSize: 14, color: INK });
  });

  s.addText("จองหลายที่นั่ง = ได้บัตรครบทุกที่นั่ง แต่ละบัตรมีรหัสเฉพาะตัวพร้อม QR สำหรับสแกนเข้างาน", {
    x: 1.2, y: 6.8, w: 10.9, h: 0.5, align: "center", fontFace: FONT, fontSize: 13, bold: true, color: NAVY2,
  });
}

/* ─── Slide 7: รอบชีวิตการขาย ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "รอบชีวิตการขายบัตร (Sale Lifecycle)");
  const states = [
    ["DRAFT", "ฉบับร่าง", "สร้างใหม่ ยังไม่เปิดจอง — ลบ/แก้ไขได้", "64748B", "F1F5F9"],
    ["OPEN", "เปิดขาย", "ผู้ใช้เห็นและจองได้ — ปิดอัตโนมัติเมื่อครบวันสุดท้าย", "1E6A41", "E8F5EE"],
    ["CLOSED", "ปิดขาย", "ปิดชั่วคราวหรือหมดเวลา — เปิดใหม่ได้", "7A5D1E", "F8F1DF"],
    ["SOLD_OUT", "บัตรหมด", "ทุกโซนเปิดขายหมด — ระบบตั้งอัตโนมัติ", "A13327", "FDECEB"],
    ["CANCELLED", "ยกเลิกการขาย", "ยกเลิกถาวรกลางคัน — แก้ไขข้อมูลไม่ได้อีก", "7F1D1D", "FDECEB"],
  ];
  states.forEach(([code, label, desc, fg, bg], i) => {
    const y = 1.5 + i * 1.05;
    s.addShape("roundRect", { x: 0.55, y, w: 2.3, h: 0.8, fill: { color: bg }, line: { color: "E2E8F0" }, rectRadius: 0.08 });
    s.addText(code, { x: 0.55, y, w: 2.3, h: 0.8, align: "center", valign: "middle", fontFace: "Consolas", fontSize: 15, bold: true, color: fg });
    s.addText(label, { x: 3.1, y: y + 0.02, w: 2.2, h: 0.75, valign: "middle", fontFace: FONT, fontSize: 15, bold: true, color: INK });
    s.addText(desc, { x: 5.4, y: y + 0.02, w: 7.3, h: 0.75, valign: "middle", fontFace: FONT, fontSize: 12.5, color: MUTED });
  });
  s.addText("ระบบตรวจปิดขายอัตโนมัติทุก 60 วินาที — และบังคับตรวจอีกชั้นทันทีที่ผู้ใช้กดจอง", {
    x: 0.55, y: 6.85, w: W - 1.1, h: 0.45, fontFace: FONT, fontSize: 12.5, italic: true, color: MUTED,
  });
}

/* ─── Slide 8: ฟีเจอร์แอดมิน ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "ฟีเจอร์สำหรับแอดมิน");
  const rows = [
    ["สถิติรายคอนเสิร์ต", "เลือกคอน (แยกหมวดเปิดขาย/ปิดขาย) → รายได้รวม รายได้รายโซน สถานะบัตรทั้งหมด + ตารางรายโซน"],
    ["จัดการคอนเสิร์ต (เรียลไทม์)", "ผังโซนวงแหวน + สถานะทุกที่นั่ง ว่าง/รอตรวจสอบ/ยืนยันแล้ว — รีเฟรชอัตโนมัติทุก 10 วินาที"],
    ["รายการตรวจสอบสลิป", "ดูสลิป อนุมัติ/ปฏิเสธพร้อมเหตุผล — บันทึกชื่อแอดมินผู้ตรวจทุกรายการ"],
    ["Export PDF + CSV", "ส่งออกรายงานสถิติและรายการจองเป็นเอกสาร (PDF แบ่งหน้าอัตโนมัติ / CSV UTF-8 เปิดใน Excel)"],
    ["สร้าง + แก้ไขคอนเสิร์ต", "ปกคอนเซปต์ (16:9) · ชื่อ 2 ภาษา · วันสุดท้ายขาย (ปิดอัตโนมัติ) · ปุ่มยกเลิกการขายกลางคัน · ลบแบบร่าง"],
  ];
  rows.forEach(([title, desc], i) => {
    const y = 1.5 + i * 1.0;
    s.addShape("roundRect", { x: 0.55, y, w: W - 1.1, h: 0.85, fill: { color: i % 2 ? "F8FAFC" : SOFT }, rectRadius: 0.06 });
    s.addText(title, { x: 0.85, y: y + 0.1, w: 3.8, h: 0.65, fontFace: FONT, fontSize: 14.5, bold: true, color: NAVY2, valign: "middle" });
    s.addText(desc, { x: 4.8, y: y + 0.1, w: W - 5.4, h: 0.65, fontFace: FONT, fontSize: 12.5, color: INK, valign: "middle" });
  });
}

/* ─── Slide 9: โครงสร้างข้อมูล ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "โครงสร้างฐานข้อมูล (Prisma + PostgreSQL)");
  const models = [
    ["User", "บัญชี + ข้อมูลยืนยันตัวตน (ชื่อ / เบอร์ / เลขบัตร / เลขหลังบัตร)", NAVY2],
    ["Concert", "คอนเสิร์ต + ชื่อ 2 ภาษา + ปก + saleEndDate (ปิดขายอัตโนมัติ)", "1E6A41"],
    ["Venue + VenueZone", "ผังโซน FIX ประจำสถานที่ — ทุกสถานที่ใช้ผังมาตรฐานเดียวกัน", "9A4B2F"],
    ["Zone + Seat", "โซนขายบัตรรายคอน + ที่นั่งรายตัว (isAvailable อัปเดตแบบ transaction)", "7C3AED"],
    ["Booking + BookingSeat", "การจองถือที่นั่ง + รหัสตั๋วรายที่นั่ง (10 ตัว) แบบ SERIALIZABLE", "B45309"],
    ["Payment", "สลิป + สถานะ + ผู้ตรวจ (reviewedBy) + เวลาตรวจ", "BE185D"],
    ["Notification", "แจ้งเตือนบัตรหมดรายโซน/ทั้งคอน อัตโนมัติ", "0E7490"],
  ];
  models.forEach(([name, desc, color], i) => {
    const y = 1.5 + i * 0.82;
    s.addShape("roundRect", { x: 0.55, y, w: 4.1, h: 0.68, fill: { color: NAVY }, rectRadius: 0.06 });
    s.addText(name, { x: 0.85, y, w: 3.7, h: 0.68, valign: "middle", fontFace: "Consolas", fontSize: 15, bold: true, color: WHITE });
    s.addText(desc, { x: 4.95, y, w: W - 5.5, h: 0.68, valign: "middle", fontFace: FONT, fontSize: 12.5, color: INK });
  });
  s.addText("ความสัมพันธ์ทั้งหมดกำหนด onDelete: Cascade — ลบคอน/ลบบัญชี แล้วข้อมูลลูกถูกจัดการตามอัตโนมัติ", {
    x: 0.55, y: 7.0, w: W - 1.1, h: 0.4, fontFace: FONT, fontSize: 12, italic: true, color: MUTED,
  });
}

/* ─── Slide 10: ความปลอดภัย ─── */
{
  const s = pptx.addSlide();
  headerBar(s, "ความปลอดภัยและความถูกต้องของข้อมูล");
  const items = [
    ["JWT + bcrypt", "ทุก API ผู้ใช้/แอดมินต้องพิสูจน์ตัวตน — รหัสผ่านเข้ารหัส bcrypt 12 rounds"],
    ["Transaction SERIALIZABLE", "การจองที่นั่งรันใน transaction ระดับ SERIALIZABLE + retry — สองคนจองที่นั่งเดียวพร้อมกันไม่ได้"],
    ["ตรวจเลขบัตร checksum", "เลขบัตร 13 หลักตรวจตามมาตรฐานกรมการปกครอง ทั้งฝั่ง client และ server"],
    ["ตรวจข้อมูลสองชั้น", "Zod validate ทั้ง frontend (ก่อนส่ง) และ backend (ก่อนบันทึก) — สอดคล้องกัน"],
    ["สิทธิ์แยกบทบาท", "USER / ADMIN — จองบัตรเฉพาะผู้ใช้ทั่วไป แอดมินจัดการหลังบ้าน (ลบคอนได้เฉพาะแบบร่าง)"],
    ["Auto-close + บังคับชั้นจอง", "หมดวันขายระบบปิดทันทีทั้งจาก background job และตอนกดจอง"],
  ];
  items.forEach(([title, desc], i) => {
    const y = 1.5 + i * 0.92;
    s.addShape("roundRect", { x: 0.55, y, w: W - 1.1, h: 0.8, fill: { color: i % 2 ? "F8FAFC" : SOFT }, rectRadius: 0.06 });
    s.addText(title, { x: 0.85, y: y + 0.08, w: 3.7, h: 0.6, fontFace: FONT, fontSize: 14.5, bold: true, color: NAVY2, valign: "middle" });
    s.addText(desc, { x: 4.7, y: y + 0.08, w: W - 5.3, h: 0.6, fontFace: FONT, fontSize: 12.5, color: INK, valign: "middle" });
  });
}

/* ─── Slide 11: สรุป ─── */
{
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.22, fill: { color: GOLD } });
  s.addText("สรุป", { x: 0.6, y: 0.7, w: W - 1.2, h: 0.9, fontFace: FONT, fontSize: 40, bold: true, color: WHITE });
  const points = [
    "ระบบจองตั๋วคอนเสิร์ตครบวงจร ตั้งแต่เลือกที่นั่งจนได้บัตร QR เข้างาน",
    "ผังโซนมาตรฐานสากล (Standing · VIP · Platinum · Gold · Silver · Balcony) เหมือนกันทุกสถานที่",
    "ปิดขายอัตโนมัติตามวันสุดท้าย + ยกเลิกการขายกลางคันได้ + ลบแบบร่างได้",
    "สถิติรายคอน 3 มุมมอง พร้อมส่งออกรายงาน PDF และ CSV",
    "รองรับสองภาษา ไทย/English และผู้ใช้ลบบัญชีตัวเองได้",
  ];
  points.forEach((p, i) => {
    s.addShape("ellipse", { x: 1.0, y: 2.0 + i * 0.72 + 0.12, w: 0.16, h: 0.16, fill: { color: GOLD } });
    s.addText(p, { x: 1.35, y: 2.0 + i * 0.72, w: W - 2.4, h: 0.6, fontFace: FONT, fontSize: 17, color: "E8EEF6", valign: "middle" });
  });
  s.addText("BOOKING TICKET CONCERT — ขอบคุณครับ 🎫", {
    x: 0.6, y: 6.5, w: W - 1.2, h: 0.6, align: "center", fontFace: FONT, fontSize: 16, bold: true, color: "B8CBDE",
  });
}

pptx.writeFile({ fileName: OUT }).then(() => {
  console.log("PPTX saved:", OUT);
});
