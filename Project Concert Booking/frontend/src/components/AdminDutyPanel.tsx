import { useEffect, useState } from "react";
import { FiUser, FiUserCheck, FiUsers } from "react-icons/fi";

import Alert from "./Alert";
import Spinner from "./Spinner";
import { getApiErrorMessage } from "../services/api";
import {
  adminService,
  type AdminStaffSummary,
  type StaffDutyRecord,
} from "../services/adminService";
import { useAuth } from "../context/AuthContext";

interface AdminDutyPanelProps {
  /** เวรที่เปิดอยู่ตอนนี้ (null = ยังไม่มีใครเลือกทำงานวันนี้) */
  duty: StaffDutyRecord | null;
  /** เรียกเมื่อเลือกผู้ทำงานสำเร็จ — ผู้เรียกควรอัปเดต state และโหลดข้อมูลหลังบ้านใหม่ */
  onDutyUpdated: (duty: StaffDutyRecord) => void;
}

/** ชื่อแสดงผลของแอดมิน — ใช้ชื่อ+นามสกุลก่อน ถ้าไม่มีใช้อีเมล */
const staffDisplayName = (staff: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string => {
  const fullName = `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim();
  return fullName || staff.email;
};

/** แผงเวรประจำวัน — บังคับเลือก "วันนี้ใครเป็นคนทำงาน" หลังล็อกอิน และแสดงผู้ที่อยู่เวรอยู่ตอนนี้ */
export default function AdminDutyPanel({ duty, onDutyUpdated }: AdminDutyPanelProps) {
  const { user } = useAuth();
  const [isChanging, setIsChanging] = useState(false);
  const [staffList, setStaffList] = useState<AdminStaffSummary[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ยังไม่มีคนอยู่เวร → เปิดโหมดเลือกบังคับ
  useEffect(() => {
    if (duty === null) setIsChanging(true);
  }, [duty]);

  // โหลดรายชื่อแอดมินเมื่อเปิดโหมดเลือก (ค่าเริ่มต้น = บัญชีที่ล็อกอินอยู่)
  useEffect(() => {
    if (!isChanging) return;
    let cancelled = false;
    const fetchStaff = async (): Promise<void> => {
      setIsLoadingStaff(true);
      setError(null);
      try {
        const staff = await adminService.getStaffList();
        if (cancelled) return;
        setStaffList(staff);
        setSelectedId((prev) => prev || user?.id || staff[0]?.id || "");
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoadingStaff(false);
      }
    };
    void fetchStaff();
    return () => {
      cancelled = true;
    };
  }, [isChanging, user?.id]);

  const handleConfirm = async (): Promise<void> => {
    if (!selectedId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await adminService.setTodayDuty(selectedId);
      onDutyUpdated(updated);
      setIsChanging(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── โหมดแสดงผู้อยู่เวร ───
  if (duty && !isChanging) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-bg text-success-text ring-1 ring-success-border"
          >
            <FiUserCheck className="text-lg" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              ใช้งานในชื่อ
            </p>
            <p className="font-display text-sm font-bold text-ink">
              {staffDisplayName(duty.staff)}
              {duty.staff.employeeId && (
                <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
                  รหัส {duty.staff.employeeId}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsChanging(true)}
          className="rounded-btn border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary hover:text-primary"
        >
          เปลี่ยนผู้ทำงาน
        </button>
      </div>
    );
  }

  // ─── โหมดเลือกผู้ทำงานวันนี้ ───
  return (
    <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
      <div className="flex items-center gap-2">
        <FiUsers aria-hidden="true" className="text-lg text-primary" />
        <h2 className="font-display text-lg font-bold text-ink">
          {duty ? "เปลี่ยนผู้ทำงานประจำวันนี้" : "วันนี้ใครเป็นคนทำงาน?"}
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        {duty
          ? "เลือกแอดมินคนใหม่ได้เลย ระบบจะปิดเวรเดิมให้อัตโนมัติ"
          : "กรุณาเลือกแอดมินที่ทำงานวันนี้ก่อนเริ่มใช้งานหลังบ้าน เพื่อบันทึกว่าใครรับผิดชอบเวรนี้"}
      </p>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoadingStaff ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {staffList.map((staff) => {
            const isSelected = selectedId === staff.id;
            const isMe = user?.id === staff.id;

            return (
              <li key={staff.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(staff.id)}
                  disabled={isSubmitting}
                  className={`flex w-full items-center justify-between gap-3 rounded-input border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary-soft ring-1 ring-primary"
                      : "border-line bg-surface hover:border-primary/50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isSelected
                          ? "bg-primary text-primary-contrast"
                          : "bg-surface-2 text-muted"
                      }`}
                    >
                      <FiUser className="text-sm" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {staffDisplayName(staff)}
                        {isMe && (
                          <span className="ml-2 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success-text ring-1 ring-success-border">
                            ล็อกอินอยู่
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted">
                        {staff.employeeId ? `รหัสพนักงาน ${staff.employeeId} · ` : ""}
                        {staff.email}
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      isSelected ? "border-primary bg-primary" : "border-line"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={!selectedId || isLoadingStaff || isSubmitting}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-btn bg-primary py-2.5 text-sm font-bold text-primary-contrast shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FiUserCheck aria-hidden="true" className="text-base" />
        {isSubmitting ? "กำลังบันทึก..." : "ยืนยันเริ่มเวรวันนี้"}
      </button>
    </div>
  );
}
