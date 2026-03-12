/**
 * Strip HTML tags from a string to prevent stored XSS.
 */
export function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitize all string values in an object (shallow, one level deep).
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, keys: (keyof T)[]): T {
  const result = { ...obj };
  for (const key of keys) {
    if (typeof result[key] === "string") {
      (result as any)[key] = sanitizeInput(result[key] as string);
    }
  }
  return result;
}
