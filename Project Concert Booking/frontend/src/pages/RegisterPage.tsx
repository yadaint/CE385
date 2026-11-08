import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiCalendar,
  FiCheckCircle,
  FiCircle,
  FiPhone,
  FiShield,
  FiUserPlus,
} from "react-icons/fi";

import Alert from "../components/Alert";
import AuthShell from "../components/AuthShell";
import FormInput from "../components/FormInput";
import { useAuth } from "../context/AuthContext";
import {
  isValidNationalIdBack,
  isValidThaiNationalId,
  registerSchema,
  type RegisterFormData,
} from "../schemas/auth.schema";
import { getApiErrorMessage } from "../services/api";
import { getFieldErrors } from "../utils/validation";

/** เงื่อนไขรหัสผ่าน — ครบทุกข้อจึงจะตั้งรหัสผ่านได้ (label ดึงจาก i18n key) */
const PASSWORD_RULES: Array<{ key: string; test: (value: string) => boolean }> = [
  { key: "auth.passwordRuleLength", test: (value) => value.length >= 8 },
  { key: "auth.passwordRuleLower", test: (value) => /[a-z]/.test(value) },
  { key: "auth.passwordRuleUpper", test: (value) => /[A-Z]/.test(value) },
  { key: "auth.passwordRuleDigit", test: (value) => /[0-9]/.test(value) },
];

/** จัดรูปเลขบัตรประชาชนเป็น 1-2345-67890-12-3 ขณะพิมพ์ */
const formatNationalId = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  const parts = [
    digits.slice(0, 1),
    digits.slice(1, 5),
    digits.slice(5, 10),
    digits.slice(10, 12),
    digits.slice(12, 13),
  ];
  return parts.filter(Boolean).join("-");
};

/** จัดรูปเลขหลังบัตร (Laser code) เป็น JT0-123456-78 ขณะพิมพ์ */
const formatNationalIdBack = (raw: string): string => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 13);
  const parts = [clean.slice(0, 3), clean.slice(3, 9), clean.slice(9, 11)];
  return parts.filter(Boolean).join("-");
};

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // หน้าที่ผู้ใช้ตั้งใจจะไปก่อนถูกเด้งมาหน้าสมัคร (เช่น หน้าจองคอนเสิร์ต)
  interface FromState {
    from?: { pathname: string };
  }
  const fromPath = (location.state as FromState | null)?.from?.pathname;

  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    nationalId: "",
    nationalIdBack: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // รหัสผ่านต้องผ่านครบทุกเงื่อนไข จึงจะตั้งรหัสผ่านได้ (ไม่งั้นปุ่มยืนยันถูกปิด)
  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    label: t(rule.key),
    passed: rule.test(formData.password),
  }));
  const isPasswordValid = passwordChecks.every((check) => check.passed);
  const isPasswordMatch =
    formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "nationalId"
          ? formatNationalId(value)
          : name === "nationalIdBack"
            ? formatNationalIdBack(value)
            : value,
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setServerError(null);

    // 1) ตรวจข้อมูลด้วย Zod ฝั่ง client
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});

    // 2) สมัครสมาชิก แล้วเข้าสู่ระบบอัตโนมัติ
    setIsSubmitting(true);
    try {
      await registerUser({
        email: result.data.email,
        password: result.data.password,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        phone: result.data.phone,
        dateOfBirth: result.data.dateOfBirth,
        nationalId: result.data.nationalId,
        nationalIdBack: result.data.nationalIdBack,
      });
      navigate(fromPath ?? "/", { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      size="lg"
      icon={<FiUserPlus aria-hidden="true" className="text-2xl" />}
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
    >
      {serverError && (
        <Alert variant="error" className="mb-5">
          {serverError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* ─── ข้อมูลบัญชี ─── */}
        <fieldset className="flex flex-col gap-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-muted">
            {t("auth.accountSection")}
          </legend>

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={t("auth.password")}
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="new-password"
              enablePasswordToggle
              value={formData.password}
              onChange={handleChange}
              error={fieldErrors.password}
              disabled={isSubmitting}
            />
            <FormInput
              label={t("auth.confirmPassword")}
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              autoComplete="new-password"
              enablePasswordToggle
              value={formData.confirmPassword}
              onChange={handleChange}
              error={
                fieldErrors.confirmPassword ??
                (formData.confirmPassword.length > 0 && !isPasswordMatch
                  ? "รหัสผ่านทั้งสองช่องไม่ตรงกัน"
                  : undefined)
              }
              disabled={isSubmitting}
            />
          </div>

          {/* เช็คลิสต์เงื่อนไขรหัสผ่าน — ครบทุกข้อถึงจะตั้งรหัสผ่านได้ */}
          <ul className="grid grid-cols-1 gap-1.5 rounded-input bg-surface-2 p-3 text-xs sm:grid-cols-2">
            {passwordChecks.map((check) => (
              <li
                key={check.label}
                className={`flex items-center gap-1.5 font-medium ${
                  check.passed ? "text-success-text" : "text-muted"
                }`}
              >
                {check.passed ? (
                  <FiCheckCircle aria-hidden="true" className="shrink-0 text-sm" />
                ) : (
                  <FiCircle aria-hidden="true" className="shrink-0 text-sm" />
                )}
                {check.label}
              </li>
            ))}
          </ul>
        </fieldset>

        {/* ─── ข้อมูลผู้สมัคร ─── */}
        <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
          <legend className="text-xs font-bold uppercase tracking-wider text-muted">
            {t("auth.profileSection")}
          </legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={t("auth.firstName")}
              type="text"
              name="firstName"
              autoComplete="given-name"
              value={formData.firstName}
              onChange={handleChange}
              error={fieldErrors.firstName}
              disabled={isSubmitting}
            />
            <FormInput
              label={t("auth.lastName")}
              type="text"
              name="lastName"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={handleChange}
              error={fieldErrors.lastName}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* วันเดือนปีเกิด */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dateOfBirth" className="text-sm font-medium text-ink">
                {t("auth.dateOfBirth")} <span className="text-danger-text">*</span>
              </label>
              <div className="relative">
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                  disabled={isSubmitting}
                  className={`w-full rounded-input border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:ring-2 ${
                    fieldErrors.dateOfBirth
                      ? "border-danger-border focus:border-danger-text focus:ring-danger-border"
                      : "border-line focus:border-primary focus:ring-primary-soft"
                  }`}
                />
                <FiCalendar
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted"
                />
              </div>
              {fieldErrors.dateOfBirth && (
                <p className="text-xs font-medium text-danger-text">{fieldErrors.dateOfBirth}</p>
              )}
            </div>

            <FormInput
              label={t("auth.phone")}
              type="tel"
              name="phone"
              inputMode="numeric"
              placeholder="0812345678"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              error={fieldErrors.phone}
              disabled={isSubmitting}
            />
          </div>

          {/* เลขบัตรประชาชน */}
          <FormInput
            label={t("auth.nationalId")}
            type="text"
            name="nationalId"
            inputMode="numeric"
            placeholder="1-2345-67890-12-3"
            maxLength={17}
            value={formData.nationalId}
            onChange={handleChange}
            error={fieldErrors.nationalId}
            disabled={isSubmitting}
          />
          {formData.nationalId.length > 0 && !fieldErrors.nationalId && (
            <p
              className={`-mt-2 flex items-center gap-1.5 text-xs font-medium ${
                isValidThaiNationalId(formData.nationalId) ? "text-success-text" : "text-muted"
              }`}
            >
              {isValidThaiNationalId(formData.nationalId)
                ? t("auth.idValid")
                : t("auth.idChecking")}
            </p>
          )}

          {/* เลขหลังบัตรประชาชน */}
          <FormInput
            label={t("auth.nationalIdBack")}
            type="text"
            name="nationalIdBack"
            placeholder="JT0-123456-78"
            maxLength={15}
            value={formData.nationalIdBack}
            onChange={handleChange}
            error={fieldErrors.nationalIdBack}
            disabled={isSubmitting}
          />
          {formData.nationalIdBack.length > 0 && !fieldErrors.nationalIdBack && (
            <p
              className={`-mt-2 flex items-center gap-1.5 text-xs font-medium ${
                isValidNationalIdBack(formData.nationalIdBack) ? "text-success-text" : "text-muted"
              }`}
            >
              {isValidNationalIdBack(formData.nationalIdBack)
                ? t("auth.idBackValid")
                : t("auth.idBackChecking")}
            </p>
          )}
        </fieldset>

        <div className="flex items-start gap-2 rounded-input bg-info-bg p-3 text-xs leading-relaxed text-info-text ring-1 ring-info-border">
          <FiShield aria-hidden="true" className="mt-0.5 shrink-0 text-sm" />
          <span>{t("auth.idNote")}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted">
          <FiPhone aria-hidden="true" className="text-sm" />
          {t("auth.phoneNote")}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isPasswordValid || !isPasswordMatch}
          title={
            isPasswordValid
              ? undefined
              : i18n.language?.startsWith("th")
                ? "รหัสผ่านต้องผ่านเงื่อนไขทุกข้อก่อนจึงจะสมัครสมาชิกได้"
                : "Password must meet all requirements before you can sign up"
          }
          className="mt-1 flex w-full items-center justify-center rounded-btn bg-primary py-3 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t("auth.creatingAccount") : t("auth.submitRegister")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("auth.hasAccount")}{" "}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">
          {t("auth.loginLink")}
        </Link>
      </p>
    </AuthShell>
  );
}
