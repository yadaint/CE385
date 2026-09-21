// เลือก Combinator ให้ถูกงาน

// เครื่องมือจำลองตามโจทย์
const wait = (ms, value, willFail = false) =>
  new Promise((resolve, reject) => {
    setTimeout(() => (willFail ? reject(new Error(`${value} ล้มเหลว`)) : resolve(value)), ms);
  });

// ฟังก์ชันสร ้าง timeout สำหรับสถานการณ์ที่ 4
const timeoutPromise = (ms) =>
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error("หมดเวลา")), ms);
  });

// สถานการณ์ที่ 1 หน้าแรก โปรไฟล์ + ตารางวเรียน + ประกาศผล

/* 
เหตุผลที่เลือก Promise.all:
  - ต้องรอดครบทุกอัน ถ้ามีอันไหนพังแค่อันเดียว ถือว่าพังทั้งหมด
 */

async function scenario1() {
    console.log("เริ่มดึงข้อมูลหน้าแรก โปรไฟล์ + ตารางเรียน + ประกาศ");

    // กรณีที่ 1 ดึงข้อมูลครบทุกชิ้นสำเร็จ
    try {
    const results = await Promise.all([
      wait(300, "โปรไฟล์"),
      wait(400, "ตารางเรียน"),
      wait(500, "ประกาศ")
    ]);
    console.log(`เปิดหน้าแรก: ${results.join(", ")}`);
  } catch (error) {
    console.log(`หน้าแรกเปิดไม่ได้: ${error.message}`);
  }
    // กรณีที่ 2 มีชิ้นใดชิ้นหนึ่งล้มเหลว
    try {
    const results = await Promise.all([
      wait(300, "โปรไฟล์"),
      wait(400, "ตารางเรียน"),
      wait(500, "ประกาศ", true)
    ]);
    console.log(`เปิดหน้าแรก: ${results.join(", ")}`);
  } catch (error) {
    console.log(`หน้าแรกเปิดไม่ได้: ${error.message}`);
  }
}

// สถานการณ์ที่ 2 แจ้งเตือนผลสอบ (อีเมล + SMS + แอป)

/*
  เหตุผลที่เลือก Promise.allSettled:
  - ต้องการรู้ผลของทุกอัน ทั้งอันที่ผ่านและอันที่พัง โดยไม่ให้ตัวที่พังมาฉุดตัวอื่น
*/

async function scenario2() {
  console.log("เริ่มส่งแจ้งเตือนผลสอบ (อีเมล + SMS + แอป)");

  const results = await Promise.allSettled([
    wait(300, "อีเมล"),
    wait(500, "SMS", true), // SMS ล้มเหลว
    wait(400, "แอป")
  ]);

  results.forEach(res => {
    if (res.status === 'fulfilled') {
      console.log(`ส่ง ${res.value} สำเร็จ`);
    } else {
      console.log(`ส่งไม่สำเร็จ: ${res.reason.message}`);
    }
  });
}

// สถานการณ์ที่ 3 Mirror Server (A ล้มเหลว 300ms / B สำเร็จ 600ms)

/*
  เหตุผลที่เลือก Promise.any:
  - เอาตัวที่ สำเร็จตัวแรก เท่านั้น ถ้าตัวแรกๆ พัง มันจะข้ามไปรอตัวถัดไปที่ผ่าน
*/

async function scenario3() {
  console.log("เริ่มดึงข้อมูลจาก Mirror Server (A ล้มเหลว 300ms / B สำเร็จ 600ms)");

  try {
    const winner = await Promise.any([
      wait(300, "mirror-A", true), // A เร็วกว่าแต่พัง
      wait(600, "mirror-B")        // B ช้ากว่าแต่สำเร็จ
    ]);
    console.log(`ใช้ข้อมูลจาก: ${winner}`);
  } catch (error) {
    console.log(`ไม่มี mirror ไหนใช้งานได้เลย: ${error.message}`);
  }
}

// สถานการณ์ที่ 4 ค้นหาฐานข้อมูล (DB 1200ms / Timeout 800ms)
/*
  เหตุผลที่เลือก Promise.race:
  - ใครเสร็จก่อนชนะทันที (วัดกันที่สปีดอย่างเดียว) พอ Timeout ถึงเวลาก่อน DB เลยตัดไปใช้แคชแทน
*/
async function scenario4() {
  console.log("เริ่มดึงข้อมูลจากฐานข้อมูล (DB 1200ms) แข่งกับ Timeout (800ms)");

  try {
    const result = await Promise.race([
      wait(1200, "ข้อมูลจากฐานข้อมูล"),
      timeoutPromise(800)
    ]);
    console.log(`ดึงข้อมูลสำเร็จ: ${result}`);
  } catch (error) {
    console.log("ใช้แคชเก่าแทน");
  }
}

// main() เรียกใช้งานทั้ง 4 สถานการณ์
async function main() {
  await scenario1();
  await scenario2();
  await scenario3();
  await scenario4();
}

main();