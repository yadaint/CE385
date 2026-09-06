// ส่วน 1 — สร้างข้อมูลตั้งต้น 6 คน

const initialStudents = [
    { id: '991', name: 'ญาดา', major: 'CE', score: 85, contact: { email: 'yada@mail.com', phone: '091-111-1111' } },
    { id: '992', name: 'จักรพันธ์', major: 'IT', score: 45, contact: { email: 'jakkaphan@mail.com', phone: '092-222-2222' } },
    { id: '993', name: 'แพรวา', major: 'CE', score: 70, contact: { email: 'phraewa@mail.com', phone: '093-333-3333' } },
    { id: '994', name: 'หยก', major: 'IT', score: 92, contact: { email: 'yok@mail.com', phone: '094-444-4444' } },
    { id: '995', name: 'ทีม', major: 'CE', score: 63, contact: { email: 'team@mail.com', phone: '095-555-5555' } },
    { id: '996', name: 'วุ้น', major: 'IT', score: 78, contact: { email: 'woon@mail.com', phone: '096-666-6666' } }
];

// ส่วน 2  เขียนฟังก์ชันค้นหา (ทุกตัวต้อง return และไม่แก้ข้อมูลต้นฉบับ)

// 1 ฟังก์ชันค้นหานักศึกษาจาก ID
const findById = (students, id) => {
    // ใช้ .find หาตัวแรกที่ตรงกัน ถ้าไม่เจอจะ return ค่า undefined ทันที
    return students.find(student => student.id === id);
};

// 2 ฟังก์ชันค้นหานักศึกษาตามสาขาวิชา
const findByMajor = (students, major) => {
    // ใช้ .filter เอาเฉพาะคนที่เรียนสาขานั้น แล้วจัดกลุ่มส่งกลับมาเป็น array ใหม่
    return students.filter(student => student.major === major);
};

// 3 ฟังก์ชันเช็คว่ามีใครสอบตกไหม (คะแนนน้อยกว่า50)
const hasFailingStudent = (students) => {
    // ใช้ .some เช็คว่ามี เช็คดูว่ามีใครคะแนนไม่ถึง 50 บ้าง ต่อให้เจอคนเดียวก็ตอบ true ทันที
    return students.some(student => student.score < 50);
};

// 4 ฟังก์ชันดึงอีเมลนักศึกษาจาก ID (ต้องใช้ ?. และ ?? ตามโจทย์)
const getEmail = (students, id) => {
    // ใช้ฟังก์ชัน findById ที่เขียนไว้ข้างบนมาช่วยหานักศึกษาก่อน ไม่ต้องเขียนโค้ดซ้ำ
    const student = findById(students, id);
    return student?.contact?.email ?? 'ไม่พบข้อมูลติดต่อ'; // ถ้าไม่เจอจะคืนค่า "ไม่พบข้อมูลติดต่อ"
};

// ส่วน 3 ทดสอบระบบ (รวมถึงกรณีหาไม่เจอ)

// ทดสอบค้นหาไอดี 9999 ที่ไม่มีในระบบ เพื่อเช็ค error ระบบ
const notFoundStudent = findById(initialStudents, '9999');
const notFoundEmail = getEmail(initialStudents, '9999');

// สร้างข้อมูลนักศึกษาใหม่ 1 คน แบบไม่ใส่ข้อมูล contact 
const newStudent = { id: '997', name: 'นินิว', major: 'CE', score: 81 }; 

/// ไม่ใช้ push เพราะไม่อยากแก้ข้อมูลเดิม เลยใช้ ... เอานักศึกษาเก่ามาต่อด้วยนักศึกษาใหม่ มาเป็นก้อนใหม่แทน
const updatedStudents = [...initialStudents, newStudent];

// ลองดึงเมลคนที่ไม่มี contact ดูว่า ?. กับ ?? จะเป็นยังไง แล้วขึ้นข้อความสำรองแทนมั้ย
const noContactEmail = getEmail(updatedStudents, '997');

// แสดงผลลัพธ์ทั้งหมด

console.log('=== ผลการค้นหานักศึกษา ===');
console.log('ข้อมูลของไอดี 994 :', findById(updatedStudents, '994'));
console.log('รายชื่อนักศึกษาสาขา IT :', findByMajor(updatedStudents, 'IT'));
console.log('มีเด็กสอบตกหรือไม่ :', hasFailingStudent(updatedStudents));

console.log('\n=== ทดสอบระบบถ้าหาไม่เจอและข้อมูลไม่ครบ ===');
console.log('ค้นหา ID 999 (ไม่มีในระบบ) :', notFoundStudent); // ระบบต้องคืนค่า undefined
console.log('ดึงอีเมล ID 999 :', notFoundEmail); // ระบบต้องขึ้น "ไม่พบข้อมูลติดต่อ"

console.log('\n=== ทดสอบการเพิ่มข้อมูลแบบไม่ใช้ push ===');
console.log('เช็คข้อมูลน้องใหม่ที่เพิ่งเพิ่มเข้ามา :', findById(updatedStudents, '997'));
console.log('ดึงอีเมล ID 997 (คนที่ไม่มี contact) :', noContactEmail); // ระบบต้องโชว์ "ไม่พบข้อมูลติดต่อ"