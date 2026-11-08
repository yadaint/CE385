// src/services/student.service.ts — ชั้นตรรกะทางธุรกิจ
// กฎของชั้นนี้ (บังคับใช้ตั้งแต่สัปดาห์ที่ 5):
//   • ห้าม import express — ไม่รู้จัก req / res / status code
//   • ห้าม console.log — ใครเรียกไปใช้ก็ต้องได้ผลเหมือนกันหมด
import { prisma } from "../lib/prisma.js";
import { notFound } from "../errors/app-error.js";
import type { CreateStudentInput, ListStudentsQuery, UpdateStudentInput } from "../schemas/student.schema.js";

/* ---------- R: อ่านหลายรายการ + แบ่งหน้า + ค้นหา + เรียง ---------- */
export async function listStudents(query: ListStudentsQuery) {
  const { page, limit, q, sort, order } = query;

  // where ว่าง = ไม่กรองอะไร · mode: "insensitive" = ไม่สนตัวพิมพ์เล็กใหญ่
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { code: { contains: q } },
        ],
      }
    : {};

  // ยิงสองคำถามพร้อมกัน — Promise.all จากสัปดาห์ที่ 4 ได้ใช้จริงที่นี่
  const [rows, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,   // ข้ามของหน้าก่อน ๆ
      take: limit,                // เอามาแค่เท่าที่ขอ
    }),
    prisma.student.count({ where }),
  ]);

  return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/* ---------- R: อ่านรายการเดียว ---------- */
export async function getStudentById(id: string) {
  const student = await prisma.student.findUnique({ where: { id } });

  // findUnique ไม่โยน error เมื่อหาไม่เจอ — มันคืน null เฉย ๆ
  // เราจึงต้องแปลง null เป็นข้อผิดพลาดที่มีความหมายเอง
  if (!student) throw notFound(`ไม่พบนักศึกษา id ${id}`);

  return student;
}

/* ---------- C: สร้างใหม่ ---------- */
export async function createStudent(input: CreateStudentInput) {
  // ถ้า code หรือ email ซ้ำ Prisma จะโยน P2002 ออกมา
  // เราปล่อยให้มันลอยขึ้นไปถึง error-handler ซึ่งแปลงเป็น 409 ให้เอง
  return prisma.student.create({ data: input });
}

/* ---------- U: แก้บางฟิลด์ ---------- */
export async function updateStudent(id: string, input: UpdateStudentInput) {
  // แถวไม่มีอยู่ → Prisma โยน P2025 → error-handler แปลงเป็น 404
  return prisma.student.update({ where: { id }, data: input });
}

/* ---------- D: ลบ ---------- */
export async function deleteStudent(id: string) {
  await prisma.student.delete({ where: { id } });
}