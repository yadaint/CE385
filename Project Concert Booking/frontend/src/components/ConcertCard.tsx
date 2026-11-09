import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowRight, FiCalendar, FiMapPin, FiMusic } from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import { concertDisplayName } from "../i18n";
import { getUploadUrl } from "../services/api";
import type { Concert } from "../types";
import { formatCurrency, formatDateBadge, formatDateRange } from "../utils/format";
import { getConcertSeatsLeft, getConcertStartingPrice, isConcertSoldOut } from "../utils/concert";

interface ConcertCardProps {
  concert: Concert;
}

export default function ConcertCard({ concert }: ConcertCardProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const soldOut = isConcertSoldOut(concert);
  const isMultiDay = concert.dates.length > 1;
  const dateBadge = formatDateBadge(concert.dates[0]);
  const seatsLeft = getConcertSeatsLeft(concert);
  const startingPrice = concert.zones.length > 0 ? getConcertStartingPrice(concert) : 0;
  const hasImage = Boolean(concert.imageUrl);

  // ปุ่มจองบัตร: ยังไม่ล็อกอิน → เด้งไปหน้าสมัครสมาชิกทันที (จำหน้าคอนไว้กลับมาหลังสมัคร)
  const bookingTarget = isAuthenticated ? `/concerts/${concert.id}` : "/register";
  const bookingState = isAuthenticated ? undefined : { from: { pathname: `/concerts/${concert.id}` } };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* ปกประจำคอนเสิร์ต — ใช้รูปจริงถ้ามี ไม่งั้นใช้ไอคอนโน้ตดนตรีบนพื้นโทนหลักอ่อน */}
      <div className="relative flex aspect-[16/9] items-center justify-center bg-primary-soft">
        {hasImage ? (
          <>
            <img
              src={getUploadUrl(concert.imageUrl ?? "")}
              alt={`Cover of ${concertDisplayName(concert)}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            {/* ชั้นมืดบางๆ ให้ป้ายอ่านง่ายขึ้นบนรูป */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0))" }}
            />
          </>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-surface text-primary-soft-text shadow-sm ring-1 ring-line transition duration-300 group-hover:scale-105"
          >
            <FiMusic className="text-3xl" />
          </span>
        )}

        {/* ป้ายวันที่ — คอนหลายวันแสดงเป็นช่วง เช่น 25-27 */}
        <div className="absolute left-4 top-4 flex h-14 min-w-14 flex-col items-center justify-center rounded-lg bg-surface px-2 shadow-sm ring-1 ring-line">
          <span className={`font-bold leading-none text-ink ${isMultiDay ? "text-sm" : "text-lg"}`}>
            {dateBadge.day}
          </span>
          <span className="text-[10px] font-semibold uppercase text-primary-soft-text">
            {dateBadge.month}
          </span>
        </div>

        {/* ป้ายสถานะที่นั่ง */}
        {soldOut ? (
          <span className="absolute right-4 top-4 rounded-full bg-danger-bg px-3 py-1 text-xs font-bold text-danger-text ring-1 ring-danger-border">
            {t("card.soldOut")}
          </span>
        ) : (
          <span className="absolute right-4 top-4 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success-text ring-1 ring-success-border">
            {t("card.seatsLeft", { count: seatsLeft })}
          </span>
        )}

        {/* ป้ายจำนวนรอบการแสดง — เฉพาะคอนเสิร์ตหลายวัน */}
        {isMultiDay && (
          <span className="absolute bottom-3 left-4 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-semibold text-ink ring-1 ring-line">
            <FiCalendar aria-hidden="true" className="text-[11px]" />
            {t("card.showsCount", { count: concert.dates.length })}
          </span>
        )}
      </div>

      {/* เนื้อหา */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3
          className="line-clamp-1 font-display text-lg font-bold text-ink"
          title={concertDisplayName(concert)}
        >
          {concertDisplayName(concert)}
        </h3>

        {/* ป้ายประเภทคอนเสิร์ต */}
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary-soft-text ring-1 ring-line">
            {concert.origin === "THAI" ? t("home.filterThai") : t("home.filterInternational")}
          </span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-line">
            {concert.artistType === "SOLO" ? t("home.filterSolo") : t("home.filterGroup")}
          </span>
        </div>

        {/* ข้อมูลสำคัญแบบแถว อ่านเร็ว */}
        <ul className="flex flex-col gap-1.5 text-sm text-muted">
          <li className="flex items-center gap-2">
            <FiCalendar aria-hidden="true" className="shrink-0 text-sm text-primary-soft-text" />
            <span className="truncate">
              {/* คอนหลายวันแสดงช่วงวันที่ เช่น 25-27 พ.ย. */}
              {formatDateRange(concert.dates)}
              {isMultiDay && ` · ${t("card.showsCount", { count: concert.dates.length })}`}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <FiMapPin aria-hidden="true" className="shrink-0 text-sm text-primary-soft-text" />
            <span className="truncate">{concert.venue.name}</span>
          </li>
        </ul>

        <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
          <div>
            <p className="text-[11px] text-muted">
              {t("card.startingFrom")} · {t("card.zonesCount", { count: concert.zones.length })}
            </p>
            <p className="font-display text-lg font-extrabold text-primary">
              {formatCurrency(startingPrice)}
            </p>
          </div>
          <Link
            to={bookingTarget}
            state={bookingState}
            className="inline-flex items-center gap-1.5 rounded-btn bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
            title={isAuthenticated ? t("card.bookTooltip") : t("card.guestTooltip")}
          >
            {soldOut
              ? t("card.details")
              : isAuthenticated
                ? t("card.book")
                : t("card.registerToBook")}
            <FiArrowRight
              aria-hidden="true"
              className="text-sm transition group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
