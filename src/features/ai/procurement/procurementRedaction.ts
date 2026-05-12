const HASH_OFFSET = 2166136261;
const HASH_PRIME = 16777619;

export function normalizeProcurementText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeProcurementOptionalText(value: unknown): string | undefined {
  const normalized = normalizeProcurementText(value);
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeProcurementPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

export function clampProcurementLimit(value: unknown, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

export function hashOpaqueId(scope: string, value: unknown): string {
  const normalized = `${scope}:${normalizeProcurementText(String(value ?? "")) || "missing"}`;
  let hash = HASH_OFFSET;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, HASH_PRIME);
  }
  return `${scope}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function toLocationBucket(location: unknown): string | undefined {
  const normalized = normalizeProcurementOptionalText(location);
  return normalized ? `location_${hashOpaqueId("bucket", normalized).slice(-8)}` : undefined;
}

export function uniqueProcurementRefs(refs: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const ref of refs) {
    const normalized = normalizeProcurementText(ref);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

export function normalizeProcurementLabel(value: unknown, fallback: string): string {
  return normalizeProcurementOptionalText(value) ?? fallback;
}
