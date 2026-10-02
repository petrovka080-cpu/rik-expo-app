import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES,
  validateWoodFireproofingQualityControlSpKr54Completeness,
} from "./woodFireproofingQualityControlSpKr54R1";

export const WOOD_FIREPROOFING_QUALITY_CONTROL_SMALL_AREA_SP_KR54_CATALOG_ID =
  "canonical-work:base:special_repair_interior_fireproof_test_small_area";

export async function compileWoodFireproofingQualityControlSmallAreaSpKr54R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? WOOD_FIREPROOFING_QUALITY_CONTROL_SMALL_AREA_SP_KR54_CATALOG_ID;
  if (catalogId !== WOOD_FIREPROOFING_QUALITY_CONTROL_SMALL_AREA_SP_KR54_CATALOG_ID) {
    throw new Error(
      `WOOD_FIREPROOFING_QUALITY_CONTROL_SMALL_AREA_SP_KR54_CATALOG_UNSUPPORTED:${catalogId}`,
    );
  }
  validateWoodFireproofingQualityControlSpKr54Completeness();
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      "canonical-estimate-compiler.wood-fireproofing-quality-control-small-area-sp-kr54-r1",
    catalogId,
    primaryMeasureParameterId: "controlled_wood_area_m2",
    parameterDefinitions: [...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS],
    formulaDefinitions: [...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS],
    resourceDefinitions: [...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
