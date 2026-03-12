import app from "./app";
import { db } from "@workspace/db";
import { cars, bookings, payments } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/** One-time fix: convert any legacy FCFA records to GHS (1 GHS ≈ 38 FCFA) */
async function fixFcfaRecords() {
  try {
    const fcfaCars = await db.select().from(cars).where(eq(cars.currency, "FCFA"));
    if (fcfaCars.length === 0) return;

    console.log(`[startup] Fixing ${fcfaCars.length} car(s) with FCFA currency → GHS`);
    await db.update(cars)
      .set({
        currency: "GHS",
        dailyRate: sql`GREATEST(50, ROUND(${cars.dailyRate} / 38.0)::int)`,
      })
      .where(eq(cars.currency, "FCFA"));

    await db.update(bookings)
      .set({
        currency: "GHS",
        totalAmount: sql`GREATEST(50, ROUND(${bookings.totalAmount} / 38.0)::int)`,
      })
      .where(eq(bookings.currency, "FCFA"));

    await db.update(payments)
      .set({
        currency: "GHS",
        amount: sql`GREATEST(50, ROUND(${payments.amount} / 38.0)::int)`,
      })
      .where(eq(payments.currency, "FCFA"));

    console.log(`[startup] FCFA → GHS migration complete.`);
  } catch (err) {
    console.error("[startup] FCFA fix failed (non-fatal):", err);
  }
}

fixFcfaRecords().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
