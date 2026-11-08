import type { ArtistType, BookingStatus, ConcertSaleStatus, Origin, PaymentStatus } from "../types";

/** ป้ายชื่อภาษาไทยของต้นสังกัดคอนเสิร์ต */
export const originLabels: Record<Origin, string> = {
  THAI: "คอนไทย",
  INTERNATIONAL: "คอนต่างประเทศ",
};

/** ป้ายชื่อภาษาไทยของรูปแบบศิลปิน */
export const artistTypeLabels: Record<ArtistType, string> = {
  SOLO: "คอนเดี่ยว",
  GROUP: "คอนกลุ่ม",
};

/** ป้ายสถานะการจองภาษาไทย */
export const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING: "รอชำระเงิน",
  PENDING_VERIFICATION: "รอตรวจสอบสลิป",
  COMPLETED: "จองสำเร็จ",
  REJECTED: "สลิปไม่ผ่าน",
  CANCELLED: "ยกเลิกแล้ว",
};

/** สไตล์ป้ายสถานะการจอง (ใช้สีตามธีมที่เลือก) */
export const bookingStatusBadgeStyles: Record<BookingStatus, string> = {
  PENDING: "bg-warn-bg text-warn-text ring-warn-border",
  PENDING_VERIFICATION: "bg-info-bg text-info-text ring-info-border",
  COMPLETED: "bg-success-bg text-success-text ring-success-border",
  REJECTED: "bg-danger-bg text-danger-text ring-danger-border",
  CANCELLED: "bg-danger-bg text-danger-text ring-danger-border",
};

/** ป้ายสถานะสลิปภาษาไทย */
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING_VERIFICATION: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
};

/* ─── สถานะการเปิดขายบัตรของคอนเสิร์ต ─── */

/** ป้ายสถานะเปิดขายภาษาไทย */
export const saleStatusLabels: Record<ConcertSaleStatus, string> = {
  DRAFT: "ฉบับร่าง — ยังไม่เปิดขาย",
  OPEN: "เปิดขายแล้ว",
  CLOSED: "ปิดขายชั่วคราว",
  SOLD_OUT: "บัตรหมดแล้ว",
};

/** สไตล์ป้ายสถานะเปิดขาย (ใช้สีตามธีมที่เลือก) */
export const saleStatusBadgeStyles: Record<ConcertSaleStatus, string> = {
  DRAFT: "bg-surface-2 text-muted ring-line",
  OPEN: "bg-success-bg text-success-text ring-success-border",
  CLOSED: "bg-warn-bg text-warn-text ring-warn-border",
  SOLD_OUT: "bg-danger-bg text-danger-text ring-danger-border",
};
