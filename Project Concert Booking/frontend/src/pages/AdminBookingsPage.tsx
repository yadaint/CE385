import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiClipboard } from "react-icons/fi";

import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { getApiErrorMessage, getUploadUrl } from "../services/api";
import { adminService } from "../services/adminService";
import { concertDisplayName } from "../i18n";
import type { AdminBooking, BookingStatus } from "../types";
import { formatCurrency, formatDateTime } from "../utils/format";
import { bookingStatusBadgeStyles } from "../utils/labels";

type StatusFilter = BookingStatus | "ALL";

export default function AdminBookingsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilters: Array<{ value: StatusFilter; key: string }> = [
    { value: "ALL", key: "adminBookings.filterAll" },
    { value: "PENDING", key: "status.booking.PENDING" },
    { value: "PENDING_VERIFICATION", key: "status.booking.PENDING_VERIFICATION" },
    { value: "COMPLETED", key: "status.booking.COMPLETED" },
    { value: "REJECTED", key: "status.booking.REJECTED" },
    { value: "CANCELLED", key: "status.booking.CANCELLED" },
  ];

  useEffect(() => {
    const fetchBookings = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await adminService.getBookings(filter === "ALL" ? undefined : filter);
        setBookings(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBookings();
  }, [filter]);

  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="container-page py-10">
        <p className="text-xs font-bold tracking-widest text-muted">{t("adminPanel.label")}</p>
        <h1 className="font-display mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
          {t("adminBookings.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("adminBookings.subtitle")}</p>

        {/* ตัวกรองสถานะ */}
        <div className="mt-6 flex flex-wrap gap-2">
          {statusFilters.map((option) => {
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

        {error && (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-6 rounded-card bg-surface p-12 text-center shadow-card ring-1 ring-line">
            <span
              aria-hidden="true"
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-text"
            >
              <FiClipboard className="text-2xl" />
            </span>
            <h2 className="font-display mt-4 text-xl font-bold text-ink">
              {t("adminBookings.empty")}
            </h2>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-card bg-surface shadow-card ring-1 ring-line">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">{t("adminBookings.thBuyer")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminBookings.thConcert")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminBookings.thZone")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminBookings.thSeats")}</th>
                  <th className="px-4 py-3 font-bold">{t("myBookings.total")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminBookings.thStatus")}</th>
                  <th className="px-4 py-3 font-bold">{t("adminBookings.thSlip")}</th>
                  <th className="px-4 py-3 font-bold">{t("myBookings.bookedAt")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3 font-semibold text-ink">{booking.user.email}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">
                        {concertDisplayName(booking.concert)}
                      </p>
                      <p className="text-xs text-muted">{booking.concert.venue.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-primary">{booking.zone.name}</p>
                      <p className="font-mono text-xs text-muted">
                        {booking.seats.map((seat) => seat.code).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {t("myBookings.tickets", { count: booking.quantity })}
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatCurrency(booking.totalPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${bookingStatusBadgeStyles[booking.status]}`}
                      >
                        {t("status.booking." + booking.status)}
                      </span>
                      {booking.payment?.note && (
                        <p className="mt-1 max-w-[160px] text-[10px] leading-snug text-muted">
                          {booking.payment.note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {booking.payment ? (
                        <a
                          href={getUploadUrl(booking.payment.slipImage)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-primary underline hover:text-primary-hover"
                        >
                          {t("adminBookings.viewSlip")}
                        </a>
                      ) : (
                        <span className="text-xs text-muted">
                          {t("adminPanel.tickets.notSubmitted")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDateTime(booking.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
