import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../lib/storage";
import { hashPassword, verifyPassword } from "../lib/auth";
import { sanitizeInput } from "../lib/sanitize";

const router: IRouter = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});
router.use(authLimiter);

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { fullName, username, phoneNumber, password } = req.body;

    if (!fullName || !username || !phoneNumber || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }

    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const cleanFullName = sanitizeInput(fullName);
    const cleanUsername = sanitizeInput(username);

    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username: cleanUsername,
      password: hashedPassword,
      fullName: cleanFullName,
      phoneNumber,
      role: "renter",
      isHost: false,
      isVerified: false,
      verificationStatus: "unverified",
    });

    req.session.userId = user.id;
    const { password: _, ...safeUser } = user;
    return res.status(201).json(safeUser);
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    req.session.userId = user.id;
    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully" });
  });
});

export default router;
