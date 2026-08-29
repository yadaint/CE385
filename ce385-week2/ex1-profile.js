 
// const=ค่าคงที่ คือการประกาศตัวแปรเพื่อบอกว่า ไม่สามารถเปลี่ยนค่าได้ กัน error
const nickname = "YADA";
const studentId = "68110921";
const age = 21;
const major = "Computer Engineering";
const RegisteredCourses = 5;
const yearsLeft = 2;  // ปีที่เหลือก่อนจบ

// คำนวณปีที่จะจบ (ตัวแปร Number) 
const gradYear = 2569 + yearsLeft;

// แสดงผลลัพธ์ในรูปแบบของ template Literal ใช้ตัวนี้ครอบ(`) พิมพ์แบบไหน แสดงแบบนั้น
console.log(`===== บัตรแนะนำตัว =====
ชื่อเล่น       : ${nickname}
รหัสนักศึกษา  : ${studentId}
อายุ         : ${age} ปี
สาขาวิชา     : ${major}
ลงทะเบียน    : ${RegisteredCourses} วิชา
ปีที่จะจบ      : ${gradYear}
========================`);