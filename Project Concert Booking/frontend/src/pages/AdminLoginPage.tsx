import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiLock, FiShield } from "react-icons/fi";

import Alert from "../components/Alert";
import FormInput from "../components/FormInput";
import { useAuth } from "../context/AuthContext";
import { loginSchema, type LoginFormData } from "../schemas/auth.schema";
import { getApiErrorMessage } from "../services/api";
import { getFieldErrors } from "../utils/validation";

interface LocationState {
  from?: { pathname: string };
}

/**
 * หน้าล็อกอินหลังบ้าน — ระบบแยกจากหน้าล็อกอินผู้ใช้
 * ใช้ endpoint POST /auth/admin/login ซึ่ง backend จะปฏิเสธบัญชีที่ไม่ใช่ ADMIN ด้วย 403
 */
export default function AdminLoginPage() {
  const { t } = useTranslation();
  const { adminLogin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "admin@concerthub.dev", // อีเมลกลางของทีมแอดมิน — ทุกคนใช้เมลเดียวกัน ระบุตัวตนด้วยรหัสผ่านส่วนตัว
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // เข้าสู่ระบบเป็นแอดมินอยู่แล้ว → พาเข้าหลังบ้านทันที (ต้องอยู่หลัง hooks ทุกตัว)
  if (isAuthenticated && user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setServerError(null);

    // 1) ตรวจสอบข้อมูลด้วย Zod ฝั่ง client ก่อนเรียก API
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});

    // 2) เรียก endpoint ล็อกอินแอดมิน — บัญชี USER จะโดนปฏิเสธจาก backend (403)
    setIsSubmitting(true);
    try {
      await adminLogin(result.data.email, result.data.password);

      // พากลับไปหน้าหลังบ้านที่ตั้งใจจะเข้า (ถ้ามี) ไม่งั้นไปหน้าแรกของหลังบ้าน
      const state = location.state as LocationState | null;
      navigate(state?.from?.pathname ?? "/admin", { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="rounded-card bg-surface p-8 shadow-2xl ring-1 ring-line">
          <div className="mb-8 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-slate-100"
            >
              <FiShield className="text-2xl" />
            </span>
            <h1 className="font-display mt-3 text-2xl font-extrabold text-ink">
              {t("adminAuth.title")}
            </h1>
            <p className="mt-1 text-sm text-muted">{t("adminAuth.subtitle")}</p>
            {/* ป้ายแจ้งว่าเป็นพื้นที่จำกัดสิทธิ์ */}
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 text-[11px] font-bold text-warn-text ring-1 ring-warn-border">
              <FiLock aria-hidden="true" className="text-xs" />
              {t("adminAuth.badge")}
            </span>
          </div>

          {serverError && (
            <Alert variant="error" className="mb-5">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <FormInput
              label={t("adminAuth.email")}
              type="email"
              name="email"
              placeholder="admin@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              error={fieldErrors.email}
              disabled={isSubmitting}
            />

            <FormInput
              label={t("adminAuth.password")}
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              enablePasswordToggle
              value={formData.password}
              onChange={handleChange}
              error={fieldErrors.password}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-btn bg-slate-900 py-2.5 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiLock aria-hidden="true" className="text-sm" />
              {isSubmitting ? t("adminAuth.loggingIn") : t("adminAuth.submit")}
            </button>
          </form>

          <p className="mt-5 rounded-input bg-surface-2 p-3 text-center text-xs leading-relaxed text-muted">
            {t("adminAuth.notAdminNote")}
          </p>

          <div className="mt-4 rounded-input bg-surface-2 p-4 text-center text-xs text-muted">
            <p className="font-semibold text-ink">{t("adminAuth.demoTitle")}</p>
            <p className="mt-1">
              อีเมลกลาง: <b>admin@concerthub.dev</b> / รหัสผ่าน seed admin: <b>Admin1234</b>
            </p>
            <p className="mt-1 text-[11px]">
              แอดมินคนอื่นใช้อีเมลกลางเดียวกัน + ใส่รหัสผ่านส่วนตัวของตัวเอง (ตั้งตอนเพิ่มบัญชี)
            </p>
          </div>
        </div>

        <p className="mt-5 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            {t("adminAuth.backToSite")}
          </Link>
        </p>
      </div>
    </div>
  );
}
