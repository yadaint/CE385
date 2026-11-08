// src/schemas/student.schema.ts — "ยาม" ที่ประตูหน้าของระบบ
// หน้าที่เดียว: บอกว่าข้อมูลที่ยอมรับได้ต้องมีรูปร่างแบบไหน
// ไฟล์นี้ไม่รู้จัก Express และไม่รู้จักฐานข้อมูล
import { z } from "zod";

/* ---------- 1) นิยามของแต่ละฟิลด์ เขียนครั้งเดียว ใช้ซ้ำได้ ---------- */
// ข้อความใน { error: "..." } คือข้อความที่ใช้เมื่อ "ชนิดข้อมูลผิด"
// ซึ่งรวมกรณีที่ไม่ส่งฟิลด์นี้มาเลยด้วย — ถ้าไม่ใส่ Zod จะขึ้นข้อความอังกฤษของมันเอง
const studentFields = {
  code: z
    .string({ error: "ต้องระบุรหัสนักศึกษา" })
    .trim()
    .regex(/^\d{8,10}$/, "รหัสนักศึกษาต้องเป็นตัวเลข 8–10 หลัก"),

  name: z
    .string({ error: "ต้องระบุชื่อ–นามสกุล" })
    .trim()
    .min(2, "ชื่อต้องยาวอย่างน้อย 2 ตัวอักษร")
    .max(100, "ชื่อยาวเกิน 100 ตัวอักษร"),

  email: z.email("รูปแบบอีเมลไม่ถูกต้อง"),

  score: z.coerce
    .number({ error: "คะแนนต้องเป็นตัวเลข" })
    .int("คะแนนต้องเป็นจำนวนเต็ม")
    .min(0, "คะแนนต้องไม่ต่ำกว่า 0")
    .max(100, "คะแนนต้องไม่เกิน 100"),

  active: z.boolean({ error: "active ต้องเป็น true หรือ false" }),
};

/* ---------- 2) POST /students — ต้องส่งมาให้ครบ ---------- */
// strictObject = ถ้าส่งฟิลด์ที่เราไม่รู้จักมาด้วย ให้ตีกลับ ไม่ใช่เมินเฉย
export const createStudentSchema = z.strictObject(
  {
    ...studentFields,
    score: studentFields.score.default(0),        // ไม่ส่งมา = 0
    active: studentFields.active.default(true),   // ไม่ส่งมา = true
  },
  { error: "ส่งฟิลด์ที่ระบบไม่รู้จักมาด้วย — ตรวจชื่อฟิลด์ให้ตรงกับเอกสาร" },
);

/* ---------- 3) PATCH /students/:id — ส่งมาแค่ฟิลด์ที่จะแก้ ---------- */
export const updateStudentSchema = z
  .strictObject(studentFields, {
    error: "ส่งฟิลด์ที่ระบบไม่รู้จักมาด้วย — ตรวจชื่อฟิลด์ให้ตรงกับเอกสาร",
  })
  .partial()                                       // ทุกฟิลด์เป็น "ส่งก็ได้ ไม่ส่งก็ได้"
  .refine((body) => Object.keys(body).length > 0, {
    error: "ต้องส่งอย่างน้อยหนึ่งฟิลด์ที่ต้องการแก้",
  });

/* ---------- 4) :id ใน URL — ต้องเป็น UUID ---------- */
export const studentIdParamSchema = z.strictObject({
  id: z.uuid("id ต้องเป็น UUID เช่น 3f0c1e8a-... (คัดลอกจากผลของ GET /students)"),
});

/* ---------- 5) Query string ของ GET /students ----------
   ค่าที่มาจาก URL เป็นข้อความล้วน ("2" ไม่ใช่ 2) จึงต้องใช้ z.coerce แปลงก่อนตรวจ */
export const listStudentsQuerySchema = z.object({
  page: z.coerce.number({ error: "page ต้องเป็นตัวเลข" }).int().min(1, "page ต้องเริ่มที่ 1").default(1),
  limit: z.coerce.number({ error: "limit ต้องเป็นตัวเลข" }).int().min(1, "limit ต้องไม่น้อยกว่า 1").max(100, "limit สูงสุด 100").default(10),
  q: z.string().trim().min(1).optional(),                             // คำค้นหา
  sort: z.enum(["code", "name", "score", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/* ---------- 6) ให้ TypeScript ถอดชนิดข้อมูลจาก schema เอง ---------- */
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;