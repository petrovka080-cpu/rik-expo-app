import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildWaterBackendDefinitions } from "../../scripts/estimate/waterBackendR3/waterDomainModel";
import {
  collapseWaterS2721ControlDefinition,
  isWaterS2721IncludedControlRow,
} from "../../scripts/estimate/r4a13/waterS2721ControlCollapsedProjection";

const inventory = JSON.parse(readFileSync(resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
), "utf8")) as { groups: { batch_id: string; member_catalog_ids: string[] }[] };
const contentIds = new Set(inventory.groups
  .filter((group) => group.batch_id === "BATCH-006")
  .flatMap((group) => group.member_catalog_ids));

describe("S27.21 BATCH006 Water included-control collapse", () => {
  const sources = buildWaterBackendDefinitions();
  const definitions = sources.map(collapseWaterS2721ControlDefinition);
  const contentDefinitions = definitions.filter((definition) => contentIds.has(definition.work.catalogId));

  it("preserves the exact 874/689/185 identity boundary", () => {
    expect(definitions).toHaveLength(874);
    expect(contentDefinitions).toHaveLength(689);
    expect(definitions.filter((definition) => !contentIds.has(definition.work.catalogId))).toHaveLength(185);
    expect(definitions.map((definition) => definition.work.catalogId))
      .toEqual(sources.map((definition) => definition.work.catalogId));
  });

  it("collapses exactly 3220 content DOCUMENT rows into exact internal ledgers", () => {
    const collapsed = contentDefinitions.reduce((count, definition) =>
      count + definition.collapsedIncludedControl.rowCount, 0);
    expect(collapsed).toBe(3_220);
    for (const definition of definitions) {
      const ledger = definition.collapsedIncludedControl;
      expect(definition.resources.some(isWaterS2721IncludedControlRow)).toBe(false);
      expect(ledger.rowIds).toHaveLength(ledger.rowCount);
      expect(new Set(ledger.rowIds)).toHaveProperty("size", ledger.rowCount);
      expect(ledger.rowSetSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(ledger.disposition).toBe("INCLUDED_IN_PRIMARY_OPERATION_NOT_SEPARATELY_SUMMED");
    }
  });

  it("retains all 8595 content TEST rows and their actual formulas", () => {
    const testResources = contentDefinitions.flatMap((definition) => definition.resources)
      .filter((resource) => resource.resourceGraph.componentRole === "TEST");
    expect(testResources).toHaveLength(8_595);
    expect(testResources.every((resource) => !isWaterS2721IncludedControlRow(resource))).toBe(true);
  });

  it("keeps resource/formula closure and removes only exclusive document inputs", () => {
    for (const definition of definitions) {
      const formulaIds = new Set(definition.formulas.map((formula) => formula.formulaId));
      const resourceFormulaIds = new Set(definition.resources.map((resource) => resource.formulaId));
      expect(definition.resources.every((resource) => formulaIds.has(resource.formulaId))).toBe(true);
      expect(definition.formulas.every((formula) => resourceFormulaIds.has(formula.formulaId))).toBe(true);
      expect(definition.parameters.some((parameter) =>
        definition.collapsedIncludedControl.removedExclusiveParameterIds.includes(parameter.parameterId))).toBe(false);
    }
  });
});
