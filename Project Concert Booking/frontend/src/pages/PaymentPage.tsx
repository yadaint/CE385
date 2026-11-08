import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiClock,
  FiCreditCard,
  FiUploadCloud,
} from "react-icons/fi";

import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { getApiErrorMessage } from "../services/api";
import { bookingService } from "../services/bookingService";
import type { BookingCheckResult } from "../types";
import { formatCurrency, formatDateTime } from "../utils/format";

/** ข้อมูลบัญชีธนาคารสำหรับโอนชำระเงิน */
const BANK_INFO = {
  bank: "กสิกรไทย",
  accountNumber: "154-111-4064",
  accountName: "ญาดา อินต๊ะนาม",
};

/** เวลาที่ให้ชำระเงินหลังจอง (10 นาที) */
const PAYMENT_WINDOW_MS = 10 * 60 * 1000;

/** นับถอยหลัง mm:ss จาก deadline */
const formatCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function PaymentPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const fetchBooking = async (): Promise<void> => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await bookingService.checkBooking(id);
        setBooking(data);
        setError(null);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBooking();
  }, [id]);

  // นาฬิกาสำหรับนับถอยหลัง (ทุกวินาที)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const deadline = useMemo(
    () => (booking ? new Date(booking.createdAt).getTime() + PAYMENT_WINDOW_MS : 0),
    [booking],
  );
  const remainingMs = deadline - now;
  const isExpired = remainingMs <= 0;
  const isPaid = booking?.status === "COMPLETED" || booking?.status === "PENDING_VERIFICATION";

  const handleSlipFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setSlipFile(file);
    setSlipPreview(file ? URL.createObjectURL(file) : null);
    setSlipError(null);
    event.target.value = "";
  };

  const handleSlipSubmit = async (): Promise<void> => {
    if (!id || !slipFile) return;

    setSlipUploading(true);
    setSlipError(null);
    try {
      await bookingService.uploadSlip(id, slipFile);
      setNotice(t("payment.sentNotice"));
      setSlipFile(null);
      setSlipPreview(null);
      const data = await bookingService.checkBooking(id);
      setBooking(data);
    } catch (err) {
      setSlipError(getApiErrorMessage(err));
    } finally {
      setSlipUploading(false);
    }
  };

  const handleCopyAccount = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(BANK_INFO.accountNumber);
      setNotice(t("payment.copied"));
    } catch {
      setNotice(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container-page py-16">
        <Alert variant="error">{error ?? t("payment.notFound")}</Alert>
        <div className="mt-6 text-center">
          <Link to="/my-bookings" className="font-semibold text-primary hover:text-primary-hover">
            {t("payment.backToTickets")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="container-page max-w-2xl py-10">
        <Link
          to="/my-bookings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          <FiArrowLeft aria-hidden="true" className="text-sm" />
          {t("payment.backToTickets")}
        </Link>

        <h1 className="font-display mt-3 text-2xl font-extrabold text-ink sm:text-3xl">
          {t("payment.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("payment.subtitle")}</p>

        {notice && (
          <Alert variant="success" className="mt-4">
            {notice}
          </Alert>
        )}

        {/* ─── นับถอยหลังชำระเงิน ─── */}
        <section
          className={`mt-5 rounded-card p-5 text-center shadow-card ring-1 ${
            isPaid
              ? "bg-success-bg ring-success-border"
              : isExpired
                ? "bg-danger-bg ring-danger-border"
                : "bg-surface ring-line"
          }`}
        >
          {isPaid ? (
            <p className="font-display text-xl font-extrabold text-success-text">
              {booking.status === "COMPLETED" ? t("payment.paidTitle") : t("payment.verifyingTitle")}
            </p>
          ) : isExpired ? (
            <>
              <p className="flex items-center justify-center gap-2 font-display text-xl font-extrabold text-danger-text">
                <FiAlertTriangle aria-hidden="true" className="text-xl" />
                {t("payment.expiredTitle")}
              </p>
              <p className="mt-1 text-sm text-danger-text">{t("payment.expiredDesc")}</p>
            </>
          ) : (
            <>
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-muted">
                <FiClock aria-hidden="true" className="text-base" />
                {t("payment.countdownLabel")}
              </p>
              <p
                className={`font-display mt-1 text-5xl font-extrabold tabular-nums ${
                  remainingMs < 2 * 60 * 1000 ? "text-danger-text" : "text-ink"
                }`}
              >
                {formatCountdown(remainingMs)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t("payment.countdownDeadline", {
                  date: formatDateTime(new Date(deadline).toISOString()),
                })}
              </p>
            </>
          )}
        </section>

        {/* ─── ข้อมูลบัญชีธนาคาร ─── */}
        <section className="mt-5 rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
          <h2 className="section-title flex items-center gap-2">
            <FiCreditCard aria-hidden="true" className="text-primary-soft-text" />
            {t("payment.transferTitle")}
          </h2>

          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("payment.bank")}</dt>
              <dd className="font-bold text-ink">{BANK_INFO.bank}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("payment.accountNumber")}</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-lg font-extrabold tracking-wider text-ink">
                  {BANK_INFO.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyAccount()}
                  className="rounded-btn border border-line px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary-soft"
                >
                  {t("payment.copy")}
                </button>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("payment.accountName")}</dt>
              <dd className="font-bold text-ink">{BANK_INFO.accountName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <dt className="font-bold text-ink">{t("payment.amountDue")}</dt>
              <dd className="font-display text-2xl font-extrabold text-primary">
                {formatCurrency(booking.totalPrice)}
              </dd>
            </div>
          </dl>

          {/* สรุปการจอง */}
          <div className="mt-4 rounded-input bg-surface-2 p-4 text-sm text-ink">
            <p>
              {t("payment.ticketCode")}:{" "}
              <span className="font-mono font-bold">{booking.ticketCode}</span>
            </p>
            <p className="mt-0.5">
              {t("payment.zone")}: <span className="font-semibold">{booking.zone.name}</span> ·{" "}
              {t("payment.seats")}:{" "}
              <span className="font-mono font-semibold">
                {booking.seats.map((seat) => seat.code).join(", ")}
              </span>{" "}
              ({booking.quantity})
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {t("payment.selectedShowDate")}: {formatDateTime(booking.showDate)}
            </p>
          </div>
        </section>

        {/* ─── แนบสลิป ─── */}
        {!isPaid && (
          <section className="mt-5 rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
            <h2 className="section-title flex items-center gap-2">
              <FiUploadCloud aria-hidden="true" className="text-primary-soft-text" />
              {t("payment.slipTitle")}
            </h2>

            {slipError && (
              <Alert variant="error" className="mt-3">
                {slipError}
              </Alert>
            )}

            <div className="mt-4 flex flex-col gap-3">
              <label
                htmlFor="slipInput"
                className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-input border-2 border-dashed border-line bg-surface-2 px-4 text-center transition hover:border-primary"
              >
                <FiUploadCloud aria-hidden="true" className="text-2xl text-muted" />
                <span className="text-sm font-semibold text-ink">{t("payment.selectSlip")}</span>
                <span className="text-[11px] text-muted">{t("payment.slipFormat")}</span>
              </label>
              <input
                id="slipInput"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleSlipFileChange}
                disabled={slipUploading}
              />

              {slipPreview && (
                <img
                  src={slipPreview}
                  alt="Payment slip preview"
                  className="max-h-56 w-full rounded-lg object-contain ring-1 ring-line"
                />
              )}

              <button
                type="button"
                onClick={() => void handleSlipSubmit()}
                disabled={slipUploading || !slipFile}
                className="flex w-full items-center justify-center rounded-btn bg-primary py-3 text-sm font-bold text-primary-contrast shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {slipUploading ? t("payment.sendingSlip") : t("payment.sendSlip")}
              </button>
              <p className="text-center text-xs text-muted">{t("payment.slipSentHint")}</p>
            </div>
          </section>
        )}

        {isExpired && !isPaid && (
          <button
            type="button"
            onClick={() =>
              void bookingService
                .cancelBooking(booking.id)
                .then(() => navigate("/my-bookings", { replace: true }))
            }
            className="mt-5 w-full rounded-btn border border-danger-border bg-danger-bg py-3 text-sm font-bold text-danger-text transition hover:opacity-80"
          >
            {t("payment.cancelBooking")}
          </button>
        )}
      </div>
    </div>
  );
}
