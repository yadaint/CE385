import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Alert from "../components/Alert";
import CoverImageUpload from "../components/CoverImageUpload";
import FormInput from "../components/FormInput";
import FormTextarea from "../components/FormTextarea";
import Spinner from "../components/Spinner";
import { getApiErrorMessage } from "../services/api";
import { adminService } from "../services/adminService";
import type { AdminConcert, ArtistType, ConcertSaleStatus, Origin } from "../types";

const originOptions: Array<{ value: Origin; label: string }> = [
  { value: "THAI", label: "คอนไทย" },
  { value: "INTERNATIONAL", label: "คอนต่างประเทศ" },
];

const artistTypeOptions: Array<{ value: ArtistType; label: string }> = [
  { value: "SOLO", label: "คอนเดี่ยว" },
  { value: "GROUP", label: "คอนกลุ่ม" },
];

/** แปลง ISO date เป็นค่าที่ input datetime-local รับ (yyyy-MM-ddTHH:mm ตามเวลาท้องถิ่น) */
const toLocalInputValue = (isoDate: string): string => {
  const date = new Date(isoDate);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function AdminEditConcertPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [concert, setConcert] = useState<AdminConcert | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [emoji, setEmoji] = useState("");
  const [origin, setOrigin] = useState<Origin>("THAI");
  const [artistType, setArtistType] = useState<ArtistType>("GROUP");
  const [zonePrices, setZonePrices] = useState<Record<string, string>>({});
  const [zoneOnSale, setZoneOnSale] = useState<Record<string, boolean>>({});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingSale, setIsTogglingSale] = useState(false);

  useEffect(() => {
    const fetchConcert = async (): Promise<void> => {
      if (!id) return;
      try {
        const concerts = await adminService.getConcerts();
        const found = concerts.find((item) => item.id === id) ?? null;
        if (!found) {
          setServerError("ไม่พบคอนเสิร์ตนี้ในระบบ");
          return;
        }
        setConcert(found);
        setName(found.name);
        setNameEn(found.nameEn ?? "");
        setDescription(found.description);
        setDates(found.dates.map((date) => toLocalInputValue(date)));
        setImageUrl(found.imageUrl ?? "");
        setEmoji(found.emoji ?? "");
        setOrigin(found.origin);
        setArtistType(found.artistType);
        setZonePrices(
          Object.fromEntries(found.zones.map((zone) => [zone.id, String(zone.price)])),
        );
        setZoneOnSale(Object.fromEntries(found.zones.map((zone) => [zone.id, zone.isOnSale])));
      } catch (err) {
        setServerError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchConcert();
  }, [id]);

  const clearError = (key: string): void => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleDateChange = (index: number, value: string): void => {
    setDates((prev) => prev.map((date, i) => (i === index ? value : date)));
    clearError(`dates.${index}`);
    clearError("dates");
  };

  const addDate = (): void => {
    setDates((prev) => [...prev, ""]);
  };

  const removeDate = (index: number): void => {
    setDates((prev) => prev.filter((_, i) => i !== index));
    clearError("dates");
  };

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const { name: fieldName, value } = event.target;
    if (fieldName === "origin") setOrigin(value as Origin);
    if (fieldName === "artistType") setArtistType(value as ArtistType);
    clearError(fieldName);
  };

  /** ตรวจความถูกต้องเบื้องต้นฝั่ง client ก่อนส่ง */
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "กรุณากรอกชื่อคอนเสิร์ต";
    if (!description.trim()) errors.description = "กรุณากรอกรายละเอียด";

    const validDates = dates.filter((date) => date !== "");
    if (validDates.length === 0) {
      errors.dates = "ต้องมีวันที่แสดงอย่างน้อย 1 วัน";
    } else if (validDates.some((date) => Number.isNaN(Date.parse(date)))) {
      errors.dates = "วันที่ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
    } else if (dates.length !== validDates.length) {
      errors.dates = "มีช่องวันที่ว่างอยู่ — กรอกให้ครบหรือลบช่องที่ไม่ใช้ออก";
    }

    // ยอมรับทั้ง URL เต็ม (https://...) และพาธจากการอัปโหลด (/uploads/covers/...)
    if (
      imageUrl.trim() &&
      !/^https?:\/\/.+/.test(imageUrl.trim()) &&
      !imageUrl.trim().startsWith("/uploads/")
    ) {
      errors.imageUrl = "URL รูปภาพไม่ถูกต้อง";
    }
    if (Array.from(emoji).length > 16) errors.emoji = "อิโมจิต้องไม่เกิน 16 ตัวอักษร";

    for (const zone of concert?.zones ?? []) {
      const price = zonePrices[zone.id] ?? "";
      if (price !== "" && (Number.isNaN(Number(price)) || Number(price) < 0)) {
        errors[`zones.${zone.id}.price`] = "ราคาต้องเป็นตัวเลขไม่ติดลบ";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!id || !concert) return;
    setServerError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const validDates = dates.filter((date) => date !== "");
      await adminService.updateConcert(id, {
        name: name.trim(),
        nameEn: nameEn.trim() || null,
        description: description.trim(),
        dates: validDates.map((date) => new Date(date).toISOString()),
        imageUrl: imageUrl.trim() || null,
        emoji: emoji.trim() || null,
        origin,
        artistType,
      });

      const zoneSettings = concert.zones
        .filter((zone) => {
          const priceChanged = Number(zonePrices[zone.id]) !== zone.price;
          const saleChanged = zoneOnSale[zone.id] !== zone.isOnSale;
          return priceChanged || saleChanged;
        })
        .map((zone) => ({
          zoneId: zone.id,
          ...(Number(zonePrices[zone.id]) !== zone.price
            ? { price: Number(zonePrices[zone.id]) }
            : {}),
          ...(zoneOnSale[zone.id] !== zone.isOnSale ? { isOnSale: zoneOnSale[zone.id] } : {}),
        }));
      if (zoneSettings.length > 0) {
        await adminService.updateConcertZones(id, zoneSettings);
      }

      setSuccessMessage("บันทึกการแก้ไขคอนเสิร์ตสำเร็จ");
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSale = async (): Promise<void> => {
    if (!id || !concert) return;
    const nextStatus: ConcertSaleStatus = concert.saleStatus === "OPEN" ? "CLOSED" : "OPEN";
    setIsTogglingSale(true);
    setServerError(null);
    try {
      await adminService.updateSaleStatus(id, nextStatus === "OPEN" ? "OPEN" : "CLOSED");
      setSuccessMessage(
        nextStatus === "OPEN"
          ? "เปิดขายบัตรสำเร็จ — คอนเสิร์ตปรากฏบนหน้าจองแล้ว"
          : "ปิดขายบัตรสำเร็จ — คอนเสิร์ตถูกซ่อนจากหน้าจอง",
      );
      setConcert({ ...concert, saleStatus: nextStatus });
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    } finally {
      setIsTogglingSale(false);
    }
  };

  const totalSeats = useMemo(
    () => (concert?.zones ?? []).reduce((sum, zone) => sum + zone.totalSeats, 0),
    [concert],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/admin" className="text-sm font-medium text-violet-600 hover:text-violet-700">
          ← กลับหน้าจัดการคอนเสิร์ต
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">แก้ไขคอนเสิร์ต</h1>
            <p className="mt-1 text-sm text-slate-500">
              ปรับชื่อ รายละเอียด วันแสดง ราคาบัตร และสถานะการเปิดขาย — เปลี่ยนสถานที่ไม่ได้
              เพราะผังโซนและที่นั่งถูกสร้างตามสถานที่เดิม
            </p>
          </div>
          {concert && (
            <button
              type="button"
              onClick={() => void toggleSale()}
              disabled={isTogglingSale || (concert.saleStatus !== "OPEN" && concert.availableSeats === 0)}
              title={
                concert.saleStatus !== "OPEN" && concert.availableSeats === 0
                  ? "เปิดขายไม่ได้ — ไม่มีที่นั่งคงเหลือ"
                  : undefined
              }
              className={`rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow transition disabled:cursor-not-allowed disabled:opacity-50 ${
                concert.saleStatus === "OPEN"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isTogglingSale
                ? "กำลังบันทึก..."
                : concert.saleStatus === "OPEN"
                  ? "⏸ ปิดขาย"
                  : "เปิดขาย"}
            </button>
          )}
        </div>

        {serverError && (
          <Alert variant="error" className="mt-6">
            {serverError}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" className="mt-6">
            {successMessage}
          </Alert>
        )}

        {!concert ? null : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
            {/* สถานะปัจจุบัน */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <span className="font-semibold text-slate-700">สถานะปัจจุบัน: </span>
              <span className="font-bold text-violet-700">
                {concert.saleStatus === "OPEN"
                  ? "เปิดขาย — ผู้ใช้เห็นและจองได้"
                  : concert.saleStatus === "DRAFT"
                    ? "ฉบับร่าง — ยังไม่แสดงบนหน้าจอง"
                    : concert.saleStatus === "CLOSED"
                      ? "ปิดขายชั่วคราว — ซ่อนจากหน้าจอง"
                      : "บัตรหมดแล้ว (ระบบตั้งอัตโนมัติ)"}
              </span>
              <span className="ml-3 text-slate-500">
                ที่นั่งคงเหลือ {concert.availableSeats.toLocaleString()}/{totalSeats.toLocaleString()}
              </span>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-8">
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormInput
                    label="ชื่อคอนเสิร์ต (ไทย)"
                    name="name"
                    autoComplete="off"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearError("name");
                    }}
                    error={fieldErrors.name}
                    disabled={isSubmitting}
                  />
            <FormInput
              label="ชื่อคอนเสิร์ต (อังกฤษ) — ไม่บังคับ ถ้าว่างใช้ชื่อไทยทั้งสองภาษา"
              name="nameEn"
              autoComplete="off"
              placeholder="e.g. Rock Legend Concert 2026"
                    value={nameEn}
                    onChange={(e) => {
                      setNameEn(e.target.value);
                      clearError("nameEn");
                    }}
                    error={fieldErrors.nameEn}
                    disabled={isSubmitting}
                  />
                </div>

                <FormTextarea
                  label="รายละเอียด"
                  name="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearError("description");
                  }}
                  error={fieldErrors.description}
                  disabled={isSubmitting}
                />

                {/* สถานที่ (แก้ไม่ได้) */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="venue" className="text-sm font-medium text-slate-700">
                    สถานที่จัดงาน (แก้ไขไม่ได้)
                  </label>
                  <input
                    id="venue"
                    value={concert.venue.name}
                    readOnly
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>

                {/* วันที่แสดง */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">วันที่แสดง</h3>
                      <p className="text-xs text-slate-500">
                        แก้ไขรอบการแสดงได้ — การจองที่ผูกกับวันเดิมจะคงอยู่ตามเดิม
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addDate}
                      disabled={isSubmitting || dates.length >= 10}
                      className="shrink-0 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + เพิ่มวันที่แสดง
                    </button>
                  </div>

                  {dates.map((date, index) => (
                    <div key={`date-${index}`} className="flex items-start gap-2">
                      <div className="flex-1">
                        <FormInput
                          label={`วันที่แสดงครั้งที่ ${index + 1}`}
                          name={`dates.${index}`}
                          type="datetime-local"
                          autoComplete="off"
                          value={date}
                          onChange={(e) => handleDateChange(index, e.target.value)}
                          error={fieldErrors[`dates.${index}`]}
                          disabled={isSubmitting}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDate(index)}
                        disabled={isSubmitting || dates.length <= 1}
                        className="mt-7 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}

                  {fieldErrors.dates && (
                    <p className="text-xs font-medium text-red-600">{fieldErrors.dates}</p>
                  )}
                </div>

                {/* รูปปก (อัปโหลดไฟล์) + อิโมจิ */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <CoverImageUpload
                    value={imageUrl}
                    onChange={(url) => {
                      setImageUrl(url);
                      clearError("imageUrl");
                    }}
                    error={fieldErrors.imageUrl}
                    disabled={isSubmitting}
                  />
                  <FormInput
                    label="อิโมจิประจำคอนเสิร์ต (ไม่บังคับ)"
                    name="emoji"
                    autoComplete="off"
                    placeholder="เช่น ไอคอนดนตรี กีตาร์ หูฟัง (จากคลังอิโมจิ)"
                    value={emoji}
                    onChange={(e) => {
                      setEmoji(e.target.value);
                      clearError("emoji");
                    }}
                    error={fieldErrors.emoji}
                    disabled={isSubmitting}
                  />
                </div>

                {/* ประเภทคอนเสิร์ต */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="origin" className="text-sm font-medium text-slate-700">
                      ต้นสังกัดคอนเสิร์ต
                    </label>
                    <select
                      id="origin"
                      name="origin"
                      value={origin}
                      onChange={handleSelectChange}
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {originOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="artistType" className="text-sm font-medium text-slate-700">
                      รูปแบบศิลปิน
                    </label>
                    <select
                      id="artistType"
                      name="artistType"
                      value={artistType}
                      onChange={handleSelectChange}
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {artistTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* โซนบัตร — แก้ราคา/เปิด-ปิดขายได้ */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">โซนบัตร</h3>
                    <p className="text-xs text-slate-500">
                      ปรับราคาและเปิด/ปิดขายรายโซนได้ — จำนวนโซนและที่นั่งตายตัวตามผังสถานที่
                    </p>
                  </div>

                  {concert.zones.map((zone) => (
                    <div
                      key={`zone-edit-${zone.id}`}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {zone.name}{" "}
                          <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[10px] text-slate-600">
                            {zone.code}
                          </span>
                        </span>
                        <span className="text-xs text-slate-400">
                          รวม {zone.totalSeats.toLocaleString()} ที่นั่ง · เหลือ{" "}
                          <span
                            className={
                              zone.availableSeats === 0 && zone.isOnSale
                                ? "font-bold text-red-600"
                                : "font-bold text-slate-600"
                            }
                          >
                            {zone.availableSeats.toLocaleString()}
                          </span>
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
                        <FormInput
                          label="ราคาบัตร (บาท)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={zonePrices[zone.id] ?? ""}
                          onChange={(e) => {
                            setZonePrices((prev) => ({ ...prev, [zone.id]: e.target.value }));
                            clearError(`zones.${zone.id}.price`);
                          }}
                          error={fieldErrors[`zones.${zone.id}.price`]}
                          disabled={isSubmitting}
                        />
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium text-slate-700">สถานะการขาย</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setZoneOnSale((prev) => ({ ...prev, [zone.id]: true }))
                              }
                              disabled={isSubmitting}
                              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                                zoneOnSale[zone.id]
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"
                              }`}
                            >
                              เปิดขาย
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setZoneOnSale((prev) => ({ ...prev, [zone.id]: false }))
                              }
                              disabled={isSubmitting}
                              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                                !zoneOnSale[zone.id]
                                  ? "border-slate-400 bg-slate-200 text-slate-600"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
                              }`}
                            >
                              ปิดขาย
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-violet-600 py-3 text-sm font-bold text-white shadow transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigate("/admin")}
                    className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    กลับ
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
