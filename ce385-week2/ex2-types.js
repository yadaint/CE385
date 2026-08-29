// ส่วนที่ 1  สร้างตัวแปรแต่ละชนิดข้อมูล
const stringVar = "สวัสดี"; 
const numberVar = 99;     
const booleanVar = true;  
let undefinedVar;            //ใช้ let เพราะยังม่กำหนดค่าให้ตัวแปร
const nullVar = null;        // null = ตัวแปรว่าาง
const arrayVar = [1, 2, 3]; 

// ส่วนที่ 2 หาชนิดข้อมูลของตัวแปรแต่ละตัว
// แสดงผลลัพธ์ของตัวแปรแต่ละชนิด ใช้ typeof เพื่อตรวจสอบ
console.log(`ค่า: ${stringVar} | ชนิด: ${typeof stringVar}`);
console.log(`ค่า: ${numberVar} | ชนิด: ${typeof numberVar}`);
console.log(`ค่า: ${booleanVar} | ชนิด: ${typeof booleanVar}`);
console.log(`ค่า: ${undefinedVar} | ชนิด: ${typeof undefinedVar}`);
console.log(`ค่า: ${nullVar} | ชนิด: ${typeof nullVar}`); //จะได้ object เป็นบัคของ js
console.log(`ค่า: ${arrayVar} | ชนิด: ${typeof arrayVar}`); // array ใน js จะได้ object

console.log("typeof null ได้ผลคือ:", typeof null); 
console.log("ตัวแปรที่ยังไม่กำหนดค่ามีชนิดเป็น:", typeof undefinedVar); 

// abc บังคับแปลงเป็นตัวเลขไม่ได้ เลยได้ค่า NaN (Not a Number) กลับมา
const myNaN = Number("abc");  
console.log("typeof NaN ได้ผลคือ:", typeof myNaN); 

// ส่วนที่ 3 การแปลงชนิดข้อมูล
const inputAge = "20"; 
const inputScore = "85.5";

console.log("อายุบวก 5:", Number(inputAge) + 5); 

// .toFixed(1) คือการสั่งล็อคทศนิยมให้อยู่ที่ 1 ตำแหน่ง (ปัดเศษให้ด้วยถ้าเกิน)
console.log("คะแนน:", Number(inputScore).toFixed(1)); 

// ข้อความ "20" กับตัวเลข 20 เป็นคนละชนิดกัน เลยตอบ false
console.log("เช็คแบบไม่แปลง:", inputAge === 20); 

// ตัวเลข 20 กับตัวเลข 20 เป็นชนิดเดียวกัน เลยตอบ true
console.log("เช็คแบบแปลงก่อน:", Number(inputAge) === 20);