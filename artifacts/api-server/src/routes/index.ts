import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import carsRouter from "./cars";
import bookingsRouter from "./bookings";
import favoritesRouter from "./favorites";
import messagesRouter from "./messages";
import reviewsRouter from "./reviews";
import paymentsRouter from "./payments";
import scraperRouter from "./scraper";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/cars", carsRouter);
router.use("/bookings", bookingsRouter);
router.use("/favorites", favoritesRouter);
router.use("/messages", messagesRouter);
router.use("/reviews", reviewsRouter);
router.use("/payments", paymentsRouter);
router.use("/scraper", scraperRouter);

export default router;
