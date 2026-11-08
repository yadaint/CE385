import { Router } from "express";

import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import bookingRoutes from "./booking.routes";
import concertRoutes from "./concert.routes";
import venueRoutes from "./venue.routes";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/venues", venueRoutes);
apiRouter.use("/concerts", concertRoutes);
apiRouter.use("/bookings", bookingRoutes);
apiRouter.use("/admin", adminRoutes);

export default apiRouter;
