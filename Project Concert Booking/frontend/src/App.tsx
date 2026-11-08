import { useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { LuTicket } from "react-icons/lu";
import { AuthProvider } from "./context/AuthContext";
import AdminCreateConcertPage from "./pages/AdminCreateConcertPage";
import AdminSeatMapPage from "./pages/AdminSeatMapPage";
import AdminSlipsPage from "./pages/AdminSlipsPage";
import AdminStatsHomePage from "./pages/AdminStatsHomePage";
import AdminDraftsPage from "./pages/AdminDraftsPage";
import AdminSummaryPage from "./pages/AdminSummaryPage";
import AdminBookingsPage from "./pages/AdminBookingsPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";
import AdminEditConcertPage from "./pages/AdminEditConcertPage";
import ConcertDetailPage from "./pages/ConcertDetailPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import PaymentPage from "./pages/PaymentPage";
import RegisterPage from "./pages/RegisterPage";


/** Scrolls the window back to the top on every route change. */
function ScrollToTop(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const { t } = useTranslation();
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="flex min-h-screen flex-col bg-page">
          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/concerts/:id" element={<ConcertDetailPage />} />
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute>
                    <MyBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings/:id/payment"
                element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminStatsHomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drafts"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDraftsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/stats/:id/revenue"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminSummaryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/stats/:id/manage"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminSeatMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/stats/:id/slips"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminSlipsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/concerts/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminEditConcertPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/create-concert"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminCreateConcertPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payments"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminPaymentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bookings"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          <footer className="mt-auto border-t border-header-border bg-header text-header-muted">
            <div className="container-page grid grid-cols-1 gap-8 py-10 sm:grid-cols-3">
              {/* แบรนด์ */}
              <div>
                <p className="flex items-center gap-2 text-header-text">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-btn bg-primary text-primary-contrast"
                  >
                    <LuTicket className="text-base" />
                  </span>
                  <span className="text-sm font-bold tracking-tight">
                    BOOKING TICKET <span className="text-header-accent">CONCERT</span>
                  </span>
                </p>
                <p className="mt-3 text-xs leading-relaxed">{t("footer.tagline")}</p>
              </div>

              {/* เมนูลัด */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-header-text">
                  {t("footer.quickLinks")}
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  <li>
                    <Link to="/" className="transition hover:text-header-text">
                      {t("footer.linkConcerts")}
                    </Link>
                  </li>
                  <li>
                    <Link to="/my-bookings" className="transition hover:text-header-text">
                      {t("footer.linkMyTickets")}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* เทคโนโลยีที่ใช้ */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-header-text">
                  {t("footer.builtWith")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["React", "TypeScript", "Tailwind CSS", "Express", "Prisma"].map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-header-border px-2.5 py-0.5 text-[11px] font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-header-border py-4">
              <p className="container-page text-center text-xs">
                © {new Date().getFullYear()} {t("footer.copyright")}
              </p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
