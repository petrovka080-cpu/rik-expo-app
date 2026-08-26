import { createHash } from "node:crypto";

import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  buildAllR555AsphaltCanonicalDefinitions,
  buildR555AsphaltLineageSummary,
} from "../../scripts/estimate/r555/asphaltCanonicalDefinitionsR555";

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

describe("R5.5.5 canonical asphalt definitions", () => {
  it("preserves R63/M44/A19 lineage and compiles every technology with a positive fully priced BOQ", async () => {
    const definitions = buildAllR555AsphaltCanonicalDefinitions();
    expect(buildR555AsphaltLineageSummary(definitions)).toEqual(expect.objectContaining({
      sourceIdentities: 35,
      catalogRecords: 63,
      technologies: 44,
      aliases: 19,
      exclusions: 3,
      boqRows: 3709,
      parameters: 3889,
      canonicalDefinitionRows: 1300,
      canonicalDefinitionParameters: 1572,
      missing: 0,
      unexplained: 0,
      duplicate: 0,
      orphan: 0,
      searchWithoutCompilableDefinition: 0,
    }));

    const snapshotId = "33333333-3333-4333-8333-333333333333";
    for (const definition of definitions) {
      expect(new Set(definition.resources.map((row) => row.semanticOwner)).size).toBe(definition.resources.length);
      expect(new Set(definition.resources.map((row) => row.costOwnerId)).size).toBe(definition.resources.length);
      const publicText = [
        definition.titleRu,
        ...definition.aliasesRu,
        ...definition.parameters.map((row) => row.titleRu),
        ...definition.resources.flatMap((row) => [row.section, row.category, row.titleRu]),
      ].join("\n");
      expect(publicText).not.toMatch(/\b(?:generic|fallback|warning|material|works?|machine|test|parking|recycling|none|low)\b/iu);
      expect(publicText).not.toMatch(/(?:поставка состава|работа механизма|выполнение работ)/iu);
      expect(publicText).not.toContain("0.000001");

      const compiled = await compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "r555-asphalt-contract-test",
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
          estimate_price_snapshot: { route_id: "44444444-4444-4444-8444-444444444444" },
        })),
        maximumResourceRows: 2_000,
        hashJson: sha256,
      });

      expect(compiled.rows).toHaveLength(definition.resources.length);
      expect(compiled.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
      expect(compiled.rows.every((row) => row.unit_price != null && row.amount != null)).toBe(true);
      expect(compiled.totals).toEqual(expect.objectContaining({
        includedRowCount: definition.resources.length,
        excludedRowCount: 0,
        pricedRowCount: definition.resources.length,
        unpricedRowCount: 0,
        currencyCode: "KGS",
      }));
      expect(Number(compiled.totals.amount)).toBeGreaterThan(0);
    }
  });
});
