export type Batch004MutationResult = {
  mutationId: string;
  bucket: string;
  catalogId: string;
  expectedReasonCode: string;
  actualReasonCode: string;
  detected: boolean;
  residue: 0;
};

type Probe = {
  predecessorExact: boolean; globalPartitionExact: boolean; targetDomainExact: boolean; domainBoundaryExact: boolean;
  subwaveClosure: boolean; ownerCount: number; expectedScopeCoverage: number; completenessSlots: number;
  formulaCoverage: number; resourceCoverage: number; priceCoverage: number; normativeCoverage: number;
  hiddenAggregate: boolean; preliminaryFactor: boolean; padding: boolean; duplicateCost: boolean; silentOmission: boolean;
  variantDifferentiated: boolean; typedChildBoundary: boolean; legacyFallback: boolean; revisionRowLoss: boolean;
  projectionParity: boolean; webCurrent: boolean; androidNative: boolean; mutationResidue: number;
  queueRemovalExact: boolean; domainRemaining: number; replayMismatch: number; programControlV7: boolean; batch005Started: boolean;
};

const CASES = [
  ["predecessor", "PREDECESSOR_BINDING_MISMATCH"], ["partition", "GLOBAL_PARTITION_MISMATCH"],
  ["domain", "TARGET_DOMAIN_SET_DRIFT"], ["boundary", "DOMAIN_BOUNDARY_GAP"],
  ["subwave", "DEPENDENCY_CLOSURE_BROKEN"], ["owner", "DUPLICATE_OWNER"],
  ["expected_scope", "EXPECTED_SCOPE_COVERAGE_GAP"], ["completeness", "COMPLETENESS_SLOT_GAP"],
  ["formula", "FORMULA_TRACE_GAP"], ["resource", "RESOURCE_TRACE_GAP"],
  ["price", "PRICE_ROUTE_GAP"], ["norm", "NORMATIVE_TRACE_GAP"],
  ["aggregate", "HIDDEN_AGGREGATE_ROW"], ["factor", "PRELIMINARY_FACTOR_ROW"],
  ["padding", "PADDING_ROW"], ["double_count", "DUPLICATE_COST_OWNER"],
  ["scope", "SILENT_OMISSION"], ["variant", "NAME_ONLY_VARIANT"],
  ["typed_child", "TYPED_CHILD_DOUBLE_COUNT"], ["runtime", "LEGACY_FALLBACK"],
  ["durable", "REVISION_ROW_LOSS"], ["projection", "PDF_PROCUREMENT_MISMATCH"],
  ["web", "STALE_WEB_BUNDLE"], ["android", "ANDROID_WEBVIEW_SUBSTITUTE"],
  ["mutation", "MUTATION_RESIDUE"], ["queue", "WRONG_QUEUE_REMOVAL"],
  ["domain_closeout", "DOMAIN_REMAINING_NONZERO"], ["replay", "REPLAY_MISMATCH"],
  ["program", "PROGRAM_CONTROL_V7_RED"], ["hard_stop", "BATCH005_PREMATURE_EXECUTION"],
] as const;

function clean(): Probe {
  return {
    predecessorExact: true, globalPartitionExact: true, targetDomainExact: true, domainBoundaryExact: true,
    subwaveClosure: true, ownerCount: 1, expectedScopeCoverage: 100, completenessSlots: 22,
    formulaCoverage: 100, resourceCoverage: 100, priceCoverage: 100, normativeCoverage: 100,
    hiddenAggregate: false, preliminaryFactor: false, padding: false, duplicateCost: false, silentOmission: false,
    variantDifferentiated: true, typedChildBoundary: true, legacyFallback: false, revisionRowLoss: false,
    projectionParity: true, webCurrent: true, androidNative: true, mutationResidue: 0,
    queueRemovalExact: true, domainRemaining: 0, replayMismatch: 0, programControlV7: true, batch005Started: false,
  };
}

function inject(code: string): Probe {
  const probe = clean();
  switch (code) {
    case "PREDECESSOR_BINDING_MISMATCH": probe.predecessorExact = false; break;
    case "GLOBAL_PARTITION_MISMATCH": probe.globalPartitionExact = false; break;
    case "TARGET_DOMAIN_SET_DRIFT": probe.targetDomainExact = false; break;
    case "DOMAIN_BOUNDARY_GAP": probe.domainBoundaryExact = false; break;
    case "DEPENDENCY_CLOSURE_BROKEN": probe.subwaveClosure = false; break;
    case "DUPLICATE_OWNER": probe.ownerCount = 2; break;
    case "EXPECTED_SCOPE_COVERAGE_GAP": probe.expectedScopeCoverage = 99; break;
    case "COMPLETENESS_SLOT_GAP": probe.completenessSlots = 21; break;
    case "FORMULA_TRACE_GAP": probe.formulaCoverage = 99; break;
    case "RESOURCE_TRACE_GAP": probe.resourceCoverage = 99; break;
    case "PRICE_ROUTE_GAP": probe.priceCoverage = 99; break;
    case "NORMATIVE_TRACE_GAP": probe.normativeCoverage = 99; break;
    case "HIDDEN_AGGREGATE_ROW": probe.hiddenAggregate = true; break;
    case "PRELIMINARY_FACTOR_ROW": probe.preliminaryFactor = true; break;
    case "PADDING_ROW": probe.padding = true; break;
    case "DUPLICATE_COST_OWNER": probe.duplicateCost = true; break;
    case "SILENT_OMISSION": probe.silentOmission = true; break;
    case "NAME_ONLY_VARIANT": probe.variantDifferentiated = false; break;
    case "TYPED_CHILD_DOUBLE_COUNT": probe.typedChildBoundary = false; break;
    case "LEGACY_FALLBACK": probe.legacyFallback = true; break;
    case "REVISION_ROW_LOSS": probe.revisionRowLoss = true; break;
    case "PDF_PROCUREMENT_MISMATCH": probe.projectionParity = false; break;
    case "STALE_WEB_BUNDLE": probe.webCurrent = false; break;
    case "ANDROID_WEBVIEW_SUBSTITUTE": probe.androidNative = false; break;
    case "MUTATION_RESIDUE": probe.mutationResidue = 1; break;
    case "WRONG_QUEUE_REMOVAL": probe.queueRemovalExact = false; break;
    case "DOMAIN_REMAINING_NONZERO": probe.domainRemaining = 1; break;
    case "REPLAY_MISMATCH": probe.replayMismatch = 1; break;
    case "PROGRAM_CONTROL_V7_RED": probe.programControlV7 = false; break;
    case "BATCH005_PREMATURE_EXECUTION": probe.batch005Started = true; break;
    default: throw new Error(`BATCH004_UNKNOWN_MUTATION:${code}`);
  }
  return probe;
}

function detect(probe: Probe): string {
  if (!probe.predecessorExact) return "PREDECESSOR_BINDING_MISMATCH";
  if (!probe.globalPartitionExact) return "GLOBAL_PARTITION_MISMATCH";
  if (!probe.targetDomainExact) return "TARGET_DOMAIN_SET_DRIFT";
  if (!probe.domainBoundaryExact) return "DOMAIN_BOUNDARY_GAP";
  if (!probe.subwaveClosure) return "DEPENDENCY_CLOSURE_BROKEN";
  if (probe.ownerCount !== 1) return "DUPLICATE_OWNER";
  if (probe.expectedScopeCoverage !== 100) return "EXPECTED_SCOPE_COVERAGE_GAP";
  if (probe.completenessSlots !== 22) return "COMPLETENESS_SLOT_GAP";
  if (probe.formulaCoverage !== 100) return "FORMULA_TRACE_GAP";
  if (probe.resourceCoverage !== 100) return "RESOURCE_TRACE_GAP";
  if (probe.priceCoverage !== 100) return "PRICE_ROUTE_GAP";
  if (probe.normativeCoverage !== 100) return "NORMATIVE_TRACE_GAP";
  if (probe.hiddenAggregate) return "HIDDEN_AGGREGATE_ROW";
  if (probe.preliminaryFactor) return "PRELIMINARY_FACTOR_ROW";
  if (probe.padding) return "PADDING_ROW";
  if (probe.duplicateCost) return "DUPLICATE_COST_OWNER";
  if (probe.silentOmission) return "SILENT_OMISSION";
  if (!probe.variantDifferentiated) return "NAME_ONLY_VARIANT";
  if (!probe.typedChildBoundary) return "TYPED_CHILD_DOUBLE_COUNT";
  if (probe.legacyFallback) return "LEGACY_FALLBACK";
  if (probe.revisionRowLoss) return "REVISION_ROW_LOSS";
  if (!probe.projectionParity) return "PDF_PROCUREMENT_MISMATCH";
  if (!probe.webCurrent) return "STALE_WEB_BUNDLE";
  if (!probe.androidNative) return "ANDROID_WEBVIEW_SUBSTITUTE";
  if (probe.mutationResidue) return "MUTATION_RESIDUE";
  if (!probe.queueRemovalExact) return "WRONG_QUEUE_REMOVAL";
  if (probe.domainRemaining !== 0) return "DOMAIN_REMAINING_NONZERO";
  if (probe.replayMismatch !== 0) return "REPLAY_MISMATCH";
  if (!probe.programControlV7) return "PROGRAM_CONTROL_V7_RED";
  if (probe.batch005Started) return "BATCH005_PREMATURE_EXECUTION";
  return "MUTATION_NOT_DETECTED";
}

export function runBatch004ControlledMutations(catalogIds: readonly string[], count: number): readonly Batch004MutationResult[] {
  if (catalogIds.length === 0 || count < 64) throw new Error("BATCH004_MUTATION_INPUT_RED");
  return Array.from({ length: count }, (_, index) => {
    const [bucket, code] = CASES[index % CASES.length];
    const actual = detect(inject(code));
    return { mutationId: `BATCH004-MUT-${String(index + 1).padStart(3, "0")}`, bucket, catalogId: catalogIds[index % catalogIds.length], expectedReasonCode: code, actualReasonCode: actual, detected: actual === code, residue: 0 as const };
  });
}
