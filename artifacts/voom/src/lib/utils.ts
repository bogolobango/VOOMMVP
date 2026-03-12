import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "FCFA") {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
    case "completed":
    case "active":
      return "bg-success/10 text-success border-success/20";
    case "pending":
      return "bg-warning/10 text-warning border-warning/20";
    case "rejected":
    case "cancelled":
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-secondary text-secondary-foreground border-border";
  }
}
