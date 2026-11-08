import { useTranslation } from "react-i18next";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
};

export default function Spinner({ size = "md", label }: SpinnerProps) {
  const { t } = useTranslation();

  return (
    <div role="status" aria-live="polite" className="inline-flex items-center justify-center">
      <span
        className={`animate-spin rounded-full border-line border-t-primary ${sizeClasses[size]}`}
      />
      <span className="sr-only">{label ?? `${t("common.loading")}…`}</span>
    </div>
  );
}
