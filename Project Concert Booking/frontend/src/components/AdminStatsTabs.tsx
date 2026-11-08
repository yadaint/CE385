import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiEdit3, FiTrendingUp, FiClipboard, FiSliders } from "react-icons/fi";

interface AdminStatsTabsProps {
  concertId: string;
  active: "revenue" | "manage" | "slips";
}

/** แถบเมนูย่อยของสถิติรายคอนเสิร์ต: รายได้รวม / จัดการคอนเสิร์ต / รายการตรวจสอบสลิป */
export default function AdminStatsTabs({ concertId, active }: AdminStatsTabsProps) {
  const { t } = useTranslation();

  const TABS: Array<{
    key: "revenue" | "manage" | "slips";
    label: string;
    icon: typeof FiTrendingUp;
    path: string;
  }> = [
    {
      key: "revenue",
      label: t("adminStats.revenueTab"),
      icon: FiTrendingUp,
      path: `/admin/stats/${concertId}/revenue`,
    },
    {
      key: "manage",
      label: t("adminStats.manageTab"),
      icon: FiSliders,
      path: `/admin/stats/${concertId}/manage`,
    },
    {
      key: "slips",
      label: t("adminStats.slipsTab"),
      icon: FiClipboard,
      path: `/admin/stats/${concertId}/slips`,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
      {TABS.map((tab) => {
        const Icon = tab.icon;

        return (
          <NavLink
            key={tab.key}
            to={tab.path}
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-btn border px-4 py-2 text-sm font-semibold transition ${
                active === tab.key || isActive
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-line bg-surface text-muted hover:border-primary hover:text-primary-soft-text"
              }`
            }
          >
            <Icon aria-hidden="true" className="text-sm" />
            {tab.label}
          </NavLink>
        );
      })}

      <Link
        to={`/admin/concerts/${concertId}/edit`}
        className="ml-auto inline-flex items-center gap-1.5 rounded-btn border border-line bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary hover:text-primary-soft-text"
      >
        <FiEdit3 aria-hidden="true" className="text-sm" />
        {t("adminPanel.map.tabEdit")}
      </Link>
    </div>
  );
}
