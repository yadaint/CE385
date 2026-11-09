import { useEffect } from "react";
import { FiAlertTriangle } from "react-icons/fi";

interface ConfirmDialogProps {
  /** หัวข้อของกล่องยืนยัน */
  title: string;
  /** หมายเหตุ/คำเตือนที่แสดงให้ผู้ใช้อ่านก่อนกดยืนยัน */
  message: string;
  /** ข้อความปุ่มยืนยัน (เช่น "ยืนยันลบบัญชีถาวร") */
  confirmLabel: string;
  /** ข้อความปุ่มยกเลิก */
  cancelLabel: string;
  /** กำลังประมวลผลอยู่ — ปิดทุกปุ่มและเปลี่ยนข้อความปุ่มยืนยัน */
  isConfirming?: boolean;
  /** ข้อความปุ่มยืนยันขณะกำลังประมวลผล (ไม่ส่ง = ใช้ confirmLabel ค้างไว้) */
  confirmingLabel?: string;
  /** เรียกเมื่อผู้ใช้กดยืนยัน */
  onConfirm: () => void;
  /** เรียกเมื่อผู้ใช้กดยกเลิก / กด Esc / คลิกฉากหลัง */
  onCancel: () => void;
}

/** กล่องยืนยันแบบ modal — ใช้แทน window.confirm เพื่อแสดงหมายเหตุเตือนให้ชัดเจนก่อนทำการลบถาวร */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  isConfirming = false,
  confirmingLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // กด Esc เพื่อยกเลิก (ยกเว้นตอนกำลังประมวลผล กันปิดกล่องแล้วงานค้าง)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isConfirming) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfirming, onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={isConfirming ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md rounded-card bg-surface p-6 shadow-card ring-1 ring-line"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-bg ring-1 ring-danger-border">
            <FiAlertTriangle aria-hidden="true" className="text-xl text-danger-text" />
          </span>
          <div className="flex-1">
            <h2 id="confirm-dialog-title" className="font-display text-lg font-bold text-ink">
              {title}
            </h2>
            {/* หมายเหตุเตือน — ไฮไลต์ด้วยกล่องสีแดงให้ผู้ใช้เห็นชัดก่อนกดยืนยัน */}
            <p className="mt-2 rounded-input bg-danger-bg px-3 py-2.5 text-sm leading-relaxed text-danger-text ring-1 ring-danger-border">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-btn border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="rounded-btn bg-danger-text px-5 py-2.5 text-sm font-bold text-surface shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming ? (confirmingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
