import type {
  EstimateDraftRevisionParam,
  ProfessionalBoqRow,
} from "../estimateDraftRevisionContract";
import { calculateProfessionalMaterialQuantityLine } from "../professionalMaterialQuantityCalculator";
import { recalculateProfessionalBoqRowsFromParams } from "../recalculateProfessionalBoqRowsFromParams";
import {
  clearAiEstimateFormulaRuntimeCaches,
  evaluateAiEstimateQuantityFormula,
  extractAiEstimateFormulaIdentifiers,
  getAiEstimateFormulaRuntimeCacheStats,
} from "./evaluateAiEstimateQuantityFormula";

function row(input: Partial<ProfessionalBoqRow> & Pick<ProfessionalBoqRow, "rowId">): ProfessionalBoqRow {
  return {
    rowType: "material",
    titleRu: input.rowId,
    quantity: 1,
    unit: "kg",
    currency: "KGS",
    includedInProcurement: true,
    ...input,
  };
}

function param(value: EstimateDraftRevisionParam["value"]): EstimateDraftRevisionParam {
  return {
    value,
    source: "edited_by_user",
    lastChangedAt: "2026-09-09T00:00:00.000Z",
  };
}

describe("AI estimate quantity formula optimized runtime equivalence", () => {
  afterEach(() => clearAiEstimateFormulaRuntimeCaches());

  it("extracts identifiers from the supported token grammar instead of substring heuristics", () => {
    const formula = "min + min(a, aa) + zero";

    const firstIdentifiers = extractAiEstimateFormulaIdentifiers(formula);
    expect(firstIdentifiers).toEqual(["a", "aa", "min", "zero"]);
    firstIdentifiers.push("caller_mutation");
    expect(extractAiEstimateFormulaIdentifiers(formula)).toEqual(["a", "aa", "min", "zero"]);
    expect(evaluateAiEstimateQuantityFormula({
      formula,
      env: { min: 10, a: 2, aa: 3, zero: 0 },
    })).toEqual({
      ok: true,
      value: 12,
      dependencies: ["a", "aa", "min", "zero"],
      missingDependencies: [],
      unsupportedTokens: [],
      error: null,
    });
  });

  it("keeps missing, null, zero, unsupported Unicode and malformed syntax distinct", () => {
    expect(evaluateAiEstimateQuantityFormula({ formula: "a + missing", env: { a: 0 } })).toMatchObject({
      ok: false,
      value: null,
      dependencies: ["a", "missing"],
      missingDependencies: ["missing"],
      error: "missing_dependencies",
    });
    expect(evaluateAiEstimateQuantityFormula({
      formula: "nullish + 1",
      env: { nullish: null } as never,
    })).toMatchObject({
      ok: false,
      value: null,
      dependencies: ["nullish"],
      missingDependencies: [],
      error: "non_finite_identifier:nullish",
    });
    expect(evaluateAiEstimateQuantityFormula({ formula: "zero + 1", env: { zero: 0 } })).toMatchObject({
      ok: true,
      value: 1,
      dependencies: ["zero"],
    });
    expect(evaluateAiEstimateQuantityFormula({ formula: "\u043f\u043b\u043e\u0449\u0430\u0434\u044c * 2", env: {} })).toMatchObject({
      ok: false,
      value: null,
      dependencies: [],
      error: "unsupported_tokens",
    });
    expect(evaluateAiEstimateQuantityFormula({ formula: "a + (2", env: { a: 1 } })).toMatchObject({
      ok: false,
      value: null,
      error: "unexpected_end",
    });
  });

  it("matches the frozen pre-optimization environment precedence and transitive row vector", () => {
    const rows = [
      row({
        rowId: "base_row",
        quantity: 2,
        quantityFormula: null,
        sourceParameters: {
          passportBackedNaturalLanguageIngress: true,
          shared: 1,
        },
      }),
      row({
        rowId: "direct_row",
        quantity: 999,
        quantityFormula: "shared + q + baseQuantity + base_row + a + aa + zero",
        sourceParameters: {
          formulaContext: { shared: 2, q: 2, baseQuantity: 2, a: 3, aa: 4, zero: 99 },
        },
      }),
      row({ rowId: "transitive_row", quantity: 999, quantityFormula: "direct_row * 2" }),
    ];
    const params = {
      area_m2: param(100),
      shared: param(5),
      q: param(7),
      zero: param(0),
      unrelated: param(123456),
    };

    const recalculated = recalculateProfessionalBoqRowsFromParams({ rows, params });

    expect(recalculated.map(({ rowId, quantity, unit }) => ({ rowId, quantity, unit }))).toEqual([
      { rowId: "base_row", quantity: 2, unit: "kg" },
      { rowId: "direct_row", quantity: 121, unit: "kg" },
      { rowId: "transitive_row", quantity: 242, unit: "kg" },
    ]);
  });

  it("does not reuse mutable formula context across estimates", () => {
    const sourceParameters = {
      asphaltV4: true,
      formulaContext: { area_m2: 10, factor: 2 },
    };
    const mutableRow = row({
      rowId: "mutable_context",
      quantityFormula: "area_m2 * factor",
      sourceParameters,
    });
    const first = calculateProfessionalMaterialQuantityLine({
      row: mutableRow,
      templateId: "template-a",
      family: "family-a",
    });
    sourceParameters.formulaContext.factor = 3;
    const second = calculateProfessionalMaterialQuantityLine({
      row: mutableRow,
      templateId: "template-b",
      family: "family-b",
    });

    expect(first.formulaInputs).toEqual({ area_m2: 10, factor: 2 });
    expect(second.formulaInputs).toEqual({ area_m2: 10, factor: 3 });
    expect(first.formulaInputs).not.toBe(second.formulaInputs);
  });

  it("keeps both formula caches bounded under a long-lived mixed workload", () => {
    for (let index = 0; index < 2_200; index += 1) {
      const formula = `value_${index} + ${index}`;
      expect(evaluateAiEstimateQuantityFormula({ formula, env: { [`value_${index}`]: 1 } }).ok).toBe(true);
      extractAiEstimateFormulaIdentifiers(formula);
    }

    expect(getAiEstimateFormulaRuntimeCacheStats()).toEqual({
      token_cache_size: 2048,
      identifier_cache_size: 2048,
      limit_per_cache: 2048,
    });
  });
});
