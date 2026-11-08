import api from "./api";
import type { ApiResponse, ArtistType, Concert, Origin } from "../types";

export interface CreateZonePayload {
  /** รหัสโซน 2 ตัวอักษร (ตามผังของสถานที่) */
  code: string;
  /** ราคาบัตรที่ทีมงานกำหนด */
  price: number;
  /** เปิดขายโซนนี้หรือไม่ (โซนปิดขายจะเป็นสีเทา เลือกซื้อไม่ได้) */
  isOnSale: boolean;
}

export interface CreateConcertPayload {
  name: string;
  /** ชื่อภาษาอังกฤษ (ไม่บังคับ — ว่าง = ใช้ชื่อไทยทั้งสองภาษา) */
  nameEn?: string;
  description: string;
  /** รหัสสถานที่จัดงานที่เลือก */
  venueId: string;
  /** วันที่แสดงทั้งหมด (ISO 8601) — รองรับหลายวัน */
  dates: string[];
  origin: Origin;
  artistType: ArtistType;
  /** URL รูปภาพปก (ถ้ามี) */
  imageUrl?: string;
  /** อิโมจิประจำคอนเสิร์ต (ถ้าไม่มีรูป) */
  emoji?: string;
  /** ราคา + เปิด/ปิดขายรายโซน (ตามผังของสถานที่) */
  zones: CreateZonePayload[];
}

export interface ConcertFilters {
  origin?: Origin;
  artistType?: ArtistType;
}

export const concertService = {
  /** GET /concerts — กรองตาม origin / artistType ได้ (กรองที่ฝั่ง API) */
  async getConcerts(filters: ConcertFilters = {}): Promise<Concert[]> {
    const params: Record<string, string> = {};
    if (filters.origin) params.origin = filters.origin;
    if (filters.artistType) params.artistType = filters.artistType;

    const { data } = await api.get<ApiResponse<{ concerts: Concert[] }>>("/concerts", { params });
    return data.data.concerts;
  },

  /** GET /concerts/:id */
  async getConcertById(id: string): Promise<Concert> {
    const { data } = await api.get<ApiResponse<{ concert: Concert }>>(`/concerts/${id}`);
    return data.data.concert;
  },

  /** POST /concerts — admin only */
  async createConcert(payload: CreateConcertPayload): Promise<Concert> {
    const { data } = await api.post<ApiResponse<{ concert: Concert }>>("/concerts", payload);
    return data.data.concert;
  },
};
