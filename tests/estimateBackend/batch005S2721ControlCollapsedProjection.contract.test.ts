import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  batch005R4FixtureValues,
  buildAllBatch005R4CanonicalBackendDefinitions,
  compileBatch005R4ThroughContentOracle,
} from "../../scripts/estimate/r5/batch005R4SharedCoreProjection";
import {
  collapseBatch005S2721ControlDefinition,
  isBatch005S2721IncludedControlRow,
} from "../../scripts/estimate/r4a13/batch005S2721ControlCollapsedProjection";

const inventory = JSON.parse(readFileSync(resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
), "utf8")) as { groups: { batch_id: string; member_catalog_ids: string[] }[] };
const contentIds = new Set(inventory.groups
  .filter((group) => group.batch_id === "BATCH-005")
  .flatMap((group) => group.member_catalog_ids));

describe("S27.21 BATCH005 included-control collapse", () => {
  const sources = buildAllBatch005R4CanonicalBackendDefinitions();
  const definitions = sources.map(collapseBatch005S2721ControlDefinition);

  it("preserves the exact 605/497/108 identity boundary", () => {
    expect(definitions).toHaveLength(605);
    expect(definitions.filter((definition) => contentIds.has(definition.catalogId))).toHaveLength(497);
    expect(definitions.filter((definition) => !contentIds.has(definition.catalogId))).toHaveLength(108);
    expect(definitions.map((definition) => definition.catalogId))
      .toEqual(sources.map((definition) => definition.catalogId));
  });

  it("removes every control row from payable resources but retains an exact internal ledger", () => {
    let collapsed = 0;
    for (const definition of definitions) {
      const ledger = definition.passport.collapsedIncludedControl;
      collapsed += ledger.rowCount;
      expect(definition.resources.some(isBatch005S2721IncludedControlRow)).toBe(false);
      expect(ledger.rowCount).toBeGreaterThan(0);
      expect(ledger.rowIds).toHaveLength(ledger.rowCount);
      expect(new Set(ledger.rowIds)).toHaveProperty("size", ledger.rowCount);
      expect(ledger.rowSetSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(ledger.disposition).toBe("INCLUDED_IN_PRIMARY_OPERATION_NOT_SEPARATELY_SUMMED");
    }
    expect(collapsed).toBeGreaterThan(10_000);
  });

  it("collapses the exact content control set and retains real protocol equipment and work", () => {
    const contentDefinitions = definitions.filter((definition) => contentIds.has(definition.catalogId));
    const collapsed = contentDefinitions.reduce((count, definition) =>
      count + definition.passport.collapsedIncludedControl.rowCount, 0);
    const retainedProtocolTechnology = contentDefinitions.flatMap((definition) => definition.resources)
      .filter((resource) => /(?:Шлюз диспетчерского протокола|Настройка коммуникационного протокола|Настройка осциллографии и журнала событий|Анализатор промышленного протокола)/u.test(resource.titleRu));
    expect(collapsed).toBe(12_920);
    expect(retainedProtocolTechnology).toHaveLength(36);
    expect(retainedProtocolTechnology.every((resource) =>
      !isBatch005S2721IncludedControlRow(resource))).toBe(true);
  });

  it("keeps formula/resource closure and removes exclusive orphan inputs", () => {
    for (const definition of definitions) {
      const formulaIds = new Set(definition.runtimeFormulas.map((formula) => formula.formulaId));
      const rowIds = new Set(definition.resources.map((resource) => resource.rowId));
      expect(definition.resources.every((resource) => formulaIds.has(resource.formulaId))).toBe(true);
      expect(definition.passport.parameters.every((parameter) =>
        parameter.formulaConsumerIds.some((formulaId) => formulaIds.has(formulaId))
        || parameter.resourceConsumerIds.some((rowId) => rowIds.has(rowId)))).toBe(true);
      expect(definition.passport.userParameterContracts.map((contract) => contract.parameterId))
        .toEqual(definition.passport.parameters.map((parameter) => parameter.parameterId));
    }
  });

  it("matches the source oracle for all retained representative rows", async () => {
    const sourceById = new Map(sources.map((definition) => [definition.catalogId, definition]));
    const representatives = [
      definitions.find((definition) => contentIds.has(definition.catalogId)),
      definitions.find((definition) => !contentIds.has(definition.catalogId)),
      ...definitions.slice(1, 4),
    ].filter((definition): definition is NonNullable<typeof definition> => definition != null);
    for (const definition of representatives) {
      const source = sourceById.get(definition.catalogId)!;
      const compiled = await compileBatch005R4ThroughContentOracle({
        definition: source,
        values: batch005R4FixtureValues(source),
      });
      const retained = new Set(definition.resources.map((resource) => resource.rowId));
      const compiledRetained = compiled.compiled_rows.filter((row) => retained.has(row.row_id));
      expect(compiledRetained).toHaveLength(definition.resources.length);
      expect(compiledRetained.every((row) => row.quantity > 0)).toBe(true);
      expect(compiled.hidden_quantity_defaults).toBe(0);
    }
  });
});
