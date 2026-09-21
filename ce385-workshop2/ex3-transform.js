// ข้อมูลจากทะเบียนนักศึกษา ข้อ 2
const studentsData = [
    { id: '991', name: 'ญาดา', major: 'CE', score: 85, contact: { email: 'yada@mail.com', phone: '091-111-1111' } },
    { id: '992', name: 'จักรพันธ์', major: 'IT', score: 45, contact: { email: 'jakkaphan@mail.com', phone: '092-222-2222' } },
    { id: '993', name: 'แพรวา', major: 'CE', score: 70, contact: { email: 'phraewa@mail.com', phone: '093-333-3333' } },
    { id: '994', name: 'หยก', major: 'IT', score: 92, contact: { email: 'yok@mail.com', phone: '094-444-4444' } },
    { id: '995', name: 'ทีม', major: 'CE', score: 63, contact: { email: 'team@mail.com', phone: '095-555-5555' } },
    { id: '996', name: 'วุ้น', major: 'IT', score: 78, contact: { email: 'woon@mail.com', phone: '096-666-6666' } }
];

// เกณฑ์คะแนนตัดเกรด ข้อ 1
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

// ฟังก์ชันตัดเกรด (ใช้ find หาตัวแรกที่เข้าเงื่อนไข)
const toGrade = (score) => gradeCriteria.find(rule => score >= rule.min).grade;

// ส่วนที่ 1 — เขียนฟังก์ชันทั้ง 6 ตามโจทย์ (ต้องมี return ทุกตัวและไม่แก้ข้อมูลต้นฉบับ)

// 1 ดึงชื่อทุกคน (map) คือการหยิบ
const getNames = (students) => students.map(s => s.name);

// 2 ดึงคนที่สอบผ่าน 50 คะแนนขึ้นไป (filter) คือการคัด
const getPassedStudents = (students) => students.filter(s => s.score >= 50);

// 3 รวมคะแนนทุกคนเริ่มจาก 0 (reduce) คือการรวบ
const getTotalScore = (students) => students.reduce((sum, s) => sum + s.score, 0);

// 4 หาคะแนนเฉลี่ย
const getAverageScore = (students) => {
    if (students.length === 0) return 0; // ถ้าไม่มีข้อมูลคืนค่าเป็น 0 เลย 
    const total = getTotalScore(students);
    return +(total / students.length).toFixed(2); // หารแล้วทำให้เป็นทศนิยม 2 ตำแหน่ง
};

// 5 นับจำนวนแยกตามเกรด (ใช้คำสั่ง reduce ลดรูป)
const countByGrade = (students) => students.reduce((acc, s) => {
    const grade = toGrade(s.score); // แปลงคะแนนเป็นเกรด
    acc[grade] = (acc[grade] || 0) + 1; // ถ้าเกรดไม่มี ให้ขึ้น 0 ก่อน แล้วค่อยบวก 1
    return acc;
}, {});

// 6 หาคนได้คะแนนสูงสุด 
const getTopStudent = (students) => students.reduce((top, current) => {
    if (!top) return current; // ทำให้คนแรกที่เจอเป็นตัว top ก่อน (เพราะ top เริ่มจาก null)
    return current.score > top.score ? current : top; }, null); // เทียบตัวต่อตัว ใครเยอะกว่าชนะ

// ส่วน 2 ท่อข้อมูลต่อกัน แบบบรรทัดเดียว

// หาคะแนนเฉลี่ยของนักศึกษา CE ที่สอบผ่าน (filter  map  reduce)
const cePassedAvg = studentsData
    .filter(s => s.major === 'CE' && s.score >= 50) // คัดนักศึกษา CE ที่ผ่าน
    .map(s => s.score) // ดึงมาแค่คะแนน
    .reduce((sum, score, _, arr) => sum + (score / arr.length), 0); // หาค่าเฉลี่ยออกมา

// ส่วน 3 ทดสอบการทำงาน และทดสอบ Array ว่าง

console.log('=== ส่วน 1 ผลปกติ ===');
console.log('ชื่อนักศึกษาทุกคน:', getNames(studentsData));
console.log('นักศึกษาสอบผ่าน:', getPassedStudents(studentsData));
console.log('คะแนนรวม:', getTotalScore(studentsData));
console.log('คะแนนเฉลี่ย:', getAverageScore(studentsData));
console.log('สรุปเกรด:', countByGrade(studentsData));
console.log('คนที่ได้คะแนนสูงสุด:', getTopStudent(studentsData));

console.log('\n=== ส่วน 2 ท่อข้อมูล ===');
console.log('คะแนนเฉลี่ยนักศึกษา CE ที่สอบผ่าน:', cePassedAvg);

console.log('\n=== ส่วน 3 ทดสอบ Array ว่าง และต้องไม่ Error ===');
const emptyArray = [];
console.log('getNames:', getNames(emptyArray));                   // ได้ []
console.log('getPassedStudents:', getPassedStudents(emptyArray)); // ได้ []
console.log('getTotalScore:', getTotalScore(emptyArray));         // ได้ 0
console.log('getAverageScore:', getAverageScore(emptyArray));     // ได้ 0
console.log('countByGrade:', countByGrade(emptyArray));           // ได้ {}
console.log('getTopStudent:', getTopStudent(emptyArray));         // ได้ null