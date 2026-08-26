import type {
  StripFoundationBoqRow,
  StripFoundationCompiledRow,
} from "./reinforcedConcreteStripFoundationR1";

export type RealProfessionalEstimateGateIssue = {
  code:
    | "CATEGORY_FORBIDDEN"
    | "GENERIC_NAME_TEMPLATE"
    | "NON_BILLABLE_ROW"
    | "RAW_LABOR_ROW"
    | "MISSING_FORMULA"
    | "MISSING_SOURCE"
    | "DUPLICATE_SEMANTIC_OWNER"
    | "DELIVERY_WITHOUT_CARGO"
    | "DELIVERY_WITHOUT_DISTANCE"
    | "DELIVERY_WITHOUT_VEHICLE"
    | "NON_POSITIVE_QUANTITY";
  rowId: string;
  detail: string;
};

const ALLOWED_CATEGORIES = new Set(["material", "construction_work", "machine_equipment", "delivery"]);
const GENERIC_TITLE = /(?:поставка состава|материал для выполнения|выполнение\s+[^,.]+$|работа механизма|рабочая детализация)/iu;
const NON_BILLABLE_TITLE = /(?:контрол|надзор|журнал|акт\b|реестр|паспорт|сертификат|фото|инструктаж|обмер|подтвержден|согласован|проектирован|испытан|мониторинг|при[её]мк|сдач|передач[аи]|хранен|координац|сиз\b)/iu;
const RAW_LABOR = /(?:worker_h|man_hour|чел\.?-?ч|трудо[её]мкост)/iu;

export function auditRealProfessionalRowsR1(
  rows: readonly (StripFoundationBoqRow | StripFoundationCompiledRow)[],
): readonly RealProfessionalEstimateGateIssue[] {
  const issues: RealProfessionalEstimateGateIssue[] = [];
  const owners = new Set<string>();
  for (const row of rows) {
    const title = row.canonicalRuName.trim();
    if (!ALLOWED_CATEGORIES.has(row.category)) {
      issues.push({ code: "CATEGORY_FORBIDDEN", rowId: row.rowId, detail: row.category });
    }
    if (GENERIC_TITLE.test(title)) {
      issues.push({ code: "GENERIC_NAME_TEMPLATE", rowId: row.rowId, detail: title });
    }
    if (NON_BILLABLE_TITLE.test(title)) {
      issues.push({ code: "NON_BILLABLE_ROW", rowId: row.rowId, detail: title });
    }
    if (RAW_LABOR.test(`${title} ${row.normalizedUom}`)) {
      issues.push({ code: "RAW_LABOR_ROW", rowId: row.rowId, detail: `${title}:${row.normalizedUom}` });
    }
    if (!row.formulaId.trim()) {
      issues.push({ code: "MISSING_FORMULA", rowId: row.rowId, detail: "formulaId" });
    }
    if (!row.normSource.sourceKey.trim() || !row.normSource.locator.trim()) {
      issues.push({ code: "MISSING_SOURCE", rowId: row.rowId, detail: row.normSource.sourceKey });
    }
    if (owners.has(row.semanticOwnerId)) {
      issues.push({ code: "DUPLICATE_SEMANTIC_OWNER", rowId: row.rowId, detail: row.semanticOwnerId });
    }
    owners.add(row.semanticOwnerId);
    if (row.category === "delivery") {
      if (!row.cargo?.cargoRu.trim()) issues.push({ code: "DELIVERY_WITHOUT_CARGO", rowId: row.rowId, detail: title });
      if (!row.cargo?.distanceParameterId.trim()) issues.push({ code: "DELIVERY_WITHOUT_DISTANCE", rowId: row.rowId, detail: title });
      if (!row.cargo?.vehicleRu.trim()) issues.push({ code: "DELIVERY_WITHOUT_VEHICLE", rowId: row.rowId, detail: title });
    }
    if ("evaluatedQuantity" in row && Number(row.evaluatedQuantity) <= 0) {
      issues.push({ code: "NON_POSITIVE_QUANTITY", rowId: row.rowId, detail: row.evaluatedQuantity });
    }
  }
  return issues;
}
