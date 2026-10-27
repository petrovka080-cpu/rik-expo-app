export function parseS2BLocalizedNumber(value: string): number {
  return Number(value.replace(/\s+/g, "").replace(",", "."));
}

export function parseS2BPositiveNumber(value: string | number | boolean | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = parseS2BLocalizedNumber(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}
