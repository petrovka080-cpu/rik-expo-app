import {
  hashOpaqueId,
  normalizeProcurementLabel,
  normalizeProcurementOptionalText,
  normalizeProcurementPositiveNumber,
  normalizeProcurementText,
  uniqueProcurementRefs,
} from "../procurement/procurementRedaction";

export {
  hashOpaqueId as hashProcurementCopilotOpaqueId,
  normalizeProcurementLabel as normalizeProcurementCopilotLabel,
  normalizeProcurementOptionalText as normalizeProcurementCopilotOptionalText,
  normalizeProcurementPositiveNumber as normalizeProcurementCopilotPositiveNumber,
  normalizeProcurementText as normalizeProcurementCopilotText,
  uniqueProcurementRefs as uniqueProcurementCopilotRefs,
};

export function clampProcurementCopilotLimit(value: unknown, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

export function sanitizeProcurementCopilotReason(value: unknown, fallback: string): string {
  const normalized = normalizeProcurementText(value);
  if (!normalized) return fallback;
  return normalized
    .replace(/(?:sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{16,}|Bearer\s+[0-9A-Za-z._-]{8,})/g, "[redacted]")
    .slice(0, 240);
}
