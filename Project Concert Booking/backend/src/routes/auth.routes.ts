import { Router } from "express";

import { login, me, register, deleteAccount } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schema";

const router = Router();

// สมัครสมาชิก: JSON (ข้อมูลยืนยันตัวตนด้วยการกรอก — ชื่อ/เลขบัตร/เลขหลังบัตร)
router.post("/register", validate({ body: registerSchema }), register);
router.post("/login", validate({ body: loginSchema }), login);
router.get("/me", authenticate, me);
router.delete("/me", authenticate, deleteAccount);

export default router;
