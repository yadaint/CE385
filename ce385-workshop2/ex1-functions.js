// กำหนดค่าคงที่คะแนน 
const MIN_SCORE = 0;
const MAX_SCORE = 100;

// เก็บข้อมูลเกณฑ์คะแนนเป็น Array ตามที่โจทย์ ืทำให้ไม่ต้องมานั่งเขียนเงื่อนไข if ซ้อนกัน 8 ชั้น 
// เอาไว้ข้างนอกทำให้ตัว vs จำ array ครั้งเดียว แต่ก็เอาไว้ข้าในฟังก์ชัน toGrade ได้ เพราะมีแค่ฟังก์ชั่นนี้ทีเรียกใช้
// สรุปง่ายๆคือ เผื่อฟังก์ชันอื่นเรียกใช้ก็ไม่ต้องมานั่งสร้าง array ใหม่ทุกครั้ง

const gradeCriteria = [
    { min: 80, grade: 'A' },
    { min: 75, grade: 'B+' },
    { min: 70, grade: 'B' },
    { min: 65, grade: 'C+' },
    { min: 60, grade: 'C' },
    { min: 55, grade: 'D+' },
    { min: 50, grade: 'D' },
    { min: 0, grade: 'F' }
];

// ส่วน 1 เขียนฟังก์ชันโดยใช้ arrow function ทั้ง 4 ตัว 

// 1. ฟังก์ชันเช็คว่าคะแนนป้อนมาถูกหรือเปล่า 
const isValidScore = (score) => {
    // ต้องเป็นตัวเลขระหว่าง 0-100 เท่านั้น (ทศนิยมก็ได้)
    return typeof score === 'number' && score >= MIN_SCORE && score <= MAX_SCORE;
};

// 2. ฟังก์ชันตัดเกรด 
const toGrade = (score) => {
    // ถ้าคะแนนมั่วมา (คือ isValidScore เช็คแล้วได้ false) ให้เด้งออกไปเลย ไม่ต้องตัดเกรดต่อ
    if (isValidScore(score) === false) {
        return 'ข้อมูลคะแนนไม่ถูกต้อง';
    }

    // ดึง gradeCriteria ที่อยู่ข้างบนสุดมาใช้ .find() ไล่หาจากเกณฑ์บนสุดลงมาได้เลย
    // .find คือค้นหาข้อมูลัวแรกที่ตรงเงือนไขที่สุดใน array เจออันแรกที่คะแนนถึงเมื่อไหร่ ก็หยิบก้อนนั้นมา
    const matchedRule = gradeCriteria.find(rule => score >= rule.min);
    
    // ดึงส่งเฉพาะตัวอักษรเกรด (เช่น A, B+) กลับไป
    return matchedRule.grade;
};

// 3. คิดคะแนนเวิร์คชอป (มีการตั้งค่าเริ่มต้นเผื่อคนลืมใส่ค่ามาให้เป็น 60 และ 20)
const calculateWorkshopScore = (raw, full = 60, weight = 20) => {
    // สูตร เอาคะแนนดิบ หารด้วยคะแนนเต็ม แล้วคูณด้วยน้ำหนักคะแนน
    return (raw / full) * weight;
};

// 4. จับคะแนนมารวมกัน ทุกค่าบวกกันหมด 
const calculateTotal = (workshop, attendance, project, midterm, final) => {
    return workshop + attendance + project + midterm + final;
};

// ส่วน 2 ทดสอบโดยสร้างข้อมูลนักศึกษา 3 คน 
// ข้อมูลดิบของนักศึกษ 3 คน
const studentsData = [
    { name: 'ญาดา', rawWorkshop: 55, attendance: 10, project: 18, midterm: 25, final: 28 }, 
    { name: 'จักรพันธ์', rawWorkshop: 50, attendance: 9, project: 12, midterm: 15, final: 10 }, 
    { name: 'แพรวา', rawWorkshop: 52, attendance: 8, project: 15, midterm: 20, final: 23 }
];
// เอาข้อมูลนักศึกษามาวนลูปทีละคน เพื่อคิดคะแนนและโชว์ในตาราง
const studentResults = studentsData.map(student => {
    const wsScore = calculateWorkshopScore(student.rawWorkshop); // สั่งแปลงคะแนนเวิร์คชอปก่อน
    const totalScore = calculateTotal(wsScore, student.attendance, student.project, student.midterm, student.final); // รวมคะแนนทุกช่อง
    const grade = toGrade(totalScore); // เอาคะแนนรวมไปตัดเกรด

    // ส่งข้อมูลกลับไปทั้งหมด เพื่อให้ตารางโชว์สวยๆ (ใช้ toFixed(2) ปัดเศษทศนิยม 2 ตำแหน่ง)
    return {
        'ชื่อ': student.name,
        'คะแนน Workshop': wsScore.toFixed(2),
        'คะแนนรวม': totalScore.toFixed(2),
        'เกรดที่ได้': grade
    };
});

// ส่วน 3 ทดสอบว่าค่าเริ่มต้น (Default Parameters) ทำงานจริงๆ
const test1 = calculateWorkshopScore(48);
const test2 = calculateWorkshopScore(48, 60, 20);
const test3 = calculateWorkshopScore(48, undefined, 25);

// อธิบายผลการทำงานของ test 3
/* 
    ถ้าเราอยากเปลี่ยนค่าสุดท้ายเป็น 25 แต่ตัวกลางยังอยากใช้ค่าเริ่มต้นคือ 60 ต้องใส่ undefined ในตำแหน่งกลางหรือตำแหน่งที่ 2 ไม่สามารถปล่อยว่างได้  
    เพื่อให้ JS รู้ว่าเราต้องการใช้ค่าเริ่มต้นของพารามิเตอร์นั้น คือ 60 ในส่วนท้ายเราก็ใส่เลข 25 ลงไปแทนค่าเริ่มต้นเดิมของพารามิเตอร์ตัวสุดท้าย
*/

// ส่วนแสดงผล ใช้ console.log 

console.log('=== ส่วน 2 ตารางสรุปผลการเรียน ===');
console.table(studentResults); 

console.log('\n=== ส่วน 3 ทดสอบ Default Parameters ===');
console.log('test1 (ใส่แค่คะแนนดิบ 48) ได้ :', test1);
console.log('test2 (ใส่ครบ 48, 60, 20) ได้ :', test2);
console.log('test1 เท่ากับ test2 หรือไม่ :', test1 === test2); 
console.log('test3 (ใส่ 48, ข้ามช่องกลาง, ใส่ 25) ได้ :', test3);