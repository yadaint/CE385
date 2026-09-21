
function getMenuPrice(menu) {
    switch (menu) {
        // 3 เมนูมีราคาเท่ากันเลยจงใจใช้ fall-through รวม case เข้าด้วยกัน
        case "ข้าวผัด":
        case "ข้าวมันไก่":
        case "ข้าวหมูแดง": 
            return 50; 
            
        case "ผัดไทย":
            return 60;
            
        case "ต้มยำกุ้ง":
            return 120;
            
        // มี default เอาไว้รับเวลาลูกค้าสั่งเมนูที่ไม่มีในร้าน
        default:
            return 0; 
    }
}
function getSizeMultiplier(size) {
    switch (size) {
        case "ธรรมดา":
            return 1;
        case "พิเศษ":
            return 1.5;
        case "จัมโบ้":
            return 2;
        // ถ้าลูกค้าสั่งแบบอืน ก็จะคิดป็นธรรมดา เพราะตั้งค่าไว้เป็น 1
        default:
            return 1;
    }
}
// เก็บข้อมูลเป็นแบบ Object เพื่อให้ออร์เดอร์นึงเก็บรายละเอียดได้หลายอย่าง
const orders = [
    { menu: "ผัดไทย", size: "พิเศษ", quantity: 2 },
    { menu: "ข้าวหมูแดง", size: "จัมโบ้", quantity: 1 },
    { menu: "ต้มยำกุ้ง", size: "ธรรมดา", quantity: 3 },
    { menu: "ข้าวมันไก่", size: "พิเศษ", quantity: 2 },
    { menu: "กะเพราหมูกรอบ", size: "ธรรมดา", quantity: 1 } // เมนูนี้ไม่มีในร้าน 
];

// ตัวแปรเก็บยอดรวมทั้งบิล
let totalBill = 0;

console.log("=== สรุปบิลค่าอาหาร ===");

for (const item of orders) {
    
    const basePrice = getMenuPrice(item.menu);        // เช็คราคาอาหารแต่ละจานตามเมนู
    const multiplier = getSizeMultiplier(item.size);  // เช็คตัวคูณตามขนาดจาน (ธรรมดา, พิเศษ, จัมโบ้)
    
    // คิดราคารวมของจานนี้ (ราคาตั้งต้น x ตัวคูณ x จำนวนจาน)
    const itemTotal = basePrice * multiplier * item.quantity;
    
    // รวมยอดทั้งบิล
    totalBill = totalBill + itemTotal;
    
    // พิมพ์รายการอาหารทีละบรรทัดตามโจทย์(เมนู + ขนาด + จำนวน + ราคารวมของจานนั้น)
    console.log(`${item.menu} (${item.size}) x${item.quantity} = ${itemTotal} บาท`);
}

console.log("=====================");
console.log(`ยอดรวมทั้งหมด: ${totalBill} บาท`);