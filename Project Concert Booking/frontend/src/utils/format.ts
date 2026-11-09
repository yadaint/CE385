import i18n from "i18next";

import { currentLocale } from "../i18n";

const thbFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export const formatCurrency = (amount: number): string => thbFormatter.format(amount);

/* ─── ภาษีมูลค่าเพิ่ม (VAT) 7% ─── ราคาบัตรที่เก็บจริงเป็น "ราคารวม VAT" แล้ว จึงแยกย่อยออกมาแสดง */

export const VAT_RATE = 0.07;

export interface VatBreakdown {
  /** ยอดก่อน VAT */
  beforeVat: number;
  /** ภาษีมูลค่าเพิ่ม 7% */
  vat: number;
  /** ยอดรวมที่ผู้ซื้อจ่ายจริง (รวม VAT แล้ว) */
  total: number;
}

/** แยกยอดรวม (รวม VAT) ออกเป็น ยอดก่อน VAT + VAT 7% ปัดเงิน 2 ตำแหน่ง */
export const calculateVat = (totalWithVat: number): VatBreakdown => {
  const total = Math.round(totalWithVat * 100) / 100;
  const beforeVat = Math.round((total / (1 + VAT_RATE)) * 100) / 100;
  return { beforeVat, vat: Math.round((total - beforeVat) * 100) / 100, total };
};

/** จัดรูปแบบวันที่ตามภาษาที่เลือก เช่น "ส. 12 ธ.ค. 2569, 19:00" / "Sat, 12 Dec 2026, 19:00" */
export const formatDateTime = (isoDate: string): string =>
  new Intl.DateTimeFormat(currentLocale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));

/** วัน/เดือนสำหรับป้ายวันที่บนการ์ด เช่น { day: "12", month: "ธ.ค." / "Dec" } */
export const formatDateBadge = (isoDate: string): { day: string; month: string } => {
  const date = new Date(isoDate);
  const locale = currentLocale();
  return {
    day: new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: "short" }).format(date),
  };
};

const dayNumber = (date: Date): string => new Intl.DateTimeFormat(currentLocale(), { day: "numeric" }).format(date);
const monthShort = (date: Date): string => new Intl.DateTimeFormat(currentLocale(), { month: "short" }).format(date);

/**
 * ช่วงวันที่ของคอนเสิร์ต เช่น "25-27 พ.ย." (เดือนเดียวกัน)
 * หรือ "28 พ.ย. - 2 ธ.ค." (ข้ามเดือน) — คอนวันเดียวคืน "25 พ.ย."
 * ภาษาอังกฤษ เช่น "Nov 25-27"
 */
export const formatDateRange = (isoDates: string[]): string => {
  if (isoDates.length === 0) return "";
  const dates = isoDates
    .map((iso) => new Date(iso))
    .sort((a, b) => a.getTime() - b.getTime());

  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const isThai = i18n.language?.startsWith("th");

  if (dates.length === 1) {
    return isThai
      ? `${dayNumber(first)} ${monthShort(first)}`
      : `${monthShort(first)} ${dayNumber(first)}`;
  }

  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return isThai
      ? `${dayNumber(first)}-${dayNumber(last)} ${monthShort(first)}`
      : `${monthShort(first)} ${dayNumber(first)}-${dayNumber(last)}`;
  }

  return isThai
    ? `${dayNumber(first)} ${monthShort(first)} - ${dayNumber(last)} ${monthShort(last)}`
    : `${monthShort(first)} ${dayNumber(first)} - ${monthShort(last)} ${dayNumber(last)}`;
};
