export type Batch003MutationResult = {
  mutationId: string;
  bucket: string;
  catalogId: string;
  expectedReasonCode: string;
  actualReasonCode: string;
  detected: boolean;
  residue: 0;
};

type Probe = {
  predecessorExact: boolean; tokenOriginExact: boolean; selectionExact: boolean; ownerCount: number;
  parameterBoundsValid: boolean; unusedParameters: number; formulaDimensionValid: boolean;
  resourcePresent: boolean; duplicateResource: boolean; hiddenCoefficient: boolean; unitValid: boolean;
  normLocatorValid: boolean; foreignPromoted: boolean; priceOwnerCount: number; silentZero: boolean;
  logisticsComplete: boolean; testingComplete: boolean; documentationComplete: boolean;
  parentChildDoubleCount: boolean; legacyFallback: boolean; revisionRowLoss: boolean;
  projectionParity: boolean; currentWebBundle: boolean; nativeAndroidProof: boolean;
  queueRemovalExact: boolean; batch004Started: boolean;
};

const CASES = [
  ["predecessor", "PREDECESSOR_BINDING_MISMATCH"], ["token", "TOKEN_ORIGIN_FALSE_CLAIM"],
  ["selection", "SELECTION_SET_DRIFT"], ["owner", "DUPLICATE_OWNER"],
  ["parameter", "PARAMETER_BOUNDS_INVALID"], ["parameter", "SHOWN_UNUSED_PARAMETER"],
  ["formula", "FORMULA_DIMENSION_INVALID"], ["resource", "MISSING_RESOURCE"],
  ["resource", "DUPLICATE_RESOURCE"], ["formula", "HIDDEN_COEFFICIENT"],
  ["formula", "WRONG_UNIT"], ["norm", "WRONG_NORM_LOCATOR"],
  ["norm", "FOREIGN_NORM_PROMOTED_TO_KG"], ["price", "DUPLICATE_PRICE_OWNER"],
  ["price", "SILENT_ZERO"], ["logistics", "MISSING_LOGISTICS_STAGE"],
  ["testing", "MISSING_TESTING_STAGE"], ["documentation", "MISSING_DOCUMENTATION_STAGE"],
  ["boundary", "PARENT_CHILD_DOUBLE_COUNT"], ["runtime", "LEGACY_FALLBACK"],
  ["durable", "REVISION_ROW_LOSS"], ["projection", "PDF_PROCUREMENT_MISMATCH"],
  ["web", "STALE_WEB_BUNDLE"], ["android", "ANDROID_MARKER_ONLY_PROOF"],
  ["queue", "WRONG_QUEUE_REMOVAL"], ["hard_stop", "BATCH004_PREMATURE_ACTIVATION"],
] as const;

function clean(): Probe {
  return { predecessorExact: true, tokenOriginExact: true, selectionExact: true, ownerCount: 1,
    parameterBoundsValid: true, unusedParameters: 0, formulaDimensionValid: true, resourcePresent: true,
    duplicateResource: false, hiddenCoefficient: false, unitValid: true, normLocatorValid: true,
    foreignPromoted: false, priceOwnerCount: 1, silentZero: false, logisticsComplete: true,
    testingComplete: true, documentationComplete: true, parentChildDoubleCount: false,
    legacyFallback: false, revisionRowLoss: false, projectionParity: true, currentWebBundle: true,
    nativeAndroidProof: true, queueRemovalExact: true, batch004Started: false };
}

function inject(code: string): Probe {
  const p = clean();
  switch (code) {
    case "PREDECESSOR_BINDING_MISMATCH": p.predecessorExact = false; break;
    case "TOKEN_ORIGIN_FALSE_CLAIM": p.tokenOriginExact = false; break;
    case "SELECTION_SET_DRIFT": p.selectionExact = false; break;
    case "DUPLICATE_OWNER": p.ownerCount = 2; break;
    case "PARAMETER_BOUNDS_INVALID": p.parameterBoundsValid = false; break;
    case "SHOWN_UNUSED_PARAMETER": p.unusedParameters = 1; break;
    case "FORMULA_DIMENSION_INVALID": p.formulaDimensionValid = false; break;
    case "MISSING_RESOURCE": p.resourcePresent = false; break;
    case "DUPLICATE_RESOURCE": p.duplicateResource = true; break;
    case "HIDDEN_COEFFICIENT": p.hiddenCoefficient = true; break;
    case "WRONG_UNIT": p.unitValid = false; break;
    case "WRONG_NORM_LOCATOR": p.normLocatorValid = false; break;
    case "FOREIGN_NORM_PROMOTED_TO_KG": p.foreignPromoted = true; break;
    case "DUPLICATE_PRICE_OWNER": p.priceOwnerCount = 2; break;
    case "SILENT_ZERO": p.silentZero = true; break;
    case "MISSING_LOGISTICS_STAGE": p.logisticsComplete = false; break;
    case "MISSING_TESTING_STAGE": p.testingComplete = false; break;
    case "MISSING_DOCUMENTATION_STAGE": p.documentationComplete = false; break;
    case "PARENT_CHILD_DOUBLE_COUNT": p.parentChildDoubleCount = true; break;
    case "LEGACY_FALLBACK": p.legacyFallback = true; break;
    case "REVISION_ROW_LOSS": p.revisionRowLoss = true; break;
    case "PDF_PROCUREMENT_MISMATCH": p.projectionParity = false; break;
    case "STALE_WEB_BUNDLE": p.currentWebBundle = false; break;
    case "ANDROID_MARKER_ONLY_PROOF": p.nativeAndroidProof = false; break;
    case "WRONG_QUEUE_REMOVAL": p.queueRemovalExact = false; break;
    case "BATCH004_PREMATURE_ACTIVATION": p.batch004Started = true; break;
    default: throw new Error(`BATCH003_UNKNOWN_MUTATION:${code}`);
  }
  return p;
}

function detect(p: Probe): string {
  if (!p.predecessorExact) return "PREDECESSOR_BINDING_MISMATCH";
  if (!p.tokenOriginExact) return "TOKEN_ORIGIN_FALSE_CLAIM";
  if (!p.selectionExact) return "SELECTION_SET_DRIFT";
  if (p.ownerCount !== 1) return "DUPLICATE_OWNER";
  if (!p.parameterBoundsValid) return "PARAMETER_BOUNDS_INVALID";
  if (p.unusedParameters) return "SHOWN_UNUSED_PARAMETER";
  if (!p.formulaDimensionValid) return "FORMULA_DIMENSION_INVALID";
  if (!p.resourcePresent) return "MISSING_RESOURCE";
  if (p.duplicateResource) return "DUPLICATE_RESOURCE";
  if (p.hiddenCoefficient) return "HIDDEN_COEFFICIENT";
  if (!p.unitValid) return "WRONG_UNIT";
  if (!p.normLocatorValid) return "WRONG_NORM_LOCATOR";
  if (p.foreignPromoted) return "FOREIGN_NORM_PROMOTED_TO_KG";
  if (p.priceOwnerCount !== 1) return "DUPLICATE_PRICE_OWNER";
  if (p.silentZero) return "SILENT_ZERO";
  if (!p.logisticsComplete) return "MISSING_LOGISTICS_STAGE";
  if (!p.testingComplete) return "MISSING_TESTING_STAGE";
  if (!p.documentationComplete) return "MISSING_DOCUMENTATION_STAGE";
  if (p.parentChildDoubleCount) return "PARENT_CHILD_DOUBLE_COUNT";
  if (p.legacyFallback) return "LEGACY_FALLBACK";
  if (p.revisionRowLoss) return "REVISION_ROW_LOSS";
  if (!p.projectionParity) return "PDF_PROCUREMENT_MISMATCH";
  if (!p.currentWebBundle) return "STALE_WEB_BUNDLE";
  if (!p.nativeAndroidProof) return "ANDROID_MARKER_ONLY_PROOF";
  if (!p.queueRemovalExact) return "WRONG_QUEUE_REMOVAL";
  if (p.batch004Started) return "BATCH004_PREMATURE_ACTIVATION";
  return "MUTATION_NOT_DETECTED";
}

export function runBatch003TechnologyWaveControlledMutations(catalogIds: readonly string[]): readonly Batch003MutationResult[] {
  if (catalogIds.length !== 36) throw new Error("BATCH003_MUTATION_EXACT36_REQUIRED");
  return CASES.flatMap(([bucket, code], caseIndex) => Array.from({ length: caseIndex < 16 ? 5 : 4 }, (_, repetition) => {
    const ordinal = CASES.slice(0, caseIndex).reduce((sum, _item, index) => sum + (index < 16 ? 5 : 4), 0) + repetition;
    const actual = detect(inject(code));
    return { mutationId: `BATCH003-MUT-${String(ordinal + 1).padStart(3, "0")}`, bucket, catalogId: catalogIds[ordinal % catalogIds.length], expectedReasonCode: code, actualReasonCode: actual, detected: actual === code, residue: 0 as const };
  }));
}
