import { Request, Response, NextFunction, Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string; [key: string]: any };
    }
  }
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  if (!process.env.SESSION_SECRET) {
    console.warn("⚠️  SESSION_SECRET not set — using random secret. Sessions will not persist across restarts.");
  }

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    })
  );

  // Load user on every request
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    if (req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = user as any;
        }
      } catch {
        // ignore
      }
    }
    next();
  });

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  return { requireAuth };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
