import {
  reconcileExpandedTemplateRows,
  type ReconciliableExpandedTemplateRow,
} from "../../src/lib/ai/estimateCompiler/expandedTemplateRowReconciliation";
import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";

function row(
  code: string,
  title: string,
  unit = "sq_m",
  quantityFormula = "q",
  unitPrice = 100,
): ReconciliableExpandedTemplateRow {
  return {
    code,
    title,
    section: "labor",
    quantityFormula,
    unit,
    unitPrice,
    includedByDefault: true,
  };
}

function semanticSnapshot(rows: readonly ReconciliableExpandedTemplateRow[]) {
  return rows.map((item) => ({
    code: item.code,
    formula: item.quantityFormula,
    unit: item.unit,
    price: item.unitPrice,
    lineage: item.duplicateLineage?.map((entry) => entry.rowCode).sort() ?? [],
  })).sort((left, right) => left.code.localeCompare(right.code));
}

describe("expanded template semantic row reconciliation", () => {
  it("merges the confirmed catalog-anchor/category-group duplicate with stable lineage and price ownership", () => {
    const anchor = row("tile_catalog_anchor_labor_1", "Разметка основания", "sq_m", "q", 125);
    const group = row("tile_group_labor_4", "Разметка основания", "sq_m", "q", 100);

    const result = reconcileExpandedTemplateRows([group, anchor]);

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe(anchor.code);
    expect(result[0].unitPrice).toBe(125);
    expect(result[0].duplicateLineage).toEqual([
      { rowCode: anchor.code, role: "catalog_anchor", unitPrice: 125 },
      { rowCode: group.code, role: "category_group", unitPrice: 100 },
    ]);
    expect(anchor.unitPrice + group.unitPrice).toBe(225);
    expect(result.reduce((sum, item) => sum + item.unitPrice, 0)).toBe(125);
  });

  it("does not delete different operations merely because their rendered titles match", () => {
    const survey = row("tile_group_labor_1", "Подготовка участка", "set", "1");
    const marking = row("tile_group_labor_2", "Подготовка участка", "set", "1");

    expect(reconcileExpandedTemplateRows([survey, marking]).map((item) => item.code)).toEqual([
      survey.code,
      marking.code,
    ]);
  });

  it("preserves equal labels in different layers and incompatible dimensions", () => {
    const baseLayer = row("floor_group_labor_1", "Укладка линолеума", "sq_m");
    const finishLayer = row("floor_group_labor_2", "Укладка линолеума", "sq_m");
    const perimeter = row("floor_group_labor_3", "Укладка линолеума", "linear_m");

    expect(reconcileExpandedTemplateRows([baseLayer, finishLayer, perimeter])).toHaveLength(3);
  });

  it("keeps a catalog/group label collision when formula ownership differs", () => {
    const anchor = row("wall_catalog_anchor_labor_1", "Разметка", "sq_m", "q");
    const group = row("wall_group_labor_1", "Разметка", "sq_m", "1");

    expect(reconcileExpandedTemplateRows([anchor, group])).toHaveLength(2);
  });

  it("is invariant to input order for identities, formulas, quantities basis, and selected price", () => {
    const anchor = row("roof_catalog_anchor_labor_1", "Монтаж покрытия", "sq_m", "q", 140);
    const duplicate = row("roof_group_labor_1", "Монтаж покрытия", "sq_m", "q", 90);
    const inspection = row("roof_group_labor_2", "Обследование", "set", "1", 50);

    expect(semanticSnapshot(reconcileExpandedTemplateRows([anchor, duplicate, inspection])))
      .toEqual(semanticSnapshot(reconcileExpandedTemplateRows([inspection, duplicate, anchor])));
  });

  it("publishes the real catalog/group reconciliation lineage through the estimate row", () => {
    const estimate = buildProfessionalExpandedGlobalEstimate({
      workKey: "baseboard_installation",
      estimateInput: {
        explicitWorkKey: "baseboard_installation",
        volume: 20,
        unit: "linear_m",
        countryCode: "KG",
        city: "Bishkek",
        language: "ru",
        locale: "ru-KG",
        currency: "KGS",
      },
    });
    const rows = estimate.sections.flatMap((section) => section.rows);
    const anchor = rows.find((item) => item.code === "baseboard_installation_catalog_anchor_labor_1");

    expect(anchor?.sourceParameters?.duplicateLineage).toEqual([
      {
        rowCode: "baseboard_installation_catalog_anchor_labor_1",
        role: "catalog_anchor",
        unitPrice: expect.any(Number),
      },
      {
        rowCode: "baseboard_installation_group_labor_7",
        role: "category_group",
        unitPrice: expect.any(Number),
      },
    ]);
    expect(rows.some((item) => item.code === "baseboard_installation_group_labor_7")).toBe(false);
    expect(anchor?.semanticSignature).toContain("owner=baseboard_installation_catalog_anchor_labor_1");
  });
});
