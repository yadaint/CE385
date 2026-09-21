// ระบบตรวจทะเบียน

// 1 สร้างฐานข้อมูลจำลอง ห้ามใช้ var จะใช้ const แทน
const students = [
    { id: '991', name: 'ญาดา', major: 'CE', score: 8 },
    { id: '992', name: 'จักรพันธ์', major: 'IT', score: 45 },
    { id: '993', name: 'แพรวา', major: 'CE', score: 70 },
    { id: '994', name: 'หยก', major: 'IT', score: 92 },
    { id: '995', name: 'ทีม', major: 'CE', score: 63 },
    { id: '996', name: 'วุ้น', major: 'IT', score: 78}
];

// 2 เขียนฟังก์ชัน fetchStudentById
function  fetchStudentById(id, callback) {

    // เช็คว่า id ที่ส่งมาเป็น string มั้ยหรือเป็นข้อความว่าง
    // ใช้ ==== ถ้าผิดรูปแบบให้ขึ้นเป๋็น error โดยที่เอาไว้ตัวแรก
    if (typeof id !== 'string' || id.trim() === '') {
        return callback(new Error("รหัสนักศึกษาไม่ถูกต้อง"));
    }

    // จำลองการหน่วงเวลา 300ms
    setTimeout(() => {

        // ค้นหานักศึกษาจาก array ด้วย id
        const student = students.find(s => s.id ===  id);

        // ถ้าไม่เจอส่ง error บอกว่าไม่มีรหัสนี้
        if (!student) {
            return callback(new Error('ไม่พบรหัสนักศึกษา ${id}'));
        }
        
        // ถ้าเจอข้อมูลช่องแรกใช่ null 
        // ช่องสองส่งข้อมูลกลับโดยใช้ {...student} เพื่อก็อปปี้ข้อมูล
        callback(null, {...student });

    }, 300);
}

// 3 ทดสอบเรียกใช้งานทั้ง 3 กรณี

// กรณี ก) มีจริง ค้นหา '996' วุ้น
fetchStudentById("996",  (error, student) => {

    // ดัก error ก่อนเสมอ
    if (error) {
        console.log("กรณี ก: พัง",error.message);
        return; // ถ้า error จบแค่ตรงนี้
    }

    // ถ้าไม่ error แปลว่าสำเร็จ ดึงข้อมููลมาใช้ได้เลย
    console.log("กรณี ก สำเร็จ เจอแล้ว ชื่อ:", student.name, "เรียนสาขา:", student.major);
});

// กรณี ข) ไม่มีรหัสนี้จริงๆ ทดสอบด้วย '999'
fetchStudentById("999", (error, student) => {
    if (error) {
        // โค้ดวิ่งเข้า if เพนสะไม่มีข้อมูล 999
        console.log("กรณี ข: หาไม่เจอ ", error.message);
        return;
   }
   console.log("กรณี ข สำเร็จ ข้อมูลคือ:", student);
});

// กรณี ค) ผิดรูปแบบ ใส่ตัวเลข 991 ไปตรงๆ แทนที่จะใส่เป็น string '991'
fetchStudentById(991, (error, student) => {
    if (error) {

        // เด้งออกตั้งแต่ทีแรก ไม่ต้องรอ 300ms
        console.log("กรณี ค: ผิดรูปแบบ", error.message);
        return;
    }
    console.log("กรณี ค สำเร็จ ข้อมูลคือ:", student);
});

// 4 ตอบคำถาม
/* 1 ถ้าลืมตรวจ error แล้วอ่าน .name ทันที จะเกิดอะไร ใครเห็น error นั้น
- โค้ดจะแครชดับไปเลย เพราะถ้ามันติด Error สิ่งที่ได้กลับมามันจะเป็น undefined พอเราไปฝืนดึง student.name จากของที่ไม่มีอยู่จริง
Node.js มันก็จะฟ้อง Error สีแดงเต็มจอแล้วหยุดทำงานทันที
- คนรันโค้ดจะเห็น Errorบน Console หรือ Terminal

2 ทำไมต้อง return หลังเรียก callback(error)
- เพื่อเบรก ไม่ให้โค้ดรันต่อ
- ถ้าเราสั่ง callback(error) แล้วลืมใส่ return โค้ดมันจะไม่ยอมหยุดทำงาน แต่มันจะรันบรรทัดถัดไปต่อหน้ามึนๆ
กลายเป็นว่าส่ง Error ไปแล้ว ยังจะดึงข้อมูลส่งตามไปซ้ำอีกรอบ ทำให้โปรแกรมมั่วไปหมด 
การใส่ return เลยเป็นการสั่งให้ฟังก์ชันจบงานแล้วแยกย้ายทันที */