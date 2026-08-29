// ส่วนที่ 1 สร้างตัวแปรเก็บคะแนนดิบ
const workshopRaw = 48;
const attendance = 9;
const project = 17;
const midterm = 15;
const final = 24;

const max_workshopRaw = 60; // คะแนนดิบ Workshop เต็ม 60
const max_workshop = 20;    // น้ำหนักคะแนน Workshop ที่จะเอาไปคิดเกรดจริงๆ คือ 20
const max_total = 100;      // คะแนนรวมทั้งวิชาเต็ม 100
const target_score = 80;    //เป้าหมายเพื่อให้ได้เกรด A คือ 80 คะแนน

// ส่วนที่ 2 คำนวณคะแนนตามสูตร

// แปลงคะแนน Workshop ตามสูตรของวิชา: (คะแนนดิบ ÷ 60) × 20
// workshopScore = (คะแนนที่ทำได้ / คะแนนเต็มดิบ) * น้ำหนักคะแนนจริง
const workshopScore = (workshopRaw / max_workshopRaw) * max_workshop;

// เอาคะแนนทุกส่วนมารวมกันให้หมด
const totalScore = workshopScore + attendance + project + midterm + final;

// หาเปอร์เซ็นต์ (สูตรคือ เอาคะแนนรวม / คะแนนเต็มทั้งหมด * 100)
const percentage = (totalScore / max_total) * 100;

// หาว่าขาดอีกกี่คะแนนถึงจะได้ 80 คะแนน ถ้าผลออกมาว่า totalScore ได้เยอะกว่า 80 scoreNeeded จะได้ค่าติดลบ 
const scoreNeeded = target_score - totalScore;

// แสดงใบสรุปคะแนน
// ใส่ .toFixed(2) เฉพาะตอนสรุปไม่งั้นถ้าใช้ตอนคำนวณจะเป็นข้อความแล้วเอาไปบวกเลขต่อไม่ได้
console.log(`=== สรุปคะแนน ===
คะแนน Workshop: ${workshopScore.toFixed(2)} / ${max_workshop}
คะแนนรวม: ${totalScore.toFixed(2)}
คิดเป็น: ${percentage.toFixed(2)}%
ต้องการอีก ${scoreNeeded.toFixed(2)} คะแนน เพื่อให้ได้เกรด A (${target_score} คะแนน)
=============================`);