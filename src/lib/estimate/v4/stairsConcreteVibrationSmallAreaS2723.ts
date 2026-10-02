import sourcePack from "../../../../data/estimate-benchmarks/source-packs/stairs-concrete-vibration-small-area-s27-23.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_SOURCE_IDS,
} from "./stairsConcreteVibrationStandardS2723";

type Json = Record<string, unknown>;

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_vibrate_small_area";
export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_ID =
  "stairs_concrete_vibration_small_area_s27_23";
export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_NORM_ID =
  "ACI-309-WACKER-IRFU45-STAIRS-VIBRATION-SMALL-AREA-S27-23-R1";
export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256 =
  "9bb5f5d2db1809ea94e95003c73df58b10d0165e1f1707254ff157fa2f1faa9d";

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_INPUT =
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT;
export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_CLASSIFICATION =
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION;
export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_SOURCE_IDS =
  Object.freeze(Object.fromEntries(
    Object.keys(STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_SOURCE_IDS)
      .map((parameterId) => [parameterId, [
        STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_ID,
      ]]),
  ) as Readonly<Record<string, readonly string[]>>);

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SHORT_INPUT = Object.freeze({
  consolidated_concrete_volume_m3: sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
});

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  consolidated_concrete_volume_m3: sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
  concrete_mix_reference: "PROJECT-CONCRETE-MIX-STAIRS-SMALL-AREA-REV-A",
  placement_location: "Малая захватка лестничного марша или площадки; STAIRS-VIB-SA-01",
});

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_METADATA = Object.freeze({
  source_title: "Small-area stair-concrete context for the ACI 309 / Wacker IRFU45 atomic vibration technology",
  source_authority: "American Concrete Institute; Wacker Neuson; контекст S27.23",
  source_document_version: "ACI_309R_05_WACKER_IRFU_AND_SMALL_AREA_CONTEXT_2026_10_01",
  definition_hash: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
  source_kind: "SHARED_ATOMIC_TECHNOLOGY_WITH_DISTINCT_CATALOG_CONTEXT",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
  effective_from: "2026-10-01",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join(" | "),
  use_restriction: sourcePack.contextPolicy,
  source_pack_path:
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-small-area-s27-23.json",
});

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze(
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS.map((parameter) => ({
    ...parameter,
    truth_metadata: {
      ...(parameter.truth_metadata as Json),
      contract: "rik-expo-app.s27-23.stairs-concrete-vibration-small-area.v1",
      semantic_parameter_key:
        `stairs-concrete-vibration-small-area-s27-23:${parameter.parameter_id}`,
      catalog_context: sourcePack.contextKey,
      catalog_context_ru: sourcePack.contextRu,
    },
  })),
);

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_FORMULAS =
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS;

const adaptRowId = (rowId: string): string => rowId.replace(
  "concrete-stairs-vibration:",
  "concrete-stairs-vibration-small-area:",
);

function adaptResource(
  resource: CanonicalEstimateResourceDefinition,
): CanonicalEstimateResourceDefinition {
  const rowId = adaptRowId(resource.row_id);
  const resourceGraph = {
    ...(resource.resource_graph as Json),
    semanticOwnerId: `stairs-concrete-vibration-small-area-s27-23:${rowId}`,
    catalogContext: sourcePack.contextKey,
    catalogContextRu: sourcePack.contextRu,
    contextSourcePackSha256: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
  };
  const sourceMetadata = {
    ...(resource.source_metadata as Json),
    sharedAtomicTechnology: true,
    sharedTechnologySourcePackSha256: sourcePack.sharedTechnologySourcePackSha256,
    contextSourcePackSha256: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
    contextPolicy: sourcePack.contextPolicy,
  };
  return {
    ...resource,
    id: `resource-${rowId.replace(/:/gu, "-")}`,
    row_id: rowId,
    title_ru: `${resource.title_ru} — малая захватка`,
    resource_graph: resourceGraph,
    cost_owner_id: rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({
      parentRowSha256: resource.row_sha256,
      rowId,
      resourceGraph,
      sourceMetadata,
    }),
  };
}

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.map(adaptResource),
);

export const STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s27-23.stairs-concrete-vibration-small-area-completeness.v1",
    sourceKind: "INDEPENDENT_SHARED_ATOMIC_TECHNOLOGY_CONTEXT_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
    sourcePackPath:
      "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-small-area-s27-23.json",
    entries: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
      .map((component) => ({
        ...component,
        requiredRowIds: component.requiredRowIds.map(adaptRowId),
        expectedResourceIds: component.expectedResourceIds.map(adaptRowId),
      })),
  });

export function stairsConcreteVibrationSmallAreaMissingRows(
  rowIds: ReadonlySet<string>,
): string[] {
  return STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export async function compileStairsConcreteVibrationSmallAreaS2723(
  submittedParameters: Record<string, unknown>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      "canonical-estimate-compiler.stairs-concrete-vibration-small-area-s27-23.v1",
    catalogId: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_CATALOG_ID,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_PARAMETERS],
    formulaDefinitions: [...STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_FORMULAS],
    resourceDefinitions: [...STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
