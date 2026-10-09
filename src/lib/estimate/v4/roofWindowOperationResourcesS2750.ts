import pack from '../../../../data/estimate-benchmarks/source-packs/roof-window-operation-resources-s27-50.json';
import { sourcePack as parentPack, parameterDefinitions, formulaDefinitions, resourceDefinitions as parentResources } from './roofLanternCfp100100LimitedS2748';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { canonicalPublicEstimateRowNameRu } from '../backendPlatform/canonicalPublicEstimateLanguageRu';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const sourcePack = { ...parentPack, ...pack };
export { parameterDefinitions, formulaDefinitions };
export const resourceDefinitions = parentResources.map(resource => {
  const binding = pack.resourceOperations[resource.row_id as keyof typeof pack.resourceOperations];
  if (!binding) throw new Error(`ROOF_WINDOW_OPERATION_BINDING_MISSING:${resource.row_id}`);
  const operation = pack.operations[binding.operation as keyof typeof pack.operations];
  const related = binding.operation === 'base' && resource.row_id === 'roof-cfp100100:installation'
    ? [{ operationId: 'roof-window:dome', operationTitleRu: pack.operations.dome.titleRu,
      completionCriterionRu: pack.operations.dome.criterionRu, processOrdinal: pack.operations.dome.ordinal }] : [];
  return { ...resource, section: operation.titleRu,
    resource_graph: { ...resource.resource_graph,
      operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1',
        groupId: 'roof-window:installation', groupTitleRu: 'Установка окон в крыше',
        operationId: `roof-window:${binding.operation}`, operationTitleRu: operation.titleRu,
        completionCriterionRu: operation.criterionRu, processOrdinal: operation.ordinal,
        ...(binding.operation === 'reference' ? { processRole: 'REFERENCE_ONLY' } : {}),
        ...(related.length ? { additionalOperations: related } : {}),
      },
      publicResourcePresentationV1: { contractVersion: 'canonical-public-resource-presentation/v1',
        sourceTitleRu: resource.title_ru,
        nameRu: canonicalPublicEstimateRowNameRu({ rowId: resource.row_id, titleRu: resource.title_ru }),
        brandAndModelRu: null, specificationRu: null, detailsRu: [],
      },
    },
    source_metadata: { ...resource.source_metadata, operation_binding_contract: pack.contract,
      operation_binding_hash: estimateDeterministicHash(pack),
      operation_binding_source_locators: binding.locators,
      no_new_application_norm: true },
  };
});

export async function compileCandidate(submittedParameters: Record<string, unknown>, rowOverrides?: CanonicalEstimateCompileCoreInput['rowOverrides']) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? 'recalculate' : 'compile', compilerVersion: pack.contract,
    catalogId: sourcePack.catalogId, primaryMeasureParameterId: 'lantern_count', parameterDefinitions,
    formulaDefinitions: [...formulaDefinitions], resourceDefinitions, submittedParameters, confirmedParameters: {},
    currencyCode: 'KGS', priceItems: [], rowOverrides, maximumResourceRows: resourceDefinitions.length,
    hashJson: value => estimateDeterministicHash(value) });
}
