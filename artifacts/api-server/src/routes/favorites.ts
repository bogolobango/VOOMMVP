import { Router, type IRouter, type Request, type Response } from "express";
import { storage } from "../lib/storage";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const cars = await storage.getFavoriteCarsByUser(req.user.id);
  return res.json(cars);
});

router.get("/ids", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const ids = await storage.getFavoriteIds(req.user.id);
  return res.json(ids);
});

router.get("/check/:carId", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const carId = parseInt(req.params.carId);
  if (isNaN(carId)) return res.status(400).json({ message: "Invalid car ID" });
  const fav = await storage.getFavorite(req.user.id, carId);
  return res.json({ isFavorite: !!fav });
});

router.post("/", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { carId } = req.body;
    if (!carId) return res.status(400).json({ message: "Car ID is required" });

    const existing = await storage.getFavorite(req.user.id, carId);
    if (existing) return res.status(409).json({ message: "Already favorited" });

    const fav = await storage.createFavorite({ userId: req.user.id, carId });
    return res.status(201).json(fav);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.delete("/:carId", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const carId = parseInt(req.params.carId);
    if (isNaN(carId)) return res.status(400).json({ message: "Invalid car ID" });
    await storage.deleteFavorite(req.user.id, carId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
