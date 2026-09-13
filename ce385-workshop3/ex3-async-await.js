// 	 async/await และลำดับ vs ขนาน

// ฐานข้อมูลนักศึกษา
const students = [
    { id: '991', name: 'ญาดา', major: 'CE', score: 8 },
    { id: '992', name: 'จักรพันธ์', major: 'IT', score: 45 },
    { id: '993', name: 'แพรวา', major: 'CE', score: 70 },
    { id: '994', name: 'หยก', major: 'IT', score: 92 },
    { id: '995', name: 'ทีม', major: 'CE', score: 63 },
    { id: '996', name: 'วุ้น', major: 'IT', score: 78}
];

// ฟังก์ชันตัดเกรดแบบสั้น 
function toGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// เขียน fetchStudentByIdAsync คืนค่าเป็น Promise ห้ามใช้ async จากข้อ 2
function fetchStudentByIdAsync(id) {

    // ห่อด้วย Promise แล้วส่งกลับไป
    return new Promise((resolve, reject) => {

        // เช็คว่า id ที่ส่งมาเป็น string มั้ยหรือเป็นข้อความว่าง
        if (typeof id !== 'string' || id.trim() === '') {

            // ถ้าส่งผิดรูปแบบให้ reject ด้วย Error
            return reject(new Error("รหัสนักศึกษาไม่ถูกต้อง"));
        }
         // หน่วงเวลา 300ms
        setTimeout(() => {

            // ค้นหานักศึกษาจาก array ด้วย id
            const student = students.find(s => s.id === id);

            // ถ้าไม่เจอให้ reject ด้วย Error
            if (!student) {
                return reject(new Error(`ไม่พบรหัสนักศึกษา ${id}`));
            }

            // ถ้าเจอให้ resolve ด้วยข้อมูลนักศึกษา
            resolve({...student, grade: toGrade(student.score)});

        }, 300);
    });
}

// 1 reportSequentail ดึงที่ละคน จาก 3 คน
async function reportSequential() {
    const targetIds = ['991', '992', '993'];
    const startTime = Date.now();

    console.log("เริ่มดึงข้อมูลนักศึกษาแบบทีละคน");
    
    // ดึงข้อมูลนักศึกษาแบบทีละคน โดยที่คนแรกต้องเสร็จก่อนคนต่อไปถึงจะเริ่ม
    for (const id of targetIds) {
        const student = await fetchStudentByIdAsync(id);
        console.log(`ดึงข้อมูลสำเร็จ: ${student.name} สาขา ${student.major} เกรด ${student.grade}`);
    }
    const endTime = Date.now();
    const timeUsed = endTime - startTime;
    console.log(`ดึงข้อมูลนักศึกษาแบบทีละคนใช้เวลา ${timeUsed} ms`);

    return timeUsed; // ส่งเวลาเทียบกับข้อ 2
}

// 2 reportParallel ดึงพร้อมกัน 3 คน
async function reportParallel(seqTime) {
    const targetIds = ['991', '992', '993'];
    const startTime = Date.now();

    console.log("เริ่มดึงข้อมูลนักศึกษาแบบพร้อมกัน");

    // ดึงข้อมูลนักศึกษาแบบพร้อมกัน โดยใช้ Promise.all
    const results = await Promise.all(
    targetIds.map(id => fetchStudentByIdAsync(id))
  );
    results.forEach(student => console.log(`ดึงข้อมูลสำเร็จ: ${student.name} สาขา ${student.major} เกรด ${student.grade}`));
    const endTime = Date.now();
    const timeUsed = endTime - startTime;
    console.log(`ดึงข้อมูลนักศึกษาแบบพร้อมกันใช้เวลา ${timeUsed} ms`);

    // เปรียบเทียบเวลาแบบทีละคนกับแบบพร้อมกัน
    const speedup = (seqTime / timeUsed).toExponential(1);
   console.log(`สรุป: แบบพร้อมกันเร็วกว่าแบบทีละคนประมาณ ${speedup} เท่า\n`);
}

// 3 safeReport(id) ดึงข้อมูลนักศึกษาแบบปลอดภัย
async function safeReport(id) {
    try {
        const student = await fetchStudentByIdAsync(id);
        const grade = toGrade(student.score);
        console.log(`พบข้อมูล: ${student.name} (เกรด ${grade})`);
    }   catch (error) {
        console.log(`ตรวจไม่พบ: ${error.message}`);
    }   finally {
    console.log(`จบการตรวจสอบ ${id}`)
    }
}

// 4 main() เรียกใช้งานทั้ง 3 ฟังก์ชัน
async function main() {

    // ข้อ 1 ดึงข้อมูลนักศึกษาแบบทีละคน
    const seqTime = await reportSequential();

    // ข้อ 2 ดึงข้อมูลนักศึกษาแบบพร้อมกัน
    await reportParallel(seqTime);

    // ข้อ 3 ดึงข้อมูลนักศึกษาแบบปลอดภัย
    console.log("เริ่มตรวจสอบข้อมูลนักศึกษาแบบปลอดภัย");
    await safeReport('991'); // เจอ
    await safeReport('999'); // ไม่เจอ
}

// เรียกทำงาน
main();

// 4 ตอบคำถาม
/* 1 ทำไม try-catch ครอบ await จับ reject ได้ แต่ครอบการเรียก callback ธรรมดาไม่ได้ 
- - เพราะ try-catch ปกติมันทำงานแบบรวดเดียวจบ พอเราเรียก callback ตัวงานมันถูกโยนไปทำใน setTimeout 
ซึ่งรันทีหลังใน Event Loop ทำให้ try-catch ทำงานผ่านไปนานแล้ว เลยจับ Error ที่เกิดขึ้นใน callback ไม่ได้
- แต่กับ await มันจะสั่งให้ฟังก์ชัน async หยุดรอผลลัพธ์ตรงนั้นจริงๆ พอมันเจอ reject ตัว JS จะเปลี่ยน reject ก้อนนั้นให้กลายเป็น Error
เด้งใส่ try-catch ให้จับได้ทันที

2 ทดลอง "ลืม await" หน้า Promise.all แล้วเอาผลไปใช้ต่อ — เกิดอะไรขึ้น เขียนคำอธิบายประกอบ
- ได้ "ใบจอง" มาแทนของจริง: จะได้ก้อน Promise {  } มาแทนที่จะได้ array ข้อมูลนักศึกษาจริงๆ
- พอเอาใบจองไปสั่งดึงชื่อนักศึกษา โค้ดจะอ่านค่าไม่ได้แล้วเด้ง undefined ออกมา 
โค้ดจะไม่ยอมรอ 300ms แต่วิ่งข้ามไปรันบรรทัดถัดไปทันที ทำให้วัดเวลาได้ 0 ms ทั้งที่ของยังดึงไม่เสร็จ */