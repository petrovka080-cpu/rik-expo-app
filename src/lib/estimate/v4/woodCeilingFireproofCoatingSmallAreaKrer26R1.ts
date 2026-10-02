import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES,
  validateWoodCeilingFireproofCoatingKrer26Completeness,
} from "./woodCeilingFireproofCoatingKrer26R1";

export const WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_ID =
  "canonical-work:base:special_repair_interior_fireproof_protect_small_area";

export async function compileWoodCeilingFireproofCoatingSmallAreaKrer26R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_ID;
  if (catalogId !== WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_ID) {
    throw new Error(
      `WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_UNSUPPORTED:${catalogId}`,
    );
  }
  validateWoodCeilingFireproofCoatingKrer26Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      "canonical-estimate-compiler.wood-ceiling-fireproof-coating-small-area-krer26-r1",
    catalogId,
    primaryMeasureParameterId: "wood_ceiling_area_m2",
    parameterDefinitions: [...WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS],
    formulaDefinitions: [...WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS],
    resourceDefinitions: [...WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
