import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";

import Alert from "../components/Alert";
import CoverImageUpload from "../components/CoverImageUpload";
import FormInput from "../components/FormInput";
import FormTextarea from "../components/FormTextarea";
import Spinner from "../components/Spinner";
import { createConcertSchema } from "../schemas/concert.schema";
import { getApiErrorMessage } from "../services/api";
import { concertService } from "../services/concertService";
import { venuesService } from "../services/venuesService";
import type { ArtistType, Origin, Venue, VenueZoneLayout, ZoneSide } from "../types";
import { getFieldErrors } from "../utils/validation";

/** การตั้งค่าโซนหนึ่งรายการ (ผังมาจากสถานที่ FIX — ทีมงานตั้งราคา/เปิดขาย) */
interface ZoneSettingRow {
  /** รหัสโซน 2 ตัวอักษร ใช้สร้างรหัสตั๋ว เช่น GD (โกลด์) */
  code: string;
  /** ชื่อโซน */
  name: string;
  /** ตำแหน่งซ้าย/กลาง/ขวาบนผัง */
  side: ZoneSide;
  /** โซนกว้างครอบทั้งแถว */
  wide: boolean;
  /** เลขแถวบนผัง */
  mapRow: number;
  /** จำนวนแถวของโซนนี้ */
  rowCount: number;
  /** ที่นั่งต่อแถว */
  seatsPerRow: number;
  /** ราคาบัตรที่ทีมงานกำหนด */
  price: string;
  /** เปิดขายโซนนี้หรือไม่ */
  isOnSale: boolean;
}

interface ConcertFormState {
  name: string;
  description: string;
  /** รหัสสถานที่จัดงานที่เลือก */
  venueId: string;
  /** วันที่แสดงทั้งหมด (ค่า datetime-local) */
  dates: string[];
  /** URL รูปภาพปก (ไม่บังคับ) */
  imageUrl: string;
  /** ชื่อคอนเสิร์ตภาษาอังกฤษ (ไม่บังคับ — ว่าง = ใช้ชื่อไทยทั้งสองภาษา) */
  nameEn: string;
  /** อิโมจิประจำคอนเสิร์ต (ไม่บังคับ) */
  emoji: string;
  origin: Origin;
  artistType: ArtistType;
  zones: ZoneSettingRow[];
}

const INITIAL_FORM_STATE: ConcertFormState = {
  name: "",
  nameEn: "",
  description: "",
  venueId: "",
  dates: [""],
  imageUrl: "",
  emoji: "",
  origin: "THAI",
  artistType: "GROUP",
  zones: [],
};

const originOptions: Array<{ value: Origin; label: string }> = [
  { value: "THAI", label: "คอนไทย" },
  { value: "INTERNATIONAL", label: "คอนต่างประเทศ" },
];

const artistTypeOptions: Array<{ value: ArtistType; label: string }> = [
  { value: "SOLO", label: "คอนเดี่ยว" },
  { value: "GROUP", label: "คอนกลุ่ม" },
];

const sideLabels: Record<ZoneSide, string> = {
  LEFT: "ซ้าย",
  CENTER: "กลาง",
  RIGHT: "ขวา",
};

/** อ่านค่าข้อความจากช่องในฟอร์มจริงบนหน้าจอ (คืน null ถ้าไม่พบช่องนั้น) */
const readFormField = (entries: FormData, key: string): string | null => {
  const value = entries.get(key);
  return typeof value === "string" ? value : null;
};

export default function AdminCreateConcertPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [formData, setFormData] = useState<ConcertFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // โหลดรายการสถานที่ (พร้อมผังโซน FIX ประจำสถานที่)
  useEffect(() => {
    const fetchVenues = async (): Promise<void> => {
      try {
        const data = await venuesService.getVenues();
        setVenues(data);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "โหลดรายการสถานที่ไม่สำเร็จ");
      } finally {
        setVenuesLoading(false);
      }
    };

    void fetchVenues();
  }, []);

  const selectedVenue = useMemo<Venue | null>(
    () => venues.find((venue) => venue.id === formData.venueId) ?? null,
    [venues, formData.venueId],
  );

  const totalCapacity = formData.zones.reduce(
    (sum, zone) => sum + zone.rowCount * zone.seatsPerRow,
    0,
  );

  // จัดแถวโซนของสถานที่ที่เลือก สำหรับพรีวิวผัง (mapRow เดียวกัน = แถวเดียวกัน)
  const previewRows = useMemo(() => {
    if (!selectedVenue) return [];

    const rows = new Map<number, VenueZoneLayout[]>();
    for (const zone of selectedVenue.zones) {
      const row = rows.get(zone.mapRow);
      if (row) {
        row.push(zone);
      } else {
        rows.set(zone.mapRow, [zone]);
      }
    }
    return Array.from(rows.entries()).sort(([a], [b]) => a - b);
  }, [selectedVenue]);

  // สถานะเปิดขายของแต่ละโซน สำหรับพรีวิวผัง (เปิดขาย = สี / ปิดขาย = เทา)
  const onSaleByCode = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const zone of formData.zones) {
      map.set(zone.code, zone.isOnSale);
    }
    return map;
  }, [formData.zones]);

  const clearError = (key: string): void => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearError(name);

    // เลือกสถานที่ใหม่ → โหลดผังโซน FIX ของสถานที่นั้น (ทีมงานแค่ตั้งราคา/เปิดขาย)
    if (name === "venueId" && value) {
      const venue = venues.find((v) => v.id === value);
      setFormData((prev) => ({
        ...prev,
        venueId: value,
        zones: venue
          ? venue.zones.map((zone) => ({
              code: zone.code,
              name: zone.name,
              side: zone.side,
              wide: zone.wide,
              mapRow: zone.mapRow,
              rowCount: zone.rowCount,
              seatsPerRow: zone.seatsPerRow,
              price: "",
              isOnSale: true,
            }))
          : [],
      }));
      setFieldErrors({});
    }
  };

  const handleDateChange = (index: number, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      dates: prev.dates.map((date, i) => (i === index ? value : date)),
    }));
    clearError(`dates.${index}`);
    clearError("dates");
  };

  const addDate = (): void => {
    setFormData((prev) => ({ ...prev, dates: [...prev.dates, ""] }));
  };

  const removeDate = (index: number): void => {
    setFormData((prev) => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index),
    }));
    clearError("dates");
  };

  const handleZonePriceChange = (index: number, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      zones: prev.zones.map((zone, i) => (i === index ? { ...zone, price: value } : zone)),
    }));
    clearError(`zones.${index}.price`);
  };

  const handleZoneOnSaleChange = (index: number, isOnSale: boolean): void => {
    setFormData((prev) => ({
      ...prev,
      zones: prev.zones.map((zone, i) => (i === index ? { ...zone, isOnSale } : zone)),
    }));
    clearError(`zones.${index}.isOnSale`);
  };

  const handleDateChangeWrapper = (event: ChangeEvent<HTMLInputElement>): void => {
    const target = event.target;
    const index = Number.parseInt(target.dataset.index ?? "0", 10);
    handleDateChange(index, target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget;
    setServerError(null);
    setSuccessMessage(null);

    // 0) อ่านค่าล่าสุดจากช่องกรอกบนหน้าจอจริงมาเทียบกับ state ก่อนตรวจเสมอ
    //    กันกรณี browser autofill หรือการกู้ค่าฟอร์มหลัง refresh (F5) ใส่ข้อความ
    //    ไว้ใน input โดยที่ React state ยังว่าง — ถ้าเชื่อ state อย่างเดียว
    //    ข้อมูลที่ผู้ใช้เห็นจะ "หาย" และช่องกลายเป็นสีแดงทั้งที่กรอกครบ
    const domEntries = new FormData(form);
    const candidate: ConcertFormState = {
      ...formData,
      name: readFormField(domEntries, "name") ?? formData.name,
      nameEn: readFormField(domEntries, "nameEn") ?? formData.nameEn,
      description: readFormField(domEntries, "description") ?? formData.description,
      venueId: readFormField(domEntries, "venueId") ?? formData.venueId,
      imageUrl: readFormField(domEntries, "imageUrl") ?? formData.imageUrl,
      emoji: readFormField(domEntries, "emoji") ?? formData.emoji,
      origin: (readFormField(domEntries, "origin") ?? formData.origin) as Origin,
      artistType: (readFormField(domEntries, "artistType") ?? formData.artistType) as ArtistType,
      dates: formData.dates.map((_, index) => readFormField(domEntries, `dates.${index}`) ?? ""),
    };
    setFormData(candidate);

    // 1) ตรวจสอบด้วย Zod ฝั่ง client (รวมราคา/เปิดขายรายโซนด้วย)
    const result = createConcertSchema.safeParse(candidate);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});

    // 2) ส่งข้อมูลไปที่ API (แปลงวันที่ทั้งหมดเป็น ISO 8601)
    setIsSubmitting(true);
    try {
      const created = await concertService.createConcert({
        name: result.data.name,
        nameEn: result.data.nameEn || undefined,
        description: result.data.description,
        venueId: result.data.venueId,
        dates: result.data.dates
          .map((date) => new Date(date).toISOString())
          .sort((a, b) => a.localeCompare(b)),
        imageUrl: result.data.imageUrl || undefined,
        emoji: result.data.emoji || undefined,
        origin: result.data.origin,
        artistType: result.data.artistType,
        zones: result.data.zones.map((zone) => ({
          code: zone.code,
          price: zone.price,
          isOnSale: zone.isOnSale,
        })),
      });

      setSuccessMessage(
        `สร้างคอนเสิร์ต "${created.name}" สำเร็จ! คอนเสิร์ตอยู่ในสถานะ "ฉบับร่าง" — ยังไม่ปรากฏบนหน้าจอง กรุณาไปที่หน้า "จัดการคอนเสิร์ต" เพื่อกดเปิดขายบัตร`,
      );
      setFormData((prev) => ({ ...INITIAL_FORM_STATE, venueId: prev.venueId, zones: prev.zones }));
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="text-sm font-medium text-violet-600 hover:text-violet-700">
          ← กลับไปหน้าคอนเสิร์ต
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">สร้างคอนเสิร์ตใหม่</h1>
        <p className="mt-1 text-sm text-slate-500">
          เลือกสถานที่จัดงาน ระบบจะดึงผังโซน FIX ประจำสถานที่มาให้ — ทีมงานแค่ตั้งราคาบัตร
          และเลือกว่าจะเปิดขายโซนไหน
        </p>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-8">
          {successMessage && (
            <Alert variant="success" className="mb-6">
              {successMessage}
            </Alert>
          )}
          {serverError && (
            <Alert variant="error" className="mb-6">
              {serverError}
            </Alert>
          )}
          {venuesLoading && (
            <div className="mb-6 flex items-center gap-3 text-sm text-slate-500">
              <Spinner size="sm" /> กำลังโหลดรายการสถานที่...
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col gap-5">
            <FormInput
              label="ชื่อคอนเสิร์ต (ไทย)"
              name="name"
              autoComplete="off"
              placeholder="เช่น คอนเสิร์ตตำนานร็อค 2026"
              value={formData.name}
              onChange={handleChange}
              error={fieldErrors.name}
              disabled={isSubmitting}
            />

            <FormInput
              label="ชื่อคอนเสิร์ต (อังกฤษ) — ไม่บังคับ ถ้าว่างจะใช้ชื่อไทยทั้งสองภาษา"
              name="nameEn"
              autoComplete="off"
              placeholder="e.g. Rock Legend Concert 2026"
              value={formData.nameEn}
              onChange={handleChange}
              error={fieldErrors.nameEn}
              disabled={isSubmitting}
            />

            <FormTextarea
              label="รายละเอียด"
              name="description"
              placeholder="อธิบายรายละเอียดคอนเสิร์ต..."
              value={formData.description}
              onChange={handleChange}
              error={fieldErrors.description}
              disabled={isSubmitting}
            />
            {/* เลือกสถานที่จัดงาน */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="venueId" className="text-sm font-medium text-slate-700">
                สถานที่จัดงาน
              </label>
              <select
                id="venueId"
                name="venueId"
                value={formData.venueId}
                onChange={handleChange}
                disabled={isSubmitting || venuesLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">— เลือกสถานที่จัดงาน —</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
              {fieldErrors.venueId && (
                <p className="text-xs font-medium text-red-600">{fieldErrors.venueId}</p>
              )}
              {selectedVenue && (
                <p className="text-xs text-slate-500">
                  ผังของสถานที่นี้มี {selectedVenue.zones.length} โซน ·{" "}
                  {selectedVenue.zones
                    .reduce((sum, z) => sum + z.rowCount * z.seatsPerRow, 0)
                    .toLocaleString()}{" "}
                  ที่นั่งรวม
                </p>
              )}
            </div>

            {/* วันที่แสดง — รองรับหลายวัน */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">วันที่แสดง</h3>
                  <p className="text-xs text-slate-500">
                    คอนเสิร์ตที่จัดหลายวัน ผู้ใช้จะเลือกวันที่ต้องการจองก่อนเลือกโซนและที่นั่ง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addDate}
                  disabled={isSubmitting || formData.dates.length >= 10}
                  className="shrink-0 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + เพิ่มวันที่แสดง
                </button>
              </div>

              {formData.dates.map((date, index) => (
                <div key={`date-${index}`} className="flex items-start gap-2">
                  <div className="flex-1">
                    <FormInput
                      label={`วันที่แสดงครั้งที่ ${index + 1}`}
                      name={`dates.${index}`}
                      type="datetime-local"
                      autoComplete="off"
                      value={date}
                      data-index={index}
                      onChange={handleDateChangeWrapper}
                      error={fieldErrors[`dates.${index}`]}
                      disabled={isSubmitting}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDate(index)}
                    disabled={isSubmitting || formData.dates.length <= 1}
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

            {/* รูปปก (อัปโหลดไฟล์) + อิโมจิ (ไม่บังคับ) */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <CoverImageUpload
                value={formData.imageUrl}
                onChange={(url) =>
                  setFormData((prev) => ({ ...prev, imageUrl: url }))
                }
                error={fieldErrors.imageUrl}
                disabled={isSubmitting}
              />
              <FormInput
                label="อิโมจิประจำคอนเสิร์ต (ไม่บังคับ)"
                name="emoji"
                placeholder="เช่น ไอคอนดนตรี กีตาร์ หูฟัง (จากคลังอิโมจิ)"
                value={formData.emoji}
                onChange={handleChange}
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
                  value={formData.origin}
                  onChange={handleChange}
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
                  value={formData.artistType}
                  onChange={handleChange}
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

            {/* โซนบัตร — ผัง FIX จากสถานที่ + ตั้งราคา/เปิดขายรายโซน */}
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">โซนบัตร (จากผังของสถานที่)</h3>
                <p className="text-xs text-slate-500">
                  ตั้งราคาบัตรรายโซน และเลือกเปิด/ปิดขาย — โซนที่ปิดขายจะเป็นสีเทาบนผัง
                  ผู้ใช้เลือกซื้อไม่ได้
                </p>
              </div>

              {formData.zones.length === 0 ? (
                <p className="text-xs text-slate-500">
                  เลือกสถานที่จัดงานก่อน เพื่อโหลดผังโซนของสถานที่นั้น
                </p>
              ) : (
                <>
                  {/* พรีวิวผัง — เปิดขาย = สี / ปิดขาย = เทา */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mx-auto flex w-3/4 items-center justify-center rounded-b-[1.5rem] bg-slate-800 py-2">
                      <span className="text-[10px] font-bold tracking-[0.3em] text-slate-300">
                        เวที
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {previewRows.map(([mapRow, zones], rowIndex) => (
                        <div
                          key={mapRow}
                          className="grid grid-cols-1 items-stretch gap-1.5 md:grid-cols-3"
                        >
                          {(() => {
                            if (zones.length === 1 && zones[0].wide) {
                              const zone = zones[0];
                              const open = onSaleByCode.get(zone.code) ?? false;
                              return (
                                <div
                                  className={`rounded-lg border px-2 py-1 text-center text-[10px] font-semibold md:col-span-3 ${
                                    open
                                      ? "border-violet-300 bg-violet-100 text-violet-700"
                                      : "border-slate-200 bg-slate-200/70 text-slate-400"
                                  }`}
                                >
                                  {zone.name} — {open ? "เปิดขาย" : "ปิดขาย"}
                                </div>
                              );
                            }

                            const cells: Array<VenueZoneLayout | null> = [null, null, null];
                            for (const zone of zones) {
                              if (zone.side === "LEFT") cells[0] = zone;
                              else if (zone.side === "RIGHT") cells[2] = zone;
                              else cells[1] = zone;
                            }

                            return cells.map((zone, cellIndex) => {
                              if (!zone) {
                                return (
                                  <div
                                    key={`empty-${rowIndex}-${cellIndex}`}
                                    aria-hidden="true"
                                    className="rounded-lg border border-dashed border-slate-200"
                                  />
                                );
                              }
                              const open = onSaleByCode.get(zone.code) ?? false;
                              return (
                                <div
                                  key={zone.code}
                                  className={`rounded-lg border px-2 py-1 text-center text-[10px] font-semibold ${
                                    open
                                      ? "border-violet-300 bg-violet-100 text-violet-700"
                                      : "border-slate-200 bg-slate-200/70 text-slate-400"
                                  }`}
                                >
                                  {(() => {
                                    const setting = formData.zones.find((z) => z.code === zone.code);
                                    const priceLabel = setting?.price ? `${setting.price} บ.` : "";
                                    return `${zone.name} ${priceLabel} — ${open ? "เปิดขาย" : "ปิดขาย"}`;
                                  })()}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ตั้งค่ารายโซน */}
                  {formData.zones.map((zone, index) => (
                    <div
                      key={`zone-setting-${zone.code}`}
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
                          {sideLabels[zone.side]} · แถว {zone.mapRow} · {zone.rowCount} แถว ×{" "}
                          {zone.seatsPerRow} ที่นั่ง ={" "}
                          {(zone.rowCount * zone.seatsPerRow).toLocaleString()} ที่นั่ง
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
                        <FormInput
                          label="ราคาบัตร (บาท)"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="3500"
                          value={zone.price}
                          onChange={(e) => handleZonePriceChange(index, e.target.value)}
                          error={fieldErrors[`zones.${index}.price`]}
                          disabled={isSubmitting}
                        />
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium text-slate-700">สถานะการขาย</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleZoneOnSaleChange(index, true)}
                              disabled={isSubmitting}
                              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                                zone.isOnSale
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"
                              }`}
                            >
                              เปิดขาย
                            </button>
                            <button
                              type="button"
                              onClick={() => handleZoneOnSaleChange(index, false)}
                              disabled={isSubmitting}
                              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                                !zone.isOnSale
                                  ? "border-slate-400 bg-slate-200 text-slate-600"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
                              }`}
                            >
                              ปิดขาย
                            </button>
                          </div>
                          {fieldErrors[`zones.${index}.isOnSale`] && (
                            <p className="text-xs font-medium text-red-600">
                              {fieldErrors[`zones.${index}.isOnSale`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {fieldErrors.zones && (
                    <p className="text-xs font-medium text-red-600">{fieldErrors.zones}</p>
                  )}

                  <p className="text-xs text-slate-500">
                    ความจุรวม:{" "}
                    <span className="font-bold text-slate-700">
                      {totalCapacity.toLocaleString()} ที่นั่ง
                    </span>{" "}
                    ใน {formData.zones.length} โซน
                  </p>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex w-full items-center justify-center rounded-lg bg-violet-600 py-3 text-sm font-bold text-white shadow transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังสร้าง..." : "สร้างคอนเสิร์ต"}
            </button>
            <p className="text-center text-xs text-slate-500">
              หลังสร้างเสร็จ คอนเสิร์ตจะอยู่ในสถานะ "ฉบับร่าง" — ต้องไปที่{" "}
              <Link to="/admin" className="text-sm font-semibold text-violet-600 hover:underline">
                จัดการคอนเสิร์ต
              </Link>{" "}
              แล้วกด "เปิดขาย" จึงจะปรากฏบนหน้าจองของผู้ใช้
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
