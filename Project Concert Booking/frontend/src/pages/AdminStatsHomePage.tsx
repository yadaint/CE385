import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiCalendar, FiTrendingUp, FiClipboard, FiMic } from "react-icons/fi";

import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { concertDisplayName } from "../i18n";
import { getApiErrorMessage } from "../services/api";
import { adminService } from "../services/adminService";
import type { AdminConcert } from "../types";
import { formatDateRange } from "../utils/format";
import { saleStatusBadgeStyles, saleStatusLabels } from "../utils/labels";

/** หน้าแรกของเมนูสถิติ — เลือกคอนเสิร์ตก่อน แล้วเข้าสถิติรายคอน (รายได้/จัดการ/สลิป) */
export default function AdminStatsHomePage() {
  const { t } = useTranslation();
  const [concerts, setConcerts] = useState<AdminConcert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // แยกหมวด: เปิดขายอยู่ / ปิดการขายแล้ว (แบบร่างอยู่เมนู "แบบร่าง" แยกต่างหาก)
  const openConcerts = concerts.filter((concert) => concert.saleStatus === "OPEN");
  const closedConcerts = concerts.filter(
    (concert) => concert.saleStatus === "CLOSED" || concert.saleStatus === "SOLD_OUT",
  );

  useEffect(() => {
    const fetchConcerts = async (): Promise<void> => {
      try {
        const data = await adminService.getConcerts();
        setConcerts(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchConcerts();
  }, []);

  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="container-page py-10">
        <p className="text-xs font-bold tracking-widest text-muted">{t("adminPanel.label")}</p>
        <h1 className="font-display mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
          {t("adminStats.pickTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("adminStats.pickSubtitle")}</p>

        {error && (
          <Alert variant="error" className="mt-6">
            {error}
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : openConcerts.length === 0 && closedConcerts.length === 0 ? (
          <div className="mt-8 rounded-card bg-surface p-10 text-center shadow-card ring-1 ring-line">
            <p className="text-muted">{t("adminStats.noConcerts")}</p>
            <Link
              to="/admin/drafts"
              className="mt-4 inline-block text-sm font-semibold text-primary underline hover:text-primary-hover"
            >
              {t("adminDrafts.title")} →
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-10">
            {/* ─── หมวด 1: กำลังเปิดขาย ─── */}
            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                <h2 className="font-display text-xl font-bold text-ink">
                  {t("adminStats.sectionOpen")}
                </h2>
                <span className="text-xs text-muted">{t("adminStats.sectionOpenHint")}</span>
              </div>
              {openConcerts.length === 0 ? (
                <p className="mt-4 text-sm text-muted">{t("adminStats.noConcerts")}</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {openConcerts.map((concert) => renderConcertCard(concert))}
                </div>
              )}
            </section>

            {/* ─── หมวด 2: ปิดการขายแล้ว ─── */}
            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                <h2 className="font-display text-xl font-bold text-ink">
                  {t("adminStats.sectionClosed")}
                </h2>
                <span className="text-xs text-muted">{t("adminStats.sectionClosedHint")}</span>
              </div>
              {closedConcerts.length === 0 ? (
                <p className="mt-4 text-sm text-muted">{t("adminStats.noConcerts")}</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {closedConcerts.map((concert) => renderConcertCard(concert))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );

  /** การ์ดคอนเสิร์ตสำหรับหน้าเลือกสถิติ */
  function renderConcertCard(concert: AdminConcert): JSX.Element {
    const soldPercent =
      concert.totalSeats > 0
        ? Math.round(((concert.totalSeats - concert.availableSeats) / concert.totalSeats) * 100)
        : 0;

    return (
      <Link
        key={concert.id}
        to={`/admin/stats/${concert.id}/revenue`}
        className="group flex flex-col rounded-card bg-surface p-6 shadow-card ring-1 ring-line transition hover:-translate-y-1 hover:ring-2 hover:ring-primary"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-bold text-ink">
            {concertDisplayName(concert)}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${saleStatusBadgeStyles[concert.saleStatus]}`}
          >
            {saleStatusLabels[concert.saleStatus]}
          </span>
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <FiCalendar aria-hidden="true" className="text-xs" />
            {concert.dates.length > 0 ? formatDateRange(concert.dates) : t("adminPanel.noDate")}
          </span>
          <span>{concert.venue.name}</span>
        </p>

        {/* สัดส่วนบัตรขายแล้ว */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {t("adminPanel.seatsLeft", {
                available: concert.availableSeats.toLocaleString(),
                total: concert.totalSeats.toLocaleString(),
              })}
            </span>
            <span className="font-semibold text-ink">{soldPercent}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
            <div className="h-full bg-primary" style={{ width: `${soldPercent}%` }} />
          </div>
        </div>

        {/* ปุ่มลัด 3 เมนู */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
          {[
            { icon: FiTrendingUp, label: t("adminStats.revenueTab") },
            { icon: FiMic, label: t("adminStats.manageTab") },
            { icon: FiClipboard, label: t("adminStats.slipsTab") },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <span
                key={item.label}
                className="flex flex-col items-center gap-1 rounded-input bg-surface-2 px-1 py-2 text-center text-[10px] font-semibold text-muted transition group-hover:text-primary-soft-text"
              >
                <Icon aria-hidden="true" className="text-sm" />
                {item.label}
              </span>
            );
          })}
        </div>
      </Link>
    );
  }
}
