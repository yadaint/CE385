import api from "./api";
import type { ApiResponse, Booking, BookingCheckResult } from "../types";

export interface CreateBookingPayload {
  /** วันที่แสดงที่ผู้ใช้เลือกจอง (ISO 8601) */
  showDate: string;
  /** Ids of the exact seats the user picked on the seating map. */
  seatIds: string[];
}

export const bookingService = {
  /** POST /bookings */
  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    const { data } = await api.post<ApiResponse<{ booking: Booking }>>("/bookings", payload);
    return data.data.booking;
  },

  /** GET /bookings/check/:id — ตรวจสอบสถานะตั๋วด้วยรหัสการจอง (สาธารณะ) */
  async checkBooking(bookingId: string): Promise<BookingCheckResult> {
    const { data } = await api.get<ApiResponse<{ booking: BookingCheckResult }>>(
      `/bookings/check/${bookingId}`,
    );
    return data.data.booking;
  },

  /** GET /bookings/my-bookings */
  async getMyBookings(): Promise<Booking[]> {
    const { data } = await api.get<ApiResponse<{ bookings: Booking[] }>>("/bookings/my-bookings");
    return data.data.bookings;
  },

  /** PATCH /bookings/:id/cancel */
  async cancelBooking(bookingId: string): Promise<Booking> {
    const { data } = await api.patch<ApiResponse<{ booking: Booking }>>(
      `/bookings/${bookingId}/cancel`,
    );
    return data.data.booking;
  },

  /** POST /bookings/:id/slip — แนบสลิปการชำระเงิน (multipart/form-data) */
  async uploadSlip(bookingId: string, file: File): Promise<Booking> {
    const formData = new FormData();
    formData.append("slipImage", file);

    const { data } = await api.post<ApiResponse<{ booking: Booking }>>(
      `/bookings/${bookingId}/slip`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data.booking;
  },
};
