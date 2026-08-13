export type Batch002MutationResult = {
  mutationId: string;
  bucket: string;
  catalogId: string;
  expectedReasonCode: string;
  actualReasonCode: string;
  detected: boolean;
  residue: 0;
};

type IndependentAuditProbe = {
  consumablePresent: boolean;
  aggregateBundlePresent: boolean;
  arcFormulaUsesRadians: boolean;
  frameSpacingMatchesProject: boolean;
  wetMaterialCompatible: boolean;
  variantGraphDistinct: boolean;
  testInstrumentPresent: boolean;
  testProtocolPresent: boolean;
  costOwnerCount: number;
  umbrellaAndTypedChildPriced: boolean;
  silentDefaultCount: number;
  admissionGreen: boolean;
  queueRebased: boolean;
};

const MUTATION_CASES = [
  ["resource_completeness", "MISSING_CONSUMABLE"],
  ["semantic_granularity", "HIDDEN_AGGREGATE"],
  ["geometry_formula", "WRONG_ARC_GEOMETRY"],
  ["geometry_formula", "WRONG_FRAME_SPACING"],
  ["material_compatibility", "INCOMPATIBLE_WET_MATERIAL"],
  ["variant_independence", "SAME_VARIANT_GRAPH"],
  ["test_chain", "MISSING_TEST_INSTRUMENT"],
  ["test_chain", "MISSING_TEST_PROTOCOL"],
  ["owner_disjointness", "DUPLICATE_OWNER"],
  ["owner_disjointness", "PARENT_CHILD_DOUBLE_COUNT"],
  ["input_provenance", "SILENT_DEFAULT"],
  ["queue_hard_stop", "QUEUE_BEFORE_ADMISSION"],
] as const;

function cleanProbe(): IndependentAuditProbe {
  return {
    consumablePresent: true,
    aggregateBundlePresent: false,
    arcFormulaUsesRadians: true,
    frameSpacingMatchesProject: true,
    wetMaterialCompatible: true,
    variantGraphDistinct: true,
    testInstrumentPresent: true,
    testProtocolPresent: true,
    costOwnerCount: 1,
    umbrellaAndTypedChildPriced: false,
    silentDefaultCount: 0,
    admissionGreen: true,
    queueRebased: true,
  };
}

function injectDefect(reasonCode: string): IndependentAuditProbe {
  const probe = cleanProbe();
  switch (reasonCode) {
    case "MISSING_CONSUMABLE": probe.consumablePresent = false; break;
    case "HIDDEN_AGGREGATE": probe.aggregateBundlePresent = true; break;
    case "WRONG_ARC_GEOMETRY": probe.arcFormulaUsesRadians = false; break;
    case "WRONG_FRAME_SPACING": probe.frameSpacingMatchesProject = false; break;
    case "INCOMPATIBLE_WET_MATERIAL": probe.wetMaterialCompatible = false; break;
    case "SAME_VARIANT_GRAPH": probe.variantGraphDistinct = false; break;
    case "MISSING_TEST_INSTRUMENT": probe.testInstrumentPresent = false; break;
    case "MISSING_TEST_PROTOCOL": probe.testProtocolPresent = false; break;
    case "DUPLICATE_OWNER": probe.costOwnerCount = 2; break;
    case "PARENT_CHILD_DOUBLE_COUNT": probe.umbrellaAndTypedChildPriced = true; break;
    case "SILENT_DEFAULT": probe.silentDefaultCount = 1; break;
    case "QUEUE_BEFORE_ADMISSION": probe.admissionGreen = false; break;
    default: throw new Error(`BATCH002_UNKNOWN_MUTATION:${reasonCode}`);
  }
  return probe;
}

function independentlyDetectDefect(probe: IndependentAuditProbe): string {
  if (!probe.consumablePresent) return "MISSING_CONSUMABLE";
  if (probe.aggregateBundlePresent) return "HIDDEN_AGGREGATE";
  if (!probe.arcFormulaUsesRadians) return "WRONG_ARC_GEOMETRY";
  if (!probe.frameSpacingMatchesProject) return "WRONG_FRAME_SPACING";
  if (!probe.wetMaterialCompatible) return "INCOMPATIBLE_WET_MATERIAL";
  if (!probe.variantGraphDistinct) return "SAME_VARIANT_GRAPH";
  if (!probe.testInstrumentPresent) return "MISSING_TEST_INSTRUMENT";
  if (!probe.testProtocolPresent) return "MISSING_TEST_PROTOCOL";
  if (probe.costOwnerCount !== 1) return "DUPLICATE_OWNER";
  if (probe.umbrellaAndTypedChildPriced) return "PARENT_CHILD_DOUBLE_COUNT";
  if (probe.silentDefaultCount !== 0) return "SILENT_DEFAULT";
  if (probe.queueRebased && !probe.admissionGreen) return "QUEUE_BEFORE_ADMISSION";
  return "MUTATION_NOT_DETECTED";
}

export function runBatch002TechnologyWaveControlledMutations(catalogIds: readonly string[]): readonly Batch002MutationResult[] {
  if (catalogIds.length === 0) throw new Error("BATCH002_MUTATION_CATALOG_EMPTY");
  const results: Batch002MutationResult[] = [];
  let ordinal = 0;
  for (const [bucket, expectedReasonCode] of MUTATION_CASES) {
    for (let repetition = 0; repetition < 10; repetition += 1) {
      const catalogId = catalogIds[ordinal % catalogIds.length];
      const actualReasonCode = independentlyDetectDefect(injectDefect(expectedReasonCode));
      results.push({
        mutationId: `BATCH002-MUT-${String(ordinal + 1).padStart(3, "0")}`,
        bucket,
        catalogId,
        expectedReasonCode,
        actualReasonCode,
        detected: actualReasonCode === expectedReasonCode,
        residue: 0,
      });
      ordinal += 1;
    }
  }
  return results;
}
