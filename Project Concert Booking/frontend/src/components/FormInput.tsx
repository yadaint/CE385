import { useState, type InputHTMLAttributes } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** เปิดให้กดรูปตาเพื่อแสดง/ซ่อนค่าที่พิมพ์ (ใช้กับช่องรหัสผ่าน) */
  enablePasswordToggle?: boolean;
}

export default function FormInput({
  label,
  error,
  id,
  name,
  enablePasswordToggle = false,
  type,
  ...rest
}: FormInputProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");
  const [showValue, setShowValue] = useState(false);

  const inputType = enablePasswordToggle ? (showValue ? "text" : "password") : type;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={inputType}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
          className={`w-full rounded-input border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted focus:ring-2 ${
            enablePasswordToggle ? "pr-11" : ""
          } ${
            error
              ? "border-danger-border focus:border-danger-text focus:ring-danger-border"
              : "border-line focus:border-primary focus:ring-primary-soft"
          }`}
        />
        {enablePasswordToggle && (
          <button
            type="button"
            onClick={() => setShowValue((prev) => !prev)}
            tabIndex={-1}
            aria-label={showValue ? "Show password" : "Hide password"}
            title={showValue ? "Show password" : "Hide password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-primary"
          >
            {showValue ? (
              <FiEyeOff aria-hidden="true" className="text-base" />
            ) : (
              <FiEye aria-hidden="true" className="text-base" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
