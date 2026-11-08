import api from "./api";
import type { Venue } from "../types";

export const venuesService = {
  /** GET /venues — รายการสถานที่จัดงาน พร้อมผังโซน FIX ประจำสถานที่ */
  async getVenues(): Promise<Venue[]> {
    const { data } = await api.get<{ data: { venues: Venue[] } }>("/venues");
    return data.data.venues;
  },
};
