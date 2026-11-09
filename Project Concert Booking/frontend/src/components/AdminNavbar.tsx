import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiLogOut, FiShield } from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import LanguageToggle from "./LanguageToggle";

const getNavLinkClass = ({ isActive }: { isActive: boolean }): string =>
  `shrink-0 whitespace-nowrap rounded-btn px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-violet-600 text-white"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

/**
 * แถบเมนูเฉพาะหลังบ้าน — แสดงเฉพาะเส้นทาง /admin/* (ยกเว้นหน้าล็อกอิน)
 * มีเมนูงานของแอดมินเท่านั้น ไม่มีเมนูฝั่งผู้ใช้ (คอนเสิร์ต/ตั๋วของฉัน/สมัครสมาชิก)
 * เมนูล้นจะตัดขึ้นบรรทัดใหม่ให้เอง (flex-wrap) — ทุกเมนูมองเห็นและกดได้ ไม่ต้องเลื่อน
 */
export default function AdminNavbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900 shadow-md">
      <nav className="container-page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        {/* แบรนด์หลังบ้าน */}
        <Link to="/admin" className="flex shrink-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-btn bg-violet-600 text-white"
          >
            <FiShield className="text-lg" />
          </span>
          <span className="hidden leading-tight text-slate-100 lg:block">
            <span className="block whitespace-nowrap text-base font-bold tracking-tight">
              BACK OFFICE <span className="text-violet-400">ADMIN</span>
            </span>
            <span className="block whitespace-nowrap text-[10px] font-medium tracking-widest text-slate-400">
              {t("common.brandSubtitle")}
            </span>
          </span>
        </Link>

        {/* เมนูงานของแอดมินเท่านั้น — เรียงตามลำดับการใช้งานจริง */}
        <div className="order-3 -mx-4 flex w-full flex-wrap items-center gap-1 px-4 pb-1 md:order-none md:mx-0 md:w-auto md:min-w-0 md:flex-1 md:justify-center md:pb-0">
          <NavLink to="/admin/bookings" className={getNavLinkClass}>
            {t("navbar.allBookings")}
          </NavLink>
          <NavLink to="/admin/payments" className={getNavLinkClass}>
            {t("navbar.verifySlips")}
          </NavLink>
          <NavLink to="/admin" end className={getNavLinkClass}>
            {t("navbar.stats")}
          </NavLink>
          <NavLink to="/admin/drafts" className={getNavLinkClass}>
            {t("navbar.drafts")}
          </NavLink>
          <NavLink to="/admin/create-concert" className={getNavLinkClass}>
            {t("navbar.createConcert")}
          </NavLink>
          <NavLink to="/admin/staff" className={getNavLinkClass}>
            {t("navbar.addStaff")}
          </NavLink>
        </div>

        {/* โซนบัญชีผู้ใช้ + ปุ่มภาษา */}
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />

          {user?.email && (
            <span
              className="hidden max-w-[180px] truncate rounded-btn bg-slate-800 px-3 py-1.5 text-sm text-slate-300 xl:block"
              title={user.email}
            >
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-btn border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <FiLogOut aria-hidden="true" className="text-sm" />
            <span className="hidden sm:inline">{t("navbar.logout")}</span>
            <span className="sm:hidden">{t("navbar.logoutShort")}</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
