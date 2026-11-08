import { useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { FiImage, FiUploadCloud } from "react-icons/fi";

import { adminService } from "../services/adminService";
import { getApiErrorMessage } from "../services/api";

interface CoverImageUploadProps {
  /** URL รูปปกปัจจุบัน (เช่น /uploads/covers/xxx.png หรือ https://...) */
  value: string;
  onChange: (url: string) => void;
  error?: string;
  disabled?: boolean;
  clearError?: () => void;
}

/** กล่องอัปโหลดรูปปกคอนเสิร์ต — พร้อมพรีวิวและคำแนะนำขนาดรูป (รองรับสองภาษา) */
export default function CoverImageUpload({
  value,
  onChange,
  error,
  disabled = false,
  clearError,
}: CoverImageUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t("adminForm.tooLarge"));
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const url = await adminService.uploadCover(file);
      onChange(url);
      clearError?.();
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const displayError = error ?? uploadError;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{t("adminForm.coverLabel")}</label>

      {value ? (
        <div className="relative overflow-hidden rounded-lg ring-1 ring-slate-200">
          <img src={value} alt="Concert cover" className="aspect-video w-full object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
            className="absolute right-2 top-2 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
          >
            {t("adminForm.change")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className={`flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 text-center transition ${
            displayError
              ? "border-red-300 bg-red-50 text-red-600"
              : "border-slate-300 bg-slate-50 text-slate-500 hover:border-violet-400 hover:text-violet-600"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <FiUploadCloud aria-hidden="true" className="text-2xl" />
          <span className="text-sm font-semibold">
            {isUploading ? t("common.loading") : t("adminForm.uploadTap")}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px]">
            <FiImage aria-hidden="true" className="text-xs" />
            {t("adminForm.sizeHint")}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void handleChange(event)}
        disabled={disabled || isUploading}
      />

      {displayError && <p className="text-xs font-medium text-red-600">{displayError}</p>}
    </div>
  );
}
