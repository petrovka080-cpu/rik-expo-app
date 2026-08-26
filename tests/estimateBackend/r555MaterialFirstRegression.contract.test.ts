import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  R555_REGRESSION_CATALOG_IDS,
  buildAllR555MaterialFirstDefinitions,
} from "../../scripts/estimate/r555/materialFirstConcreteRegressionR555";

const forbiddenPublic = [
  /поставка состава/iu,
  /поставка системы/iu,
  /работа механизма/iu,
  /выполнение работ/iu,
  /\b(?:generic|fallback|warning|material|works?|machine|test)\b/iu,
];

describe("R5.5.5 material-first regression definitions", () => {
  it("isolates both works and compiles a non-empty, fully priced, positive BOQ", async () => {
    const definitions = buildAllR555MaterialFirstDefinitions();
    expect(definitions.map((row) => row.catalogId)).toEqual([...R555_REGRESSION_CATALOG_IDS]);

    for (const definition of definitions) {
      expect(definition.resources).toHaveLength(25);
      expect(new Set(definition.resources.map((row) => row.semanticOwner)).size).toBe(25);
      expect(new Set(definition.resources.map((row) => row.costOwnerId)).size).toBe(25);
      expect(new Set(definition.resources.map((row) => row.category))).toEqual(new Set([
        "Материалы",
        "Труд",
        "Механизмы",
        "Доставка",
        "Контроль качества",
      ]));
      expect(definition.resources.filter((row) => row.rowType === "material").length).toBeGreaterThanOrEqual(6);
      expect(definition.resources.filter((row) => row.rowType === "labor").length).toBeGreaterThanOrEqual(8);
      expect(definition.resources.filter((row) => row.rowType === "equipment")).toHaveLength(3);
      expect(definition.resources.filter((row) => row.section === "Испытания и контроль качества")).toHaveLength(5);

      const publicText = [
        definition.titleRu,
        ...definition.parameters.map((row) => row.titleRu),
        ...definition.resources.map((row) => row.titleRu),
      ].join("\n");
      for (const pattern of forbiddenPublic) expect(publicText).not.toMatch(pattern);
      expect(publicText).not.toContain("0.000001");

      const snapshotId = "11111111-1111-4111-8111-111111111111";
      const compiled = await compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "r555-material-first-contract-test",
        catalogId: definition.catalogId,
        parameterDefinitions: definition.parameters.map((row) => ({
          parameter_id: row.parameterId,
          value_type: row.valueType,
          required: row.required,
          default_value: null,
          constraints_json: row.constraints,
        })),
        formulaDefinitions: definition.formulas.map((row) => ({
          formula_id: row.formulaId,
          ast: row.ast,
          input_parameter_ids: row.inputParameterIds,
          ast_sha256: row.astSha256,
        })),
        resourceDefinitions: definition.resources.map((row) => ({
          id: `spec:${row.rowId}`,
          row_id: row.rowId,
          ordinal: row.ordinal,
          section: row.section,
          category: row.category,
          title_ru: row.titleRu,
          unit_id: row.unitId,
          formula_id: row.formulaId,
          inclusion_ast: row.inclusionAst,
          resource_graph: row.resourceGraph,
          procurement_eligible: row.procurementEligible,
          cost_owner_id: row.costOwnerId,
          source_metadata: row.sourceMetadata,
          row_sha256: row.rowSha256,
        })),
        submittedParameters: {},
        confirmedParameters: definition.baseline,
        currencyCode: "KGS",
        priceSnapshotIds: [snapshotId],
        priceItems: definition.resources.map((row, index) => ({
          snapshot_id: snapshotId,
          price_key: row.costOwnerId,
          unit_id: row.unitId,
          unit_price: index + 1,
          currency_code: "KGS",
          estimate_price_snapshot: { route_id: "22222222-2222-4222-8222-222222222222" },
        })),
        maximumResourceRows: 2_000,
        hashJson: (value) => JSON.stringify(value).padEnd(64, "0").slice(0, 64).replace(/[^0-9a-f]/gu, "a"),
      });

      expect(compiled.rows).toHaveLength(25);
      expect(compiled.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
      expect(compiled.rows.every((row) => row.unit_price != null && row.amount != null)).toBe(true);
      expect(compiled.totals).toEqual(expect.objectContaining({
        includedRowCount: 25,
        excludedRowCount: 0,
        pricedRowCount: 25,
        unpricedRowCount: 0,
        currencyCode: "KGS",
      }));
      expect(Number(compiled.totals.amount)).toBeGreaterThan(0);
    }
  });

  it("keeps Node/local price loading behavior in parity with the edge worker", () => {
    const local = readFileSync(resolve(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    ), "utf8");
    expect(local).toContain("from public.estimate_price_snapshot_item item");
    expect(local).toContain("priceItems,");
  });
});
