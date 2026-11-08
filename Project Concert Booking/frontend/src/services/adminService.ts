import api from "./api";
import type {
  AdminBooking,
  AdminConcert,
  AdminConcertSummary,
  AdminConcertTickets,
  AdminNotification,
  AdminPayment,
  AdminSeatMap,
  AdminStats,
  ApiResponse,
  BookingStatus,
  ConcertSaleStatus,
  PaymentStatus,
} from "../types";

/** Zone setting สำหรับปรับราคา/เปิด-ปิดขายรายโซน (คอนที่สร้างแล้ว) */
export interface UpdateZoneSetting {
  zoneId: string;
  price?: number;
  isOnSale?: boolean;
}

/** Payload สำหรับแก้ไขข้อมูลคอนเสิร์ต (ส่งเฉพาะฟิลด์ที่ต้องการแก้) */
export interface UpdateConcertPayload {
  name?: string;
  /** ชื่อภาษาอังกฤษ (null = ล้างค่า ใช้ชื่อไทยทั้งสองภาษา) */
  nameEn?: string | null;
  description?: string;
  dates?: string[];
  imageUrl?: string | null;
  emoji?: string | null;
  origin?: "THAI" | "INTERNATIONAL";
  artistType?: "SOLO" | "GROUP";
}

export const adminService = {
  /** GET /admin/stats — สถิติภาพรวมทั้งระบบ */
  async getStats(): Promise<AdminStats> {
    const { data } = await api.get<{ data: { stats: AdminStats } }>("/admin/stats");
    return data.data.stats;
  },

  /** GET /admin/concerts — คอนเสิร์ตทุกสถานะในหลังบ้าน */
  async getConcerts(): Promise<AdminConcert[]> {
    const { data } = await api.get<{ data: { concerts: AdminConcert[] } }>("/admin/concerts");
    return data.data.concerts;
  },

  /** DELETE /concerts/:id — ลบคอนเสิร์ตแบบร่าง (DRAFT เท่านั้น) */
  async deleteConcert(concertId: string): Promise<void> {
    await api.delete(`/concerts/${concertId}`);
  },

  /** GET /admin/concerts/:id/seats — ผังที่นั่งเรียลไทม์พร้อมสถานะรายที่นั่ง */
  async getConcertSeatMap(concertId: string): Promise<AdminSeatMap> {
    const { data } = await api.get<{ data: AdminSeatMap }>(
      `/admin/concerts/${concertId}/seats`,
    );
    return data.data;
  },

  /** GET /admin/concerts/:id/tickets — รายการตั๋วของคอนเสิร์ต (กรองโซน/สถานะได้) */
  async getConcertTickets(
    concertId: string,
    filters?: { zoneId?: string; status?: BookingStatus },
  ): Promise<AdminConcertTickets> {
    const { data } = await api.get<{ data: AdminConcertTickets }>(
      `/admin/concerts/${concertId}/tickets`,
      { params: filters },
    );
    return data.data;
  },

  /** GET /admin/concerts/:id/summary — สรุปรายได้/ที่นั่งรายโซน */
  async getConcertSummary(concertId: string): Promise<AdminConcertSummary> {
    const { data } = await api.get<{ data: AdminConcertSummary }>(
      `/admin/concerts/${concertId}/summary`,
    );
    return data.data;
  },

  /** PATCH /concerts/:id — แก้ไขข้อมูลคอนเสิร์ต */
  async updateConcert(concertId: string, payload: UpdateConcertPayload): Promise<AdminConcert> {
    const { data } = await api.patch<{ data: { concert: AdminConcert } }>(
      `/concerts/${concertId}`,
      payload,
    );
    return data.data.concert;
  },

  /** PATCH /concerts/:id/zones — ปรับราคา/เปิด-ปิดขายรายโซน */
  async updateConcertZones(
    concertId: string,
    zones: UpdateZoneSetting[],
  ): Promise<AdminConcert> {
    const { data } = await api.patch<{ data: { concert: AdminConcert } }>(
      `/concerts/${concertId}/zones`,
      { zones },
    );
    return data.data.concert;
  },

  /** PATCH /concerts/:id/sale-status — เปิด/ปิดการขายบัตร */
  async updateSaleStatus(concertId: string, status: Extract<ConcertSaleStatus, "OPEN" | "CLOSED">): Promise<void> {
    await api.patch(`/concerts/${concertId}/sale-status`, { status });
  },

  /** GET /admin/notifications — แจ้งเตือนหลังบ้าน (บัตรโซนหมด/บัตรทั้งคอนหมด) */
  async getNotifications(unreadOnly = false): Promise<{ notifications: AdminNotification[]; unreadCount: number }> {
    const { data } = await api.get<{
      data: { notifications: AdminNotification[]; unreadCount: number };
    }>("/admin/notifications", { params: unreadOnly ? { unread: "true" } : undefined });
    return data.data;
  },

  /** PATCH /admin/notifications/read — มาร์กอ่านแจ้งเตือน (ทั้งหมด หรือระบุรายการ) */
  async markNotificationsRead(ids?: string[]): Promise<number> {
    const { data } = await api.patch<{ data: { updated: number } }>(
      "/admin/notifications/read",
      ids && ids.length > 0 ? { ids } : {},
    );
    return data.data.updated;
  },

  /** GET /admin/bookings — การจองทั้งหมดของทุกผู้ใช้ */
  async getBookings(status?: BookingStatus): Promise<AdminBooking[]> {
    const { data } = await api.get<{ data: { bookings: AdminBooking[] } }>("/admin/bookings", {
      params: status ? { status } : undefined,
    });
    return data.data.bookings;
  },

  /** GET /admin/payments — สลิปการชำระเงินทั้งหมด */
  async getPayments(status?: PaymentStatus): Promise<AdminPayment[]> {
    const { data } = await api.get<{ data: { payments: AdminPayment[] } }>("/admin/payments", {
      params: status ? { status } : undefined,
    });
    return data.data.payments;
  },

  /** PATCH /admin/payments/:id/approve — อนุมัติสลิป → บัตรจองสำเร็จ */
  async approvePayment(paymentId: string): Promise<void> {
    await api.patch(`/admin/payments/${paymentId}/approve`);
  },

  /** PATCH /admin/payments/:id/reject — ปฏิเสธสลิป (ระบุเหตุผลได้) */
  async rejectPayment(paymentId: string, note?: string): Promise<void> {
    await api.patch(`/admin/payments/${paymentId}/reject`, { note });
  },

  /** POST /admin/uploads/cover — อัปโหลดรูปปกคอนเสิร์ต (แนะนำ 1200x675 16:9) → คืน URL */
  async uploadCover(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("cover", file);

    const { data } = await api.post<ApiResponse<{ url: string }>>(
      "/admin/uploads/cover",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data.url;
  },
};
