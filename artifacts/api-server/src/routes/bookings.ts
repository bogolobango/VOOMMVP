import { Router, type IRouter, type Request, type Response } from "express";
import { storage } from "../lib/storage";
import { db } from "@workspace/db";

const router: IRouter = Router();

const PLATFORM_FEE_PERCENT = 15;

router.post("/", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const userId = req.user.id;
    const { carId, startDate, endDate, pickupLocation, dropoffLocation, paymentMethod } = req.body;

    if (!carId || !startDate || !endDate || !pickupLocation || !dropoffLocation) {
      return res.status(400).json({ message: "Missing required booking fields" });
    }

    const car = await storage.getCar(parseInt(carId));
    if (!car) return res.status(404).json({ message: "Car not found" });
    if (!car.available) return res.status(400).json({ message: "Car is not available" });
    if (car.hostId === userId) return res.status(400).json({ message: "You cannot book your own car" });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) return res.status(400).json({ message: "End date must be after start date" });

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalAmount = days * car.dailyRate;
    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT / 100);
    const hostPayout = totalAmount - platformFee;

    const booking = await db.transaction(async (tx) => {
      const hasConflict = await storage.hasBookingConflict(car.id, start, end);
      if (hasConflict) throw new Error("CONFLICT");

      const created = await storage.createBooking({
        carId: car.id,
        userId,
        hostId: car.hostId,
        startDate: start,
        endDate: end,
        pickupLocation,
        dropoffLocation,
        totalAmount,
        currency: car.currency,
        paymentMethod: paymentMethod || null,
        status: "pending",
      } as any);

      await storage.updateBooking(created.id, { platformFee, hostPayout });
      return { ...created, platformFee, hostPayout };
    });

    return res.status(201).json(booking);
  } catch (error) {
    if ((error as Error).message === "CONFLICT") {
      return res.status(409).json({ message: "Car is already booked for these dates" });
    }
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const result = await storage.getBookingsWithCars(req.user.id);
  return res.json(result);
});

router.get("/", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const result = await storage.getBookingsWithCars(req.user.id);
  return res.json(result);
});

router.get("/host/me", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const cars = await storage.getCarsByHost(req.user.id);
  if (!cars || cars.length === 0) return res.json([]);

  const bookingsPromises = cars.map(async (car) => {
    const carBookings = await storage.getBookingsByCar(car.id);
    return carBookings.map((booking) => ({ ...booking, car }));
  });
  const bookingsNested = await Promise.all(bookingsPromises);
  return res.json(bookingsNested.flat());
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid booking ID" });
  const booking = await storage.getBooking(id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (booking.userId !== req.user.id && booking.hostId !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }
  return res.json(booking);
});

router.put("/:id/approve", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid booking ID" });

    const booking = await storage.getBooking(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.hostId !== req.user.id) return res.status(403).json({ message: "Only the host can approve" });
    if (booking.status !== "pending") return res.status(400).json({ message: "Booking is not pending" });

    const updated = await storage.updateBooking(id, { status: "approved" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.put("/:id/reject", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid booking ID" });

    const booking = await storage.getBooking(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.hostId !== req.user.id) return res.status(403).json({ message: "Only the host can reject" });
    if (booking.status !== "pending") return res.status(400).json({ message: "Booking is not pending" });

    const updated = await storage.updateBooking(id, { status: "rejected" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.put("/:id/cancel", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid booking ID" });

    const booking = await storage.getBooking(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.userId !== req.user.id) return res.status(403).json({ message: "Only the renter can cancel" });
    if (["completed", "cancelled"].includes(booking.status)) {
      return res.status(400).json({ message: "Booking cannot be cancelled" });
    }

    const updated = await storage.updateBooking(id, { status: "cancelled" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid booking ID" });

    const booking = await storage.getBooking(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.userId !== req.user.id && booking.hostId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await storage.updateBooking(id, req.body);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
