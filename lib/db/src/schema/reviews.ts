import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(),
  revieweeId: integer("reviewee_id").notNull(),
  carId: integer("car_id").notNull(),
  rating: integer("rating").notNull(),
  text: text("text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
