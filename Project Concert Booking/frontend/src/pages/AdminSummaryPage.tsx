import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiTrendingUp,
} from "react-icons/fi";

import AdminStatsTabs from "../components/AdminStatsTabs";
import ExportButtons from "../components/ExportButtons";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { concertDisplayName } from "../i18n";
import { getApiErrorMessage } from "../services/api";
import { adminService } from "../services/adminService";
import type { AdminConcertSummary } from "../types";
import { formatCurrency, formatDateRange, formatDateTime } from "../utils/format";
import {
  bookingStatusBadgeStyles,
  saleStatusBadgeStyles,
} from "../utils/labels";

/** หน้าสรุปข้อมูลคอนเสิร์ต — โซนไหนบ้าง ขายได้เท่าไหร่ รายได้รวมรายโซน */
export default function AdminSummaryPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [summary, setSummary] = useState<AdminConcertSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── เอกสารรายงาน: ref สำหรับจับ PDF (ต้องประกาศก่อน early return ตามกฎ Hooks) ───
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSummary = async (): Promise<void> => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await adminService.getConcertSummary(id);
        setSummary(data);
        setError(null);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSummary();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="container-page py-16">
        <Alert variant="error">{error ?? "ไม่พบคอนเสิร์ตนี้"}</Alert>
        <div className="mt-6 text-center">
          <Link to="/admin" className="font-semibold text-primary hover:text-primary-hover">
            {t("adminStats.pickTitle")}
          </Link>
        </div>
      </div>
    );
  }

  const { concert, zones, totals } = summary;
  const soldPercent =
    totals.totalSeats > 0 ? Math.round((totals.soldSeats / totals.totalSeats) * 100) : 0;

  // ─── เอกสารรายงาน: ตัวสร้าง CSV ───
  const reportDate = new Date();

  const buildCsv = (): string => {
    const esc = (value: string | number): string => {
      const text = String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines: string[] = [];

    lines.push(t("export.csvConcert"));
    lines.push(`${t("adminPanel.summary.title")},${esc(concert.name)}`);
    lines.push(`${t("detail.aboutVenue")},${esc(concert.venue.name)}`);
    lines.push(
      `${t("detail.showDate")},${formatDateRange(concert.dates)}`,
    );
    lines.push(`${t("adminPanel.summary.closed") === "ปิดขาย" ? "สถานะ" : "Status"},${t("status.saleStatus." + concert.saleStatus)}`);
    lines.push("");
    lines.push(t("export.csvTotals"));
    lines.push(`${t("adminPanel.summary.totalConfirmed")},${totals.confirmedRevenue}`);
    lines.push(`${t("adminPanel.summary.totalPending")},${totals.pendingRevenue}`);
    lines.push(`${t("adminPanel.summary.soldSeats")},${totals.soldSeats}/${totals.totalSeats}`);
    lines.push(`${t("adminPanel.summary.bookingsCount")},${totals.bookingCount}`);
    lines.push("");
    lines.push(t("export.csvZones"));
    lines.push(t("export.csvZoneCols"));
    for (const zone of zones) {
      lines.push(
        [
          esc(zone.name),
          zone.code,
          zone.price,
          zone.totalSeats,
          zone.soldSeats,
          zone.availableSeats,
          zone.bookingCount,
          zone.confirmedRevenue,
          zone.pendingRevenue,
        ]
          .map((cell) => esc(cell as string | number))
          .join(","),
      );
    }
    lines.push(
      [
        t("adminPanel.summary.totalRow"),
        "",
        "",
        totals.totalSeats,
        totals.soldSeats,
        totals.totalSeats - totals.soldSeats,
        totals.bookingCount,
        totals.confirmedRevenue,
        totals.pendingRevenue,
      ]
        .map((cell) => esc(cell as string | number))
        .join(","),
    );

    return lines.join("\n");
  };

  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="container-page py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          <FiArrowLeft aria-hidden="true" className="text-sm" />
          {t("adminStats.pickTitle")}
        </Link>

        <div className="mt-3">
          <p className="text-xs font-bold tracking-widest text-muted">{t("adminPanel.label")}</p>
          <h1 className="font-display mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
            {t("adminPanel.summary.title")} — {concertDisplayName(concert)}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span>{concert.venue.name}</span>
            <span>
              {concert.dates.length > 0
                ? `${formatDateTime(concert.dates[0])}${concert.dates.length > 1 ? ` +${concert.dates.length - 1}` : ""}`
                : t("adminPanel.noDate")}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${saleStatusBadgeStyles[concert.saleStatus]}`}
            >
              {t("status.saleStatus." + concert.saleStatus)}
            </span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <AdminStatsTabs concertId={concert.id} active="revenue" />
          <ExportButtons
            targetRef={reportRef}
            filenameBase={`revenue-report-${concert.id}`}
            buildCsv={buildCsv}
          />
        </div>

        {/* เอกสารรายงาน — จับเป็น PDF ได้ทั้งบล็อก */}
        <div ref={reportRef} className="bg-surface p-5">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted">
            {t("export.reportSystem")}
          </p>
          <p className="mt-1 text-center text-xs text-muted">
            {t("export.reportGenerated", { date: formatDateTime(reportDate.toISOString()) })}
          </p>

        {/* สถานะปัจจุบันของบัตรทั้งหมด (รวมทุกโซน) */}
        <section className="mt-5 rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
            <FiCheckCircle aria-hidden="true" className="text-base text-primary-soft-text" />
            {t("adminStats.ticketStatusTitle")}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />
              {t("adminStats.availableChip")}:{" "}
              {totals.totalSeats - totals.soldSeats}
            </span>
            {(
              [
                "PENDING",
                "PENDING_VERIFICATION",
                "COMPLETED",
                "REJECTED",
                "CANCELLED",
              ] as const
            ).map((status) => {
              const count = zones.reduce(
                (sum, zone) => sum + zone.bookingsByStatus[status],
                0,
              );

              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${bookingStatusBadgeStyles[status]}`}
                >
                  {t("status.booking." + status)}: {count}
                </span>
              );
            })}
          </div>
        </section>

        {/* สรุปภาพรวมทั้งคอนเสิร์ต */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <FiCheckCircle aria-hidden="true" className="text-sm text-success-text" />
              {t("adminPanel.summary.totalConfirmed")}
            </p>
            <p className="font-display mt-1.5 text-2xl font-extrabold text-success-text">
              {formatCurrency(totals.confirmedRevenue)}
            </p>
            <p className="mt-0.5 text-xs text-muted">{t("adminPanel.summary.totalConfirmedHint")}</p>
          </div>
          <div className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <FiClock aria-hidden="true" className="text-sm text-warn-text" />
              {t("adminPanel.summary.totalPending")}
            </p>
            <p className="font-display mt-1.5 text-2xl font-extrabold text-warn-text">
              {formatCurrency(totals.pendingRevenue)}
            </p>
            <p className="mt-0.5 text-xs text-muted">{t("adminPanel.summary.totalPendingHint")}</p>
          </div>
          <div className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <FiCreditCard aria-hidden="true" className="text-sm text-primary-soft-text" />
              {t("adminPanel.summary.soldSeats")}
            </p>
            <p className="font-display mt-1.5 text-2xl font-extrabold text-ink">
              {totals.soldSeats.toLocaleString()}
              <span className="text-base font-bold text-muted">
                /{totals.totalSeats.toLocaleString()}
              </span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
              <div className="h-full bg-primary" style={{ width: `${soldPercent}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {t("adminPanel.summary.soldPercent", { percent: soldPercent })}
            </p>
          </div>
          <div className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <FiTrendingUp aria-hidden="true" className="text-sm text-primary-soft-text" />
              {t("adminPanel.summary.bookingsCount")}
            </p>
            <p className="font-display mt-1.5 text-2xl font-extrabold text-ink">
              {t("adminPanel.summary.bookingsUnit", { count: totals.bookingCount })}
            </p>
            <p className="mt-0.5 text-xs text-muted">{t("adminPanel.summary.bookingsHint")}</p>
          </div>
        </div>

        {/* ตารางสรุปรายโซน */}
        <section className="mt-6 rounded-card bg-surface shadow-card ring-1 ring-line">
          <div className="border-b border-line px-6 py-4">
            <h2 className="section-title">
              {t("adminPanel.summary.zoneTableTitle", { count: zones.length })}
            </h2>
            <p className="mt-0.5 text-xs text-muted">{t("adminPanel.summary.zoneTableHint")}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-6 py-3 font-bold">{t("adminPanel.summary.thZone")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminPanel.summary.thPrice")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminPanel.summary.thSold")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminPanel.summary.thRemaining")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminPanel.summary.thBookings")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminPanel.summary.thConfirmed")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminPanel.summary.thPending")}</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => {
                  const occupancy =
                    zone.totalSeats > 0 ? Math.round((zone.soldSeats / zone.totalSeats) * 100) : 0;

                  return (
                    <tr key={zone.id} className="border-b border-line last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-bold text-ink">
                          {zone.name}{" "}
                          <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted">
                            {zone.code}
                          </span>
                        </p>
                        {!zone.isOnSale && (
                          <p className="text-[11px] font-semibold text-warn-text">
                            {t("adminPanel.summary.closed")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink">{formatCurrency(zone.price)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">
                          {zone.soldSeats.toLocaleString()}/{zone.totalSeats.toLocaleString()}
                        </p>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                          <div className="h-full bg-primary" style={{ width: `${occupancy}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {t("adminPanel.summary.remainingUnit", {
                          count: zone.availableSeats.toLocaleString(),
                        })}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {t("adminPanel.summary.bookingsUnit", { count: zone.bookingCount })}
                      </td>
                      <td className="px-4 py-3 font-bold text-success-text">
                        {formatCurrency(zone.confirmedRevenue)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-warn-text">
                        {formatCurrency(zone.pendingRevenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2 text-sm font-extrabold text-ink">
                  <td className="px-6 py-3">{t("adminPanel.summary.totalRow")}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">
                    {totals.soldSeats.toLocaleString()}/{totals.totalSeats.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {t("adminPanel.summary.remainingUnit", {
                      count: (totals.totalSeats - totals.soldSeats).toLocaleString(),
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {t("adminPanel.summary.bookingsUnit", { count: totals.bookingCount })}
                  </td>
                  <td className="px-4 py-3 text-success-text">
                    {formatCurrency(totals.confirmedRevenue)}
                  </td>
                  <td className="px-4 py-3 text-warn-text">
                    {formatCurrency(totals.pendingRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

          <p className="mt-4 text-center text-[10px] text-muted">
            {t("export.reportSystem")} · {t("export.reportGenerated", { date: formatDateTime(reportDate.toISOString()) })}
          </p>
        </div>
      </div>
    </div>
  );
}
