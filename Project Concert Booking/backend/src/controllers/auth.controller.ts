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

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // เก็บเลขบัตรแบบไม่มีตัวคั่น + เลขหลังบัตรเป็นตัวพิมพ์ใหญ่
    const normalizedNationalId = nationalId.replace(/\D/g, "");
    const normalizedNationalIdBack = nationalIdBack.replace(/[-\s]/g, "").toUpperCase();

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
