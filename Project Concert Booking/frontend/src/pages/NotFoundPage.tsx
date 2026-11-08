import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiAlertTriangle } from "react-icons/fi";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-page px-4 text-center">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-bg text-danger-text ring-1 ring-danger-border"
      >
        <FiAlertTriangle className="text-3xl" />
      </span>
      <p className="font-display mt-5 text-7xl font-extrabold text-primary">404</p>
      <h1 className="font-display mt-4 text-2xl font-bold text-ink">{t("notFound.title")}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">{t("notFound.desc")}</p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-btn bg-primary px-6 py-3 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover"
      >
        <FiArrowLeft aria-hidden="true" className="text-base" />
        {t("notFound.back")}
      </Link>
    </div>
  );
}
