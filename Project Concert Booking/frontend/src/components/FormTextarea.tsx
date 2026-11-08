import type { TextareaHTMLAttributes } from "react";

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export default function FormTextarea({
  label,
  error,
  id,
  name,
  rows = 4,
  ...rest
}: FormTextareaProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={inputId}
        name={name}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
        className={`w-full resize-y rounded-input border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted focus:ring-2 ${
          error
            ? "border-danger-border focus:border-danger-text focus:ring-danger-border"
            : "border-line focus:border-primary focus:ring-primary-soft"
        }`}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
