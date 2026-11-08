import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCalendar,
  FiFlag,
  FiGlobe,
  FiMapPin,
  FiMic,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiUsers,
  FiZap,
} from "react-icons/fi";

import Alert from "../components/Alert";
import ConcertCard from "../components/ConcertCard";
import Spinner from "../components/Spinner";
import { getApiErrorMessage } from "../services/api";
import { concertService } from "../services/concertService";
import type { ArtistType, Concert, Origin } from "../types";

type OriginFilter = Origin | "ALL";
type ArtistTypeFilter = ArtistType | "ALL";

export default function HomePage() {
  const { t } = useTranslation();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ตัวกรองประเภทคอนเสิร์ต (กรองที่ฝั่ง API ด้วย query params)
  const [originFilter, setOriginFilter] = useState<OriginFilter>("ALL");
  const [artistTypeFilter, setArtistTypeFilter] = useState<ArtistTypeFilter>("ALL");

  const hasActiveFilter = originFilter !== "ALL" || artistTypeFilter !== "ALL";

  useEffect(() => {
    const fetchConcerts = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await concertService.getConcerts({
          origin: originFilter === "ALL" ? undefined : originFilter,
          artistType: artistTypeFilter === "ALL" ? undefined : artistTypeFilter,
        });
        setConcerts(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchConcerts();
  }, [originFilter, artistTypeFilter]);

  const pillClass = (active: boolean): string =>
    `inline-flex items-center gap-1.5 rounded-btn border px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "border-primary bg-primary text-primary-contrast"
        : "border-line bg-surface text-muted hover:border-primary hover:text-primary-soft-text"
    }`;

  return (
    <div className="min-h-screen bg-page">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="hero-pattern relative overflow-hidden bg-hero pb-24 pt-14 text-hero-text sm:pt-20">
        {/* วงกลมเบลอตกแต่ง */}
        <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-black/25 blur-3xl" />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.25em] text-hero-muted">
              {t("home.heroBadge")}
            </p>
            <h1 className="font-display animate-fade-up-delay-1 mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
              {t("home.heroTitleLead")}
              <span className="text-hero-muted"> {t("home.heroTitleAccent")}</span>
              {" "}{t("home.heroTitleTail")}
            </h1>
            <p className="animate-fade-up-delay-2 mx-auto mt-4 max-w-xl text-sm leading-relaxed text-hero-muted sm:text-base">
              {t("home.heroSubtitle")}
            </p>
            <div className="animate-fade-up-delay-3 mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#concert-list"
                className="inline-flex items-center gap-2 rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast shadow-lg transition hover:-translate-y-0.5 hover:bg-primary-hover"
              >
                {t("home.heroBrowse")}
                <FiArrowRight aria-hidden="true" className="text-base" />
              </a>
              <Link
                to="/my-bookings"
                className="inline-flex items-center gap-2 rounded-btn border border-hero-muted px-5 py-2.5 text-sm font-semibold text-hero-text transition hover:-translate-y-0.5 hover:bg-header-hover"
              >
                <FiSearch aria-hidden="true" className="text-base" />
                {t("home.heroMyTickets")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── จุดเด่น 3 ข้อ (ยกขึ้นทับ hero เป็นชั้นบน ไม่ให้ถูกแถบบัง) ── */}
      <section className="container-page relative z-10 -mt-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: FiZap, title: t("home.highlight1Title"), detail: t("home.highlight1Detail") },
            { icon: FiShield, title: t("home.highlight2Title"), detail: t("home.highlight2Detail") },
            { icon: FiMapPin, title: t("home.highlight3Title"), detail: t("home.highlight3Detail") },
          ].map((item, index) => {
            const Icon = item.icon;
            const delayClass =
              index === 0
                ? "animate-fade-up-delay-1"
                : index === 1
                  ? "animate-fade-up-delay-2"
                  : "animate-fade-up-delay-3";

            return (
              <div
                key={item.title}
                className={`flex items-start gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line ${delayClass}`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-soft-text"
                >
                  <Icon className="text-lg" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── รายการคอนเสิร์ต ──────────────────────────────── */}
      <section id="concert-list" className="container-page scroll-mt-32 pb-16 pt-12">
        {/* แถบกรอง */}
        <div className="rounded-card bg-surface p-4 shadow-card ring-1 ring-line sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-full text-[11px] font-bold uppercase tracking-wider text-muted sm:w-24">
                {t("home.filterOrigin")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { value: "ALL", label: t("home.filterAll"), icon: FiCalendar },
                    { value: "THAI", label: t("home.filterThai"), icon: FiFlag },
                    { value: "INTERNATIONAL", label: t("home.filterInternational"), icon: FiGlobe },
                  ] as Array<{ value: OriginFilter; label: string; icon: typeof FiGlobe }>
                ).map((option) => {
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOriginFilter(option.value)}
                      className={pillClass(originFilter === option.value)}
                    >
                      <Icon aria-hidden="true" className="text-sm" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <span className="w-full text-[11px] font-bold uppercase tracking-wider text-muted sm:w-24">
                {t("home.filterArtist")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { value: "ALL", label: t("home.filterAll"), icon: FiCalendar },
                    { value: "SOLO", label: t("home.filterSolo"), icon: FiMic },
                    { value: "GROUP", label: t("home.filterGroup"), icon: FiUsers },
                  ] as Array<{ value: ArtistTypeFilter; label: string; icon: typeof FiMic }>
                ).map((option) => {
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setArtistTypeFilter(option.value)}
                      className={pillClass(artistTypeFilter === option.value)}
                    >
                      <Icon aria-hidden="true" className="text-sm" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setOriginFilter("ALL");
                    setArtistTypeFilter("ALL");
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted underline-offset-2 transition hover:text-primary hover:underline"
                >
                  <FiRotateCcw aria-hidden="true" className="text-sm" />
                  {t("home.filterClear")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ผลลัพธ์ */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center py-24">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <Alert variant="error">{error}</Alert>
          ) : concerts.length === 0 ? (
            <div className="rounded-card bg-surface p-12 text-center shadow-card">
              <span
                aria-hidden="true"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-text"
              >
                <FiCalendar className="text-2xl" />
              </span>
              <h2 className="font-display mt-4 text-xl font-bold text-ink">{t("home.emptyTitle")}</h2>
              <p className="mt-1 text-sm text-muted">{t("home.emptyDesc")}</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <h2 className="section-title">{t("home.resultsTitle")}</h2>
                <span className="text-sm text-muted">
                  {hasActiveFilter
                    ? t("home.resultsFoundFiltered", { count: concerts.length })
                    : t("home.resultsFound", { count: concerts.length })}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {concerts.map((concert) => (
                  <ConcertCard key={concert.id} concert={concert} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
