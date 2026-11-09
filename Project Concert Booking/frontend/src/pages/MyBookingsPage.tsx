import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiAlertTriangle,
  FiCalendar,
  FiCreditCard,
  FiClock,
  FiLayers,
  FiMapPin,
  FiPrinter,
  FiTag,
  FiTrash2,
} from "react-icons/fi";
import { LuTicket } from "react-icons/lu";
import { MdOutlineEventSeat } from "react-icons/md";

import Alert from "../components/Alert";
import ConfirmDialog from "../components/ConfirmDialog";
import Spinner from "../components/Spinner";
import TicketCard from "../components/TicketCard";
import { useAuth } from "../context/AuthContext";
import { concertDisplayName } from "../i18n";
import { getApiErrorMessage } from "../services/api";
import { bookingService } from "../services/bookingService";
import type { Booking } from "../types";
import { formatCurrency, formatDateTime } from "../utils/format";
import { bookingStatusBadgeStyles } from "../utils/labels";
import { printReceipt } from "../utils/receipt";

/** เวลาที่ให้ชำระเงินหลังจอง (ต้องตรงกับหน้าชำระเงิน) */
const PAYMENT_WINDOW_MS = 10 * 60 * 1000;

/** ข้อมูลบัญชีธนาคารสำหรับโอนชำระเงิน (ต้องตรงกับหน้าชำระเงิน) */
const BANK_INFO = {
  bank: "กสิกรไทย",
  accountNumber: "154-111-4064",
  accountName: "ญาดา อินต๊ะนาม",
};

/** นาฬิกานับถอยหลังชำระเงิน — แสดง mm:ss จนถึงหมดเวลา */
function PaymentCountdown({ createdAt }: { createdAt: string }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = new Date(createdAt).getTime() + PAYMENT_WINDOW_MS - now;
  if (remaining <= 0) {
    return <span className="font-bold text-danger-text">{t("myBookings.payExpired")}</span>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <span
      className={`font-mono font-extrabold tabular-nums ${
        remaining < 2 * 60 * 1000 ? "text-danger-text" : "text-warn-text"
      }`}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

export default function MyBookingsPage() {
  const { t } = useTranslation();
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // โซนอันตราย: ควบคุมกล่องยืนยันลบบัญชี (แสดงหมายเหตุเตือนก่อนลบถาวร)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const fetchBookings = async (): Promise<void> => {
      try {
        const data = await bookingService.getMyBookings();
        setBookings(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBookings();
  }, []);

  const handleCancel = async (bookingId: string): Promise<void> => {
    const confirmed = window.confirm(t("myBookings.cancelConfirm"));
    if (!confirmed) return;

    setCancellingId(bookingId);
    setError(null);
    setNotice(null);

    try {
      const cancelled = await bookingService.cancelBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === cancelled.id ? cancelled : b)));
      setNotice(t("myBookings.cancelled"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  /** ลบบัญชีถาวร — เรียกจากปุ่มยืนยันใน ConfirmDialog เท่านั้น (ผู้ใช้ต้องอ่านหมายเหตุก่อน) */
  const handleDeleteAccount = async (): Promise<void> => {
    setIsDeletingAccount(true);
    setError(null);
    setNotice(null);

    try {
      await deleteAccount();
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const activeBookings = bookings.filter((b) => b.status === "COMPLETED");
  const totalTickets = activeBookings.reduce((sum, b) => sum + b.quantity, 0);
  const totalSpent = activeBookings.reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="container-page py-10">
        <div className="border-b border-line pb-5">
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            {t("myBookings.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{t("myBookings.subtitle")}</p>
        </div>

        {/* สถิติ */}
        {!isLoading && bookings.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-soft-text"
              >
                <FiLayers className="text-lg" />
              </span>
              <div>
                <p className="font-display text-xl font-extrabold text-ink">{bookings.length}</p>
                <p className="text-xs text-muted">{t("myBookings.statTotal")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input bg-success-bg text-success-text"
              >
                <LuTicket className="text-lg" />
              </span>
              <div>
                <p className="font-display text-xl font-extrabold text-ink">{totalTickets}</p>
                <p className="text-xs text-muted">{t("myBookings.statUsable")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input bg-info-bg text-info-text"
              >
                <FiCreditCard className="text-lg" />
              </span>
              <div>
                <p className="font-display text-xl font-extrabold text-ink">
                  {formatCurrency(totalSpent)}
                </p>
                <p className="text-xs text-muted">{t("myBookings.statSpent")}</p>
              </div>
            </div>
          </div>
        )}

        {/* แจ้งเตือน */}
        {(error || notice) && (
          <div className="mt-6">
            {error && <Alert variant="error">{error}</Alert>}
            {!error && notice && <Alert variant="success">{notice}</Alert>}
          </div>
        )}

        {/* เนื้อหา */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-8 rounded-card bg-surface p-12 text-center shadow-card ring-1 ring-line">
            <span
              aria-hidden="true"
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-text"
            >
              <FiCalendar className="text-2xl" />
            </span>
            <h2 className="font-display mt-4 text-xl font-bold text-ink">{t("myBookings.emptyTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("myBookings.emptyDesc")}</p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast transition hover:bg-primary-hover"
            >
              {t("myBookings.browseAll")}
            </Link>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-6">
            {bookings.map((booking) => (
              <li key={booking.id} className="flex flex-col gap-3">
                {/* รูปหน้าตั๋ว — แสดงเมื่อแอดมินอนุมัติสลิปแล้ว (จองสำเร็จ) */}
                {booking.status === "COMPLETED" && (
                  <>
                    <TicketCard
                      bookingId={booking.id}
                      ticketCode={booking.ticketCode}
                      concertName={concertDisplayName(booking.concert)}
                      venue={booking.concert.venue.name}
                      dateLabel={formatDateTime(booking.showDate)}
                      zoneName={booking.zone.name}
                      seatCodes={booking.seats.map((seat) => seat.code)}
                      seatTickets={booking.seats.map((seat) => ({
                        code: seat.code,
                        ticketCode: seat.ticketCode ?? null,
                      }))}
                      quantity={booking.quantity}
                      totalPrice={booking.totalPrice}
                      buyerLabel={
                        user?.firstName || user?.lastName
                          ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                          : user?.email
                      }
                    />
                    {/* ปุ่มพิมพ์ใบเสร็จรับเงิน (แยกยอดก่อน VAT + VAT 7% + ยอดรวม) */}
                    <button
                      type="button"
                      onClick={() =>
                        printReceipt({
                          receiptNo: booking.ticketCode,
                          buyerLabel:
                            user?.firstName || user?.lastName
                              ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                              : user?.email ?? "-",
                          concertName: concertDisplayName(booking.concert),
                          venue: booking.concert.venue.name,
                          showDateLabel: formatDateTime(booking.showDate),
                          zoneName: booking.zone.name,
                          seatTickets: booking.seats.map((seat) => ({
                            code: seat.code,
                            ticketCode: seat.ticketCode ?? null,
                          })),
                          quantity: booking.quantity,
                          totalPrice: booking.totalPrice,
                        })
                      }
                      className="flex items-center justify-center gap-2 rounded-btn border border-line bg-surface py-2 text-sm font-semibold text-muted transition hover:border-primary hover:text-primary"
                    >
                      <FiPrinter aria-hidden="true" className="text-base" />
                      {t("myBookings.printReceipt")}
                    </button>
                  </>
                )}

                {/* รายการจอง + การชำระเงิน */}
                <div className="rounded-card bg-surface shadow-card ring-1 ring-line">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/concerts/${booking.concertId}`}
                          className="text-lg font-bold text-ink hover:text-primary"
                        >
                          {concertDisplayName(booking.concert)}
                        </Link>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${bookingStatusBadgeStyles[booking.status]}`}
                        >
                          {t("status.booking." + booking.status)}
                        </span>
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <FiMapPin aria-hidden="true" className="text-sm shrink-0" />
                          {booking.concert.venue.name}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <FiCalendar aria-hidden="true" className="text-sm shrink-0" />
                          {formatDateTime(booking.showDate)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-0.5 font-semibold text-primary-soft-text ring-1 ring-line">
                          <FiTag aria-hidden="true" className="text-xs shrink-0" />
                          {booking.zone.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs font-semibold text-ink">
                          <MdOutlineEventSeat aria-hidden="true" className="text-sm shrink-0" />
                          {booking.seats.map((seat) => seat.code).join(", ")}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {t("myBookings.ticketCodeLabel")}: <span className="font-mono font-semibold">{booking.ticketCode}</span> ·
                        {t("myBookings.bookedAt")} {formatDateTime(booking.createdAt)} · {t("myBookings.bookingId")}: {booking.id}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:justify-center">
                      <div className="text-right">
                        <p className="text-sm text-muted">
                          {t("myBookings.tickets", { count: booking.quantity })} × {formatCurrency(booking.zone.price)}
                        </p>
                        <p className="font-display text-lg font-extrabold text-primary">
                          {formatCurrency(booking.totalPrice)}
                        </p>
                      </div>

                      {booking.status !== "CANCELLED" &&
                        booking.status !== "COMPLETED" &&
                        booking.status !== "PENDING_VERIFICATION" && (
                          <button
                            type="button"
                            onClick={() => void handleCancel(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="rounded-btn border border-danger-border bg-danger-bg px-4 py-2 text-sm font-semibold text-danger-text transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancellingId === booking.id ? t("myBookings.cancelling") : t("myBookings.cancel")}
                          </button>
                        )}
                    </div>
                  </div>

                  {/* ส่วนการชำระเงิน — รอชำระเงิน: โชว์ข้อมูลบัญชี + นับถอยหลัง 10 นาที */}
                  {booking.status === "PENDING" && (
                    <div className="border-t border-line bg-warn-bg p-5">
                      {booking.payment?.note && (
                        <Alert variant="error" className="mb-3">
                          {t("myBookings.slipRejectedNote", { note: booking.payment.note })}
                        </Alert>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
                          <FiCreditCard aria-hidden="true" className="shrink-0 text-base" />
                          {t("myBookings.pendingStatus")}{" "}
                          <span className="text-primary">{formatCurrency(booking.totalPrice)}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-ink">
                          <FiClock aria-hidden="true" className="shrink-0 text-base" />
                          {t("myBookings.payWithin")} <PaymentCountdown createdAt={booking.createdAt} />
                        </p>
                      </div>

                      <div className="mt-3 rounded-input bg-surface p-3 text-sm ring-1 ring-line">
                        <p className="text-muted text-xs font-semibold uppercase tracking-wider">
                          {t("myBookings.transferTo")}
                        </p>
                        <p className="mt-1 text-ink">
                          {t("myBookings.bank")} <b>{BANK_INFO.bank}</b> · {t("myBookings.accountNo")}{" "}
                          <span className="font-mono font-extrabold tracking-wide">
                            {BANK_INFO.accountNumber}
                          </span>{" "}
                          · {t("myBookings.accountName")} <b>{BANK_INFO.accountName}</b>
                        </p>
                      </div>

                      <Link
                        to={`/bookings/${booking.id}/payment`}
                        className="mt-3 inline-flex items-center justify-center gap-2 rounded-btn bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover"
                      >
                        <FiCreditCard aria-hidden="true" className="text-sm" />
                        {t("myBookings.goPayment")}
                      </Link>
                    </div>
                  )}

                  {/* สลิปไม่ผ่าน — แจ้งเหตุผล + ให้ส่งใหม่ผ่านหน้าชำระเงิน */}
                  {booking.status === "REJECTED" && (
                    <div className="border-t border-line bg-danger-bg p-5">
                      {booking.payment?.note && (
                        <Alert variant="error" className="mb-3">
                          {t("myBookings.slipRejectedNote", { note: booking.payment.note })}
                        </Alert>
                      )}
                      <Link
                        to={`/bookings/${booking.id}/payment`}
                        className="inline-flex items-center gap-2 rounded-btn bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover"
                      >
                        {t("myBookings.attachNewSlip")}
                      </Link>
                    </div>
                  )}

                  {booking.status === "PENDING_VERIFICATION" && (
                    <div className="border-t border-line bg-info-bg p-4">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm text-info-text">
                        <FiClock aria-hidden="true" className="text-base shrink-0" />
                        {t("myBookings.verifying")}{" "}
                        <b>
                          {booking.payment
                            ? t("status.payment." + booking.payment.status)
                            : t("status.payment.PENDING_VERIFICATION")}
                        </b>{" "}
                        {t("myBookings.verifyingNote")}
                        {booking.payment?.note ? ` ${t("myBookings.remark", { note: booking.payment.note })}` : ""}
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ─── โซนอันตราย: ลบบัญชีผู้ใช้ (ผู้ใช้ลบเองได้) ─── */}
        <section className="mt-10 rounded-card border border-danger-border bg-danger-bg p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-danger-text">
            <FiAlertTriangle aria-hidden="true" className="text-lg" />
            {t("account.deleteTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-danger-text">{t("account.deleteDesc")}</p>
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isLoading}
            className="mt-4 inline-flex items-center gap-2 rounded-btn bg-danger-text px-5 py-2.5 text-sm font-bold text-surface shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiTrash2 aria-hidden="true" className="text-base" />
            {t("account.deleteButton")}
          </button>
          {bookings.length > 0 && (
            <p className="mt-2 text-xs text-danger-text">
              * {t("account.deleteDesc")}
            </p>
          )}
        </section>
      </div>

      {/* กล่องยืนยันลบบัญชี — แสดงหมายเหตุเตือนให้อ่านก่อนกดยืนยันลบถาวร */}
      {isDeleteDialogOpen && (
        <ConfirmDialog
          title={t("account.deleteConfirmTitle")}
          message={t("account.deleteConfirmWarning")}
          confirmLabel={t("account.deleteConfirmYes")}
          cancelLabel={t("account.deleteConfirmNo")}
          isConfirming={isDeletingAccount}
          confirmingLabel={t("account.deleting")}
          onConfirm={() => void handleDeleteAccount()}
          onCancel={() => setIsDeleteDialogOpen(false)}
        />
      )}
    </div>
  );
}
