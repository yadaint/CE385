import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./locales/en";
import { th } from "./locales/th";

const STORAGE_KEY = "ctb-lang";

/** ภาษาที่รองรับ */
export const SUPPORTED_LANGS = ["th", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const getInitialLang = (): Lang => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "th" || stored === "en") return stored;
  return "th";
};

export const initI18n = (): void => {
  void i18n.use(initReactI18next).init({
    resources: { th: { translation: th }, en: { translation: en } },
    lng: getInitialLang(),
    fallbackLng: "th",
    interpolation: { escapeValue: false },
  });

  // ซิงก์ lang attribute ของ <html> กับภาษาที่เลือก
  document.documentElement.lang = i18n.language;

  i18n.on("languageChanged", (lng) => {
    window.localStorage.setItem(STORAGE_KEY, lng);
    document.documentElement.lang = lng;
  });
};

/** locale สำหรับ Intl (วันที่/ตัวเลข) ตามภาษาปัจจุบัน */
export const currentLocale = (): string => (i18n.language?.startsWith("th") ? "th-TH" : "en-US");

/** เลือกชื่อคอนเสิร์ตตามภาษาปัจจุบัน — ถ้าไม่มีชื่ออังกฤษ ใช้ชื่อไทยทั้งสองภาษา */
export const concertDisplayName = (concert: {
  name: string;
  nameEn?: string | null;
}): string => {
  if (i18n.language?.startsWith("en") && concert.nameEn) return concert.nameEn;
  return concert.name;
};

/** เปลี่ยนภาษา */
export const changeLanguage = (lang: Lang): void => {
  void i18n.changeLanguage(lang);
};
