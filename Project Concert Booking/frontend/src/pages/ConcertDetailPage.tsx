import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiMapPin,
  FiMic,
  FiSliders,
  FiX,
} from "react-icons/fi";
import { MdOutlineMeetingRoom } from "react-icons/md";

import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { concertDisplayName } from "../i18n";
import { MAX_TICKETS_PER_BOOKING, createBookingSchema } from "../schemas/booking.schema";
import { getApiErrorMessage } from "../services/api";
import { bookingService } from "../services/bookingService";
import { concertService } from "../services/concertService";
import type { Booking, Concert, Seat, Zone, ZoneSide } from "../types";
import { getConcertSeatsLeft, getConcertStartingPrice } from "../utils/concert";
import { formatCurrency, formatDateRange, formatDateTime } from "../utils/format";

const sideLabels: Record<ZoneSide, { th: string; en: string }> = {
  LEFT: { th: "ซ้าย", en: "Left" },
  CENTER: { th: "กลาง", en: "Center" },
  RIGHT: { th: "ขวา", en: "Right" },
};

/** สีประจำ "ระดับราคา" — โซนที่ราคาเดียวกันใช้สีเดียวกัน (เรียงจากแพงสุด) */
const TIER_COLORS = [
  {
    name: "แดง",
    block: "border-red-400 bg-red-100 text-red-900 hover:bg-red-200",
    dot: "bg-red-500",
    header: "bg-red-100 text-red-800 ring-red-200",
  },
  {
    name: "ฟ้า",
    block: "border-sky-400 bg-sky-100 text-sky-900 hover:bg-sky-200",
    dot: "bg-sky-500",
    header: "bg-sky-100 text-sky-800 ring-sky-200",
  },
  {
    name: "เขียว",
    block: "border-emerald-400 bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
    dot: "bg-emerald-500",
    header: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  {
    name: "เหลือง",
    block: "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200",
    dot: "bg-amber-400",
    header: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  {
    name: "ม่วง",
    block: "border-purple-400 bg-purple-100 text-purple-900 hover:bg-purple-200",
    dot: "bg-purple-500",
    header: "bg-purple-100 text-purple-800 ring-purple-200",
  },
  {
    name: "ฟ้าอ่อน",
    block: "border-cyan-400 bg-cyan-100 text-cyan-900 hover:bg-cyan-200",
    dot: "bg-cyan-500",
    header: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  },
];

/** หนึ่งแถวบนผัง: โซนซ้าย / กลาง / ขวา หรือโซนกว้างครอบทั้งแถว */
interface MapRow {
  mapRow: number;
  wide: Zone | null;
  left: Zone | null;
  center: Zone | null;
  right: Zone | null;
}

/** ป้ายเลขขั้นตอน */
function StepBadge({ step }: { step: number }) {
  return (
    <span
      aria-hidden="true"
      className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-contrast"
    >
      {step}
    </span>
  );
}

/** แถบแสดงความคืบหน้าของขั้นตอนการจอง 1 → 4 */
function StepProgress({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="flex items-center">
      {labels.map((label, index) => {
        const stepNumber = index + 1;
        const done = stepNumber < current;
        const active = stepNumber === current;
        const isLast = stepNumber === labels.length;

        return (
          <li key={label} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                  done
                    ? "bg-primary text-primary-contrast"
                    : active
                      ? "bg-primary text-primary-contrast ring-4 ring-primary-soft"
                      : "bg-surface-2 text-muted ring-1 ring-line"
                }`}
              >
                {done ? <FiCheck className="text-base" /> : stepNumber}
              </span>
              <span
                className={`whitespace-nowrap text-[11px] font-semibold sm:text-xs ${
                  active || done ? "text-ink" : "text-muted"
                }`}
              >
                {label}
              </span>
            </div>

            {!isLast && (
              <span
                aria-hidden="true"
                className={`mx-2 mb-5 h-0.5 flex-1 rounded-full ${done ? "bg-primary" : "bg-line"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function ConcertDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // ─── ข้อมูลคอนเสิร์ต ────────────────────────────────────────
  const [concert, setConcert] = useState<Concert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── ขั้นตอนจอง: 1 เลือกวันที่ → 2 เลือกโซนจากผัง → 3 เลือกที่นั่งเฉพาะโซน → 4 ยืนยัน/สลิป ──
  const [selectedShowDate, setSelectedShowDate] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [seatError, setSeatError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipSent, setSlipSent] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchConcert = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const data = await concertService.getConcertById(id);
        setConcert(data);
      } catch (error) {
        setLoadError(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchConcert();
  }, [id]);

  const selectedZone = useMemo<Zone | null>(
    () => concert?.zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [concert, selectedZoneId],
  );

  const selectedSeats = useMemo<Seat[]>(
    () =>
      selectedZone ? selectedZone.seats?.filter((s) => selectedSeatIds.includes(s.id)) ?? [] : [],
    [selectedZone, selectedSeatIds],
  );

  // วันที่แสดงทั้งหมด เรียงตามลำดับเวลา
  const sortedDates = useMemo<string[]>(
    () => [...(concert?.dates ?? [])].sort((a, b) => a.localeCompare(b)),
    [concert],
  );

  // จัดแถวโซนบนผังแบบผังสนามจริง: แต่ละแถวมีช่องซ้าย/กลาง/ขวา
  const mapRows = useMemo<MapRow[]>(() => {
    if (!concert) return [];

    const byOrder = new Map<number, Zone[]>();
    for (const zone of concert.zones) {
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
            if (zone.side === "LEFT") {
              row.left = zone;
            } else if (zone.side === "RIGHT") {
              row.right = zone;
            } else {
              row.center = zone;
            }
          }
        }

        return row;
      });
  }, [concert]);

  // แถวที่นั่งของแต่ละโซน: Map<zoneId, Array<[rowLabel, seats]>> เรียงแบบธรรมชาติ
  const seatRowsByZone = useMemo(() => {
    const map = new Map<string, Array<[string, Seat[]]>>();

    for (const zone of concert?.zones ?? []) {
      const rowsMap = new Map<string, Seat[]>();
      for (const seat of zone.seats ?? []) {
        const row = rowsMap.get(seat.rowLabel);
        if (row) {
          row.push(seat);
        } else {
          rowsMap.set(seat.rowLabel, [seat]);
        }
      }

      const rows = Array.from(rowsMap.entries()).sort(
        ([a], [b]) => a.length - b.length || a.localeCompare(b),
      );
      map.set(zone.id, rows);
    }

    return map;
  }, [concert]);

  // จับคู่ "ระดับราคา" กับสี — โซนที่ราคาเดียวกันใช้สีเดียวกัน
  const tierByPrice = useMemo(() => {
    const prices = Array.from(
      new Set((concert?.zones ?? []).filter((zone) => zone.isOnSale).map((zone) => zone.price)),
    ).sort((a, b) => b - a);
    const map = new Map<number, number>();
    prices.forEach((price, index) => map.set(price, index % TIER_COLORS.length));
    return map;
  }, [concert]);

  const tierOf = (zone: Zone) => TIER_COLORS[tierByPrice.get(zone.price) ?? 0];

  // ระดับราคาที่แตกต่างกัน (สำหรับ legend แบบเล็กใต้ผัง)
  const distinctTiers = useMemo(() => {
    const prices = Array.from(new Set((concert?.zones ?? []).map((z) => z.price))).sort(
      (a, b) => b - a,
    );
    return prices.map((price) => ({
      price,
      ...TIER_COLORS[tierByPrice.get(price) ?? 0],
    }));
  }, [concert, tierByPrice]);

  const seatsLeft = concert ? getConcertSeatsLeft(concert) : 0;
  const concertSoldOut = concert ? seatsLeft === 0 : true;
  const startingPrice = concert && concert.zones.length > 0 ? getConcertStartingPrice(concert) : 0;
  const totalPrice = selectedZone ? selectedZone.price * selectedSeats.length : 0;

  // ขั้นตอนปัจจุบันของการจอง (สำหรับแถบความคืบหน้า)
  const currentStep = pendingBooking ? 4 : selectedZone ? 3 : selectedShowDate ? 2 : 1;

  const isSelectedSeat = (seat: Seat): boolean => selectedSeatIds.includes(seat.id);

  const handleSelectDate = (date: string): void => {
    // เปลี่ยนวันที่ = เริ่มเลือกใหม่ทั้งหมด (ที่นั่งถูกถือไว้ตามวันที่)
    setSelectedShowDate(date);
    setSelectedZoneId(null);
    setSelectedSeatIds([]);
    setSeatError(null);
    setBookingError(null);
    setPendingBooking(null);
    setSlipFile(null);
    setSlipPreview(null);
    setSlipError(null);
    setSlipSent(false);
  };

  const handleSelectZone = (zone: Zone): void => {
    // ต้องเลือกวันที่ก่อนเลือกโซนเสมอ
    if (!selectedShowDate) {
      setSeatError(t("detail.needDateFirst"));
      return;
    }

    setSelectedZoneId(zone.id);
    setSelectedSeatIds([]);
    setSeatError(null);
    setBookingError(null);
    setPendingBooking(null);
    setSlipFile(null);
    setSlipPreview(null);
    setSlipError(null);
    setSlipSent(false);
  };

  const clearZoneSelection = (): void => {
    setSelectedZoneId(null);
    setSelectedSeatIds([]);
    setSeatError(null);
  };

  const toggleSeat = (seat: Seat): void => {
    if (!seat.isAvailable) return;

    setSeatError(null);
    setBookingError(null);
    setPendingBooking(null);
    setSlipFile(null);
    setSlipPreview(null);
    setSlipError(null);
    setSlipSent(false);

    // 1 การจองต้องอยู่ในโซนเดียวกันทั้งหมด
    if (selectedSeatIds.length > 0 && selectedZoneId && seat.zoneId !== selectedZoneId) {
      setSeatError(
        i18n.language?.startsWith("th")
          ? "ที่นั่งทั้งหมดใน 1 การจองต้องอยู่ในโซนเดียวกัน — กรุณานำที่นั่งที่เลือกออกก่อน"
          : "All seats in one booking must be in the same zone — please remove your selected seats first",
      );
      return;
    }

    if (isSelectedSeat(seat)) {
      setSelectedSeatIds((prev) => prev.filter((seatId) => seatId !== seat.id));
      return;
    }

    if (selectedSeatIds.length >= MAX_TICKETS_PER_BOOKING) {
      setSeatError(
        i18n.language?.startsWith("th")
          ? `เลือกได้สูงสุด ${MAX_TICKETS_PER_BOOKING} ที่นั่งต่อการจอง`
          : `You can select up to ${MAX_TICKETS_PER_BOOKING} seats per booking`,
      );
      return;
    }

    // ที่นั่งแรกที่เลือกจะเป็นการเลือกโซนของที่นั่งนั้นด้วย
    if (!selectedZoneId) {
      setSelectedZoneId(seat.zoneId);
    }

    setSelectedSeatIds((prev) => [...prev, seat.id]);
  };

  const handleBooking = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!concert) return;

    setBookingError(null);

    // 1) ตรวจสอบด้วย Zod ฝั่ง client (สอดคล้องกับ schema ของ backend)
    const result = createBookingSchema.safeParse({
      showDate: selectedShowDate ?? "",
      seatIds: selectedSeatIds,
    });
    if (!result.success) {
      setSeatError(result.error.issues[0]?.message ?? "Invalid booking");
      return;
    }

    setIsBooking(true);
    try {
      const booking = await bookingService.createBooking({
        showDate: result.data.showDate,
        seatIds: result.data.seatIds,
      });

      // จองสำเร็จ → เด้งไปหน้าโอนเงิน (ชำระภายใน 10 นาที) ทันที
      navigate(`/bookings/${booking.id}/payment`, { replace: true });

      // อัปเดตสถานะที่นั่งบนหน้าจอทันที (optimistic update)
      setConcert((prev) =>
        prev
          ? {
              ...prev,
              zones: prev.zones.map((zone) =>
                zone.id === booking.zoneId
                  ? {
                      ...zone,
                      availableSeats: Math.max(0, zone.availableSeats - booking.quantity),
                      seats: (zone.seats ?? []).map((seat) =>
                        booking.seats.some((bookedSeat) => bookedSeat.id === seat.id)
                          ? { ...seat, isAvailable: false }
                          : seat,
                      ),
                    }
                  : zone,
              ),
            }
          : prev,
      );
    } catch (error) {
      setBookingError(getApiErrorMessage(error));
    } finally {
      setIsBooking(false);
    }
  };

  const handleSlipFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setSlipFile(file);
    setSlipPreview(file ? URL.createObjectURL(file) : null);
    setSlipError(null);
  };

  const handleSlipSubmit = async (): Promise<void> => {
    if (!pendingBooking || !slipFile) return;

    setSlipUploading(true);
    setSlipError(null);
    try {
      await bookingService.uploadSlip(pendingBooking.id, slipFile);
      setSlipSent(true);
      setSlipFile(null);
      setSlipPreview(null);
    } catch (error) {
      setSlipError(getApiErrorMessage(error));
    } finally {
      setSlipUploading(false);
    }
  };

  const resetBookingFlow = (): void => {
    setPendingBooking(null);
    setSlipFile(null);
    setSlipPreview(null);
    setSlipError(null);
    setSlipSent(false);
    setBookingError(null);
  };

  /** บล็อกโซนบนผังภาพรวม — โค้งตามวงแหวน (ซ้าย/ขวา/หัวท้ายแถว) + สีบอกระดับราคา */
  const renderZoneCard = (
    zone: Zone,
    position: "left" | "center" | "right" | "wide",
    isFirstRow: boolean,
    isLastRow: boolean,
  ): JSX.Element => {
    const zoneClosed = !zone.isOnSale;
    const zoneSoldOut = zone.isOnSale && zone.availableSeats === 0;
    const isSelectedZone = zone.id === selectedZoneId;
    const tier = tierOf(zone);

    // โค้งมนตามตำแหน่งบนวงแหวน: ข้างซ้ายโค้งซ้าย, ขวาโค้งขวา, แถวหน้าโค้งหัว, แถวหลังโค้งท้าย
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

    const tone = zoneClosed
      ? "cursor-not-allowed border-line bg-surface-2 text-muted"
      : isSelectedZone
        ? "border-primary bg-primary text-primary-contrast shadow-lg ring-2 ring-primary"
        : zoneSoldOut
          ? "cursor-not-allowed border-line bg-surface-2 text-muted"
          : !selectedShowDate
            ? `${tier.block} opacity-50`
            : tier.block;

    return (
      <button
        type="button"
        onClick={() => handleSelectZone(zone)}
        disabled={zoneClosed || zoneSoldOut || !selectedShowDate || isBooking}
        title={`${zone.name} (${zone.code}) · ${formatCurrency(zone.price)}${zoneClosed ? " · " + t("detail.zoneClosed") : ""}`}
        className={`flex w-full flex-col items-center justify-center gap-0.5 border-2 px-2 py-3 text-center transition ${arcClass} ${tone}`}
      >
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold tracking-wider">
          {isSelectedZone && <FiCheck aria-hidden="true" className="text-xs" />}
          {zone.code}
        </span>
        <span className="text-[11px] font-semibold leading-tight">{zone.name}</span>
        <span className="text-[10px] font-semibold">{formatCurrency(zone.price)}</span>
        <span className="text-[10px] opacity-80">
          {zoneClosed
            ? t("detail.zoneClosed")
            : zoneSoldOut
              ? t("detail.zoneSoldOut")
              : t("detail.seatsLeft", { count: zone.availableSeats })}
        </span>
      </button>
    );
  };

  /** ช่องว่างบนผัง (โซนกลางที่ไม่มีที่นั่ง = จุดควบคุมเสียง) */
  const renderEmptyCell = (kind: "side" | "center"): JSX.Element => (
    <div className="flex w-full items-stretch">
      {kind === "center" ? (
        <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 px-3 py-4 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] leading-snug text-muted">
            <FiSliders aria-hidden="true" className="text-sm" />
            {t("detail.soundControl")}
            <span className="block text-[10px]">{t("detail.soundControlNote")}</span>
          </span>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="w-full self-stretch rounded-xl border border-dashed border-line"
        />
      )}
    </div>
  );

  // ─── เงื่อนไขการแสดงผล (อยู่หลัง hooks ทั้งหมด) ─────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError || !concert) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Alert variant="error">{loadError ?? t("detail.aboutSoldOut")}</Alert>
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-hover"
          >
            <FiArrowLeft aria-hidden="true" className="text-sm" />
            {t("detail.homeBreadcrumb")}
          </Link>
        </div>
      </div>
    );
  }

  const sideLabel = selectedZone ? sideLabels[selectedZone.side][i18n.language?.startsWith("th") ? "th" : "en"] : "";

  return (
    <div className="min-h-screen bg-page pb-16">
      {/* แบนเนอร์ */}
      <section className="bg-hero py-10 text-hero-text">
        <div className="container-page">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-sm text-hero-muted"
          >
            <Link to="/" className="inline-flex items-center gap-1.5 transition hover:text-hero-text">
              <FiArrowLeft aria-hidden="true" className="text-sm" />
              {t("detail.homeBreadcrumb")}
            </Link>
            <FiChevronRight aria-hidden="true" className="text-sm opacity-60" />
            <span className="max-w-[280px] truncate text-hero-text">{concert.name}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
                {concertDisplayName(concert)}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-hero-muted">
                <span className="inline-flex items-center gap-1.5">
                  <FiMapPin aria-hidden="true" className="text-sm" /> {concert.venue.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FiCalendar aria-hidden="true" className="text-sm" />
                  {/* แสดงช่วงวันที่เมื่อมีหลายรอบ เช่น 25-27 พ.ย. */}
                  {formatDateRange(concert.dates)}
                  {concert.dates.length > 1 && ` ${t("detail.dateCount", { count: concert.dates.length })}`}
                </span>
              </div>
            </div>

            <div className="rounded-card bg-surface px-5 py-4 text-right shadow-card">
              <p className="text-xs uppercase tracking-wide text-muted">{t("detail.startingPrice")}</p>
              <p className="font-display text-2xl font-extrabold text-primary">
                {formatCurrency(startingPrice)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* แถบขั้นตอนการจอง */}
      <section className="container-page mt-6">
        <div className="rounded-card bg-surface px-4 py-5 shadow-card ring-1 ring-line sm:px-8">
          <StepProgress
            current={currentStep}
            labels={[
              t("detail.step1Label"),
              t("detail.step2Label"),
              t("detail.step3Label"),
              t("detail.step4Label"),
            ]}
          />
        </div>
      </section>

      {/* ขั้นที่ 1 เลือกรอบการแสดง — ต้องเลือกก่อนเลือกโซน/ที่นั่ง */}
      <section className="container-page mt-6">
        <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center font-display text-xl font-bold text-ink">
              <StepBadge step={1} />
              {t("detail.step1")}
            </h2>
            <span className="text-xs text-muted">
              {t("detail.step1Hint", { count: concert.dates.length })}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {sortedDates.map((date) => {
              const selected = date === selectedShowDate;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  className={`inline-flex items-center gap-2 rounded-btn border px-4 py-2.5 text-sm font-semibold transition ${
                    selected
                      ? "border-primary bg-primary text-primary-contrast shadow-sm"
                      : "border-line bg-surface text-ink hover:border-primary hover:text-primary-soft-text"
                  }`}
                >
                  <FiCalendar aria-hidden="true" className="text-sm" />
                  {formatDateTime(date)}
                </button>
              );
            })}
          </div>

          {selectedShowDate && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-success-text">
              <FiCheck aria-hidden="true" className="text-base" />
              {t("detail.dateChosen", { date: formatDateTime(selectedShowDate) })}
            </p>
          )}
        </div>
      </section>

      {/* ขั้นที่ 2 ผังโซนภาพรวม — เลือกโซน */}
      {!selectedZone ? (
        <section className="container-page mt-6">
          <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center font-display text-xl font-bold text-ink">
                <StepBadge step={2} />
                {t("detail.step2")}
              </h2>
              <span className="text-xs text-muted">{t("detail.step2Hint")}</span>
            </div>

            {!selectedShowDate && (
              <Alert variant="info" className="mt-4">
                {t("detail.needDateFirst")}
              </Alert>
            )}

            {/* เวที */}
            <div className="mx-auto mt-5 flex w-3/4 items-center justify-center rounded-b-[2.5rem] bg-ink py-4 shadow-inner">
              <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.4em] text-page">
                <FiMic aria-hidden="true" className="text-base" />
                {t("detail.stage")}
              </span>
            </div>
            <div className="mx-auto mt-1 w-3/4 border-b-2 border-dashed border-line" />

            {/* แถวโซนซ้าย/กลาง/ขวา — โค้งเป็นวงแหวนรอบเวทีตามผังคอนเสิร์ตจริง */}
            <div className="mt-4 flex flex-col gap-3">
              {mapRows.map((row, rowIndex) => {
                const isFirstRow = rowIndex === 0;
                const isLastRow = rowIndex === mapRows.length - 1;

                return (
                  <div
                    key={row.mapRow}
                    className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3"
                  >
                    {row.wide ? (
                      <div className="md:col-span-3">
                        {renderZoneCard(row.wide, "wide", isFirstRow, isLastRow)}
                      </div>
                    ) : (
                      <>
                        <div className="flex">
                          {row.left
                            ? renderZoneCard(row.left, "left", isFirstRow, isLastRow)
                            : renderEmptyCell("side")}
                        </div>
                        <div className="flex">
                          {row.center
                            ? renderZoneCard(row.center, "center", isFirstRow, isLastRow)
                            : renderEmptyCell("center")}
                        </div>
                        <div className="flex">
                          {row.right
                            ? renderZoneCard(row.right, "right", isFirstRow, isLastRow)
                            : renderEmptyCell("side")}
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
                {t("detail.entranceLeft")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1 text-[11px] text-muted">
                <MdOutlineMeetingRoom aria-hidden="true" className="text-sm" />
                {t("detail.entranceRight")}
              </span>
            </div>

            {/* Legend เล็ก — สี = ราคา */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
              {distinctTiers.map((tier) => (
                <span key={tier.price} className="flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded ${tier.dot}`} />
                  {formatCurrency(tier.price)}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-line" />
                {t("detail.zoneClosed")}
              </span>
            </div>
          </div>
        </section>
      ) : (
        /* แถบโซนที่เลือก */
        <section className="container-page mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border-2 border-primary bg-primary p-5 text-primary-contrast shadow-card">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-surface px-2.5 py-1 font-mono text-sm font-extrabold text-ink">
                {selectedZone.code}
              </span>
              <div>
                <p className="text-sm opacity-80">
                  {t("detail.zoneLabel")} · {sideLabel}
                </p>
                <p className="font-display text-xl font-extrabold">{selectedZone.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs opacity-80">
                  {t("detail.seatsLeft", { count: selectedZone.availableSeats })}
                </p>
                <p className="font-display text-lg font-extrabold">
                  {formatCurrency(selectedZone.price)} {t("detail.perTicket")}
                </p>
              </div>
              <button
                type="button"
                onClick={clearZoneSelection}
                className="rounded-btn bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:opacity-90"
              >
                {t("detail.changeZone")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ขั้นที่ 3 ผังที่นั่งใหญ่ — เฉพาะโซนที่เลือก */}
      {selectedZone && (
        <section className="container-page mt-6">
          <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center font-display text-xl font-bold text-ink">
                <StepBadge step={3} />
                {t("detail.step3")} — {selectedZone.name}
                <span
                  className={`ml-2 rounded px-1.5 py-0.5 font-mono text-xs font-bold ring-1 ${tierOf(selectedZone).header}`}
                >
                  {selectedZone.code}
                </span>
              </h2>
              <p className="text-sm font-semibold text-primary">
                {formatCurrency(selectedZone.price)} {t("detail.perTicket")} ·{" "}
                {t("detail.seatsLeft", { count: selectedZone.availableSeats })}
              </p>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2">
              {(seatRowsByZone.get(selectedZone.id) ?? []).map(([rowLabel, seats]) => (
                <div key={rowLabel} className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-right text-xs font-bold text-muted">
                    {rowLabel}
                  </span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {seats.map((seat) => {
                      const selected = isSelectedSeat(seat);

                      return (
                        <button
                          key={seat.id}
                          type="button"
                          title={`${t("detail.seats")} ${seat.code}${seat.isAvailable ? "" : ` (${t("detail.legendTaken")})`}`}
                          aria-label={`${t("detail.seats")} ${seat.code}${seat.isAvailable ? "" : ` (${t("detail.legendTaken")})`}`}
                          disabled={!seat.isAvailable || isBooking}
                          onClick={() => toggleSeat(seat)}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition sm:h-10 sm:w-10 sm:text-sm ${
                            selected
                              ? "bg-primary text-primary-contrast shadow-md"
                              : seat.isAvailable
                                ? "bg-surface-2 text-ink ring-1 ring-line hover:bg-primary-soft hover:text-primary-soft-text"
                                : "cursor-not-allowed bg-surface-2 text-muted opacity-60"
                          }`}
                        >
                          {seat.seatNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend ที่นั่ง */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-surface-2 ring-1 ring-line" />
                {t("detail.legendAvailable")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-primary" />
                {t("detail.legendSelected")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-surface-2 opacity-60" />
                {t("detail.legendTaken")}
              </span>
            </div>

            {selectedSeatIds.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                <span className="text-xs text-muted">{t("detail.selectedSeats")}</span>
                {selectedSeats.map((seat) => (
                  <button
                    key={seat.id}
                    type="button"
                    onClick={() => toggleSeat(seat)}
                    title={t("detail.removeSeat")}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 font-mono text-[11px] font-bold text-primary-contrast transition hover:bg-primary-hover"
                  >
                    {seat.code}
                    <FiX aria-hidden="true" className="text-xs" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* รายละเอียด + กล่องจอง */}
      <div className="container-page mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-xl font-bold text-ink">{t("detail.aboutTitle")}</h2>
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-soft-text ring-1 ring-line">
                {concert.origin === "THAI" ? t("home.filterThai") : t("home.filterInternational")}
              </span>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">
                {concert.artistType === "SOLO" ? t("home.filterSolo") : t("home.filterGroup")}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">
              {concert.description}
            </p>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-surface-2 p-4">
                <dt className="text-xs font-medium text-muted">{t("detail.aboutVenue")}</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{concert.venue.name}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-4">
                <dt className="text-xs font-medium text-muted">{t("detail.aboutShows")}</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {t("detail.aboutShowsValue", { count: concert.dates.length })}
                  <span className="block text-xs font-normal text-muted">
                    {t("detail.aboutStarts", { date: formatDateTime(concert.dates[0]) })}
                  </span>
                </dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-4">
                <dt className="text-xs font-medium text-muted">{t("detail.aboutSeatsLeft")}</dt>
                <dd
                  className={`mt-1 text-sm font-semibold ${concertSoldOut ? "text-danger-text" : "text-success-text"}`}
                >
                  {concertSoldOut
                    ? t("detail.aboutSoldOut")
                    : t("detail.aboutSeatsValue", {
                        count: seatsLeft,
                        zones: concert.zones.length,
                      })}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* กล่องจองบัตร — ติดตามจอเมื่อเลื่อนดูรายละเอียด (จอใหญ่) โดยไม่ถูกแถบเมนูบัง */}
        <aside className="self-start lg:sticky lg:top-28">
          <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
            <h2 className="font-display text-xl font-bold text-ink">{t("detail.bookingTitle")}</h2>

            {!isAuthenticated ? (
              <div className="mt-4 flex flex-col gap-3">
                <Alert variant="info">{t("detail.needAccount")}</Alert>
                <Link
                  to="/register"
                  state={{ from: { pathname: `/concerts/${concert.id}` } }}
                  className="rounded-btn bg-primary py-2.5 text-center text-sm font-semibold text-primary-contrast transition hover:bg-primary-hover"
                >
                  {t("detail.registerToBook")}
                </Link>
                <Link
                  to="/login"
                  state={{ from: { pathname: `/concerts/${concert.id}` } }}
                  className="text-center text-xs font-medium text-muted underline hover:text-ink"
                >
                  {t("detail.haveAccount")}
                </Link>
              </div>
            ) : isAdmin ? (
              <div className="mt-4">
                <Alert variant="info">{t("detail.adminNote")}</Alert>
              </div>
            ) : concertSoldOut ? (
              <div className="mt-4">
                <Alert variant="error">{t("detail.soldOutNote")}</Alert>
              </div>
            ) : slipSent && pendingBooking ? (
              /* ขั้นที่ 4 ส่งสลิปแล้ว — รอแอดมินตรวจสอบ */
              <div className="mt-4 flex flex-col gap-4">
                <Alert variant="success">
                  <p className="font-semibold">{t("detail.slipSentTitle")}</p>
                  <p className="mt-1">{t("detail.slipSentDesc")}</p>
                </Alert>

                <Link
                  to="/my-bookings"
                  className="rounded-btn bg-primary py-2.5 text-center text-sm font-semibold text-primary-contrast transition hover:bg-primary-hover"
                >
                  {t("detail.goMyTickets")}
                </Link>
                <button
                  type="button"
                  onClick={resetBookingFlow}
                  className="rounded-btn bg-surface-2 py-2.5 text-sm font-semibold text-ink transition hover:opacity-80"
                >
                  {t("detail.bookMore")}
                </button>
              </div>
            ) : pendingBooking ? (
              /* ขั้นที่ 4 ชำระเงิน + แนบสลิป */
              <div className="mt-4 flex flex-col gap-4">
                <Alert variant="info">{t("detail.slipInfo")}</Alert>

                <div className="rounded-xl border border-line p-4 text-sm text-ink">
                  <p>
                    {t("detail.ticketCode")}:{" "}
                    <span className="font-mono font-bold text-ink">
                      {pendingBooking.ticketCode}
                    </span>
                  </p>
                  <p className="mt-0.5">
                    {t("detail.zone")}:{" "}
                    <span className="font-bold text-ink">{pendingBooking.zone.name}</span>
                  </p>
                  <p className="mt-0.5">
                    {t("detail.seats")}:{" "}
                    <span className="font-mono font-semibold">
                      {pendingBooking.seats.map((seat) => seat.code).join(", ")}
                    </span>
                  </p>
                  <p className="mt-0.5">
                    {t("detail.showDate")}: {formatDateTime(pendingBooking.showDate)}
                  </p>
                  <p className="mt-0.5">
                    {t("detail.quantity")}: {pendingBooking.quantity} · {t("detail.amountDue")}:{" "}
                    <span className="font-bold text-primary">
                      {formatCurrency(pendingBooking.totalPrice)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="slipInput" className="text-sm font-medium text-ink">
                    {t("detail.attachSlip")}
                  </label>
                  <input
                    id="slipInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleSlipFileChange}
                    disabled={slipUploading}
                    className="w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-soft-text hover:file:opacity-80"
                  />
                  {slipPreview && (
                    <img
                      src={slipPreview}
                      alt="Payment slip preview"
                      className="max-h-48 w-full rounded-lg object-contain ring-1 ring-line"
                    />
                  )}
                  {slipError && <Alert variant="error">{slipError}</Alert>}
                  <button
                    type="button"
                    onClick={() => void handleSlipSubmit()}
                    disabled={slipUploading || !slipFile}
                    className="flex w-full items-center justify-center rounded-btn bg-primary py-2.5 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {slipUploading ? t("detail.sendingSlip") : t("detail.sendSlip")}
                  </button>
                </div>

                <Link
                  to="/my-bookings"
                  className="text-center text-xs text-muted underline hover:text-ink"
                >
                  {t("detail.goMyTicketsPending")}
                </Link>
              </div>
            ) : (
              /* ขั้นที่ 1-3 สรุปการเลือก + ยืนยัน */
              <form onSubmit={handleBooking} noValidate className="mt-4 flex flex-col gap-4">
                {/* ข้อมูลผู้จอง — ดึงจากบัญชีที่ล็อกอิน */}
                <div className="rounded-xl border border-line p-4 text-sm">
                  <p className="text-xs font-medium text-muted">{t("detail.buyerInfo")}</p>
                  <div className="mt-2 flex flex-col gap-1 text-ink">
                    <p>
                      {t("detail.buyerName")}:{" "}
                      <span className="font-semibold">
                        {user?.firstName ?? "-"} {user?.lastName ?? "-"}
                      </span>
                    </p>
                    <p>
                      {t("detail.buyerPhone")}:{" "}
                      <span className="font-semibold">{user?.phone ?? "-"}</span>
                    </p>
                    <p>
                      {t("detail.buyerEmail")}:{" "}
                      <span className="font-semibold">{user?.email}</span>
                    </p>
                  </div>
                </div>

                {/* สรุปขั้นตอน 1-3 */}
                <div className="rounded-xl border border-line p-4 text-sm">
                  <p className="text-xs font-medium text-muted">{t("detail.summary")}</p>
                  <div className="mt-2 flex flex-col gap-1.5 text-ink">
                    <p>
                      <span className="font-semibold text-primary">1.</span> {t("detail.summaryDate")}:{" "}
                      {selectedShowDate ? (
                        <span className="font-semibold">{formatDateTime(selectedShowDate)}</span>
                      ) : (
                        <span className="text-warn-text">{t("detail.notSelected")}</span>
                      )}
                    </p>
                    <p>
                      <span className="font-semibold text-primary">2.</span> {t("detail.summaryZone")}:{" "}
                      {selectedZone ? (
                        <span className="font-semibold">
                          {selectedZone.name} ({formatCurrency(selectedZone.price)} {t("detail.perTicket")})
                        </span>
                      ) : (
                        <span className="text-warn-text">{t("detail.notSelectedZone")}</span>
                      )}
                    </p>
                    <p>
                      <span className="font-semibold text-primary">3.</span> {t("detail.summarySeats")}:{" "}
                      {selectedSeats.length > 0 ? (
                        <span className="font-mono font-semibold">
                          {selectedSeats.map((seat) => seat.code).join(", ")}
                        </span>
                      ) : (
                        <span className="text-warn-text">{t("detail.notSelected")}</span>
                      )}
                    </p>
                  </div>
                </div>

                {seatError && <Alert variant="error">{seatError}</Alert>}

                <div className="rounded-xl bg-surface-2 p-4">
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>{t("detail.pricePerTicket")}</span>
                    <span className="font-semibold">
                      {selectedZone ? formatCurrency(selectedZone.price) : "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                    <span className="font-bold text-ink">
                      {t("detail.total", { count: selectedSeats.length })}
                    </span>
                    <span className="font-display text-lg font-extrabold text-primary">
                      {selectedZone && selectedSeats.length > 0
                        ? formatCurrency(totalPrice)
                        : "—"}
                    </span>
                  </div>
                </div>

                {bookingError && <Alert variant="error">{bookingError}</Alert>}

                <button
                  type="submit"
                  disabled={
                    isBooking ||
                    selectedSeats.length === 0 ||
                    !selectedShowDate ||
                    !selectedZone
                  }
                  className="flex w-full items-center justify-center rounded-btn bg-primary py-3 text-sm font-bold text-primary-contrast shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBooking
                    ? t("detail.processing")
                    : selectedSeats.length > 0
                      ? t("detail.confirmBookingCount", { count: selectedSeats.length })
                      : t("detail.confirmBooking")}
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
