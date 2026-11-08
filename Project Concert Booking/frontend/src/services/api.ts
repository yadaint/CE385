import axios, { AxiosError } from "axios";

import type { ApiResponse } from "../types";

/** Base URL ของ backend API (ปรับได้ผ่านไฟล์ .env) */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

/** Origin ของ API server (ตัด /api/v1 ออก) — ใช้เข้าถึงไฟล์ที่อัปโหลด เช่น สลิป */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

/** แปลง path ของไฟล์ที่อัปโหลด (เช่น /uploads/slips/xx.png) เป็น URL เต็ม */
export const getUploadUrl = (path: string): string => `${API_ORIGIN}${path}`;

/** localStorage key ที่ใช้เก็บ JWT */
export const TOKEN_STORAGE_KEY = "booking-ticket-concert.jwt";

export interface ApiFieldError {
  field: string;
  message: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor — แนบ JWT จาก localStorage เข้า Authorization header
 * ให้ทุกคำขอที่ส่งออกไปโดยอัตโนมัติ
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Response interceptor — ถ้าคำขอถูกปฏิเสธด้วยสถานะ 401 ทั้งที่เราคิดว่าล็อกอินอยู่
 * แปลว่า token หมดอายุ/ถูกเพิกถอน: เคลียร์ token และพากลับไปหน้าเข้าสู่ระบบ
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const hasToken = localStorage.getItem(TOKEN_STORAGE_KEY) !== null;
    const isOnAuthPage = ["/login", "/register"].includes(window.location.pathname);

    if (error.response?.status === 401 && hasToken && !isOnAuthPage) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.assign("/login");
    }

    return Promise.reject(error);
  },
);

/** ดึงข้อความ error ที่อ่านเข้าใจง่ายจากทุก error (โดยเฉพาะ AxiosError) */
export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const payload = error.response?.data;

    // ข้อผิดพลาดจาก Zod validation (422) มีรายละเอียดรายฟิลด์ — แสดงให้ครบ
    const fieldErrors = (payload as { errors?: ApiFieldError[] } | undefined)?.errors;
    if (fieldErrors && fieldErrors.length > 0) {
      return fieldErrors.map((e) => `${e.field}: ${e.message}`).join(" · ");
    }

    if (payload?.message) {
      return payload.message;
    }

    if (error.code === "ECONNABORTED") {
      return "หมดเวลาการเชื่อมต่อ — กรุณาลองอีกครั้ง";
    }

    if (error.response) {
      return `คำขอล้มเหลว (รหัสสถานะ ${error.response.status})`;
    }

    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — API กำลังทำงานอยู่หรือไม่?";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "เกิดข้อผิดพลาดที่ไม่คาดคิด";
};

export default api;
