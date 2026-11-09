import type { Role } from "@prisma/client";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";
import { asyncHandler } from "../utils/asyncHandler";

const BCRYPT_SALT_ROUNDS = 12;

interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
}

const generateToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN_SECONDS });

const USER_PUBLIC_FIELDS = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  dateOfBirth: true,
  createdAt: true,
} as const;

/** POST /api/v1/auth/register — สมัครสมาชิก (JSON) ยืนยันตัวตนด้วยการกรอกข้อมูลบัตร */
export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, firstName, lastName, phone, dateOfBirth, nationalId, nationalIdBack } =
      req.body as RegisterInput & { nationalId: string; nationalIdBack: string };

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError("อีเมลนี้ถูกใช้งานแล้ว", 409);
    }

    // เก็บเลขบัตรแบบไม่มีตัวคั่น + เลขหลังบัตรเป็นตัวพิมพ์ใหญ่
    const normalizedNationalId = nationalId.replace(/\D/g, "");
    const normalizedNationalIdBack = nationalIdBack.replace(/[-\s]/g, "").toUpperCase();

    // อีเมล/เบอร์โทร/เลขบัตรประชาชน ใช้ได้ 1 บัญชีเท่านั้น —
    // ถ้าเคยสมัครไปแล้วต้องลบบัญชีเดิมออกก่อน จึงจะสมัครด้วยข้อมูลชุดเดิมได้อีก
    const [existingPhone, existingNationalId, existingNationalIdBack] = await Promise.all([
      prisma.user.findFirst({ where: { phone } }),
      prisma.user.findFirst({ where: { nationalId: normalizedNationalId } }),
      prisma.user.findFirst({ where: { nationalIdBack: normalizedNationalIdBack } }),
    ]);

    if (existingPhone) {
      throw new AppError(
        "เบอร์โทรศัพท์นี้เคยใช้สมัครไปแล้ว ข้อมูลนี้ใช้ได้ 1 บัญชีเท่านั้น — หากต้องการสมัครใหม่ ต้องลบบัญชีเดิมออกก่อน",
        409,
      );
    }
    if (existingNationalId) {
      throw new AppError(
        "เลขบัตรประชาชนนี้เคยใช้สมัครไปแล้ว ข้อมูลนี้ใช้ได้ 1 บัญชีเท่านั้น — หากต้องการสมัครใหม่ ต้องลบบัญชีเดิมออกก่อน",
        409,
      );
    }
    if (existingNationalIdBack) {
      throw new AppError(
        "เลขหลังบัตรประชาชนนี้เคยใช้สมัครไปแล้ว ข้อมูลนี้ใช้ได้ 1 บัญชีเท่านั้น — หากต้องการสมัครใหม่ ต้องลบบัญชีเดิมออกก่อน",
        409,
      );
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        nationalId: normalizedNationalId,
        nationalIdBack: normalizedNationalIdBack,
      },
      select: USER_PUBLIC_FIELDS,
    });

    res.status(201).json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      data: { user },
    });
  },
);

/** POST /api/v1/auth/login — ตรวจสอบข้อมูลและคืนค่า JWT */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
  }

  // แอดมินห้ามล็อกอินผ่านหน้าผู้ใช้ — ต้องเข้าผ่านหน้าหลังบ้าน (/admin/login) เท่านั้น
  // (เช็คหลังตรวจรหัสผ่าน กันการเดาว่าอีเมลไหนเป็นแอดมิน)
  if (user.role === "ADMIN") {
    throw new AppError(
      "บัญชีนี้เป็นบัญชีแอดมิน — ต้องเข้าสู่ระบบผ่านหน้าหลังบ้านเท่านั้น (/admin/login)",
      403,
    );
  }

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  res.status(200).json({
    success: true,
    message: "เข้าสู่ระบบสำเร็จ",
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    },
  });
});

/**
 * POST /api/v1/auth/admin/login — ล็อกอินหลังบ้านด้วย "อีเมลกลาง + รหัสผ่านส่วนตัว"
 * ทุกแอดมินใช้อีเมลเดียวกัน (ADMIN_LOGIN_EMAIL เช่น admin@concerthub.dev)
 * ระบุตัวตนจริงด้วยรหัสผ่านส่วนตัวของแต่ละคน — ระบบจับคู่กับบัญชีแอดมินที่รหัสตรง
 * กันสวมรอย: รหัสผ่านใครรหัสคนนั้น และห้ามตั้งรหัสซ้ำกัน (ตรวจตอนเพิ่มแอดมิน)
 */
export const adminLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput;

  // ต้องใช้อีเมลกลางเท่านั้น
  if (email.toLowerCase() !== env.ADMIN_LOGIN_EMAIL.toLowerCase()) {
    throw new AppError(
      `แอดมินต้องเข้าสู่ระบบด้วยอีเมลกลาง: ${env.ADMIN_LOGIN_EMAIL}`,
      401,
    );
  }

  // หาแอดมินที่รหัสผ่านส่วนตัวตรง (ทุกบัญชีแอดมินในระบบ)
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });

  let matched: (typeof admins)[number] | null = null;
  let duplicateCount = 0;
  for (const admin of admins) {
    if (await bcrypt.compare(password, admin.password)) {
      if (matched) {
        duplicateCount += 1;
      } else {
        matched = admin;
      }
    }
  }

  if (!matched) {
    throw new AppError("รหัสผ่านไม่ถูกต้อง — ไม่พบแอดมินที่ใช้รหัสผ่านนี้", 401);
  }
  if (duplicateCount > 0) {
    throw new AppError(
      "รหัสผ่านนี้ซ้ำกับแอดมินมากกว่า 1 คน ระบบจึงระบุตัวตนไม่ได้ — กรุณาแก้ให้รหัสผ่านของแต่ละคนไม่ซ้ำกัน",
      409,
    );
  }

  const user = matched;
  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  // ล็อกอินหลังบ้าน = ถือว่าแอดมินคนนี้กำลังทำงานอยู่ทันที
  // (ปิดเวรที่เปิดค้างทั้งหมด แล้วเปิดเวรใหม่ของคนนี้อัตโนมัติ — วันนี้ใครล็อกอินล่าสุดคือคนอยู่เวร)
  const dutyNow = new Date();
  const workDate = new Date(Date.UTC(dutyNow.getFullYear(), dutyNow.getMonth(), dutyNow.getDate(), 12));
  await prisma.$transaction([
    prisma.staffDuty.updateMany({ where: { endedAt: null }, data: { endedAt: dutyNow } }),
    prisma.staffDuty.create({ data: { staffId: user.id, workDate, startedAt: dutyNow } }),
  ]);

  res.status(200).json({
    success: true,
    message: `เข้าสู่ระบบหลังบ้านสำเร็จ — ยินดีต้อนรับ ${user.firstName ?? user.email} (บันทึกเวรเรียบร้อย)`,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    },
  });
});

/** GET /api/v1/auth/me — ข้อมูลผู้ใช้ที่กำลังเข้าสู่ระบบอยู่ (ดึงจากฐานข้อมูล) */
export const me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: USER_PUBLIC_FIELDS,
  });

  if (!user) {
    throw new AppError("ไม่พบบัญชีผู้ใช้นี้", 404);
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

/** DELETE /api/v1/auth/me — ผู้ใช้ลบบัญชีตัวเอง (การจอง/ที่นั่ง/สลิปถูก cascade ลบตาม) */
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new AppError("ไม่พบบัญชีผู้ใช้นี้", 404);
    }

    // ─── กันลบบัญชี: ถ้ายังมีบัตรคอนเสิร์ตที่ยังไม่หมดอายุค้างอยู่ ห้ามลบ ───
    // บัตรยังไม่หมดอายุ = วันแสดงเป็นวันนี้หรืออนาคต และสถานะไม่ใช่ CANCELLED
    // (ครอบคลุม: รอชำระเงิน / รอตรวจสลิป / สลิปถูกปฏิเสธ / จองสำเร็จรอเข้างาน)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeBookings = await prisma.booking.count({
      where: {
        userId,
        status: { not: "CANCELLED" },
        showDate: { gte: startOfToday },
      },
    });

    if (activeBookings > 0) {
      throw new AppError(
        `ยังลบบัญชีไม่ได้ — คุณมีบัตรคอนเสิร์ตที่ยังไม่หมดอายุค้างอยู่ ${activeBookings} รายการ กรุณาใช้บัตรให้ครบหรือยกเลิกการจองก่อนลบบัญชี`,
        409,
      );
    }

    // ปลดชื่อผู้ตรวจสลิปออกจากรายการที่เคยตรวจ (กัน FK block ตอนลบบัญชี)
    await prisma.payment.updateMany({
      where: { reviewedBy: userId },
      data: { reviewedBy: null },
    });

    // การจอง/ที่นั่ง/สลิปของผู้ใช้ถูก cascade ลบตามความสัมพันธ์ใน schema
    await prisma.user.delete({ where: { id: userId } });

    res.status(200).json({
      success: true,
      message: `ลบบัญชี ${user.email} สำเร็จ — ข้อมูลการจองทั้งหมดถูกลบตามไปด้วย`,
    });
  },
);
