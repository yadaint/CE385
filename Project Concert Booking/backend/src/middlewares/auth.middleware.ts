import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";

const extractToken = (authHeader: string | undefined): string => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("ต้องเข้าสู่ระบบ — ไม่พบ token", 401);
  }
  return authHeader.split(" ")[1] ?? "";
};

/**
 * ตรวจสอบ JWT จาก Authorization header และผูกผู้ใช้เข้ากับ `req.user`
 * ปฏิเสธ token ที่ไม่มี หมดอายุ ถูกแก้ไข หรือผู้ใช้ถูกลบไปแล้ว
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    } catch {
      throw new AppError("เข้าสู่ระบบไม่สำเร็จ — token ไม่ถูกต้องหรือหมดอายุ", 401);
    }

    if (!payload.sub) {
      throw new AppError("เข้าสู่ระบบไม่สำเร็จ — รูปแบบ token ไม่ถูกต้อง", 401);
    }

    // ตรวจสอบกับฐานข้อมูลใหม่ทุกครั้ง เพื่อปฏิเสธผู้ใช้ที่ถูกลบทันที
    // และอ่าน role จากแหล่งข้อมูลจริงเสมอ
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new AppError("เข้าสู่ระบบไม่สำเร็จ — ไม่พบผู้ใช้นี้ในระบบ", 401);
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Factory จำกัดสิทธิ์การเข้าถึงเส้นทางตาม role ที่กำหนด
 * ต้องใช้ต่อจาก middleware `authenticate` เสมอ
 */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("ต้องเข้าสู่ระบบก่อน", 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError("ไม่มีสิทธิ์ — คุณไม่ได้รับอนุญาตให้ทำรายการนี้", 403));
      return;
    }

    next();
  };
