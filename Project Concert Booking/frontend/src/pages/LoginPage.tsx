import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LuTicket } from "react-icons/lu";

import Alert from "../components/Alert";
import AuthShell from "../components/AuthShell";
import FormInput from "../components/FormInput";
import { useAuth } from "../context/AuthContext";
import { loginSchema, type LoginFormData } from "../schemas/auth.schema";
import { getApiErrorMessage } from "../services/api";
import { getFieldErrors } from "../utils/validation";

interface LocationState {
  from?: { pathname: string };
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState<LoginFormData>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // 2) เรียก API
    setIsSubmitting(true);
    try {
      await login(result.data.email, result.data.password);

      // พากลับไปยังหน้าที่ผู้ใช้ตั้งใจจะไป (ถ้ามี)
      const state = location.state as LocationState | null;
      navigate(state?.from?.pathname ?? "/", { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      icon={<LuTicket aria-hidden="true" className="text-2xl" />}
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
    >
      {serverError && (
        <Alert variant="error" className="mb-5">
          {serverError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <FormInput
              label={t("auth.email")}
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              error={fieldErrors.email}
              disabled={isSubmitting}
            />

            <FormInput
              label={t("auth.password")}
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
              className="mt-1 flex w-full items-center justify-center rounded-btn bg-primary py-2.5 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t("auth.loggingIn") : t("auth.submitLogin")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="font-semibold text-primary hover:text-primary-hover">
              {t("auth.registerLink")}
            </Link>
          </p>

          <div className="mt-5 rounded-input bg-surface-2 p-4 text-center text-xs text-muted">
            <p className="font-semibold text-ink">{t("auth.demoTitle")}</p>
            <p className="mt-1">user@concerthub.dev / User1234 (USER)</p>
            <p className="mt-1 text-[11px]">* แอดมินเข้าระบบที่ /admin/login (หน้าหลังบ้านแยกต่างหาก)</p>
          </div>
    </AuthShell>
  );
}
