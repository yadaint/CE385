import { Router } from "express";

import { getAllVenues } from "../controllers/venue.controller";

const router = Router();

// รายการสถานที่จัดงาน — สาธารณะ
router.get("/", getAllVenues);

export default router;
