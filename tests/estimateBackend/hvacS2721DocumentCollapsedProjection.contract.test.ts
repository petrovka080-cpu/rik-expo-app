import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { HVAC_DOMAIN_INVENTORY } from "../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import { buildHvacPassport, HVAC_R4_EXTERNAL_INVENTORY } from "../../scripts/estimate/hvacBackendR4/hvacR4Model";
import {
  collapseHvacS2721DocumentPassport,
  isHvacS2721IncludedDocumentRow,
} from "../../scripts/estimate/r4a13/hvacS2721DocumentCollapsedProjection";

const inventory = JSON.parse(readFileSync(resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
), "utf8")) as { groups: { batch_id: string; member_catalog_ids: string[] }[] };
const contentIds = new Set(inventory.groups
  .filter((group) => group.batch_id === "BATCH-007")
  .flatMap((group) => group.member_catalog_ids));

function summarizeContent() {
  const summary = {
    definitions: 0,
    sourceParameters: 0,
    retainedParameters: 0,
    sourceRows: 0,
    retainedRows: 0,
    collapsedRows: 0,
    removedParameters: 0,
    visibleDocuments: 0,
    retainedInterfaces: 0,
    closureErrors: 0,
    sourceHashErrors: 0,
  };
  for (const row of HVAC_DOMAIN_INVENTORY) {
    if (!contentIds.has(row.catalog_id)) continue;
    const source = buildHvacPassport(row);
    const definition = collapseHvacS2721DocumentPassport(source);
    const formulaIds = new Set(definition.formulas.map((formula) => formula.formulaId));
    const resourceFormulaIds = new Set(definition.resources.map((resource) => resource.formulaId));
    summary.definitions += 1;
    summary.sourceParameters += source.parameters.length;
    summary.retainedParameters += definition.parameters.length;
    summary.sourceRows += source.resources.length;
    summary.retainedRows += definition.resources.length;
    summary.collapsedRows += definition.collapsedIncludedDocuments.rowCount;
    summary.removedParameters += definition.collapsedIncludedDocuments.removedExclusiveParameterCount;
    summary.visibleDocuments += definition.resources.filter(isHvacS2721IncludedDocumentRow).length;
    summary.retainedInterfaces += definition.resources.filter((resource) =>
      resource.resourceGraph.componentKind === "INTERFACE").length;
    summary.closureErrors += definition.resources.filter((resource) => !formulaIds.has(resource.formulaId)).length;
    summary.closureErrors += definition.formulas.filter((formula) => !resourceFormulaIds.has(formula.formulaId)).length;
    summary.sourceHashErrors += definition.sourcePassportSha256 === source.passportSha256 ? 0 : 1;
  }
  return summary;
}

describe("S27.21 BATCH007 HVAC included-document collapse", () => {
  const summary = summarizeContent();

  it("preserves the exact 1012/864/148 identity boundary", () => {
    expect(HVAC_DOMAIN_INVENTORY.length + HVAC_R4_EXTERNAL_INVENTORY.length).toBe(1_012);
    expect(summary.definitions).toBe(864);
    expect(1_012 - summary.definitions).toBe(148);
  });

  it("collapses exactly 18632 DOCUMENT rows and their exclusive inputs", () => {
    expect(summary.collapsedRows).toBe(18_632);
    expect(summary.visibleDocuments).toBe(0);
    expect(summary.retainedRows + summary.collapsedRows).toBe(summary.sourceRows);
    expect(summary.retainedParameters + summary.removedParameters).toBe(summary.sourceParameters);
  });

  it("retains all 3526 typed INTERFACE rows until immutable children are accepted", () => {
    expect(summary.retainedInterfaces).toBe(3_526);
  });

  it("keeps resource/formula closure and exact source-passport provenance", () => {
    expect(summary.closureErrors).toBe(0);
    expect(summary.sourceHashErrors).toBe(0);
  });
});
