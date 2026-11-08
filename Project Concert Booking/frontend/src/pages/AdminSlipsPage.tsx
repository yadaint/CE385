import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiArrowLeft,
  FiCheck,
  FiClipboard,
  FiClock,
  FiExternalLink,
  FiX,
} from "react-icons/fi";

import AdminStatsTabs from "../components/AdminStatsTabs";
import ExportButtons from "../components/ExportButtons";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { concertDisplayName } from "../i18n";
import { getApiErrorMessage, getUploadUrl } from "../services/api";
import { adminService } from "../services/adminService";
import type { AdminBooking, PaymentStatus } from "../types";
import { formatCurrency, formatDateTime } from "../utils/format";
import { bookingStatusBadgeStyles } from "../utils/labels";

type SlipFilter = PaymentStatus | "ALL";

export default function AdminSlipsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [concertName, setConcertName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [filter, setFilter] = useState<SlipFilter>("PENDING_VERIFICATION");

  const fetchBookings = useCallback(async (): Promise<void> => {
    if (!id) return;
    try {
      const data = await adminService.getBookings();
      // เอาเฉพาะการจองของคอนเสิร์ตนี้
      const mine = data.filter((booking) => booking.concert.id === id);
      setBookings(mine);
      if (mine.length > 0) setConcertName(mine[0].concert.name);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    void fetchBookings();
  }, [fetchBookings]);

  const filtered = useMemo(() => {
    if (filter === "ALL") {
      return bookings.filter((booking) => booking.payment !== null && booking.payment !== undefined);
    }
    return bookings.filter((booking) => booking.payment?.status === filter);
  }, [bookings, filter]);

  const handleApprove = async (paymentId: string): Promise<void> => {
    setActionId(paymentId);
    setActionError(null);
    try {
      await adminService.approvePayment(paymentId);
      setNotice(t("adminPanel.payments.approvedMsg"));
      await fetchBookings();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (paymentId: string): Promise<void> => {
    setActionId(paymentId);
    setActionError(null);
    try {
      await adminService.rejectPayment(paymentId, rejectNote.trim() || undefined);
      setRejectTarget(null);
      setRejectNote("");
      await fetchBookings();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  // ─── เอกสารรายงาน: ref สำหรับจับ PDF + ตัวสร้าง CSV ───
  const reportRef = useRef<HTMLDivElement>(null);

  const buildCsv = (): string => {
    const esc = (value: string | number): string => {
      const text = String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines: string[] = [];

    lines.push(`${t("export.csvBookings")} — ${esc(concertName)}`);
    lines.push(t("export.csvBookingCols"));
    for (const booking of filtered) {
      lines.push(
        [
          booking.ticketCode,
          booking.user.email,
          booking.concert.name,
          booking.zone.name,
          booking.seats.map((seat) => seat.code).join(" "),
          formatDateTime(booking.showDate),
          booking.quantity,
          booking.totalPrice,
          t("status.booking." + booking.status),
          booking.payment ? t("status.payment." + booking.payment.status) : "-",
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
            {t("adminStats.slipsTitle")}
            {concertName ? ` — ${concertName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("adminStats.slipsSubtitle")}</p>
        </div>

        {id && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <AdminStatsTabs concertId={id} active="slips" />
            <ExportButtons
              targetRef={reportRef}
              filenameBase={`slips-report-${id}`}
              buildCsv={buildCsv}
            />
          </div>
        )}

        {/* ตัวกรองสถานะสลิป */}
        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              { value: "PENDING_VERIFICATION" as const, key: "adminStats.filterPending" },
              { value: "APPROVED" as const, key: "adminStats.filterApproved" },
              { value: "REJECTED" as const, key: "adminStats.filterRejected" },
              { value: "ALL" as const, key: "adminStats.filterAll" },
            ]
          ).map((option) => {
            const active = filter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-btn border px-4 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-line bg-surface text-muted hover:border-primary hover:text-primary-soft-text"
                }`}
              >
                {t(option.key)}
              </button>
            );
          })}
        </div>

        {(error || actionError || notice) && (
          <div className="mt-4">
            {error && <Alert variant="error">{error}</Alert>}
            {actionError && <Alert variant="error">{actionError}</Alert>}
            {notice && <Alert variant="success">{notice}</Alert>}
          </div>
        )}

        {/* เอกสารรายงาน — จับเป็น PDF ได้ทั้งบล็อก */}
        <div ref={reportRef} className="bg-surface p-5">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted">
            {t("export.reportSystem")} — {concertName}
          </p>
          <p className="mt-1 text-center text-xs text-muted">
            {t("export.reportGenerated", { date: formatDateTime(new Date().toISOString()) })}
          </p>

          {filtered.length === 0 ? (
            <div className="mt-4 rounded-card bg-surface-2 p-12 text-center ring-1 ring-line">
              <span
                aria-hidden="true"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-text"
              >
                <FiClipboard className="text-2xl" />
              </span>
              <p className="mt-4 text-sm text-muted">{t("adminStats.empty")}</p>
            </div>
          ) : (
          <ul className="mt-6 flex flex-col gap-5">
            {filtered.map((booking) => {
              const payment = booking.payment;
              const isPending = payment?.status === "PENDING_VERIFICATION";

              return (
                <li key={booking.id} className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
                    {/* รูปสลิป */}
                    {payment && (
                      <div>
                        <a
                          href={getUploadUrl(payment.slipImage)}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                          title={t("adminStats.viewSlip")}
                        >
                          <img
                            src={getUploadUrl(payment.slipImage)}
                            alt={`Slip of ${booking.user.email}`}
                            className="max-h-52 w-full rounded-xl object-contain ring-1 ring-line"
                          />
                        </a>
                        <span
                          className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${
                            payment.status === "APPROVED"
                              ? "bg-success-bg text-success-text ring-success-border"
                              : payment.status === "REJECTED"
                                ? "bg-danger-bg text-danger-text ring-danger-border"
                                : "bg-info-bg text-info-text ring-info-border"
                          }`}
                        >
                          {t("status.payment." + payment.status)}
                        </span>
                      </div>
                    )}

                    {/* ข้อมูลการจอง */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-lg font-bold text-ink">
                          {concertDisplayName(booking.concert)}
                        </p>
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-soft-text ring-1 ring-line">
                          {booking.zone.name}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${bookingStatusBadgeStyles[booking.status]}`}
                        >
                          {t("status.booking." + booking.status)}
                        </span>
                      </div>

                      <dl className="mt-2 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted">{t("adminPanel.payments.buyer")}</dt>
                          <dd className="font-semibold text-ink">{booking.user.email}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">{t("adminPanel.payments.showDate")}</dt>
                          <dd className="text-ink">{formatDateTime(booking.showDate)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">{t("adminPanel.payments.seats")}</dt>
                          <dd className="font-mono text-ink">
                            {booking.seats.map((seat) => seat.code).join(", ")}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">{t("adminPanel.payments.qtyAmount")}</dt>
                          <dd className="font-semibold text-ink">
                            {t("myBookings.tickets", { count: booking.quantity })} ·{" "}
                            <span className="text-primary">
                              {formatCurrency(booking.totalPrice)}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">{t("myBookings.ticketCodeLabel")}</dt>
                          <dd className="font-mono text-xs text-muted">{booking.ticketCode}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">{t("myBookings.bookedAt")}</dt>
                          <dd className="text-ink">{formatDateTime(booking.createdAt)}</dd>
                        </div>
                      </dl>

                      {payment?.reviewedAt && (
                        <p className="mt-2 text-xs text-muted">
                          {payment.status === "APPROVED"
                            ? t("adminPanel.payments.approvedMsg")
                            : t("adminPanel.payments.rejectedMsg")}{" "}
                          {t("adminPanel.payments.when", {
                            date: formatDateTime(payment.reviewedAt),
                          })}{" "}
                          {payment.reviewedByEmail &&
                            `${t("adminPanel.payments.byAdmin")} ${payment.reviewedByEmail}`}
                        </p>
                      )}

                      {payment?.note && (
                        <p className="mt-2 rounded-input bg-surface-2 px-3 py-2 text-xs text-muted">
                          {t("adminPanel.payments.noteLabel")}: {payment.note}
                        </p>
                      )}

                      {/* ปุ่มอนุมัติ / ปฏิเสธ */}
                      {isPending && (
                        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                          {rejectTarget === booking.id && (
                            <input
                              type="text"
                              value={rejectNote}
                              onChange={(event) => setRejectNote(event.target.value)}
                              placeholder={t("adminStats.rejectPlaceholder")}
                              className="w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
                            />
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => payment && void handleApprove(payment.id)}
                              disabled={actionId !== null}
                              className="inline-flex items-center gap-1.5 rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FiCheck aria-hidden="true" className="text-base" />
                              {t("adminStats.approve")}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                rejectTarget === booking.id
                                  ? payment && void handleReject(payment.id)
                                  : setRejectTarget(booking.id)
                              }
                              disabled={actionId !== null}
                              className="inline-flex items-center gap-1.5 rounded-btn border border-danger-border bg-danger-bg px-5 py-2 text-sm font-semibold text-danger-text transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FiX aria-hidden="true" className="text-base" />
                              {rejectTarget === booking.id
                                ? t("adminStats.confirmReject")
                                : t("adminStats.reject")}
                            </button>
                            {rejectTarget === booking.id && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                                <FiClock aria-hidden="true" className="text-sm" />
                                {t("adminPanel.payments.rejectHint")}
                              </span>
                            )}
                            {payment && (
                              <a
                                href={getUploadUrl(payment.slipImage)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline hover:text-primary-hover"
                              >
                                <FiExternalLink aria-hidden="true" className="text-xs" />
                                {t("adminStats.viewSlip")}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          )}

          <p className="mt-4 text-center text-[10px] text-muted">
            {t("export.reportSystem")} · {t("export.reportGenerated", { date: formatDateTime(new Date().toISOString()) })}
          </p>
        </div>
      </div>
    </div>
  );
}
