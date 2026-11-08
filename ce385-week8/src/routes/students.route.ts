// src/routes/students.route.ts — ชั้นเปลือกนอกสุดที่ติดกับ HTTP
// หน้าที่มีแค่ 3 อย่าง:
//   1. บอกว่า method ไหน + path ไหน
//   2. บอกว่าใช้ schema ไหนตรวจ
//   3. เอาผลจาก service มาห่อเป็น response พร้อม status code ที่ถูกต้อง
// ไม่มีตรรกะทางธุรกิจในไฟล์นี้ และ "ไม่มี /api/v1/students" ในไฟล์นี้ด้วย
// (path ที่เอาไปแขวนเป็นเรื่องของ app.ts — router ไม่ควรรู้ว่าตัวเองอยู่ที่ไหน)
import { Router } from "express";
import { asyncHandler } from "../middlewares/async-handler.js";
import { validate } from "../middlewares/validate.js";
import {
  createStudentSchema, listStudentsQuerySchema, studentIdParamSchema, updateStudentSchema,
  type CreateStudentInput, type ListStudentsQuery, type UpdateStudentInput,
} from "../schemas/student.schema.js";
import * as studentService from "../services/student.service.js";

export const studentsRouter = Router();

/* ---------- GET / → อ่านหลายรายการ ---------- */
studentsRouter.get(
  "/",
  validate({ query: listStudentsQuerySchema }),
  asyncHandler(async (_req, res) => {
    const query: ListStudentsQuery = res.locals.valid.query;
    const result = await studentService.listStudents(query);
    res.status(200).json(result);            // 200 OK + { data, meta }
  }),
);

/* ---------- GET /:id → อ่านรายการเดียว ---------- */
studentsRouter.get(
  "/:id",
  validate({ params: studentIdParamSchema }),
  asyncHandler(async (_req, res) => {
    const { id } = res.locals.valid.params as { id: string };
    const student = await studentService.getStudentById(id);
    res.status(200).json({ data: student });
  }),
);

/* ---------- POST / → สร้างใหม่ ---------- */
studentsRouter.post(
  "/",
  validate({ body: createStudentSchema }),
  asyncHandler(async (_req, res) => {
    const input: CreateStudentInput = res.locals.valid.body;
    const created = await studentService.createStudent(input);

    // 201 Created + header Location ชี้ไปที่ของใหม่ที่เพิ่งสร้าง
    // นี่คือธรรมเนียมของ REST ที่คนลืมบ่อยที่สุด
    res.status(201).location(`/api/v1/students/${created.id}`).json({ data: created });
  }),
);

/* ---------- PATCH /:id → แก้บางฟิลด์ ---------- */
studentsRouter.patch(
  "/:id",
  validate({ params: studentIdParamSchema, body: updateStudentSchema }),
  asyncHandler(async (_req, res) => {
    const { id } = res.locals.valid.params as { id: string };
    const input: UpdateStudentInput = res.locals.valid.body;
    const updated = await studentService.updateStudent(id, input);
    res.status(200).json({ data: updated });
  }),
);

/* ---------- DELETE /:id → ลบ ---------- */
studentsRouter.delete(
  "/:id",
  validate({ params: studentIdParamSchema }),
  asyncHandler(async (_req, res) => {
    const { id } = res.locals.valid.params as { id: string };
    await studentService.deleteStudent(id);

    // 204 No Content — ลบสำเร็จแล้วไม่มีอะไรจะส่งกลับ
    // ห้ามใส่ body ใน 204 (ผิดมาตรฐาน HTTP) จึงใช้ .end() ไม่ใช่ .json()
    res.status(204).end();
  }),
);