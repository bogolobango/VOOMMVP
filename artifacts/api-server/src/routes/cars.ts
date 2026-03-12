import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../lib/storage";
import { sanitizeObject } from "../lib/sanitize";
import OpenAI from "openai";

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

/**
 * POST /api/cars/:id/enrich
 * Uses GPT-4o vision to identify car make/model/type/color from its images
 * and patches any blank or unknown fields. Open to admin users only.
 */
router.post("/:id/enrich", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });

    const carId = parseInt(req.params.id);
    if (isNaN(carId)) return res.status(400).json({ message: "Invalid car ID" });

    const car = await storage.getCar(carId);
    if (!car) return res.status(404).json({ message: "Car not found" });

    const imageUrls: string[] = [
      ...(Array.isArray(car.images) ? car.images : []),
      ...(car.imageUrl ? [car.imageUrl] : []),
    ].filter(Boolean).slice(0, 3);

    if (!imageUrls.length) {
      return res.status(422).json({ message: "Car has no images to analyse" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "OpenAI API key not configured" });
    }

    const client = new OpenAI({ apiKey });

    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "auto" as const },
    }));

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert car identifier. Given car photos, return ONLY JSON:
{"make":string,"model":string,"year":number|null,"type":"Sedan"|"SUV"|"Hatchback"|"Pickup"|"Van"|"Truck"|"Coupe"|"Convertible"|"Wagon"|"Minivan"|"Other","color":string|null,"confidence":"high"|"medium"|"low","description":string}`,
        },
        {
          role: "user",
          content: [
            ...imageContent,
            { type: "text" as const, text: "Identify this car." },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return res.status(502).json({ message: "Vision API returned empty response" });

    const identified = JSON.parse(raw);

    const UNKNOWNS = new Set(["unknown", "car", "vehicle", "auto", "automobile", ""]);
    const updates: Record<string, unknown> = {};

    if (identified.make && !UNKNOWNS.has((car.make ?? "").toLowerCase())) {
      // only overwrite if car's make is actually unknown/blank
    } else if (identified.make && !UNKNOWNS.has(identified.make.toLowerCase())) {
      updates.make = identified.make;
    }

    if (UNKNOWNS.has((car.model ?? "").toLowerCase()) && identified.model && !UNKNOWNS.has(identified.model.toLowerCase())) {
      updates.model = identified.model;
    }
    if (!car.year && identified.year) updates.year = identified.year;
    if (!car.color && identified.color) updates.color = identified.color;
    if ((!car.description || car.description.length < 50) && identified.description) {
      updates.description = identified.description;
    }

    const updated = Object.keys(updates).length > 0
      ? await storage.updateCar(carId, updates)
      : car;

    return res.json({
      identified,
      updated,
      fieldsPatched: Object.keys(updates),
    });
  } catch (error) {
    console.error("[cars/enrich] Error:", error);
    return res.status(500).json({ message: (error as Error).message });
  }
});

export default router;
