import { useTranslation } from "react-i18next";
import { FiGlobe } from "react-icons/fi";

import { changeLanguage } from "../i18n";

/** ปุ่มสลับภาษา ไทย / อังกฤษ — ใช้ในแถบนำทาง */
export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("th") ? "th" : "en";

  const switchTo = (next: "th" | "en"): void => {
    if (next !== lang) changeLanguage(next);
  };

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className="flex shrink-0 items-center overflow-hidden rounded-btn border border-header-border"
    >
      <span className="hidden px-2 text-header-muted" aria-hidden="true">
        <FiGlobe className="text-sm" />
      </span>
      <button
        type="button"
        onClick={() => switchTo("th")}
        aria-pressed={lang === "th"}
        className={`px-2.5 py-1.5 text-xs font-bold transition ${
          lang === "th"
            ? "bg-primary text-primary-contrast"
            : "text-header-muted hover:bg-header-hover hover:text-header-text"
        }`}
      >
        ไทย
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        aria-pressed={lang === "en"}
        className={`px-2.5 py-1.5 text-xs font-bold transition ${
          lang === "en"
            ? "bg-primary text-primary-contrast"
            : "text-header-muted hover:bg-header-hover hover:text-header-text"
        }`}
      >
        EN
      </button>
    </div>
  );
}
