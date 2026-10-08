import fittingPack from '../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-exact-fittings-s27-47.json';
import { compileCanonicalEstimateCore, type CanonicalEstimateParameterDefinition } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import {
  WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID,
  WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS,
  WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS,
  WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES,
  WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT,
} from './waterValtecPpr20StandardS2723';

export const VALTEC_EXACT_FITTINGS_S2747 = fittingPack;
export const VALTEC_EXACT_FITTINGS_S2747_SOURCE_PACK_SHA256 = '20e6ac5d7529f93d24425a7a10d7b8e2ab588825adbaa5c0095e1d2f0c95e067';

// Product geometry belongs to the object. Manufacturer dimensions and the
// existing socket/time/quantity formulas stay with the shared profile.
export const VALTEC_EXACT_FITTINGS_S2747_PARAMETERS: readonly CanonicalEstimateParameterDefinition[] = [
  ...WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS,
  ...fittingPack.projectSelections.map((selection, index) => ({
    parameter_id: selection.parameterId,
    ordinal: WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS.length + index,
    value_type: 'enum', unit_id: null, title_ru: selection.titleRu,
    required: false, default_value: null,
    constraints_json: { values: selection.values,
      requiredWhen: { kind: 'formula_greater_than', expression: selection.countParameterId, unitId: 'item', value: 0 } },
    truth_metadata: {
      contract: 'rik-expo-app.s27-47.water-valtec-ppr20-exact-fittings.v1',
      semantic_parameter_key: `valtec-ppr20-fitting:${selection.parameterId}`,
      visibility_role: 'USER_INPUT', value_source_role: 'CONDITIONAL_PROJECT_FACT',
      input_origin_class: 'PROJECT_ROUTE_GEOMETRY', hidden_default_forbidden: true,
      preliminary_compilation_allowed: true, source_confirmation_required: false,
      provenance: { consumer_input_role_v1: 'OBJECT_FACT' }, synthetic: false,
      guide: { guide_kind: 'PROJECT_DEFINED', guide_short_ru: selection.guideRu,
        source_role: 'ACTUAL_PROJECT_CONNECTION_WITH_MANUFACTURER_VARIANTS',
        source_document: fittingPack.sourceId, source_locator: selection.exactLocator,
        source_snapshot_hash: fittingPack.artifactSha256,
        guide_version: 's2747-exact-fitting-selections-v1', verified_at: '2026-10-08T00:00:00+06:00',
        guide_validation_policy: 'MANDATORY_BLOCK' },
    },
  })),
];

export const VALTEC_EXACT_FITTINGS_S2747_RESOURCES = WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.map(resource => {
  const fixed = fittingPack.fixedComponents.find(component => component.rowId === resource.row_id);
  const selection = fittingPack.projectSelections.find(component => component.rowId === resource.row_id);
  if (!fixed && !selection) return resource;
  const title = fixed?.titleRu ?? resource.title_ru;
  const resourceGraph = { ...resource.resource_graph,
    ...(selection ? { titleSpecificationParameterIds: [selection.parameterId], titleSpecificationMode: 'REPLACE' } : {}) };
  const sourceMetadata = { ...resource.source_metadata,
    exactFittingSourcePackSha256: VALTEC_EXACT_FITTINGS_S2747_SOURCE_PACK_SHA256,
    normativeTrace: [{ ...(Array.isArray(resource.source_metadata?.normativeTrace) ? resource.source_metadata.normativeTrace[0] : {}),
      sourceId: fittingPack.sourceId, source_id: fittingPack.sourceId,
      source_url: fittingPack.officialUrl, source_definition_hash: fittingPack.artifactSha256,
      exact_locator: (fixed ?? selection)!.exactLocator,
      source_title: 'VALTEC: паспорт полипропиленовых фитингов VTp.700, редакция 12.2024' }] };
  return { ...resource, title_ru: title, resource_graph: resourceGraph, source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ resource, title, resourceGraph, sourceMetadata }) };
});

export async function compileWaterValtecPpr20ExactFittingsS2747(
  submittedParameters: Record<string, unknown>,
  rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides'],
) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? 'recalculate' : 'compile',
    compilerVersion: 'canonical-estimate-compiler.water-valtec-ppr20-exact-fittings.s2747.v1',
    catalogId: WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID, primaryMeasureParameterId: 'route_length_m',
    parameterDefinitions: [...VALTEC_EXACT_FITTINGS_S2747_PARAMETERS],
    formulaDefinitions: [...WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS],
    resourceDefinitions: VALTEC_EXACT_FITTINGS_S2747_RESOURCES,
    submittedParameters, rowOverrides, confirmedParameters: { ...WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT },
    currencyCode: 'KGS', priceItems: [], maximumResourceRows: VALTEC_EXACT_FITTINGS_S2747_RESOURCES.length,
    hashJson: async value => estimateDeterministicHash(value),
  });
}
