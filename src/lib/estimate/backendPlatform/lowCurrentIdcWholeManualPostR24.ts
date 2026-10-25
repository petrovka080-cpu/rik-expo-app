import pack from '../../../../data/estimate-benchmarks/source-packs/low-current-idc-whole-manual-post-r24.json';
import {buildAutomaticConstructionOwnerR1, type AutomaticOwnerDefinition, type AutomaticRowSpec} from '../v4/automaticConstructionOwnerR1';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import type {CanonicalEstimateResourceDefinition} from './canonicalEstimateCompileCore';

const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const ownerId=pack.prefix+':provision-owner';
export const lowCurrentIdcPostResourceIdsR24=()=>[ownerId,...pack.parts.map(p=>pack.prefix+':'+p.key)];

/** Selection describes a proposed physical post. It is never an approval or a
 * statement that the tools, a safe circuit or a suitable terminal exist. */
export function resolveLowCurrentIdcPostProfileR24(value:unknown){
  if(value===undefined||value===null||value==='')return{kind:'CLARIFICATION_REQUIRED' as const,parameterId:pack.profileId};
  if(value===pack.notSelected)return{kind:'NOT_SELECTED' as const};
  const profile=pack.profiles.find(p=>p.titleRu===value);
  if(!profile)throw Object.assign(new Error('LOW_CURRENT_IDC_POST_PROFILE_INVALID'),{code:'LOW_CURRENT_IDC_POST_PROFILE_INVALID'});
  return{kind:'SELECTED' as const,profile};
}

/** Actual ROOT-captured parent computation hash is a mandatory external input.
 * The immutable source preview cannot stand in for a current captured parent. */
export function appendLowCurrentIdcWholeManualPostR24(input:Readonly<{
  catalogId:string;parent:AutomaticOwnerDefinition;expectedCapturedComputationSha256:string;sourceKey:string;
}>):AutomaticOwnerDefinition{
  if(input.catalogId!==pack.hostCatalogId)throw Error('LOW_CURRENT_IDC_EXISTING_SCS_OWNER_REQUIRED');
  if(!/^[a-f0-9]{64}$/.test(input.expectedCapturedComputationSha256)
    ||hash({parameters:input.parent.parameters,formulas:input.parent.formulas,resources:input.parent.resources})!==input.expectedCapturedComputationSha256)
    throw Error('LOW_CURRENT_IDC_EXACT_CAPTURED_PARENT_REQUIRED');
  if(!input.sourceKey.trim())throw Error('LOW_CURRENT_IDC_ROOT_SOURCE_KEY_REQUIRED');
  const selected={kind:'or' as const,operands:pack.profiles.map(p=>({kind:'equals' as const,parameterId:pack.profileId,value:p.titleRu}))};
  const rows:AutomaticRowSpec[]=[{rowId:ownerId,formulaId:pack.prefix+':formula:provision',title:'Оснащение ручного поста IDC-оконцевания',
    section:'Оснащение поста оконцевания медных линий',category:'equipment',unitId:'set',expression:pack.frontCountId,procurement:false,costTreatment:'OWN_COST',inclusion:selected},
    ...pack.parts.map(p=>({rowId:pack.prefix+':'+p.key,formulaId:pack.prefix+':formula:'+p.key,title:p.titleRu,
      section:'Состав поста оконцевания медных линий',category:'equipment',unitId:p.unitId,expression:pack.frontCountId+'*'+p.countPerPost,
      procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,inclusion:selected}))];
  const extra=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:input.sourceKey,
    normId:'EXPLICIT_MANUFACTURER_POST_INVENTORY_NOT_INSTALLATION_RATE',sourceMetadata:{source_title:'Полный ручной пост IDC-оконцевания: заявленный состав изготовителя',
      source_document_version:pack.contract,definition_hash:pack.source.sha256,exact_locator:pack.source.locator,artifact_sha256:pack.source.sha256},
    applicabilityRu:pack.scopeRu,ordinary:[{id:pack.profileId,title:'Ручной пост для какого интерфейса и жилы выбран?',kind:'ordinary',valueType:'enum',unitId:null,
      values:[pack.notSelected,...pack.profiles.map(p=>p.titleRu)]}],profile:[],conditional:[{id:pack.frontCountId,title:'Число одновременно оборудуемых ручных постов',
      kind:'conditional',valueType:'integer',unitId:'piece',min:1,max:1000000,requiredWhen:selected}],rows,
    excludedUnownedAssumptions:pack.notCoveredRu,deferMissingProjectFactsToRows:true});
  const parameters=[...input.parent.parameters,...extra.parameters.map((p,i)=>({...p,ordinal:input.parent.parameters.length+i,
    truth_metadata:{...p.truth_metadata,postFactIsStockOrApproval:false,quantityProvenance:'EXPLICIT_ORGANISATIONAL_PHYSICAL_POST_COUNT_NOT_APPLICATION_NORM'}}))];
  const additions=extra.resources.map((row,i):CanonicalEstimateResourceDefinition=>{
    const part=pack.parts.find(p=>pack.prefix+':'+p.key===row.row_id);
    const{row_sha256:_priorRowHash,...originalRow}=row;
    const body={...originalRow,ordinal:input.parent.resources.length+i,...(part?{cost_owner_id:ownerId}:{}),resource_graph:{...row.resource_graph,
      ...(part?{parentCostOwnerId:ownerId,includedInResourceOwnerRowId:ownerId}:{}),
      derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,
        parameterIds:[pack.frontCountId],reasonRu:'Количество определяется явным числом оборудуемых постов; не длиной кабеля, числом портов или нормой часов.'},
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:'Ручное оснащение IDC-оконцевания',
        operationId:pack.prefix+':physical-provision',operationTitleRu:'Обеспечить целый ручной пост оконцевания',processOrdinal:10,
        completionCriterionRu:'Все пять компонентов доступны на каждом заявленном посту; монтаж, безопасное состояние и сертификация сети отдельно.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,
        brandAndModelRu:part?.internalModel??'IS50/11292000',specificationRu:part?.assemblyBoundary??pack.priceScopeRu,detailsRu:pack.notCoveredRu}},
      source_metadata:{...row.source_metadata,sourceRole:'MANUFACTURER_PHYSICAL_POST_BOM_NOT_INSTALLATION_NORM',normativeTrace:[],
        sourceKey:input.sourceKey,source_artifact_sha256:pack.source.sha256,official_url:pack.source.url,
        sourceLocator:pack.source.locator,supporting_artifact_sha256:pack.source.supportingSha256,
        quantityNormClaimed:false,serverApprovalClaimed:false,stockAvailabilityClaimed:false,
        actualObjectFactsRequired:pack.requiresActualObjectFacts,sourceUseInstructionsReceiptAccepted:false,
        full_technical_acceptance:false,purchaseOrHireQuantityInferred:false,costAndSupplyScope:pack.priceScopeRu}};
    return{...body,row_sha256:estimateDeterministicHash(body)};
  });
  const resources=[...input.parent.resources,...additions];
  const formulas=[...input.parent.formulas,...extra.formulas];
  for(const [kind,ids] of [['parameter',parameters.map(p=>p.parameter_id)],['formula',formulas.map(f=>f.formula_id)],['resource',resources.map(r=>r.row_id)]] as const)
    if(new Set(ids).size!==ids.length)throw Error('LOW_CURRENT_IDC_DUPLICATE_'+kind.toUpperCase());
  if(pack.parts.length!==5||pack.parts.some(p=>p.countPerPost!==1)||new Set(pack.parts.map(p=>p.key)).size!==5)
    throw Error('LOW_CURRENT_IDC_EXACT_WHOLE_ROSTER_REQUIRED');
  return{...input.parent,parameters,formulas,resources};
}

/** Independently fixed source roster; it is not generated from output rows. */
export function lowCurrentIdcWholePostExpectedR24(fronts:number){
  if(!Number.isSafeInteger(fronts)||fronts<1||fronts>1000000)throw Error('LOW_CURRENT_IDC_EXPLICIT_POST_COUNT_REQUIRED');
  return{owner:{rowId:ownerId,quantity:String(fronts),unitId:'set'},parts:[
    ['impact-tool','piece'],['snips','piece'],['cable-stripper','piece'],['66-110-blade','piece'],['pouch','piece'],
  ].map(([key,unitId])=>({rowId:pack.prefix+':'+key,quantity:String(fronts),unitId,costOwnerId:ownerId})),
    physicalAssetPieces:5*fronts,applicationHoursDerived:false,stockOrProjectApprovalAccepted:false};
}

export function lowCurrentIdcPostComputationHashR24(parent:AutomaticOwnerDefinition):string{
  return hash({parameters:parent.parameters,formulas:parent.formulas,resources:parent.resources});
}
