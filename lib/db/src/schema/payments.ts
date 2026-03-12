import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("FCFA"),
  method: text("method").notNull(),
  providerPaymentId: text("provider_payment_id"),
  status: text("status").notNull().default("pending"),
  idempotencyKey: text("idempotency_key"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  providerPaymentId: true,
  status: true,
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
