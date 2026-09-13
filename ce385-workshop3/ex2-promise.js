// แปลง Callback เป็น Promise

// ฐานข้อมูลนักศึกษาจากข้อ 1 
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

// 1 เขียน fetchStudentByIdAsync คืนค่าเป็น Promise ห้ามใช้ async
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

// 2 ทดสอบเรียกใช้งานทั้ง 3 กรณี .then .catch .finally

// ก) มีจริง หา '994' หยก
fetchStudentByIdAsync("994")
    .then(student => console.log("กรณี ก สำเร็จ:", student.name))
    .catch(err => console.log("กรณี ก พัง", err.message))
    .finally(() => console.log("กรณี ก: จบการทำงาน (finally รันเสมอ)"));

// ข) ไม่มีรหัสนี้จริง ('999')
fetchStudentByIdAsync("999")
    .then(student => console.log("กรณี ข สำเร็จ:", student))
    .catch(err => console.log("กรณี ข หาไม่เจอ", err.message))
    .finally(() => console.log("กรณี ข: จบการทำงาน (finally รันเสมอ)"));

// ค) ผิดรูปแบบ (ส่งตัวเลข 991)
fetchStudentByIdAsync(991)
    .then(student => console.log("กรณี ค สำเร็จ:", student))
    .catch(err => console.log("กรณี ค ผิดรูปแบบ", err.message))
    .finally(() => console.log("กรณี ค: จบการทำงาน (finally รันเสมอ)"));

/* .then() (โซนผ่าน)
ถ้าทำงานผ่าน ดึงข้อมูลสำเร็จ โค้ดจะวิ่งมาทำตรงนี้

.catch() (โซนพัง)
ถ้างานมีปัญหา เกิด Error มันจะข้าม .then() แล้วกระโดดมาตรงนี้แทน

.finally() (โซนปิดท้าย)
ไม่ว่าจะผ่านหรือพัง ตอนจบยังไงก็ต้องแวะมาทำตรงนี้เสมอ */

// 3 ทำโซ่ 3 ขั้น ทุกขั้นต้อง return 
fetchStudentByIdAsync("991")

    // 1 แปลงข้อมูลเป็น object {name, grade}
    .then(student => {
        return { name: student.name, grade: toGrade(student.score) };
    })
    // 2 แปลงข้อมูลเป็น string
    .then(data => {
    return `นักศึกษาชื่อ ${data.name} สอบได้เกรด ${data.grade}`;
    })
    // 3 แสดงผลลัพธ์
    .then(report => {
    console.log("ผลลัพธ์โซ่ 3 ขั้น", report);
    })
    .catch(err => console.log("โซ่ 3 ขั้น มี error", err.message));

// 4 เขียน promisify(fn) อเนกประสงค์
function promisify(fn) {
    return function(...args) {
        return new Promise((resolve, reject) => {

            // เรียกฟังก์ชันเดิมโดยต่อ callback แบบ error-first ท้ายสุด
            fn(...args, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    };
}

// สร้างฟังก์ชันตัวอย่างที่ไม่ใช่ข้อ 1 เอาไว้ทดสอบ promisify
function exampleFunction(a, b, callback) {
    setTimeout(() => {
        if (typeof a !== 'number' || typeof b !== 'number') {
            return callback(new Error("a และ b ต้องเป็นตัวเลขเท้่านั้น"));
        }
        if (b === 0) {
            return callback(new Error("ห้ามหารด้วย 0"));
        }
        callback(null, a / b);
    }, 300);
}

// แปลงฟังก์ชัน divide เป็น Promise ด้วย promisify
const divideAsync = promisify(exampleFunction);

// ทดสอบเรียกใช้งานฟังก์ชันที่แปลงแล้ว
divideAsync(30, 2)
    .then(result => console.log("ผลลัพธ์การหาร 30 / 2 =", result))
    .catch(err => console.log("เกิด error:", err.message));