import api from "./api";
import type { ApiResponse, AuthResponse, User } from "../types";

export interface LoginCredentials {
  email: string;
  password: string;
}

/** ข้อมูลสมัครสมาชิก — ยืนยันตัวตนด้วยการกรอกข้อมูลบัตร (ไม่ใช้รูป) */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** รูปแบบ YYYY-MM-DD จาก <input type="date"> */
  dateOfBirth: string;
  /** เลขบัตรประชาชน 13 หลัก (มี/ไม่มีตัวคั่นก็ได้ ระบบจะตัดให้) */
  nationalId: string;
  /** เลขหลังบัตรประชาชน (Laser code เช่น JT0-123456-78) */
  nationalIdBack: string;
}

export const authService = {
  /** POST /auth/register */
  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await api.post<ApiResponse<{ user: User }>>("/auth/register", {
      ...payload,
      nationalId: payload.nationalId.replace(/\D/g, ""),
      nationalIdBack: payload.nationalIdBack.replace(/[-\s]/g, "").toUpperCase(),
    });
    return data.data.user;
  },

  /** POST /auth/login */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/login", credentials);
    return data.data;
  },

  /** POST /auth/admin/login — ล็อกอินหลังบ้าน (backend ปฏิเสธบัญชีที่ไม่ใช่ ADMIN ด้วย 403) */
  async adminLogin(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/admin/login", credentials);
    return data.data;
  },

  /** GET /auth/me — validates the stored token and returns the current user */
  async getMe(): Promise<User> {
    const { data } = await api.get<ApiResponse<{ user: User }>>("/auth/me");
    return data.data.user;
  },

  /** DELETE /auth/me — ผู้ใช้ลบบัญชีตัวเอง (การจองทั้งหมดถูกลบตาม) */
  async deleteAccount(): Promise<void> {
    await api.delete("/auth/me");
  },
};
