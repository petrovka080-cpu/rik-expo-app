import { createCanonicalDefinitionClonePlan, auditPersistedCanonicalDefinition } from "../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1";
import type { Client } from "pg";

test("a cloned multi-binding parent passes exact persisted audit despite a different parent readback order", async () => {
  const inherited = [
    { row_id: "delivery:water", locator_id: "water-method-locator", applicability: { basis: "direct_project_schedule" } },
    { row_id: "material:concrete", locator_id: "concrete-method-locator", applicability: { basis: "original_approved_order" } },
    { row_id: "equipment:watering", locator_id: "water-method-locator", applicability: { basis: "direct_project_schedule" } },
  ];
  const before = JSON.stringify(inherited);
  const decision = { contract: "real-professional-estimates-r3.content-passport.v1", status: "GREEN", allowed: true, quantityScope: "FULL",
    priceState: "PARTIAL_NEEDS_PRICE", activationAllowed: false, productionEligible: false, waveContract: "binding-order-test" };
  const plan = createCanonicalDefinitionClonePlan({ contract: "binding-order-test",
    definition: { id: "definition", releaseId: "release", catalogId: "catalog", definitionVersion: 2, passport: {}, applicability: {}, definitionSha256: "a".repeat(64), sourceMetadata: {} },
    representative: { resources: ["material:concrete", "equipment:watering", "delivery:water"].map((row_id, ordinal) => ({ row_id, ordinal, unit_id: "m3" })),
      parameters: [], formulas: [], bindings: inherited, baseline: {}, passport: {} },
    parameterTruthMetadata: p => p, resourceId: r => `new-${r.row_id}`, resourceSemanticOwner: r => r.row_id, resourceSha256: () => "b".repeat(64),
    baseline: { id: "baseline", key: "baseline-key", sourceDefinitionVersionId: "parent", validationScenarioRefs: [], acceptanceEvidenceSha256: "c".repeat(64), acceptedReleaseId: "release", supersedesBaselineId: "old-baseline" },
    passport: { physicalResultRu: "Concrete", excludedScopeRu: [], decision, payloadSha256: "d".repeat(64), sourceHead: "e".repeat(40), sourceTree: "f".repeat(40) },
    bindingApplicability: b => b.applicability, expectedNormativeBindingCount: 3,
  });
  const databaseResults = [[{ ...plan.definition, content_status: "CANDIDATE_READY", content_gate_status: "GREEN" }], plan.parameters, plan.formulas,
    plan.resources, [plan.baseline], [plan.passport], [plan.bindings[0]!, plan.bindings[1]!, plan.bindings[2]!], []];
  // Model the actual SQL readback: associated resources, not lexical row IDs.
  databaseResults[6] = [...plan.bindings].sort((a, b) => plan.resources.find(r => r.id === a.resource_spec_id)!.ordinal - plan.resources.find(r => r.id === b.resource_spec_id)!.ordinal);
  let index = 0;
  const client = { query: async () => ({ rows: databaseResults[index++] }) } as unknown as Client;
  const audit = await auditPersistedCanonicalDefinition(client, plan);
  expect(audit.normativeBindingCount).toBe(3);
  expect(JSON.stringify(inherited)).toBe(before);
  expect(plan.bindings.map(b => b.resource_spec_id)).toEqual(["new-material:concrete", "new-equipment:watering", "new-delivery:water"]);
  expect(plan.bindings.find(b => b.resource_spec_id === "new-delivery:water")?.applicability).toEqual(inherited[0]!.applicability);
});
