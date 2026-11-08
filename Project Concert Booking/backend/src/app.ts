import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import path from "path";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import apiRouter from "./routes";

const app = express();

// ─── Global middleware ──────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── ให้เข้าถึงไฟล์สลิปที่อัปโหลด (สำหรับแอดมินดูสลิป) ───────
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ─── Health check ───────────────────────────────────────────
app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({
    status: "ok",
    service: "concert-ticket-booking-api",
    timestamp: new Date().toISOString(),
  });
});

// ─── API routes ─────────────────────────────────────────────
app.use("/api/v1", apiRouter);

// ─── 404 + global error handler (must be registered last) ───
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
