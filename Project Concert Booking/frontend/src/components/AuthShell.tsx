import type { ReactNode } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { LuTicket } from "react-icons/lu";

interface AuthShellProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** md = การ์ดปกติ (ล็อกอิน) · lg = การ์ดกว้าง (สมัครสมาชิก ฟิลด์เยอะ) */
  size?: "md" | "lg";
}

/** จุดเด่นที่โชว์บนแผงด้านซ้ายของหน้าล็อกอิน/สมัครสมาชิก (จอใหญ่) */
const BENEFITS = [
  "เลือกโซนและที่นั่งเองได้จากผังจริง",
  "แนบสลิปและติดตามสถานะบัตรได้ทุกขั้นตอน",
  "ดูบัตรเข้างานทั้งหมดไว้ที่หน้าเดียว",
];

/** โครงหน้าย่อยด้านบัญชี — แผงแบรนด์ด้านซ้าย + การ์ดฟอร์มด้านขวา (จอเล็กเหลือการ์ดอย่างเดียว) */
export default function AuthShell({ icon, title, subtitle, children, size = "md" }: AuthShellProps) {
  const cardWidth = size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 bg-page lg:grid-cols-2">
      {/* แผงแบรนด์ — แสดงเฉพาะจอใหญ่ */}
      <aside className="relative overflow-hidden bg-hero p-10 text-hero-text" aria-hidden="true">
        {/* วงกลมเบลอตกแต่ง */}
        <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-black/20 blur-3xl" />

        <div className="relative flex h-full max-w-md flex-col justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-btn bg-primary text-primary-contrast shadow-lg">
            <LuTicket className="text-2xl" />
          </span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-hero-muted">
            Booking Ticket Concert
          </p>
          <h2 className="font-display mt-3 text-3xl font-extrabold leading-snug">
            บัตรคอนเสิร์ตที่คุณชอบ
            <br />
            จองได้ง่ายในไม่กี่คลิก
          </h2>
          <ul className="mt-8 flex flex-col gap-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 text-sm text-hero-muted">
                <FiCheckCircle aria-hidden="true" className="shrink-0 text-base" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* การ์ดฟอร์ม */}
      <div className="flex items-center justify-center px-4 py-10">
        <div className={`w-full ${cardWidth} animate-fade-up`}>
          <div className="rounded-card bg-surface p-8 shadow-card ring-1 ring-line">
            <div className="mb-8 text-center">
              <span
                aria-hidden="true"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-text"
              >
                {icon}
              </span>
              <h1 className="font-display mt-3 text-2xl font-extrabold text-ink">{title}</h1>
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
