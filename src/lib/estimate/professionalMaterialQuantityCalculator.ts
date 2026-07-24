import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";
import type {
  ProfessionalMaterialQuantityFormulaInputs,
  ProfessionalMaterialQuantityLine,
  ProfessionalMaterialType,
} from "./professionalMaterialQuantityContract";
import { findProfessionalMaterialQuantityNorm } from "./professionalMaterialQuantityNormRegistry";
import { resolveProfessionalMaterialPackagingPolicy } from "./professionalMaterialPackagingPolicy";
import { resolveProfessionalMaterialWastePolicy } from "./professionalMaterialWastePolicy";

const FORMULA_FUNCTIONS = new Set([
  "abs",
  "ceil",
  "floor",
  "max",
  "min",
  "pow",
  "round",
  "round_to",
  "sqrt",
  "unit_convert",
]);

function normalizeUnit(unit: string): string {
  const value = unit.trim().toLowerCase();
  if (value === "linear_m" || value === "lm") return "m";
  if (value === "m²" || value === "sqm") return "m2";
  if (value === "m³" || value === "cbm") return "m3";
  if (value === "ton") return "t";
  return value || unit;
}

function roundQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(4));
}

function primitiveInputs(value: unknown): ProfessionalMaterialQuantityFormulaInputs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: ProfessionalMaterialQuantityFormulaInputs = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "number" || typeof item === "string" || typeof item === "boolean" || item === null) {
      result[key] = item;
    }
  }
  return result;
}

function formulaContextInputs(row: ProfessionalBoqRow): ProfessionalMaterialQuantityFormulaInputs {
  const source = row.sourceParameters ?? {};
  const topLevel = primitiveInputs(source);
  const context = primitiveInputs((source as Record<string, unknown>).formulaContext);
  if (source.asphaltV4 === true) {
    const formulaSymbols = extractFormulaSymbols(row.quantityFormula?.trim() || row.formulaId?.trim() || "");
    return formulaSymbols.reduce<ProfessionalMaterialQuantityFormulaInputs>((result, key) => {
      if (Object.hasOwn(context, key)) result[key] = context[key];
      else if (Object.hasOwn(topLevel, key)) result[key] = topLevel[key];
      return result;
    }, {});
  }
  return { ...context, ...topLevel };
}

function extractFormulaSymbols(formula: string): string[] {
  const symbols = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
  return [...new Set(symbols.filter((symbol) => !FORMULA_FUNCTIONS.has(symbol)))];
}

function classifyMaterialType(row: ProfessionalBoqRow): ProfessionalMaterialType {
  if (row.rowType === "transport") return "transport_service";
  if (row.rowType === "equipment") return "equipment_rental";
  if (row.rowType === "service") return "service";
  const unit = normalizeUnit(row.unit);
  const name = `${row.titleRu} ${row.materialKey ?? ""} ${row.rowId}`.toLowerCase();
  if (/cement|adhesive|glue|plaster|screed|concrete|asphalt|mix|mortar|bitumen/.test(name)) return "wet_mix";
  if (unit === "m") return "linear_material";
  if (unit === "m2") return "sheet_material";
  if (unit === "m3" || unit === "t") return "bulk_material";
  if (unit === "pcs") return "piece_material";
  if (unit === "set") return "set_material";
  if (unit === "kg" || unit === "l" || unit === "roll" || unit === "pack") return "consumable";
  return "consumable";
}

function resolveSourceId(row: ProfessionalBoqRow, normSourceId: string | null | undefined): string {
  return row.normSourceId?.trim() || row.sourceId?.trim() || normSourceId?.trim() || "engineering_reference_formula";
}

function resolveCitationLabel(row: ProfessionalBoqRow, normCitationLabel: string | null | undefined): string {
  return row.normSourceTitle?.trim() || row.sourceLabel?.trim() || normCitationLabel?.trim() || "Engineering reference formula";
}

function hasFormula(row: ProfessionalBoqRow, normFormula: string | null | undefined): string {
  return row.quantityFormula?.trim() || normFormula?.trim() || row.formulaId?.trim() || "";
}

export function isProfessionalMaterialQuantityRow(row: ProfessionalBoqRow): boolean {
  return row.includedInProcurement &&
    row.rowType !== "work" &&
    row.rowType !== "labor" &&
    row.rowType !== "document" &&
    row.rowType !== "other";
}

export function calculateProfessionalMaterialQuantityLine(input: {
  row: ProfessionalBoqRow;
  templateId: string;
  family: string;
}): ProfessionalMaterialQuantityLine {
  const norm = findProfessionalMaterialQuantityNorm({ row: input.row, family: input.family });
  const materialType = norm?.materialType ?? classifyMaterialType(input.row);
  const formulaInputs = formulaContextInputs(input.row);
  const formula = hasFormula(input.row, norm?.formula);
  const formulaSymbols = extractFormulaSymbols(formula);
  const quantityDependsOnParams = [...new Set([
    ...formulaSymbols,
    ...Object.keys(formulaInputs).filter((key) => !/^rowCode$|^group$|^lineType$|^includedInProcurement$/i.test(key)),
    ...(norm?.formulaInputsRequired ?? []),
  ])].filter((key) => key.trim().length > 0);
  const baseQuantity = roundQuantity(input.row.quantity);
  const netQuantity = baseQuantity;
  const wastePolicy = resolveProfessionalMaterialWastePolicy({
    family: input.family,
    materialName: input.row.titleRu,
    materialType,
    unit: input.row.unit,
  });
  const wastePercent = norm?.wastePercent ?? wastePolicy.wastePercent;
  const lossPercent = norm?.lossPercent ?? wastePolicy.lossPercent;
  const grossQuantity = roundQuantity(netQuantity * (1 + (wastePercent + lossPercent) / 100));
  const packaging = resolveProfessionalMaterialPackagingPolicy({
    materialName: input.row.titleRu,
    materialType,
    unit: input.row.unit,
    grossQuantity,
    normProcurementUnit: norm?.procurementUnit,
    normProcurementPackageSize: norm?.procurementPackageSize,
  });
  const sourceId = resolveSourceId(input.row, norm?.sourceId);
  const citationLabel = resolveCitationLabel(input.row, norm?.citationLabel);
  const quantityState = !isProfessionalMaterialQuantityRow(input.row)
    ? "not_applicable"
    : formula && sourceId
      ? "calculated"
      : "requires_source_quantity";

  return {
    rowId: input.row.rowId,
    templateId: input.templateId || input.row.templateId || "",
    family: input.family || input.row.normFamilyId || "",
    materialName: input.row.titleRu,
    materialType,
    unit: normalizeUnit(input.row.unit),
    baseQuantity,
    wastePercent,
    lossPercent,
    netQuantity,
    grossQuantity,
    procurementUnit: packaging.procurementUnit,
    procurementPackageSize: packaging.procurementPackageSize,
    procurementQuantity: packaging.procurementQuantity,
    formula,
    formulaInputs,
    formulaResult: baseQuantity,
    sourceId,
    citationLabel,
    calculationTrace: [
      `base=${baseQuantity} ${normalizeUnit(input.row.unit)}`,
      `waste=${wastePercent}%`,
      `loss=${lossPercent}%`,
      `gross=${grossQuantity} ${normalizeUnit(input.row.unit)}`,
      `procurement=${packaging.procurementQuantity} ${packaging.procurementUnit}`,
      `rounding=${packaging.roundingRule}`,
      `source=${sourceId}`,
    ].join("; "),
    quantityDependsOnParams,
    quantityState,
  };
}

export function attachProfessionalMaterialQuantityLines(input: {
  rows: readonly ProfessionalBoqRow[];
  templateId: string;
  family: string;
}): ProfessionalBoqRow[] {
  return input.rows.map((row) => {
    if (!isProfessionalMaterialQuantityRow(row)) {
      return { ...row, materialQuantity: null };
    }
    return {
      ...row,
      materialQuantity: calculateProfessionalMaterialQuantityLine({
        row,
        templateId: input.templateId,
        family: input.family,
      }),
    };
  });
}
