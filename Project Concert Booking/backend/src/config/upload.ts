import fs from "fs";
import multer from "multer";
import path from "path";

import { AppError } from "../errors/AppError";

// โฟลเดอร์เก็บสลิป: <project>/backend/uploads/slips
const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
const SLIP_DIR = path.join(UPLOADS_ROOT, "slips");
// โฟลเดอร์เก็บรูปปกคอนเสิร์ต (อัปโหลดโดยแอดมิน): <project>/backend/uploads/covers
const COVER_DIR = path.join(UPLOADS_ROOT, "covers");

// สร้างโฟลเดอร์อัตโนมัติหากยังไม่มี
fs.mkdirSync(SLIP_DIR, { recursive: true });
fs.mkdirSync(COVER_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** สร้าง multer uploader สำหรับโฟลเดอร์ที่กำหนด โดยตั้งชื่อไฟล์ด้วย prefix */
const makeImageUploader = (dir: string, prefix: string, maxFiles = 1) =>
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".png";
        cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new AppError("รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น", 400));
      }
    },
    limits: { fileSize: MAX_FILE_SIZE, files: maxFiles },
  });

export const uploadSlipImage = makeImageUploader(SLIP_DIR, "slip");

/** รูปปกคอนเสิร์ต (แอดมินอัปโหลด) — ขนาดแนะนำ 1200x675 px (16:9) ไม่เกิน 5MB */
export const uploadCoverImage = makeImageUploader(COVER_DIR, "cover");

export const SLIP_UPLOAD_DIR = SLIP_DIR;
