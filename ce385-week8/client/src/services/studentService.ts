// src/services/studentService.ts — ชั้นติดต่อ API ฝั่งหน้าเว็บ
// ทุกฟังก์ชันคืน Promise — Component จึงเรียกด้วย await ได้เลย
// เรียกผ่าน path สัมพัทธ์ /api/... (vite proxy ส่งต่อไปให้ backend พอร์ต 3000 เอง)

/** รูปร่างข้อมูลนักศึกษาที่ API คืนกลับมา */
export interface Student {
  id: string;
  code: string;
  name: string;
  email: string;
  score: number;
  active: boolean;
}

/** ข้อมูลที่ใช้สร้าง/แก้ไข — เหมือน Student แต่ไม่มี id (id ระบบสร้างเอง) */
export type StudentInput = Omit<Student, "id">;

const BASE_URL = "/api/v1/students";

/** ยิงคำขอพร้อมจัดการ error กลางที่เดียว */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  // 204 No Content (ลบสำเร็จ) — ไม่มี body ให้อ่าน
  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as {
    data?: T;
    error?: { message?: string };
    message?: string;
  };

  if (!res.ok) {
    throw new Error(json?.error?.message ?? json?.message ?? `คำขอล้มเหลว (รหัส ${res.status})`);
  }

  // API ครอบผลลัพธ์ด้วย { data: ... } — unwrap ที่นี่ที่เดียว
  return (json.data ?? (json as unknown)) as T;
}

/** GET /api/v1/students — อ่านรายการทั้งหมด */
export async function listStudents(): Promise<Student[]> {
  return request<Student[]>(BASE_URL);
}

/** POST /api/v1/students — สร้างใหม่ */
export async function createStudent(input: StudentInput): Promise<Student> {
  return request<Student>(BASE_URL, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** PATCH /api/v1/students/:id — แก้ไขรายการ */
export async function updateStudent(id: string, input: StudentInput): Promise<Student> {
  return request<Student>(`${BASE_URL}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** DELETE /api/v1/students/:id — ลบรายการ */
export async function deleteStudent(id: string): Promise<void> {
  await request<void>(`${BASE_URL}/${id}`, { method: "DELETE" });
}
