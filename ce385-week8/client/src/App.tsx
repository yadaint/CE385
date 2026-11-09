import { useEffect, useState, type FormEvent } from "react";

import {
  createStudent,
  deleteStudent,
  listStudents,
  updateStudent,
  type Student,
  type StudentInput,
} from "./services/studentService";

/** ค่าเริ่มต้นของฟอร์ม (โหมดเพิ่มใหม่) */
const EMPTY_FORM: StudentInput = { code: "", name: "", email: "", score: 0, active: true };

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  // editing = null → โหมด "เพิ่มใหม่" · editing = Student → โหมด "แก้ไข" รายการนั้น
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  /** ดึงรายการล่าสุดจาก server มาใส่ตาราง */
  async function refresh(): Promise<void> {
    try {
      setStudents(await listStudents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ — backend เปิดอยู่ไหม?");
    }
  }

  /* ────────────────────────────────────────────────────────────
     ▼▼▼ โครงสร้างที่อาจารย์กำหนด — ฟังก์ชันเดียวจัดการทั้งสร้างและแก้ไข ▼▼▼
     ──────────────────────────────────────────────────────────── */
  async function handleSubmit(input: StudentInput) {
    if (editing) {
      await updateStudent(editing.id, input); // โหมดแก้ไข → PATCH /students/:id
      setEditing(null);                       // กลับเป็นโหมดเพิ่มใหม่
    } else {
      await createStudent(input);             // โหมดเพิ่มใหม่ → POST /students
    }
    setStudents(await listStudents()); // โหลดใหม่ให้ตารางตรงกับฐานข้อมูล
  }
  /* ──────────────────────────────────────────────────────────── */

  /** ลบรายการ แล้วโหลดใหม่ให้ตารางตรงกับฐานข้อมูลเช่นกัน */
  async function handleDelete(id: string): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      await deleteStudent(id);
      setStudents(await listStudents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  /** กดปุ่ม "แก้ไข" → เติมข้อมูลแถวนั้นลงฟอร์มและสลับเป็นโหมดแก้ไข */
  function startEdit(student: Student): void {
    setEditing(student);
    setForm({
      code: student.code,
      name: student.name,
      email: student.email,
      score: student.score,
      active: student.active,
    });
    setError(null);
  }

  /** เคลียร์ฟอร์มกลับสู่โหมดเพิ่มใหม่ */
  function resetForm(): void {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  /** จัดการ event ของ <form> — กันหน้ารีเฟรชแล้วส่งงานต่อให้ handleSubmit */
  function onFormSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    setLoading(true);
    handleSubmit({ ...form, score: Number(form.score) })
      .then(() => resetForm())
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ"),
      )
      .finally(() => setLoading(false));
  }

  return (
    <main className="container">
      <h1>ระบบจัดการนักศึกษา <small>CE385 · Week 8</small></h1>

      {/* ─── ฟอร์มเพิ่ม/แก้ไข ─── */}
      <form className="card" onSubmit={onFormSubmit}>
        <h2>{editing ? `แก้ไข: ${editing.name}` : "เพิ่มนักศึกษาใหม่"}</h2>

        <div className="grid">
          <label>
            รหัสนักศึกษา
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="เช่น 6501234"
              required
            />
          </label>

          <label>
            ชื่อ–นามสกุล
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="เช่น สมชาย ใจดี"
              required
            />
          </label>

          <label>
            อีเมล
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="เช่น somchai@university.ac.th"
              required
            />
          </label>

          <label>
            คะแนน (0–100)
            <input
              type="number"
              min={0}
              max={100}
              value={form.score}
              onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
              required
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            กำลังศึกษาอยู่ (active)
          </label>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "เพิ่มนักศึกษา"}
          </button>
          {editing && (
            <button type="button" className="secondary" onClick={resetForm}>
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>
      </form>

      {/* ─── ตารางรายการ ─── */}
      <section className="card">
        <h2>รายชื่อนักศึกษา ({students.length} คน)</h2>

        {students.length === 0 ? (
          <p className="muted">ยังไม่มีข้อมูล — เพิ่มจากฟอร์มด้านบนได้เลย</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อ–นามสกุล</th>
                <th>อีเมล</th>
                <th>คะแนน</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.code}</td>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.score}</td>
                  <td>{s.active ? "กำลังศึกษา" : "ไม่ active"}</td>
                  <td>
                    <button type="button" onClick={() => startEdit(s)}>แก้ไข</button>{" "}
                    <button
                      type="button"
                      className="danger"
                      disabled={loading}
                      onClick={() => void handleDelete(s.id)}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
