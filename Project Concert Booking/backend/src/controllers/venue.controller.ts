import type { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

/** GET /api/v1/venues — รายการสถานที่จัดงาน พร้อมผังโซน FIX ประจำสถานที่ */
export const getAllVenues = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const venues = await prisma.venue.findMany({
      orderBy: { name: "asc" },
      include: { zones: { orderBy: [{ mapRow: "asc" }, { code: "asc" }] } },
    });

    res.status(200).json({
      success: true,
      data: { venues },
    });
  },
);
