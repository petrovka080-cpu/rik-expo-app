export * from "../../../../src/lib/format";

export function itemCode(value: string | number | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "ITEM-—";
  return `ITEM-${raw.replace(/[^0-9A-Za-z-]+/g, "").slice(0, 8) || raw.slice(0, 8)}`;
}
