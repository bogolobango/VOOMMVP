import { Router, type IRouter, type Request, type Response } from "express";
import { storage } from "../lib/storage";

const router: IRouter = Router();

router.get("/me", (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const { password, ...safeUser } = req.user as any;
  return res.json(safeUser);
});

router.patch("/phone", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: "Phone number is required" });
    const updated = await storage.updateUser(req.user.id, { phoneNumber });
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password, ...safe } = updated;
    return res.json(safe);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.post("/profile-picture", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { profilePicture } = req.body;
    if (!profilePicture) return res.status(400).json({ message: "Profile picture URL is required" });
    const updated = await storage.updateUser(req.user.id, { profilePicture });
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password, ...safe } = updated;
    return res.json(safe);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.patch("/profile", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { profilePicture, fullName, phoneNumber } = req.body;
    const updates: Record<string, any> = {};
    if (profilePicture) updates.profilePicture = profilePicture;
    if (fullName) updates.fullName = fullName;
    if (phoneNumber) updates.phoneNumber = phoneNumber;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updated = await storage.updateUser(req.user.id, updates);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password, ...safe } = updated;
    return res.json(safe);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
