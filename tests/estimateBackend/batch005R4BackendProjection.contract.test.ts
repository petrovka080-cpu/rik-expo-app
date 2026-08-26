import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  batch005R4FixtureValues,
  buildAllBatch005R4CanonicalBackendDefinitions,
  compileBatch005R4ThroughContentOracle,
} from "../../scripts/estimate/r5/batch005R4SharedCoreProjection";

const inventory = JSON.parse(readFileSync(resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
), "utf8")) as { groups: Array<{ batch_id: string; member_catalog_ids: string[] }> };
const contentIds = new Set(inventory.groups
  .filter((group) => group.batch_id === "BATCH-005")
  .flatMap((group) => group.member_catalog_ids));

describe("BATCH-005 R4 canonical backend projection", () => {
  const definitions = buildAllBatch005R4CanonicalBackendDefinitions();

  it("separates 497 content definitions from 108 external references across 107 work groups", () => {
    expect(definitions).toHaveLength(605);
    expect(definitions.filter((definition) => contentIds.has(definition.catalogId))).toHaveLength(497);
    expect(definitions.filter((definition) => !contentIds.has(definition.catalogId))).toHaveLength(108);
    expect(new Set(definitions.map((definition) => definition.group))).toHaveProperty("size", 107);
    expect(new Set(definitions.map((definition) => definition.catalogId))).toHaveProperty("size", 605);
  });

  it("keeps every persisted resource bound to one formula, semantic owner and physical unit", () => {
    for (const definition of definitions) {
      const formulaIds = new Set(definition.runtimeFormulas.map((formula) => formula.formulaId));
      expect(definition.resources.length).toBeGreaterThanOrEqual(35);
      expect(definition.resources.every((resource) =>
        formulaIds.has(resource.formulaId)
        && resource.semanticOwnerId.length > 0
        && resource.costOwnerId.length > 0
        && resource.unitId.length > 0
        && resource.normativeSource.locator.length > 0)).toBe(true);
      expect(definition.passport.parameters.every((parameter) =>
        parameter.visibilityRole === "USER_INPUT"
        && parameter.resourceConsumerIds.length > 0)).toBe(true);
    }
  });

  it("publishes all 605 electrical definitions with plain Russian resource titles", () => {
    const forbiddenInternalTitle = /(?:\bexact\b|typed[- ]child|Electrical(?:-owned)?|Civil|Controls|Fire|HVAC|Structural|End-to-end|nested BOM|final circuit|bonding|feeder|\bLOTO\b|\bUPS\b|\bDC\b|\bSPD\b|\bPE\b|\bIP\b|\bIK\b|\bDIN\b)/iu;
    const rows = definitions.flatMap((definition) => definition.resources.map((resource) => ({
      catalogId: definition.catalogId,
      rowId: resource.rowId,
      titleRu: resource.titleRu,
    })));
    expect(rows.length).toBeGreaterThan(20_000);
    expect(rows.filter((row) => forbiddenInternalTitle.test(row.titleRu))).toEqual([]);
    expect(rows.every((row) => /[А-Яа-яЁё]/u.test(row.titleRu))).toBe(true);
  });

  it("compiles representative content and external identities through the migration oracle", async () => {
    const representatives = [
      definitions.find((definition) => contentIds.has(definition.catalogId)),
      definitions.find((definition) => !contentIds.has(definition.catalogId)),
      ...[...new Map(definitions.map((definition) => [definition.group, definition])).values()].slice(1, 4),
    ].filter((definition): definition is NonNullable<typeof definition> => definition != null);
    for (const definition of representatives) {
      const compiled = await compileBatch005R4ThroughContentOracle({
        definition,
        values: batch005R4FixtureValues(definition),
      });
      expect(compiled.compiled_rows).toHaveLength(definition.resources.length);
      expect(compiled.compiled_rows.every((row) => row.quantity > 0)).toBe(true);
      expect(compiled.hidden_quantity_defaults).toBe(0);
      expect(compiled.assumptions_count).toBe(0);
    }
  });
});
