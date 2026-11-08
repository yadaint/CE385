import { useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { FiDownload, FiFileText, FiGrid } from "react-icons/fi";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ExportButtonsProps {
  /** ส่วนของรายงานที่จะจับเป็น PDF */
  targetRef: RefObject<HTMLDivElement | null>;
  /** ชื่อไฟล์ (ไม่ต้องมีนามสกุล) */
  filenameBase: string;
  /** สร้างเนื้อหา CSV (ข้อความหลายบรรทัด) */
  buildCsv: () => string;
}

/** ปุ่มส่งออกรายงาน: PDF (จับภาพจากหน้าจอ) และ CSV (พร้อม BOM รองรับภาษาไทยใน Excel) */
export default function ExportButtons({ targetRef, filenameBase, buildCsv }: ExportButtonsProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const triggerDownload = (href: string, filename: string): void => {
    const link = linkRef.current;
    if (!link) return;
    link.href = href;
    link.download = filename;
    link.click();
  };

  const handlePdf = async (): Promise<void> => {
    const node = targetRef.current;
    if (!node) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // แบ่งหน้าอัตโนมัติเมื่อรายงานยาวเกิน 1 หน้า
      let remainingHeight = imgHeight;
      let position = 0;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, position, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
      }

      pdf.save(`${filenameBase}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCsv = (): void => {
    // \uFEFF (BOM) ทำให้ Excel เปิดไฟล์ UTF-8 ภาษาไทยได้ถูกต้อง
    const blob = new Blob(["\uFEFF" + buildCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${filenameBase}.csv`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex items-center gap-2">
      <a ref={linkRef} className="sr-only" aria-hidden="true" tabIndex={-1}>
        download
      </a>
      <button
        type="button"
        onClick={() => void handlePdf()}
        disabled={isExporting}
        className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-surface px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition hover:border-primary hover:text-primary-soft-text disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FiFileText aria-hidden="true" className="text-sm" />
        {isExporting ? t("common.loading") : t("export.pdf")}
      </button>
      <button
        type="button"
        onClick={handleCsv}
        className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-surface px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition hover:border-primary hover:text-primary-soft-text"
      >
        <FiGrid aria-hidden="true" className="text-sm" />
        {t("export.csv")}
      </button>
      <span className="hidden items-center gap-1 text-[11px] text-muted sm:inline-flex">
        <FiDownload aria-hidden="true" className="text-xs" />
        {t("export.reportLabel")}
      </span>
    </div>
  );
}
