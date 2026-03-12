import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  type: text("type").notNull().default("Sedan"),
  dailyRate: integer("daily_rate").notNull(),
  currency: text("currency").notNull().default("GHS"),
  location: text("location").notNull(),
  city: text("city"),
  country: text("country"),
  description: text("description"),
  imageUrl: text("image_url"),
  images: text("images").array(),
  color: text("color"),
  licensePlate: text("license_plate"),
  rating: integer("rating"),
  ratingCount: integer("rating_count").default(0),
  available: boolean("available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  features: text("features").array(),
  status: text("status").default("active"),
  transmission: text("transmission"),
  fuelType: text("fuel_type"),
  seats: integer("seats"),
});

export const insertCarSchema = createInsertSchema(cars).omit({
  id: true,
  createdAt: true,
});

export type Car = typeof cars.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
