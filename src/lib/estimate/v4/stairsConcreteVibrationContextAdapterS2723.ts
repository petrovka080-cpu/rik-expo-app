import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT,
} from "./stairsConcreteVibrationStandardS2723";

type Json = Record<string, unknown>;

export type StairsConcreteVibrationContextConfigS2723 = Readonly<{
  catalogId: string;
  sourceId: string;
  normId: string;
  sourcePackSha256: string;
  sharedTechnologySourcePackSha256: string;
  contextKey: string;
  contextRu: string;
  contextSlug: string;
  rowPrefix: string;
  contextPolicy: string;
  compilerVersion: string;
}>;

export function createStairsConcreteVibrationContextS2723(
  config: StairsConcreteVibrationContextConfigS2723,
) {
  const runtimeInput = STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT;
  const runtimeClassification =
    STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION;
  const runtimeSourceIds = Object.freeze(Object.fromEntries(
    Object.keys(runtimeInput).map((parameterId) => [parameterId, [config.sourceId]]),
  ) as Readonly<Record<string, readonly string[]>>);

  const parameters: readonly CanonicalEstimateParameterDefinition[] = Object.freeze(
    STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS.map((parameter) => ({
      ...parameter,
      truth_metadata: {
        ...(parameter.truth_metadata as Json),
        contract: `rik-expo-app.s27-23.stairs-concrete-vibration-${config.contextSlug}.v1`,
        semantic_parameter_key:
          `stairs-concrete-vibration-${config.contextSlug}-s27-23:${parameter.parameter_id}`,
        catalog_context: config.contextKey,
        catalog_context_ru: config.contextRu,
      },
    })),
  );

  const adaptRowId = (rowId: string): string => rowId.replace(
    "concrete-stairs-vibration:",
    `${config.rowPrefix}:`,
  );

  const resources: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
    STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.map((resource) => {
      const rowId = adaptRowId(resource.row_id);
      const resourceGraph = {
        ...(resource.resource_graph as Json),
        semanticOwnerId:
          `stairs-concrete-vibration-${config.contextSlug}-s27-23:${rowId}`,
        preliminaryProfileId: config.normId,
        catalogContext: config.contextKey,
        catalogContextRu: config.contextRu,
        contextSourcePackSha256: config.sourcePackSha256,
      };
      const sourceMetadata = {
        ...(resource.source_metadata as Json),
        sharedAtomicTechnology: true,
        sharedTechnologySourcePackSha256: config.sharedTechnologySourcePackSha256,
        contextSourcePackSha256: config.sourcePackSha256,
        contextPolicy: config.contextPolicy,
      };
      return {
        ...resource,
        id: `resource-${rowId.replace(/:/gu, "-")}`,
        row_id: rowId,
        title_ru: `${resource.title_ru} — ${config.contextRu}`,
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
    }),
  );

  const independentCompletenessMap = Object.freeze({
    contract:
      `rik-expo-app.s27-23.stairs-concrete-vibration-${config.contextSlug}-completeness.v1`,
    sourceKind: "INDEPENDENT_SHARED_ATOMIC_TECHNOLOGY_CONTEXT_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: config.sourcePackSha256,
    entries: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
      .map((component) => ({
        ...component,
        requiredRowIds: component.requiredRowIds.map(adaptRowId),
        expectedResourceIds: component.expectedResourceIds.map(adaptRowId),
      })),
  });

  const missingRows = (rowIds: ReadonlySet<string>): string[] =>
    independentCompletenessMap.entries
      .flatMap((entry) => entry.requiredRowIds)
      .filter((rowId) => !rowIds.has(rowId));

  const compile = async (
    submittedParameters: Record<string, unknown>,
  ): Promise<CanonicalEstimateCompileCoreResult> => compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: config.compilerVersion,
    catalogId: config.catalogId,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...parameters],
    formulaDefinitions: [...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS],
    resourceDefinitions: [...resources],
    submittedParameters,
    confirmedParameters: { ...runtimeInput },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: resources.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });

  return Object.freeze({
    runtimeInput,
    runtimeClassification,
    runtimeSourceIds,
    parameters,
    formulas: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
    resources,
    independentCompletenessMap,
    missingRows,
    compile,
  });
}
