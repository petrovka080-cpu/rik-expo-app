import sourcePack from "../../../../data/estimate-benchmarks/source-packs/stairs-concrete-vibration-large-area-s27-23.json";

import {
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
} from "./stairsConcreteVibrationStandardS2723";
import { createStairsConcreteVibrationContextS2723 } from
  "./stairsConcreteVibrationContextAdapterS2723";

export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_vibrate_large_area";
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_ID =
  "stairs_concrete_vibration_large_area_s27_23";
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_NORM_ID =
  "ACI-309-WACKER-IRFU45-STAIRS-VIBRATION-LARGE-AREA-S27-23-R1";
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_PACK_SHA256 =
  "afcd23a475fda561df676063cc25be7b32581c7c1e258ba73cc56fd0101db1c6";

const CONTEXT = createStairsConcreteVibrationContextS2723({
  catalogId: STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_CATALOG_ID,
  sourceId: STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_ID,
  normId: STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_NORM_ID,
  sourcePackSha256: STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_PACK_SHA256,
  sharedTechnologySourcePackSha256: sourcePack.sharedTechnologySourcePackSha256,
  contextKey: sourcePack.contextKey,
  contextRu: sourcePack.contextRu,
  contextSlug: sourcePack.contextSlug,
  rowPrefix: sourcePack.rowPrefix,
  contextPolicy: sourcePack.contextPolicy,
  compilerVersion:
    "canonical-estimate-compiler.stairs-concrete-vibration-large-area-s27-23.v1",
});

export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_RUNTIME_INPUT =
  CONTEXT.runtimeInput;
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_RUNTIME_CLASSIFICATION =
  CONTEXT.runtimeClassification;
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_RUNTIME_SOURCE_IDS =
  CONTEXT.runtimeSourceIds;
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_PARAMETERS = CONTEXT.parameters;
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_FORMULAS = CONTEXT.formulas;
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_RESOURCES = CONTEXT.resources;
export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_INDEPENDENT_COMPLETENESS_MAP =
  CONTEXT.independentCompletenessMap;
export const stairsConcreteVibrationLargeAreaMissingRows = CONTEXT.missingRows;
export const compileStairsConcreteVibrationLargeAreaS2723 = CONTEXT.compile;

export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SHORT_INPUT = Object.freeze({
  consolidated_concrete_volume_m3: sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
});

export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  consolidated_concrete_volume_m3: sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
  concrete_mix_reference: "PROJECT-CONCRETE-MIX-STAIRS-LARGE-AREA-REV-A",
  placement_location: "Большая захватка лестничных маршей и площадок; STAIRS-VIB-LA-01",
});

export const STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_METADATA = Object.freeze({
  source_title: "Large-area stair-concrete context for the ACI 309 / Wacker IRFU45 atomic vibration technology",
  source_authority: "American Concrete Institute; Wacker Neuson; контекст S27.23",
  source_document_version: "ACI_309R_05_WACKER_IRFU_AND_LARGE_AREA_CONTEXT_2026_10_01",
  definition_hash: STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_PACK_SHA256,
  source_kind: "SHARED_ATOMIC_TECHNOLOGY_WITH_DISTINCT_CATALOG_CONTEXT",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_PACK_SHA256,
  effective_from: "2026-10-01",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join(" | "),
  use_restriction: sourcePack.contextPolicy,
  source_pack_path:
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-large-area-s27-23.json",
});
