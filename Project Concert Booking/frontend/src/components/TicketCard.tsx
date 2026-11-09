import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiCheck, FiMapPin } from "react-icons/fi";

import { calculateVat, formatCurrency } from "../utils/format";

/** ที่นั่ง + รหัสตั๋วประจำที่นั่ง (1 ที่นั่ง = 1 รหัส) */
export interface SeatTicket {
  code: string;
  ticketCode: string | null;
}

/** เลขที่นั่งจากรหัสที่นั่ง เช่น "A08" → "08" (ใช้โชว์ในวงเล็บท้ายรหัสตั๋ว) */
const seatNumberFrom = (seatCode: string): string =>
  seatCode.replace(/\D/g, "") || seatCode;

interface TicketCardProps {
  bookingId: string;
  /** รหัสตั๋ว เช่น THAGD012K7XP2M9QB4RT */
  ticketCode: string;
  concertName: string;
  venue: string;
  dateLabel: string;
  zoneName: string;
  seatCodes: string[];
  /** รหัสตั๋วรายที่นั่ง — ต้องแสดงครบทุกที่นั่งบนบัตรเดียวกัน */
  seatTickets: SeatTicket[];
  quantity: number;
  totalPrice: number;
  buyerLabel?: string;
}

/** รูปหน้าตั๋ว — แสดงเมื่อการจองได้รับการอนุมัติ (จองสำเร็จ) พร้อม QR ตรวจสอบหน้างาน */
export default function TicketCard({
  bookingId,
  ticketCode,
  concertName,
  venue,
  dateLabel,
  zoneName,
  seatCodes,
  seatTickets,
  quantity,
  totalPrice,
  buyerLabel,
}: TicketCardProps) {
  const { t } = useTranslation();
  // ราคาที่เก็บเป็นราคารวม VAT 7% แล้ว — แยกย่อยออกมาแสดงใต้ยอดรวม
  const vat = calculateVat(totalPrice);

  // รหัสตั๋วที่แสดง = รหัสรายที่นั่งทั้งหมด (ถ้าไม่มีข้อมูลรายที่นั่ง ใช้รหัสของ booking แทน)
  // ซื้อหลายใบ → ต่อท้ายด้วยเลขที่นั่งในวงเล็บ เช่น THAST08T5K(08) THAST09N3R(09)
  const entries = seatTickets
    .map((seat) => ({ ticketCode: seat.ticketCode, seatNo: seatNumberFrom(seat.code) }))
    .filter((entry): entry is { ticketCode: string; seatNo: string } => Boolean(entry.ticketCode));
  if (entries.length === 0) entries.push({ ticketCode, seatNo: "" });
  const showSeatNumbers = entries.length > 1;
  const displayCodes = entries.map((entry) =>
    showSeatNumbers && entry.seatNo ? `${entry.ticketCode}(${entry.seatNo})` : entry.ticketCode,
  );

  // QR สแกนเข้างาน — ต้องมีรหัสบัตรครบทุกใน (คั่นด้วยช่องว่าง) ไม่ใช่แค่รหัสแรก
  const qrValue =
    entries.length > 0 ? entries.map((entry) => entry.ticketCode).join(" ") : ticketCode;

  return (
    <div className="overflow-hidden rounded-card shadow-card ring-1 ring-line">
      {/* ส่วนหัวตั๋ว */}
      <div className="bg-hero p-5 text-hero-text">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold tracking-[0.25em] text-hero-muted">
            BOOKING TICKET CONCERT
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-bold text-ink">
            <FiCheck aria-hidden="true" className="text-xs" />
            {t("myBookings.entryBadge")}
          </span>
        </div>
        <p className="font-display mt-3 text-lg font-extrabold leading-snug">{concertName}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-hero-muted">
          <span className="inline-flex items-center gap-1.5">
            <FiCalendar aria-hidden="true" className="text-xs" /> {dateLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FiMapPin aria-hidden="true" className="text-xs" /> {venue}
          </span>
        </p>
      </div>

      {/* ส่วนเนื้อหาตั๋ว + ทองซิป */}
      <div className="relative flex bg-surface">
        {/* รอยปรุขอบด้านบน/ล่าง */}
        <span
          aria-hidden="true"
          className="absolute -bottom-3 -left-3 z-10 h-6 w-6 rounded-full bg-page ring-1 ring-line"
        />
        <span
          aria-hidden="true"
          className="absolute -top-3 -left-3 z-10 h-6 w-6 rounded-full bg-page ring-1 ring-line"
        />

        <div className="flex-1 p-5">
          {/* รหัสตั๋ว — 1 ที่นั่ง = 1 รหัส เรียงแนวนอนครบทุกรหัสบนบัตรใบเดียวกัน
              (ซื้อหลายใบจะต่อท้ายด้วยเลขที่นั่งในวงเล็บ เช่น THAST08T5K(08)) */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            {t("myBookings.ticketHeaderCode")}
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 break-all font-mono text-xl font-extrabold leading-tight text-ink">
            {displayCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </p>

          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("payment.zone")}</dt>
              <dd className="font-semibold text-primary">{zoneName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("payment.seats")}</dt>
              <dd className="font-mono font-semibold text-ink">
                {seatCodes.join(", ")}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("payment.quantity")}</dt>
              <dd className="text-ink">{t("myBookings.tickets", { count: quantity })}</dd>
            </div>
            {buyerLabel && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("myBookings.buyer")}</dt>
                <dd className="font-semibold text-ink">{buyerLabel}</dd>
              </div>
            )}
            {/* แยกยอดก่อน VAT + ภาษี 7% ก่อนยอดรวม */}
            <div className="flex justify-between gap-3 border-t border-line pt-2">
              <dt className="text-muted">{t("myBookings.vatBeforeLabel")}</dt>
              <dd className="text-ink">{formatCurrency(vat.beforeVat)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("myBookings.vatLabel")}</dt>
              <dd className="text-ink">{formatCurrency(vat.vat)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-bold text-ink">{t("myBookings.total")}</dt>
              <dd className="font-display text-base font-extrabold text-primary">
                {formatCurrency(vat.total)}
              </dd>
            </div>
            <p className="text-right text-[11px] text-muted">
              {t("myBookings.vatIncludedNote")}
            </p>
          </dl>
        </div>

        {/* แถบ QR ยาวด้านขวา — สแกนเข้างาน (คิวอาร์มีรหัสบัตรครบทุกใน คั่นด้วยช่องว่าง) */}
        <div className="relative flex w-36 shrink-0 flex-col items-center justify-center gap-2 border-l-2 border-dashed border-line p-4">
          <div className="rounded-lg bg-white p-2 ring-1 ring-line">
            <QRCode value={qrValue} size={104} />
          </div>
          <p className="text-center text-[10px] font-semibold leading-tight text-muted">
            {t("myBookings.scanAtGate")}
            <br />
            {t("myBookings.atGate")}
          </p>
          <p className="break-all text-center font-mono text-[9px] leading-tight text-muted">
            {bookingId}
          </p>
        </div>
      </div>
    </div>
  );
}
