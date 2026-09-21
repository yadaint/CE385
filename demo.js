// const name = "สมชาย", score = 82;

// // แบบเก่า: ต่อข้อความด้วย + อ่านยากและพลาดง่าย
// console.log("แบบเก่า : ชื่อ " + name + " ได้ " + score + " คะแนน");

// // แบบใหม่: Template Literal ใช้ backtick ` ` และ ${ }
// console.log(`แบบใหม่ : ชื่อ ${name} ได้ ${score} คะแนน`);

// // ใส่ "นิพจน์" ลงไปได้ ไม่ใช่แค่ตัวแปร
// console.log(`ครึ่งหนึ่งของคะแนนคือ ${score / 2}`);
// console.log(`ผ่านเกณฑ์หรือไม่ — ${score >= 50 ? "ผ่าน" : "ไม่ผ่าน"}`);

// console.warn("console.warn — คำเตือน");
// console.error("console.error — ข้อผิดพลาด");


//-----


// console.log("1  typeof '42'      =", typeof "42");
// console.log("3  typeof null      =", typeof null);
// console.log("5  typeof NaN       =", typeof NaN);
// console.log("6  '5' + 3          =", "5" + 3);
// console.log("7  '5' - 3          =", "5" - 3);
// console.log("8  0.1 + 0.2        =", 0.1 + 0.2);
// console.log("   0.1+0.2 === 0.3  =", 0.1 + 0.2 === 0.3);
// console.log("9  10 / 0           =", 10 / 0);
// console.log("10 'abc' * 2        =", "abc" * 2);

// // วิธีเก็บจำนวนเงินที่ถูกต้อง: เก็บเป็นสตางค์ (จำนวนเต็ม)
// const priceSatang = 1050;   // 10.50 บาท
// console.log("ราคา 3 ชิ้น =", (priceSatang * 3) / 100, "บาท");


//------//


// function getPriceBuggy(size) {
//   let price = 0;
//   switch (size) {
//     case "S":  price = 30; break;
//     case "M":  price = 45; break;
//     case "L":  price = 60; break;
//     default:   price = 0;
//   }
//   return price;
// }


// function getPriceFixed(size) {
//   switch (size) {
//     case "S": return 30;
//     case "M": return 45;
//     case "L": return 60;
//     default:  return 0;
//   }
// }

// for (const s of ["S", "M", "L", "XL"]) {
//   console.log("ขนาด " + s + " → มีบั๊ก: " + getPriceBuggy(s) + " | แก้แล้ว: " + getPriceFixed(s));
// }

// 

// // 1) Function Declaration — ประกาศแบบตั้งชื่อ
// function add(a, b) {
//   return a + b;
// }

// // 2) Function Expression — เก็บฟังก์ชันไว้ในตัวแปร
// const subtract = function (a, b) {
//   return a - b;
// };

// // 3) Arrow Function — รูปแบบสั้น ใช้บ่อยที่สุดในโค้ดสมัยใหม่
// const multiply = (a, b) => a * b;

// console.log("add(10, 3)      =", add(10, 3));
// console.log("subtract(10, 3) =", subtract(10, 3));
// console.log("multiply(10, 3) =", multiply(10, 3));


// function createStudent(name, year = 1, isActive = true) {
//   return { name, year, isActive };   // ชื่อ property ตรงกับชื่อตัวแปร เขียนย่อได้
// }

// console.log("ไม่ส่ง year        =", createStudent("สมชาย"));
// console.log("ส่งครบ            =", createStudent("สมหญิง", 3, false));
// console.log("ส่ง undefined      =", createStudent("มานี", undefined));
// console.log("ส่ง null           =", createStudent("ปิติ", null), " <-- ค่าเริ่มต้นไม่ทำงาน");
// console.log("ส่ง 0              =", createStudent("ชูใจ", 0), " <-- 0 ก็ถือว่าส่งค่ามาแล้ว");

// // --- Rest Parameter: รับพารามิเตอร์ที่เหลือทั้งหมดเป็น array ---
// function sumAll(...numbers) {
//   return numbers.reduce((total, n) => total + n, 0);
// }

// console.log("\nsumAll(10, 20, 30) =", sumAll(10, 20, 30));
// console.log("sumAll()           =", sumAll(), " <-- ค่าเริ่มต้น 0 ทำให้ไม่ error");

// // rest ต้องอยู่ท้ายสุดเสมอ
// function formatScores(studentName, ...scores) {
//   return `${studentName}: ${scores.join(", ")}`;
// }
// console.log(formatScores("สมชาย", 78, 91, 45));

// const course = {
//   code: "CE385",
//   instruction: {name: "YADA", email: "68110921@dpu.ac.th"},
//   schedule: { day: "จันทร์", room: "521" },
// };

// console.log("course.code               =", course.code);
// console.log("course.instructor.email   =", course.instruction.email);
// console.log("course.assistant          =", course.assistant, " undefined ยังไม่ error");

// try {
//   console.log(course.assistant.name);
// } catch (error) {
//   console.log("course.assistant.name     =", error.name + ": " + error.message);
// }

// // Optional chaining กันพัง
// console.log("\ncourse.assistant?.name  =", course.assistant?.name, " ไม่ error");
// console.log('?. กับ ?? ใช้คู่กัน       =', course.assistant?.name ?? "ยังไม่มีผู้ช่วยสอน");

// c                                                                                                                                                                                                                                                                                                                                                                                                                  