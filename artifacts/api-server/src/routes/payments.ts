import { Router, type IRouter, type Request, type Response } from "express";
import { storage } from "../lib/storage";

const router: IRouter = Router();

router.post("/stripe/create", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { bookingId, idempotencyKey } = req.body;
    if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });

    const booking = await storage.getBooking(parseInt(bookingId));
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.userId !== req.user.id) return res.status(403).json({ message: "Not your booking" });

    if (idempotencyKey) {
      const existing = await storage.getPaymentByIdempotencyKey(idempotencyKey);
      if (existing) return res.json(existing);
    }

    const payment = await storage.createPayment({
      bookingId: booking.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      method: "stripe",
      idempotencyKey: idempotencyKey || `stripe_${booking.id}_${Date.now()}`,
      metadata: null,
    });

    return res.json({
      paymentId: payment.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      status: "pending",
    });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.post("/momo/initiate", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { bookingId, phoneNumber, idempotencyKey } = req.body;
    if (!bookingId || !phoneNumber) {
      return res.status(400).json({ message: "Booking ID and phone number are required" });
    }

    const booking = await storage.getBooking(parseInt(bookingId));
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.userId !== req.user.id) return res.status(403).json({ message: "Not your booking" });

    if (idempotencyKey) {
      const existing = await storage.getPaymentByIdempotencyKey(idempotencyKey);
      if (existing) return res.json(existing);
    }

    const payment = await storage.createPayment({
      bookingId: booking.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      method: "momo",
      idempotencyKey: idempotencyKey || `momo_${booking.id}_${Date.now()}`,
      metadata: JSON.stringify({ phoneNumber }),
    });

    return res.json({
      paymentId: payment.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      status: "pending",
      message: "Payment request sent to your phone",
    });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
