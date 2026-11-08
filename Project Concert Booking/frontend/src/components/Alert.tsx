import type { ReactNode } from "react";
import { FiAlertCircle, FiCheckCircle, FiInfo } from "react-icons/fi";

type AlertVariant = "success" | "error" | "info";

interface AlertProps {
  variant: AlertVariant;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<AlertVariant, string> = {
  success: "bg-success-bg text-success-text ring-success-border",
  error: "bg-danger-bg text-danger-text ring-danger-border",
  info: "bg-info-bg text-info-text ring-info-border",
};

const variantIcons: Record<AlertVariant, typeof FiInfo> = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  info: FiInfo,
};

export default function Alert({ variant, className = "", children }: AlertProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-input px-4 py-3 text-sm ring-1 ${variantClasses[variant]} ${className}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-base" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
