import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull(),
  userId: integer("user_id").notNull(),
  hostId: integer("host_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  totalAmount: integer("total_amount").notNull(),
  platformFee: integer("platform_fee").default(0),
  hostPayout: integer("host_payout").default(0),
  currency: text("currency").notNull().default("FCFA"),
  paymentMethod: text("payment_method"),
  paymentId: text("payment_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  platformFee: true,
  hostPayout: true,
  paymentId: true,
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
