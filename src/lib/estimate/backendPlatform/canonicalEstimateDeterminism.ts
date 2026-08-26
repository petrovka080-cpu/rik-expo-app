type JsonRecord = Record<string, unknown>;

export function canonicalEstimateStableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalEstimateStableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalEstimateStableJson(record[key])}`).join(",")}}`;
}

export function canonicalRoundDecimal(value: string, scale: number): string {
  if (!/^[+-]?\d+(?:\.\d+)?$/u.test(value) || !Number.isInteger(scale) || scale < 0 || scale > 12) {
    throw Object.assign(new Error("invalid decimal"), { code: "DEFINITION_INTEGRITY_FAILED" });
  }
  const negative = value.startsWith("-");
  const unsigned = value.replace(/^[+-]/u, "");
  const [integer, fraction = ""] = unsigned.split(".");
  const padded = `${fraction}${"0".repeat(scale + 1)}`;
  let scaled = BigInt(`${integer}${padded.slice(0, scale)}` || "0");
  if (Number(padded[scale] ?? "0") >= 5) scaled += 1n;
  const digits = scaled.toString().padStart(scale + 1, "0");
  const rendered = scale === 0
    ? digits
    : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/\.?0+$/u, "");
  return negative && rendered !== "0" ? `-${rendered}` : rendered;
}
