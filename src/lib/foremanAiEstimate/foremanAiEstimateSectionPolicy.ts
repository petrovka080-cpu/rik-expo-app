import type { StructuredEstimateRow } from "../estimateStructuredPipeline/structuredEstimateTypes";
import type {
  ForemanDraftEstimateRow,
  ForemanEstimatePriceStatus,
  ForemanEstimateSection,
} from "./foremanAiEstimateContracts";

const NON_PROCUREMENT_SECTIONS: ReadonlySet<ForemanEstimateSection> = new Set([
  "labor",
  "tax",
  "quality_control",
  "overhead",
  "debug",
]);

const MATERIAL_PROCUREMENT_SECTIONS: ReadonlySet<ForemanEstimateSection> = new Set([
  "materials",
  "equipment",
  "delivery",
]);

const normalize = (value: unknown): string => String(value ?? "").trim().toLowerCase();

export function classifyForemanEstimateSection(row: Pick<StructuredEstimateRow, "sectionType" | "sectionTitle" | "visibleName">): ForemanEstimateSection {
  const title = normalize(`${row.sectionTitle} ${row.visibleName}`);
  if (title.includes("quality") || title.includes("control") || title.includes("\u043a\u043e\u043d\u0442\u0440\u043e\u043b")) {
    return "quality_control";
  }
  if (title.includes("overhead") || title.includes("\u043d\u0430\u043a\u043b\u0430\u0434")) {
    return "overhead";
  }
  if (row.sectionType === "materials") return "materials";
  if (row.sectionType === "labor") return "labor";
  if (row.sectionType === "equipment") return "equipment";
  if (row.sectionType === "delivery") return "delivery";
  if (row.sectionType === "tax") return "tax";
  return "debug";
}

export function isForemanProcurementSection(section: ForemanEstimateSection): boolean {
  return MATERIAL_PROCUREMENT_SECTIONS.has(section);
}

export function shouldIncludeForemanRowInBuyerProcurement(
  row: Pick<
    ForemanDraftEstimateRow,
    "section" | "includedInProcurement" | "includedInEstimate" | "quantity"
  > & { deletedByUser?: boolean },
): boolean {
  if (row.deletedByUser) return false;
  if (!row.includedInEstimate || !row.includedInProcurement) return false;
  if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) return false;
  if (NON_PROCUREMENT_SECTIONS.has(row.section)) return false;
  return MATERIAL_PROCUREMENT_SECTIONS.has(row.section);
}

export function toForemanRequestDraftKind(section: ForemanEstimateSection): "material" | "work" | "service" | null {
  if (section === "materials" || section === "equipment" || section === "delivery") return "material";
  if (section === "labor") return "work";
  if (section === "tax" || section === "quality_control" || section === "overhead") return "service";
  return null;
}

export function resolveForemanEstimatePriceStatus(row: Pick<StructuredEstimateRow, "unitPrice" | "includedInProcurement">, section: ForemanEstimateSection): ForemanEstimatePriceStatus {
  if (!isForemanProcurementSection(section) || !row.includedInProcurement) return "not_for_procurement";
  return Number(row.unitPrice) > 0 ? "priced" : "manual_price_required";
}

export function isBuyerProcurementKind(kind: unknown): boolean {
  const value = normalize(kind);
  if (!value) return true;
  return value === "material" || value === "materials" || value === "equipment" || value === "delivery";
}
