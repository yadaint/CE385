// src/errors/app-error.ts — ข้อผิดพลาดที่ "เราตั้งใจให้เกิด"
// เอาไว้แยกจากข้อผิดพลาดที่ไม่คาดคิด (bug) ซึ่งต้องตอบ 500 เสมอ

export class AppError extends Error {
  /**
   * @param statusCode สถานะ HTTP ที่จะตอบกลับ เช่น 404
   * @param code       รหัสข้อผิดพลาดแบบตัวอักษรที่ฝั่ง client เอาไปเทียบได้ เช่น "NOT_FOUND"
   * @param message    ข้อความอธิบายให้มนุษย์อ่าน
   */
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ตัวช่วยสั้น ๆ ที่ใช้บ่อย เพื่อไม่ต้องพิมพ์ตัวเลขซ้ำทั้งโปรเจกต์
export const notFound = (message: string) => new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);