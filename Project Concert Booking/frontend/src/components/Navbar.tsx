import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiLogOut } from "react-icons/fi";
import { LuTicket } from "react-icons/lu";

import { useAuth } from "../context/AuthContext";
import LanguageToggle from "./LanguageToggle";

const getNavLinkClass = ({ isActive }: { isActive: boolean }): string =>
  `shrink-0 whitespace-nowrap rounded-btn px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-primary text-primary-contrast"
      : "text-header-muted hover:bg-header-hover hover:text-header-text"
  }`;

export default function Navbar() {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-header-border bg-header shadow-sm backdrop-blur">
      <nav className="container-page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 md:flex-nowrap">
        {/* โลโก้ */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary text-primary-contrast"
          >
            <LuTicket className="text-lg" />
          </span>
          <span className="hidden leading-tight text-header-text lg:block">
            <span className="block whitespace-nowrap text-base font-bold tracking-tight">
              BOOKING TICKET <span className="text-header-accent">CONCERT</span>
            </span>
            <span className="block whitespace-nowrap text-[10px] font-medium tracking-widest text-header-muted">
              {t("common.brandSubtitle")}
            </span>
          </span>
        </Link>

        {/* เมนูหลัก — มือถืออยู่แถวล่างเต็มกว้าง, จอ md+ อยู่แถวเดียวกับโลโก้
            ถ้าเมนูล้นจะตัดขึ้นบรรทัดใหม่ให้เอง (flex-wrap) ทุกเมนูมองเห็นและกดได้หมด ไม่ต้องเลื่อน */}
        <div className="order-3 -mx-4 flex w-full flex-wrap items-center gap-1 px-4 pb-1 md:order-none md:mx-0 md:w-auto md:min-w-0 md:flex-1 md:justify-center md:pb-0">
          {/* เมนู "คอนเสิร์ต" — ซ่อนสำหรับแอดมิน (ดูข้อมูลผ่านเมนูสถิติแทน) */}
          {user?.role !== "ADMIN" && (
            <NavLink to="/" end className={getNavLinkClass}>
              {t("navbar.concerts")}
            </NavLink>
          )}
          {isAuthenticated && user?.role !== "ADMIN" && (
            <NavLink to="/my-bookings" className={getNavLinkClass}>
              {t("navbar.myTickets")}
            </NavLink>
          )}
          {/* แอดมินเห็นเมนูเว็บผู้ใช้น้อยที่สุด — มีลิงก์เดียวไปหลังบ้าน (เมนูงานแอดมินอยู่ใน AdminNavbar) */}
          {user?.role === "ADMIN" && (
            <NavLink to="/admin" className={getNavLinkClass}>
              {t("navbar.backOffice")}
            </NavLink>
          )}
        </div>

        {/* โซนบัญชีผู้ใช้ + ปุ่มภาษา */}
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />

          {isAuthenticated ? (
            <>
              <span
                className="hidden max-w-[180px] truncate rounded-btn bg-header-hover px-3 py-1.5 text-sm text-header-muted xl:block"
                title={user?.email}
              >
                {user?.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-btn border border-header-border px-4 py-2 text-sm font-semibold text-header-text transition hover:bg-header-hover focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <FiLogOut aria-hidden="true" className="text-sm" />
                <span className="hidden sm:inline">{t("navbar.logout")}</span>
                <span className="sm:hidden">{t("navbar.logoutShort")}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="whitespace-nowrap rounded-btn px-3 py-2 text-sm font-medium text-header-muted transition hover:bg-header-hover hover:text-header-text"
              >
                {t("navbar.login")}
              </Link>
              <Link
                to="/register"
                className="whitespace-nowrap rounded-btn bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast transition hover:bg-primary-hover"
              >
                {t("navbar.register")}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
