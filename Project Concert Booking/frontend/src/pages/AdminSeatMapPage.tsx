import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiMic,
  FiRefreshCw,
  FiSliders,
} from "react-icons/fi";
import { MdOutlineMeetingRoom } from "react-icons/md";

import AdminStatsTabs from "../components/AdminStatsTabs";
import ExportButtons from "../components/ExportButtons";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { getApiErrorMessage } from "../services/api";
import { adminService } from "../services/adminService";
import type { AdminSeat, AdminSeatMap, AdminSeatMapZone } from "../types";
import { formatCurrency, formatDateTime } from "../utils/format";
import { saleStatusBadgeStyles, saleStatusLabels } from "../utils/labels";

type SeatState = "AVAILABLE" | "PENDING" | "CONFIRMED";

/** สถานะแสดงผลของที่นั่ง: ว่าง / รอตรวจสอบ (ถือที่นั่งไว้) / ยืนยันแล้ว */
const seatStateOf = (seat: AdminSeat): SeatState => {
  if (seat.isAvailable) return "AVAILABLE";
  return seat.bookingStatus === "COMPLETED" ? "CONFIRMED" : "PENDING";
};

const SEAT_STATE_STYLES: Record<SeatState, string> = {
  AVAILABLE: "bg-surface-2 text-ink ring-1 ring-line",
  PENDING: "bg-warn-bg text-warn-text ring-1 ring-warn-border",
  CONFIRMED: "bg-success-bg text-success-text ring-1 ring-success-border",
};

const REFRESH_INTERVAL_MS = 10_000;

/** หนึ่งแถวบนผัง: โซนซ้าย / กลาง / ขวา หรือโซนกว้างครอบทั้งแถว */
interface MapRow {
  mapRow: number;
  wide: AdminSeatMapZone | null;
  left: AdminSeatMapZone | null;
  center: AdminSeatMapZone | null;
  right: AdminSeatMapZone | null;
}

export default function AdminSeatMapPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [seatMap, setSeatMap] = useState<AdminSeatMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSeatMap = useCallback(async (): Promise<void> => {
    if (!id) return;
    try {
      const data = await adminService.getConcertSeatMap(id);
      setSeatMap(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    void fetchSeatMap();
  }, [fetchSeatMap]);

  // เรียลไทม์: ดึงข้อมูลซ้ำทุก 10 วินาทีเมื่อเปิดโหมดอัตโนมัติ
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void fetchSeatMap();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoRefresh, fetchSeatMap]);

  // จัดแถวโซนบนผังแบบผังสนามจริง: แต่ละแถวมีช่องซ้าย/กลาง/ขวา
  const mapRows = useMemo<MapRow[]>(() => {
    if (!seatMap) return [];

    const byOrder = new Map<number, AdminSeatMapZone[]>();
    for (const zone of seatMap.zones) {
      const arr = byOrder.get(zone.sortOrder);
      if (arr) {
        arr.push(zone);
      } else {
        byOrder.set(zone.sortOrder, [zone]);
      }
    }

    return Array.from(byOrder.entries())
      .sort(([a], [b]) => a - b)
      .map(([mapRow, zones]) => {
        const row: MapRow = { mapRow, wide: null, left: null, center: null, right: null };

        if (zones.length === 1 && zones[0].wide) {
          row.wide = zones[0];
        } else {
          for (const zone of zones) {
            if (zone.side === "LEFT") row.left = zone;
            else if (zone.side === "RIGHT") row.right = zone;
            else row.center = zone;
          }
        }

        return row;
      });
  }, [seatMap]);

  // โซนที่เลือก + แถวที่นั่งของโซนนั้น (เรียงแบบเดียวกับหน้าผู้ใช้)
  const selectedZone: AdminSeatMapZone | null =
    seatMap?.zones.find((zone) => zone.id === selectedZoneId) ?? null;

  const selectedZoneSeatRows = useMemo(() => {
    if (!selectedZone) return [] as Array<[string, AdminSeat[]]>;

    const rowsMap = new Map<string, AdminSeat[]>();
    for (const seat of selectedZone.seats) {
      const row = rowsMap.get(seat.rowLabel);
      if (row) row.push(seat);
      else rowsMap.set(seat.rowLabel, [seat]);
    }

    return Array.from(rowsMap.entries())
      .map(
        ([rowLabel, seats]) =>
          [rowLabel, [...seats].sort((a, b) => a.seatNumber - b.seatNumber)] as [string, AdminSeat[]],
      )
      .sort(([a], [b]) => a.length - b.length || a.localeCompare(b));
  }, [selectedZone]);

  // นับจำนวนที่นั่งแยกตามสถานะทั้งคอนเสิร์ต
  const stateCounts = useMemo(() => {
    const counts: Record<SeatState, number> = { AVAILABLE: 0, PENDING: 0, CONFIRMED: 0 };
    for (const zone of seatMap?.zones ?? []) {
      for (const seat of zone.seats) {
        counts[seatStateOf(seat)] += 1;
      }
    }
    return counts;
  }, [seatMap]);

  // ─── เอกสารรายงาน: ref สำหรับจับ PDF + ตัวสร้าง CSV ───
  const reportRef = useRef<HTMLDivElement>(null);

  const buildCsv = (): string => {
    if (!seatMap) return "";
    const esc = (value: string | number): string => {
      const text = String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines: string[] = [];

    lines.push(`${t("adminPanel.map.title")} — ${seatMap.concert.name}`);
    lines.push(`${t("detail.aboutVenue")},${seatMap.concert.venue.name}`);
    lines.push("");
    lines.push(t("export.statusCounts"));
    lines.push(`${t("adminPanel.map.available")},${stateCounts.AVAILABLE}`);
    lines.push(`${t("adminPanel.map.pending")},${stateCounts.PENDING}`);
    lines.push(`${t("adminPanel.map.confirmed")},${stateCounts.CONFIRMED}`);
    lines.push("");
    lines.push(t("export.csvManageCols"));
    for (const zone of seatMap.zones) {
      const occupied = zone.totalSeats - zone.availableSeats;
      const percent = zone.totalSeats > 0 ? Math.round((occupied / zone.totalSeats) * 100) : 0;
      lines.push(
        [
          zone.name,
          zone.code,
          zone.price,
          zone.totalSeats,
          occupied,
          zone.availableSeats,
          zone.isOnSale ? "YES" : "NO",
          `${percent}%`,
        ]
          .map((cell) => esc(cell as string | number))
          .join(","),
      );
    }

    return lines.join("\n");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !seatMap) {
    return (
      <div className="container-page py-16">
        <Alert variant="error">{error ?? t("adminStats.notFound")}</Alert>
        <div className="mt-6 text-center">
          <Link to="/admin" className="font-semibold text-primary hover:text-primary-hover">
            {t("adminPanel.backToPick")}
          </Link>
        </div>
      </div>
    );
  }

  /** บล็อกโซนบนผัง — โค้งตามวงแหวน + แถบสัดส่วนการจอง (คลิกดูที่นั่งรายตัว) */
  const renderZoneCard = (
    zone: AdminSeatMapZone,
    position: "left" | "center" | "right" | "wide",
    isFirstRow: boolean,
    isLastRow: boolean,
  ): JSX.Element => {
    const isSelectedZone = zone.id === selectedZoneId;
    const occupied = zone.totalSeats - zone.availableSeats;
    const occupancyPercent = zone.totalSeats > 0 ? Math.round((occupied / zone.totalSeats) * 100) : 0;
    const arcClass =
      position === "left"
        ? "rounded-l-[2rem]"
        : position === "right"
          ? "rounded-r-[2rem]"
          : isFirstRow
            ? "rounded-t-[2rem]"
            : isLastRow
              ? "rounded-b-[2rem]"
              : "rounded-2xl";
    const tone = isSelectedZone
      ? "border-primary bg-primary-soft ring-2 ring-primary"
      : "border-line bg-surface hover:ring-2 hover:ring-primary";

    return (
      <button
        type="button"
        onClick={() => setSelectedZoneId(isSelectedZone ? null : zone.id)}
        className={`flex w-full flex-col gap-1 border-2 px-3 py-3 text-center transition ${arcClass} ${tone}`}
      >
        <span className="font-display text-sm font-extrabold text-ink">
          {zone.name} ({zone.code})
        </span>
        <span className="text-xs font-semibold text-muted">{formatCurrency(zone.price)}</span>
        <span className="text-[11px] text-muted">
          {!zone.isOnSale
            ? t("detail.zoneClosed")
            : t("adminPanel.map.occupancy", {
                sold: occupied.toLocaleString(),
                total: zone.totalSeats.toLocaleString(),
                percent: occupancyPercent,
              })}
        </span>
        {/* แถบสัดส่วนการจอง */}
        <span
          aria-hidden="true"
          className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-line"
        >
          <span className="block h-full bg-primary" style={{ width: `${occupancyPercent}%` }} />
        </span>
      </button>
    );
  };

  /** ช่องว่างบนผัง (โซนกลางที่ไม่มีที่นั่ง = จุดควบคุมเสียง) */
  const renderEmptyCell = (kind: "side" | "center"): JSX.Element =>
    kind === "center" ? (
      <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 px-3 py-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <FiSliders aria-hidden="true" className="text-sm" />
          {t("adminPanel.map.soundControl")}
        </span>
      </div>
    ) : (
      <div aria-hidden="true" className="w-full self-stretch rounded-xl border border-dashed border-line" />
    );

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

        {/* หัวหน้า + แท็บย่อยของเมนูสถิติ */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-muted">
              {t("adminPanel.label")} · {t("adminStats.manageTab")}
            </p>
            <h1 className="font-display mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
              {seatMap.concert.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{seatMap.concert.venue.name}</span>
              <span>
                {seatMap.concert.dates.length > 0
                  ? `${formatDateTime(seatMap.concert.dates[0])}${seatMap.concert.dates.length > 1 ? ` +${seatMap.concert.dates.length - 1}` : ""}`
                  : t("adminPanel.noDate")}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${saleStatusBadgeStyles[seatMap.concert.saleStatus]}`}
              >
                {saleStatusLabels[seatMap.concert.saleStatus]}
              </span>
            </p>
          </div>

          {/* ควบคุมการรีเฟรชเรียลไทม์ */}
          <div className="flex flex-col items-end gap-1.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                className="h-4 w-4 accent-[color:var(--primary)]"
              />
              <FiRefreshCw
                aria-hidden="true"
                className={`text-sm ${autoRefresh ? "text-primary" : "text-muted"}`}
              />
              {t("adminPanel.map.autoRefresh")}
            </label>
            <p className="text-xs text-muted">
              {lastUpdated
                ? t("adminPanel.map.lastUpdated", { time: lastUpdated.toLocaleTimeString("th-TH") })
                : t("common.loading")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <AdminStatsTabs concertId={seatMap.concert.id} active="manage" />
          <ExportButtons
            targetRef={reportRef}
            filenameBase={`seatmap-report-${seatMap.concert.id}`}
            buildCsv={buildCsv}
          />
        </div>

        {/* เอกสารรายงาน — จับเป็น PDF ได้ทั้งบล็อก */}
        <div ref={reportRef} className="bg-page p-5">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted">
            {t("export.reportSystem")} — {seatMap.concert.name}
          </p>
          <p className="mt-1 text-center text-xs text-muted">
            {t("export.reportGenerated", { date: formatDateTime(new Date().toISOString()) })}
          </p>

          {/* สรุปสถานะที่นั่งทั้งคอน */}
          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
              <p className="text-xs font-semibold text-muted">{t("adminPanel.map.available")}</p>
              <p className="font-display mt-1 text-2xl font-extrabold text-ink">
                {stateCounts.AVAILABLE.toLocaleString()}
              </p>
            </div>
            <div className="rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-warn-text">
                <FiClock aria-hidden="true" className="text-sm" />
                {t("adminPanel.map.pending")}
              </p>
              <p className="font-display mt-1 text-2xl font-extrabold text-warn-text">
                {stateCounts.PENDING.toLocaleString()}
              </p>
            </div>
            <div className="rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-success-text">
                <FiCheckCircle aria-hidden="true" className="text-sm" />
                {t("adminPanel.map.confirmed")}
              </p>
              <p className="font-display mt-1 text-2xl font-extrabold text-success-text">
                {stateCounts.CONFIRMED.toLocaleString()}
              </p>
            </div>
          </div>

          {/* ─── ผังโซนภาพรวม ─── */}
          <section className="mt-6 rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
            <h2 className="section-title">{t("adminPanel.map.zoneMapTitle")}</h2>

            {/* เวที */}
            <div className="mx-auto mt-5 flex w-3/4 items-center justify-center rounded-b-[2.5rem] bg-ink py-4 shadow-inner">
              <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.4em] text-page">
                <FiMic aria-hidden="true" className="text-base" />
                {t("adminPanel.map.stage")}
              </span>
            </div>
            <div className="mx-auto mt-1 w-3/4 border-b-2 border-dashed border-line" />

            {/* แถวโซนซ้าย/กลาง/ขวา — โค้งเป็นวงแหวนรอบเวที */}
            <div className="mt-4 flex flex-col gap-3">
              {mapRows.map((row, rowIndex) => {
                const isFirstRow = rowIndex === 0;
                const isLastRow = rowIndex === mapRows.length - 1;

                return (
                  <div key={row.mapRow} className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3">
                    {row.wide ? (
                      <div className="md:col-span-3">
                        {renderZoneCard(row.wide, "wide", isFirstRow, isLastRow)}
                      </div>
                    ) : (
                      <>
                        <div className="flex">
                          {row.left ? renderZoneCard(row.left, "left", isFirstRow, isLastRow) : renderEmptyCell("side")}
                        </div>
                        <div className="flex">
                          {row.center ? renderZoneCard(row.center, "center", isFirstRow, isLastRow) : renderEmptyCell("center")}
                        </div>
                        <div className="flex">
                          {row.right ? renderZoneCard(row.right, "right", isFirstRow, isLastRow) : renderEmptyCell("side")}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ทางเข้า */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1 text-[11px] text-muted">
                <MdOutlineMeetingRoom aria-hidden="true" className="text-sm" />
                {t("adminPanel.map.entranceLeft")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1 text-[11px] text-muted">
                <MdOutlineMeetingRoom aria-hidden="true" className="text-sm" />
                {t("adminPanel.map.entranceRight")}
              </span>
            </div>
          </section>
        </div>

        {/* ─── ผังที่นั่งของโซนที่เลือก (อยู่นอกรายงาน PDF) ─── */}
        {selectedZone && (
          <section className="mt-6 rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">
                {t("adminPanel.map.seatsTitle", { zone: selectedZone.name })}
                <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-bold text-ink ring-1 ring-line">
                  {selectedZone.code}
                </span>
              </h2>
              <p className="text-sm font-semibold text-primary">
                {formatCurrency(selectedZone.price)} {t("detail.perTicket")} ·{" "}
                {t("detail.seatsLeft", { count: selectedZone.availableSeats })}/
                {selectedZone.totalSeats.toLocaleString()}
              </p>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2">
              {selectedZoneSeatRows.map(([rowLabel, seats]) => (
                <div key={rowLabel} className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-right text-xs font-bold text-muted">{rowLabel}</span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {seats.map((seat) => {
                      const state = seatStateOf(seat);

                      return (
                        <span
                          key={seat.id}
                          title={`${t("detail.seats")} ${seat.code} · ${
                            state === "AVAILABLE"
                              ? t("adminPanel.map.seatStateAvailable")
                              : state === "CONFIRMED"
                                ? t("adminPanel.map.seatStateConfirmed")
                                : t("adminPanel.map.seatStatePending")
                          }`}
                          className={`flex h-9 w-9 cursor-help items-center justify-center rounded-lg text-xs font-bold sm:h-10 sm:w-10 sm:text-sm ${SEAT_STATE_STYLES[state]}`}
                        >
                          {seat.seatNumber}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-surface-2 ring-1 ring-line" />
                {t("adminPanel.map.legendAvailable")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-warn-bg ring-1 ring-warn-border" />
                {t("adminPanel.map.legendPending")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-success-bg ring-1 ring-success-border" />
                {t("adminPanel.map.legendConfirmed")}
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
