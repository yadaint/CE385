import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiEdit3,
  FiFileText,
  FiMapPin,
  FiTrash2,
} from "react-icons/fi";

import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { concertDisplayName } from "../i18n";
import { getApiErrorMessage } from "../services/api";
import { adminService } from "../services/adminService";
import type { AdminConcert } from "../types";
import { formatDateRange } from "../utils/format";

/** หน้าแบบร่าง — คอนเสิร์ตที่ยังไม่เปิดจอง แก้ไขหรือลบถาวรได้ */
export default function AdminDraftsPage() {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<AdminConcert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrafts = async (): Promise<void> => {
      try {
        const all = await adminService.getConcerts();
        setDrafts(all.filter((concert) => concert.saleStatus === "DRAFT"));
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDrafts();
  }, []);

  const handleDelete = async (concert: AdminConcert): Promise<void> => {
    const confirmed = window.confirm(
      `${t("adminDrafts.deleteConfirm")}\n\n"${concertDisplayName(concert)}"`,
    );
    if (!confirmed) return;

    setDeletingId(concert.id);
    setError(null);
    setNotice(null);
    try {
      await adminService.deleteConcert(concert.id);
      setDrafts((prev) => prev.filter((item) => item.id !== concert.id));
      setNotice(t("adminDrafts.deleted"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-page pb-16">
      <div className="container-page py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          <FiArrowLeft aria-hidden="true" className="text-sm" />
          {t("adminPanel.backToAdmin")}
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-muted">{t("adminPanel.label")}</p>
            <h1 className="font-display mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
              {t("adminDrafts.title")}
            </h1>
            <p className="mt-1 text-sm text-muted">{t("adminDrafts.subtitle")}</p>
          </div>
          <Link
            to="/admin/create-concert"
            className="inline-flex items-center gap-2 rounded-btn bg-primary px-4 py-2.5 text-sm font-bold text-primary-contrast shadow-sm transition hover:bg-primary-hover"
          >
            {t("adminDrafts.createNew")}
          </Link>
        </div>

        {error && (
          <Alert variant="error" className="mt-6">
            {error}
          </Alert>
        )}
        {notice && (
          <Alert variant="success" className="mt-6">
            {notice}
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="mt-8 rounded-card bg-surface p-12 text-center shadow-card ring-1 ring-line">
            <span
              aria-hidden="true"
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-text"
            >
              <FiFileText className="text-2xl" />
            </span>
            <p className="mt-4 text-sm text-muted">{t("adminDrafts.empty")}</p>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {drafts.map((concert) => (
              <li key={concert.id} className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-ink">
                        {concertDisplayName(concert)}
                      </h2>
                      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted ring-1 ring-line">
                        {t("adminDrafts.draftBadge")}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <FiCalendar aria-hidden="true" className="text-xs" />
                        {concert.dates.length > 0
                          ? formatDateRange(concert.dates)
                          : t("adminPanel.noDate")}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FiMapPin aria-hidden="true" className="text-xs" />
                        {concert.venue.name}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/concerts/${concert.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-surface px-4 py-2 text-sm font-bold text-ink transition hover:border-primary hover:text-primary-soft-text"
                    >
                      <FiEdit3 aria-hidden="true" className="text-sm" />
                      {t("adminDrafts.edit")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(concert)}
                      disabled={deletingId === concert.id}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-danger-border bg-danger-bg px-4 py-2 text-sm font-bold text-danger-text transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiTrash2 aria-hidden="true" className="text-sm" />
                      {deletingId === concert.id ? t("adminDrafts.deleting") : t("adminDrafts.delete")}
                    </button>
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
