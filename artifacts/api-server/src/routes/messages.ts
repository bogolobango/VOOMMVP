import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../lib/storage";
import { sanitizeInput } from "../lib/sanitize";

const router: IRouter = Router();

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages, please slow down." },
});

router.get("/", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const threads = await storage.getMessageThreads(req.user.id);
  return res.json(threads);
});

router.get("/:userId", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const partnerId = parseInt(req.params.userId);
  if (isNaN(partnerId)) return res.status(400).json({ message: "Invalid user ID" });

  const msgs = await storage.getConversation(req.user.id, partnerId);
  // Mark messages as read
  await storage.markMessagesRead(partnerId, req.user.id);
  return res.json(msgs);
});

router.post("/", messageLimiter, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const { receiverId, content, bookingId } = req.body;
    if (!receiverId || !content) return res.status(400).json({ message: "Receiver and content are required" });

    const msg = await storage.sendMessage({
      senderId: req.user.id,
      receiverId: parseInt(receiverId),
      content: sanitizeInput(content),
      bookingId: bookingId ? parseInt(bookingId) : undefined,
    });
    return res.status(201).json(msg);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
