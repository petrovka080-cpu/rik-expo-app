import type {
  ProfessionalEstimateRecipeRow,
  ProfessionalEstimateUnit,
} from "./professionalEstimateTypes";

export type ProfessionalFormulaInput = {
  quantity: number;
  unit: ProfessionalEstimateUnit;
};

export type ProfessionalFormulaResult = {
  value: number | null;
  parse_failed: boolean;
  negative_quantity: boolean;
  nan_quantity: boolean;
  waste_applied: boolean;
};

function evaluateSimpleQuantityFormula(formula: string, quantity: number): number | null {
  const trimmed = formula.replace(/\s+/g, " ").trim();
  if (trimmed === "quantity") return quantity;
  const multiply = /^quantity \* ([0-9]+(?:\.[0-9]+)?)$/.exec(trimmed);
  if (multiply) return quantity * Number(multiply[1]);
  const divide = /^quantity \/ ([0-9]+(?:\.[0-9]+)?)$/.exec(trimmed);
  if (divide) return quantity / Number(divide[1]);
  const plus = /^quantity \+ ([0-9]+(?:\.[0-9]+)?)$/.exec(trimmed);
  if (plus) return quantity + Number(plus[1]);
  const fixed = /^([0-9]+(?:\.[0-9]+)?)$/.exec(trimmed);
  if (fixed) return Number(fixed[1]);
  return null;
}

export function calculateProfessionalRecipeRowQuantity(
  row: ProfessionalEstimateRecipeRow,
  input: ProfessionalFormulaInput,
): ProfessionalFormulaResult {
  const raw = evaluateSimpleQuantityFormula(row.quantity_formula, input.quantity);
  if (raw === null) {
    return {
      value: null,
      parse_failed: true,
      negative_quantity: false,
      nan_quantity: false,
      waste_applied: false,
    };
  }
  const withWaste = raw * (1 + row.waste_percent / 100);
  const rounded = Number(withWaste.toFixed(4));
  return {
    value: rounded,
    parse_failed: false,
    negative_quantity: rounded < 0,
    nan_quantity: Number.isNaN(rounded),
    waste_applied: row.waste_percent > 0 ? rounded >= raw : true,
  };
}
