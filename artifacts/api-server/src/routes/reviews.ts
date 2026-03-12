import { Router, type IRouter, type Request, type Response } from "express";
import { storage } from "../lib/storage";

const router: IRouter = Router();

router.get("/car/:carId", async (req: Request, res: Response) => {
  const carId = parseInt(req.params.carId);
  if (isNaN(carId)) return res.status(400).json({ message: "Invalid car ID" });
  const reviews = await storage.getCarReviews(carId);
  return res.json(reviews);
});

router.post("/", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { bookingId, revieweeId, carId, rating, text } = req.body;

    if (!bookingId || !revieweeId || !carId || !rating) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const review = await storage.createReview({
      bookingId: parseInt(bookingId),
      reviewerId: req.user.id,
      revieweeId: parseInt(revieweeId),
      carId: parseInt(carId),
      rating: parseInt(rating),
      text: text || null,
    });
    return res.status(201).json(review);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
