import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiClock, FiFileText, FiX } from "react-icons/fi";

import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { getApiErrorMessage, getUploadUrl } from "../services/api";
import { adminService } from "../services/adminService";
import { concertDisplayName } from "../i18n";
import type { AdminPayment, PaymentStatus } from "../types";
import { formatCurrency, formatDateTime } from "../utils/format";

type PaymentFilter = PaymentStatus | "ALL";

const filterOptions: Array<{ value: PaymentFilter; key: string }> = [
  { value: "PENDING_VERIFICATION", key: "adminPanel.payments.filterPending" },
  { value: "APPROVED", key: "adminPanel.payments.filterApproved" },
  { value: "REJECTED", key: "adminPanel.payments.filterRejected" },
  { value: "ALL", key: "adminPanel.payments.filterAll" },
];

const paymentBadgeStyles: Record<PaymentStatus, string> = {
  PENDING_VERIFICATION: "bg-info-bg text-info-text ring-info-border",
  APPROVED: "bg-success-bg text-success-text ring-success-border",
  REJECTED: "bg-danger-bg text-danger-text ring-danger-border",
};

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<PaymentFilter>("PENDING_VERIFICATION");
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const fetchPayments = async (f: PaymentFilter): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getPayments(f === "ALL" ? undefined : f);
      setPayments(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPayments(filter);
  }, [filter]);

  const handleApprove = async (paymentId: string): Promise<void> => {
    setActionId(paymentId);
    setActionError(null);
    setNotice(null);
    try {
      await adminService.approvePayment(paymentId);
      setNotice("อนุมัติสลิปสำเร็จ — บัตรเปลี่ยนเป็น 'จองสำเร็จ' แล้ว");
      await fetchPayments(filter);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (paymentId: string): Promise<void> => {
    setActionId(paymentId);
    setActionError(null);
    setNotice(null);
    try {
      await adminService.rejectPayment(paymentId, rejectNote.trim() || undefined);
      setNotice("ปฏิเสธสลิปสำเร็จ — ผู้จองสามารถส่งสลิปใหม่ได้");
      setRejectTarget(null);
      setRejectNote("");
      await fetchPayments(filter);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="container-page py-10">
        <p className="text-xs font-bold tracking-widest text-muted">{t("adminPanel.label")}</p>
        <h1 className="font-display mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
          {t("adminPanel.payments.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("adminPanel.payments.subtitle")}</p>

        {/* ตัวกรอง */}
        <div className="mt-6 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
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

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : payments.length === 0 ? (
          <div className="mt-6 rounded-card bg-surface p-12 text-center shadow-card ring-1 ring-line">
            <span
              aria-hidden="true"
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-text"
            >
              <FiFileText className="text-2xl" />
            </span>
            <h2 className="font-display mt-4 text-xl font-bold text-ink">
              {t("adminPanel.payments.noItems")}
            </h2>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-5">
            {payments.map((payment) => (
              <li key={payment.id} className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
                  {/* รูปสลิป */}
                  <div>
                    <a
                      href={getUploadUrl(payment.slipImage)}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                      title="คลิกเพื่อเปิดรูปสลิปเต็มขนาด"
                    >
                      <img
                        src={getUploadUrl(payment.slipImage)}
                        alt={`สลิปของ ${payment.booking.user.email}`}
                        className="max-h-56 w-full rounded-xl object-contain ring-1 ring-line"
                      />
                    </a>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${paymentBadgeStyles[payment.status]}`}
                    >
                      {t("status.payment." + payment.status)}
                    </span>
                  </div>

                  {/* ข้อมูลการจอง */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-bold text-ink">
                        {concertDisplayName(payment.booking.concert)}
                      </p>
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-soft-text ring-1 ring-line">
                        {payment.booking.zone.name}
                      </span>
                    </div>

                    <dl className="mt-2 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted">{t("adminPanel.payments.buyer")}</dt>
                        <dd className="font-semibold text-ink">{payment.booking.user.email}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{t("adminPanel.payments.showDate")}</dt>
                        <dd className="text-ink">{formatDateTime(payment.booking.showDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{t("adminPanel.payments.seats")}</dt>
                        <dd className="font-mono text-ink">
                          {payment.booking.seats.map((seat) => seat.code).join(", ")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{t("adminPanel.payments.qtyAmount")}</dt>
                        <dd className="font-semibold text-ink">
                          {t("myBookings.tickets", { count: payment.booking.quantity })} ·{" "}
                          <span className="text-primary">{formatCurrency(payment.booking.totalPrice)}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{t("adminPanel.payments.submittedAt")}</dt>
                        <dd className="text-ink">{formatDateTime(payment.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{t("adminPanel.payments.bookingId")}</dt>
                        <dd className="font-mono text-xs text-muted">{payment.booking.id}</dd>
                      </div>
                    </dl>

                    {/* ผลการตรวจสอบ + ชื่อแอดมินที่ตรวจ */}
                    {payment.status !== "PENDING_VERIFICATION" && (
                      <div
                        className={`mt-3 flex flex-wrap items-center gap-2 rounded-input px-3 py-2 text-xs ring-1 ${
                          payment.status === "APPROVED"
                            ? "bg-success-bg text-success-text ring-success-border"
                            : "bg-danger-bg text-danger-text ring-danger-border"
                        }`}
                      >
                        {payment.status === "APPROVED" ? (
                          <FiCheck aria-hidden="true" className="text-sm" />
                        ) : (
                          <FiX aria-hidden="true" className="text-sm" />
                        )}
                        <span>
                          {payment.status === "APPROVED"
                            ? t("adminPanel.payments.approvedMsg")
                            : t("adminPanel.payments.rejectedMsg")}
                          {payment.reviewedAt &&
                            ` ${t("adminPanel.payments.when", { date: formatDateTime(payment.reviewedAt) })}`}
                          {payment.reviewedBy && (
                            <>
                              {" "}
                              {t("adminPanel.payments.byAdmin")}{" "}
                              <b className="font-bold">{payment.reviewedBy.email}</b>
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {payment.note && (
                      <p className="mt-2 rounded-input bg-surface-2 px-3 py-2 text-xs text-muted">
                        {t("adminPanel.payments.noteLabel")}: {payment.note}
                      </p>
                    )}

                    {/* ปุ่มอนุมัติ / ปฏิเสธ (เฉพาะสลิปที่รอตรวจสอบ) */}
                    {payment.status === "PENDING_VERIFICATION" && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                        {rejectTarget === payment.id && (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={rejectNote}
                              onChange={(event) => setRejectNote(event.target.value)}
                              placeholder={t("adminPanel.payments.rejectPlaceholder")}
                              className="w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApprove(payment.id)}
                            disabled={actionId !== null}
                            className="inline-flex items-center gap-1.5 rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiCheck aria-hidden="true" className="text-base" />
                            {t("adminPanel.payments.approve")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              rejectTarget === payment.id
                                ? void handleReject(payment.id)
                                : setRejectTarget(payment.id)
                            }
                            disabled={actionId !== null}
                            className="inline-flex items-center gap-1.5 rounded-btn border border-danger-border bg-danger-bg px-5 py-2 text-sm font-semibold text-danger-text transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiX aria-hidden="true" className="text-base" />
                            {rejectTarget === payment.id
                              ? t("adminPanel.payments.confirmReject")
                              : t("adminPanel.payments.reject")}
                          </button>
                          {rejectTarget === payment.id && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                              <FiClock aria-hidden="true" className="text-sm" />
                              {t("adminPanel.payments.rejectHint")}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
