import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FiCheckCircle, FiLock, FiShield, FiTrash2, FiUserPlus } from "react-icons/fi";

import Alert from "../components/Alert";
import ConfirmDialog from "../components/ConfirmDialog";
import FormInput from "../components/FormInput";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";
import {
  adminService,
  type AdminStaffAccount,
  type AdminStaffSummary,
} from "../services/adminService";
import { buildStaffEmail, createStaffSchema, type CreateStaffFormData } from "../schemas/staff.schema";
import { getFieldErrors } from "../utils/validation";

const INITIAL_FORM_STATE: CreateStaffFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
  employeeId: "",
  password: "",
};

/** หน้าจัดการแอดมิน — ต้องใส่รหัสยืนยัน 8 ตัว (ฟิค Main0110) ก่อนทุกครั้ง
 *  จึงจะมีสิทธิ์ "เพิ่ม" หรือ "ลด" บัญชีแอดมิน ใส่ผิดจะถูกล็อกไว้ทั้งหน้า */
export default function AdminStaffPage() {
  const { user } = useAuth();

  // ─── รหัสยืนยัน (state เท่านั้น ไม่เก็บลง localStorage → ทุกครั้งที่เข้าเมนูต้องใส่ใหม่) ───
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [gateInput, setGateInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // ─── รายชื่อแอดมิน + การลบ ───
  const [staffList, setStaffList] = useState<AdminStaffSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listNotice, setListNotice] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminStaffSummary | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // ─── ฟอร์มเพิ่มแอดมิน ───
  const [formData, setFormData] = useState<CreateStaffFormData>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdStaff, setCreatedStaff] = useState<AdminStaffAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** โหลดรายชื่อแอดมินใหม่จากฐานข้อมูล (เรียกหลังเพิ่ม/ลบ เพื่อให้ลิสต์ตรงกับ DB เสมอ) */
  const loadStaffList = useCallback(async (): Promise<void> => {
    setIsLoadingList(true);
    try {
      setStaffList(await adminService.getStaffList());
    } catch (err) {
      setListNotice(getApiErrorMessage(err));
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // ─── ขั้น 1: ใส่รหัสยืนยัน 8 ตัว — ผิด = ค้างที่หน้านี้ ไม่ปลดล็อกให้เลย ───
  const handleVerify = async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    const code = gateInput.trim();
    if (code.length !== 8) {
      setGateError("รหัสยืนยันต้องมี 8 ตัวอักษรพอดี");
      return;
    }
    setIsVerifying(true);
    setGateError(null);
    try {
      await adminService.verifyStaffAccess(code);
      setAccessCode(code); // จำไว้ใน state เพื่อแนบไปกับการเพิ่ม/ลบ — ออกจากหน้า = ต้องใส่ใหม่
      void loadStaffList();
    } catch (err) {
      setGateError(getApiErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    // รหัสพนักงานบังคับเป็นตัวเลข 4 หลัก — กรองตัวอักษรอื่นทิ้งทันทีที่พิมพ์
    setFormData((prev) => ({
      ...prev,
      [name]: name === "employeeId" ? value.replace(/\D/g, "").slice(0, 4) : value,
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // ─── ขั้น 2: เพิ่มแอดมิน (แนบรหัสยืนยันที่ใส่ไว้ไปด้วย) ───
  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!accessCode) return;
    setServerError(null);
    setCreatedStaff(null);

    const result = createStaffSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const staff = await adminService.createStaff(result.data, accessCode);
      setCreatedStaff(staff);
      setFormData(INITIAL_FORM_STATE);
      void loadStaffList();
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── ขั้น 3: ลดแอดมิน (ยืนยันผ่าน ConfirmDialog แล้วค่อยลบจริง) ───
  const handleRemove = async (): Promise<void> => {
    if (!accessCode || !removeTarget) return;
    setIsRemoving(true);
    try {
      await adminService.removeStaff(removeTarget.id, accessCode);
      setListNotice(`ลบบัญชี ${removeTarget.email} สำเร็จ — ข้อมูลทั้งหมดถูกลบถาวรแล้ว`);
      setRemoveTarget(null);
      void loadStaffList();
    } catch (err) {
      setListNotice(getApiErrorMessage(err));
      setRemoveTarget(null);
    } finally {
      setIsRemoving(false);
    }
  };

  // ═══ หน้าใส่รหัสยืนยัน (ยังไม่ปลดล็อก — บล็อกทั้งหน้า) ═══
  if (!accessCode) {
    return (
      <div className="min-h-screen bg-slate-100 pb-16">
        <div className="mx-auto max-w-md px-4 py-14">
          <Link to="/admin" className="text-sm font-medium text-violet-600 hover:text-violet-700">
            ← กลับหน้าหลังบ้าน
          </Link>

          <div className="mt-4 rounded-2xl bg-white p-8 shadow-md ring-1 ring-slate-200">
            <div className="text-center">
              <span
                aria-hidden="true"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-slate-100"
              >
                <FiShield className="text-2xl" />
              </span>
              <h1 className="font-display mt-3 text-2xl font-extrabold text-slate-900">
                พื้นที่จำกัดสิทธิ์
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                การเพิ่มหรือลดแอดมินต้องยืนยันด้วยรหัสลับ 8 ตัวอักษร — ต้องใส่ใหม่ทุกครั้งที่เข้าเมนูนี้
              </p>
            </div>

            {gateError && (
              <Alert variant="error" className="mt-5">
                {gateError}
              </Alert>
            )}

            <form onSubmit={(e) => void handleVerify(e)} noValidate className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="accessCode" className="text-sm font-medium text-slate-700">
                  รหัสยืนยัน (8 ตัวอักษร)
                </label>
                <input
                  id="accessCode"
                  name="accessCode"
                  type="password"
                  inputMode="text"
                  autoComplete="off"
                  maxLength={8}
                  placeholder="••••••••"
                  value={gateInput}
                  onChange={(e) => setGateInput(e.target.value)}
                  disabled={isVerifying}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.4em] text-slate-900 shadow-sm outline-none transition placeholder:tracking-[0.4em] placeholder:text-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {gateInput.length > 0 && gateInput.length !== 8 && (
                  <p className="text-xs text-slate-400">
                    ใส่ไป {gateInput.length}/8 ตัว
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isVerifying || gateInput.trim().length !== 8}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-bold text-white shadow transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiLock aria-hidden="true" className="text-base" />
                {isVerifying ? "กำลังตรวจรหัส..." : "ปลดล็อกการจัดการแอดมิน"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-400">
              ใส่รหัสไม่ถูกต้องจะไม่มีสิทธิ์เข้าถึงการเพิ่มหรือลดแอดมิน
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══ ปลดล็อกแล้ว — ฟอร์มเพิ่มแอดมิน + รายชื่อแอดมินพร้อมปุ่มลบ ═══
  const emailPreview = buildStaffEmail(formData.employeeId || "รหัสพนักงาน");
  const isEmailPreviewReal = formData.employeeId.trim() !== "";

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link to="/admin" className="text-sm font-medium text-violet-600 hover:text-violet-700">
          ← กลับหน้าหลังบ้าน
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-3xl font-extrabold text-slate-900">
          <FiUserPlus aria-hidden="true" className="text-2xl" />
          จัดการแอดมิน (เพิ่ม / ลด)
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          รหัสยืนยันถูกต้อง — เพิ่มบัญชีใหม่ได้ที่ฟอร์มด้านล่าง หรือลบบัญชีจากรายชื่อ
        </p>

        {/* สถานะรหัสยืนยัน — แจ้งว่าปลดล็อกอยู่และต้องใส่ใหม่เมื่อออกจากหน้านี้ */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <FiCheckCircle aria-hidden="true" className="text-sm" />
          รหัสยืนยันถูกต้อง — สิทธิ์จัดการแอดมินเปิดอยู่ (ออกจากหน้านี้แล้วต้องใส่รหัสใหม่)
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <FiUserPlus aria-hidden="true" />
            เพิ่มบัญชีแอดมินใหม่
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ระบบสร้างอีเมลจากรหัสพนักงานให้อัตโนมัติ แล้วบัญชีนั้นล็อกอินเข้าหลังบ้านได้ทันที
          </p>

          {createdStaff && (
            <Alert variant="success" className="mt-4">
              <span className="flex items-start gap-2">
                <FiCheckCircle aria-hidden="true" className="mt-0.5 shrink-0 text-base" />
                <span>
                  สร้างบัญชี <b>{createdStaff.firstName} {createdStaff.lastName}</b> สำเร็จ —
                  อีเมล: <b>{createdStaff.email}</b>
                  <br />
                  ใช้อีเมลนี้กับรหัสผ่านที่ตั้งไว้ ล็อกอินที่หน้า <b>/admin/login</b> ได้เลย
                </span>
              </span>
            </Alert>
          )}
          {serverError && (
            <Alert variant="error" className="mt-4">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormInput
                label="ชื่อจริง"
                name="firstName"
                placeholder="เช่น สมชาย"
                value={formData.firstName}
                onChange={handleChange}
                error={fieldErrors.firstName}
                disabled={isSubmitting}
              />
              <FormInput
                label="นามสกุล"
                name="lastName"
                placeholder="เช่น ใจดี"
                value={formData.lastName}
                onChange={handleChange}
                error={fieldErrors.lastName}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormInput
                label="เบอร์โทรศัพท์"
                name="phone"
                type="tel"
                placeholder="0812345678"
                value={formData.phone}
                onChange={handleChange}
                error={fieldErrors.phone}
                disabled={isSubmitting}
              />
              <FormInput
                label="วันเดือนปีเกิด"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                error={fieldErrors.dateOfBirth}
                disabled={isSubmitting}
              />
            </div>

            <FormInput
              label="รหัสพนักงาน (ตัวเลข 4 หลัก — ใช้สร้างอีเมล)"
              name="employeeId"
              placeholder="เช่น 0001"
              autoComplete="off"
              inputMode="numeric"
              maxLength={4}
              value={formData.employeeId}
              onChange={handleChange}
              error={fieldErrors.employeeId}
              disabled={isSubmitting}
            />

            {/* พรีวิวอีเมลที่ระบบจะสร้างให้อัตโนมัติ */}
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-semibold text-violet-700">อีเมลที่ระบบจะสร้างให้อัตโนมัติ</p>
              <p className="mt-1 font-mono text-sm font-bold text-violet-900">
                {isEmailPreviewReal ? emailPreview : `admin…@concerthub.dev`}
              </p>
            </div>

            <FormInput
              label="รหัสผ่าน (อย่างน้อย 8 ตัว มีตัวเล็ก ตัวใหญ่ และตัวเลข)"
              name="password"
              type="password"
              placeholder="••••••••"
              enablePasswordToggle
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              error={fieldErrors.password}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-bold text-white shadow transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiUserPlus aria-hidden="true" className="text-base" />
              {isSubmitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชีแอดมิน"}
            </button>
          </form>
        </div>

        {/* ─── รายชื่อแอดมิน + ลดแอดมิน ─── */}
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">รายชื่อแอดมินในระบบ</h2>
            <span className="text-sm text-slate-400">{staffList.length} คน</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            กดปุ่มถังขยะเพื่อลบบัญชีแอดมิน (ลบแล้วกู้คืนไม่ได้) — ลบบัญชีของตัวเองไม่ได้
          </p>

          {listNotice && (
            <Alert variant="info" className="mt-4">
              {listNotice}
            </Alert>
          )}

          {isLoadingList ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {staffList.map((staff) => {
                const isMe = user?.id === staff.id;
                const fullName = `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim();

                return (
                  <li
                    key={staff.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {fullName || staff.email}
                        {isMe && (
                          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                            คุณ (ล็อกอินอยู่)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {staff.employeeId ? `รหัสพนักงาน ${staff.employeeId} · ` : ""}
                        {staff.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setListNotice(null);
                        setRemoveTarget(staff);
                      }}
                      disabled={isMe}
                      title={isMe ? "ลบบัญชีของตัวเองไม่ได้" : "ลบบัญชีแอดมินนี้"}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiTrash2 aria-hidden="true" className="text-sm" />
                      ลบ
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* กล่องยืนยันก่อนลบแอดมิน — แสดงหมายเหตุให้อ่านก่อนกดยืนยันลบถาวร */}
      {removeTarget && (
        <ConfirmDialog
          title="ยืนยันการลบบัญชีแอดมิน"
          message={`หากยืนยันลบ บัญชี "${removeTarget.email}" และข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบออกจากฐานข้อมูลอย่างถาวร และไม่สามารถกู้คืนได้ทุกกรณี`}
          confirmLabel="ยืนยันลบถาวร"
          cancelLabel="ยกเลิก"
          isConfirming={isRemoving}
          confirmingLabel="กำลังลบ..."
          onConfirm={() => void handleRemove()}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
