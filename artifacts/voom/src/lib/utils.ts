import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyType = "FCFA" | "GHS" | "USD";

const CONVERSION_RATES: Record<CurrencyType, number> = {
  "GHS": 1,
  "FCFA": 37.5,
  "USD": 0.065,
};

export function convertCurrency(amount: number, from: CurrencyType, to: CurrencyType): number {
  if (from === to) return amount;
  const inGHS = from === "GHS" ? amount : amount / CONVERSION_RATES[from];
  return to === "GHS" ? inGHS : inGHS * CONVERSION_RATES[to];
}

export function formatCurrency(amount: number, currency: string = "GHS"): string {
  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };
  const formatted = amount.toLocaleString(undefined, formatOptions);
  switch (currency) {
    case "USD":
      return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "GHS":
      return `₵${formatted}`;
    case "FCFA":
    default:
      return `${formatted} ${currency}`;
  }
}

export function getDaysDifference(start: Date | string, end: Date | string): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
}

export function getHoursDifference(start: Date | string, end: Date | string): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.floor(((e.getTime() - s.getTime()) % (1000 * 3600 * 24)) / (1000 * 3600));
}

export function formatDuration(start: Date | string, end: Date | string): string {
  const days = getDaysDifference(start, end);
  const hours = getHoursDifference(start, end);
  if (days === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  if (hours === 0) return `${days} day${days !== 1 ? "s" : ""}`;
  return `${days} day${days !== 1 ? "s" : ""} and ${hours} hour${hours !== 1 ? "s" : ""}`;
}

export function calculateTotalAmount(dailyRate: number, start: Date | string, end: Date | string): number {
  const days = getDaysDifference(start, end);
  const hours = getHoursDifference(start, end);
  return Math.round(dailyRate * days + (dailyRate / 24) * hours);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function formatDateAndTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
    case "active":
    case "completed":
      return "text-green-600 bg-green-50";
    case "pending":
      return "text-yellow-600 bg-yellow-50";
    case "cancelled":
    case "rejected":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}
