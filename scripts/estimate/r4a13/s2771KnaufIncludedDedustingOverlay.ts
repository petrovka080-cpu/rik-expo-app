import {createHash} from 'node:crypto';
import pack from '../../../data/estimate-benchmarks/source-packs/knauf-included-dedusting-seven-s27-71.json';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateResourceOperationSections} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import type {CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

const hash=(value:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex');
export const S2771_KNAUF_INCLUDED_DEDUSTING_CONTRACT=pack.contract;
export const S2771_KNAUF_INCLUDED_DEDUSTING_WORKER='plaster:krer15-manual-base:workers';
const operation={
  operationId:'plaster:krer15-manual-base:included-dedusting',
  operationTitleRu:'Обеспыливание, включённое в базовый ручной труд',
  completionCriterionRu:'Однократное обеспыливание того же бетонного участка входит в принятый базовый ручной труд по КРЕР15-02-019-03/04; отдельные часы и эксплуатация пылесоса этим не определены.',
  processOrdinal:10,processRole:'REFERENCE_ONLY',
};

function assertDedustingSourceAdmitted():void {
  if(!pack.publicationAdmitted||!pack.source.quantityAdmitted)
    throw Error('KNAUF_DEDUSTING_SOURCE_NOT_ADMITTED');
}

/** Unpublished draft only. The cited table proves priming, not dedusting.
 * Neither entry point may construct the relationship until its source is admitted. */
export function knaufIncludedDedustingResourceS2771(resource:Json):Json {
  const primary=resource.resource_graph?.operationCompositionV1;
  if(resource.row_id!==S2771_KNAUF_INCLUDED_DEDUSTING_WORKER
    ||primary?.groupId!=='plaster:knauf-materials'
    ||primary.operationId!=='plaster:krer15-manual-base:base'
    ||resource.resource_graph?.costTreatment!=='OWN_COST'
    ||!JSON.stringify(resource.source_metadata).includes(pack.source.sha256))
    throw Error('KNAUF_DEDUSTING_EXISTING_SOURCE_BACKED_WORKER_REQUIRED');
  if(primary.additionalOperations?.some((item:Json)=>item.operationId===operation.operationId))
    throw Error('KNAUF_DEDUSTING_ALREADY_INCLUDED');
  assertDedustingSourceAdmitted();
  const result=structuredClone(resource);
  result.resource_graph={...result.resource_graph,operationCompositionV1:{...primary,
    additionalOperations:[...(primary.additionalOperations??[]),{...operation}]}};
  const {row_sha256:_prior,...body}=result;
  result.row_sha256=hash(body);
  return result;
}

export function overlayS2771KnaufIncludedDedusting(parent:PurchaseGroupRepresentative) {
  const target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id);
  if(!target||parent.definition.id!==target.predecessorDefinitionId
    ||Number(parent.definition.definition_version)!==target.predecessorVersion
    ||parent.definition.definition_sha256!==target.predecessorDefinitionSha256
    ||hash(parent)!==target.parentInputSha256)
    throw Error('KNAUF_DEDUSTING_EXACT_CURRENT_PARENT_REQUIRED');
  const workers=parent.resources.filter(r=>r.row_id===S2771_KNAUF_INCLUDED_DEDUSTING_WORKER);
  const preparation=parent.resources.filter(r=>r.row_id==='plaster:knauf-materials:open-preparation');
  if(workers.length!==1||preparation.length!==1||workers[0]!.row_sha256!==target.workerRowSha256)
    throw Error('KNAUF_DEDUSTING_ORIGINAL_COST_OWNER_AND_OPEN_PREPARATION_REQUIRED');
  assertDedustingSourceAdmitted();
  const result=structuredClone(parent);
  result.resources=result.resources.map(row=>row.row_id===S2771_KNAUF_INCLUDED_DEDUSTING_WORKER
    ?knaufIncludedDedustingResourceS2771(row):row);
  const sections=canonicalEstimateResourceOperationSections(result.resources.map(row=>({
    rowId:String(row.row_id),titleRu:String(row.title_ru),operation:row.resource_graph?.operationCompositionV1,
  })));
  const dust=sections.filter(section=>section.operation?.operationId===operation.operationId);
  if(dust.length!==1||dust[0]!.resourceIds.length!==0||dust[0]!.sharedResources.length!==1
    ||dust[0]!.sharedResources[0]!.rowId!==S2771_KNAUF_INCLUDED_DEDUSTING_WORKER
    ||sections.filter(section=>section.resourceIds.includes(S2771_KNAUF_INCLUDED_DEDUSTING_WORKER)).length!==1)
    throw Error('KNAUF_DEDUSTING_SINGLE_EXISTING_COST_OWNER_REQUIRED');
  return {representative:result,referencedRowId:S2771_KNAUF_INCLUDED_DEDUSTING_WORKER,
    originalDefinitionId:target.predecessorDefinitionId,addedRowIds:[],addedParameterIds:[],
    newQuantityNorms:0,newCostOwners:0,newCompleteTechnicalTypes:0,
    compositeOpenPreparationRetained:true};
}
