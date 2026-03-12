import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../lib/storage";
import { sanitizeObject } from "../lib/sanitize";

const router: IRouter = Router();

const createCarLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many car listings, please try again later." },
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      minPrice, maxPrice, make, model, features,
      year, minRating, transmission, fuelType, seats,
      category, available, sort, limit, offset, searchQuery,
    } = req.query;

    const filters: any = {};
    if (minPrice) filters.minPrice = parseFloat(minPrice as string);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);
    if (minRating) filters.minRating = parseFloat(minRating as string);
    if (year) filters.year = parseInt(year as string, 10);
    if (seats) filters.seats = parseInt(seats as string, 10);
    if (make) filters.make = (Array.isArray(make) ? make : [make]) as string[];
    if (features) filters.features = (Array.isArray(features) ? features : [features]) as string[];
    if (transmission) filters.transmission = transmission as string;
    if (fuelType) filters.fuelType = fuelType as string;
    if (category) filters.category = category as string;
    if (searchQuery) filters.searchQuery = searchQuery as string;
    if (available) filters.available = available === "true";
    if (limit) filters.limit = parseInt(limit as string, 10);
    if (offset) filters.offset = parseInt(offset as string, 10);
    if (sort) filters.sort = sort as string;

    const result = Object.keys(filters).length > 0
      ? await storage.getCarsWithFilters(filters)
      : await storage.getCars();

    return res.json(result);
  } catch (error) {
    console.error("Error fetching cars:", error);
    return res.status(500).json({ message: "Error fetching cars" });
  }
});

router.get("/host/me", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const cars = await storage.getCarsByHost(req.user.id);
  return res.json(cars);
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });
  const car = await storage.getCar(id);
  if (!car) return res.status(404).json({ message: "Car not found" });
  return res.json(car);
});

router.post("/", createCarLimiter, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const sanitized = sanitizeObject(req.body, ["make", "model", "description", "location", "city", "color"]);
    const carData = { ...sanitized, hostId: req.user.id };
    const car = await storage.createCar(carData);
    await storage.updateUser(req.user.id, { isHost: true, role: "both" });
    return res.status(201).json(car);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const carId = parseInt(req.params.id);
    if (isNaN(carId)) return res.status(400).json({ message: "Invalid car ID" });

    const car = await storage.getCar(carId);
    if (!car) return res.status(404).json({ message: "Car not found" });
    if (car.hostId !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    const sanitized = sanitizeObject(req.body, ["make", "model", "description", "location", "city", "color"]);
    const updated = await storage.updateCar(carId, sanitized);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const carId = parseInt(req.params.id);
    if (isNaN(carId)) return res.status(400).json({ message: "Invalid car ID" });

    const car = await storage.getCar(carId);
    if (!car) return res.status(404).json({ message: "Car not found" });
    if (car.hostId !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    await storage.updateCar(carId, { status: "inactive", available: false });
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
