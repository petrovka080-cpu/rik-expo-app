import pack from '../../../../data/estimate-benchmarks/source-packs/low-current-copper-certifier-pro-stock-r24.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from '../v4/automaticConstructionOwnerR1';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
export const lowCurrentCopperCertifierProStockResourceIdsR24=()=>pack.parts.map(part=>pack.prefix+':'+part.key);

export function resolveLowCurrentCopperCertifierProStockR24(value:unknown){
  if(value===undefined||value===null||value==='')return{kind:'CLARIFICATION_REQUIRED' as const,parameterId:pack.profileId};
  if(value===pack.notSelected)return{kind:'NOT_SELECTED' as const};
  if(value!==pack.selectedProfile)throw Object.assign(new Error('LOW_CURRENT_CERTIFIER_PROFILE_INVALID'),{code:'LOW_CURRENT_CERTIFIER_PROFILE_INVALID'});
  return{kind:'SELECTED' as const,profile:pack.selectedProfile};
}

/** Physical inventory only. The existing hour owner and its quantities remain
 * untouched; this function does not admit a new price or a second paid post. */
export function appendLowCurrentCopperCertifierProStockR24(input:Readonly<{
  catalogId:string;parent:AutomaticOwnerDefinition;expectedCapturedComputationSha256:string;sourceKey:string;
}>):AutomaticOwnerDefinition{
  if(input.catalogId!==pack.hostCatalogId)throw Error('LOW_CURRENT_CERTIFIER_EXISTING_SCS_OWNER_REQUIRED');
  if(!/^[a-f0-9]{64}$/.test(input.expectedCapturedComputationSha256)
    ||hash({parameters:input.parent.parameters,formulas:input.parent.formulas,resources:input.parent.resources})!==input.expectedCapturedComputationSha256)
    throw Error('LOW_CURRENT_CERTIFIER_EXACT_CAPTURED_PARENT_REQUIRED');
  if(!input.sourceKey.trim())throw Error('LOW_CURRENT_CERTIFIER_ROOT_SOURCE_KEY_REQUIRED');
  const usage=input.parent.resources.find(row=>row.row_id===pack.existingMachineHourOwnerRowId);
  if(!usage||usage.unit_id!=='machine_hour'||usage.category!=='equipment')throw Error('LOW_CURRENT_CERTIFIER_EXISTING_HOUR_OWNER_REQUIRED');
  const active={kind:'equals' as const,parameterId:pack.profileId,value:pack.selectedProfile};
  const child=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,
    sourceId:input.sourceKey,normId:'MANUFACTURER_DECLARED_PRO_INVENTORY_NOT_HOURLY_NORM',
    sourceMetadata:{source_title:'Парный комплект сертификации медных линий: полный заявленный состав',source_document_version:pack.contract,
      definition_hash:pack.primary.sha256,exact_locator:pack.primary.locator,artifact_sha256:pack.primary.sha256},
    applicabilityRu:pack.scopeRu,ordinary:[{id:pack.profileId,title:'Какой физический измерительный комплект выбран?',kind:'ordinary',valueType:'enum',unitId:null,
      values:[pack.notSelected,pack.selectedProfile]}],profile:[],conditional:[{id:pack.frontCountId,title:'Число одновременно оснащаемых измерительных постов',
      kind:'conditional',valueType:'integer',unitId:'piece',min:1,max:1000000,requiredWhen:active}],
    rows:pack.parts.map(p=>({rowId:pack.prefix+':'+p.key,formulaId:pack.prefix+':formula:'+p.key,title:p.nameRu,
      category:p.unitId==='document'?'service':'equipment',section:'Физический состав измерительного поста',unitId:p.unitId,
      expression:pack.frontCountId+'*'+p.perFront,inclusion:active,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const})),
    excludedUnownedAssumptions:pack.openObjectFacts,deferMissingProjectFactsToRows:true});
  const additions=child.resources.map((row,index)=>{
    const{row_sha256:_old,...oldBody}=row;
    const body={...oldBody,ordinal:input.parent.resources.length+index,resource_graph:{...row.resource_graph,
      existingUsageHourPriceOwnerRowId:pack.existingMachineHourOwnerRowId,
      physicalPieceQuantityNotUsageHours:true,commercialCoverageUnresolved:true,
      derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,
        parameterIds:[pack.frontCountId],reasonRu:'Физический состав задаётся числом пар приборов; часы существующей строки не меняются и не становятся штуками.'},
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:'Измерительное оснащение постоянных медных линий',
        operationId:pack.prefix+':physical-inventory',operationTitleRu:'Обеспечить полный физический состав измерительного поста',processOrdinal:20,
        completionCriterionRu:'Доступны все приборы, адаптеры и принадлежности; калибровка, цены и фактические тесты не приняты.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:row.title_ru,
        brandAndModelRu:pack.internalProductReference,specificationRu:'Точная заводская поставка с двумя permanent-link адаптерами',detailsRu:pack.openObjectFacts}},
      source_metadata:{...row.source_metadata,normativeTrace:[],sourceRole:'MANUFACTURER_PHYSICAL_INVENTORY_PRICE_COVERAGE_HOLD',
        sourceKey:input.sourceKey,official_url:pack.primary.url,source_artifact_sha256:pack.primary.sha256,sourceLocator:pack.primary.locator,
        oldUsageHourOwnerUnchanged:true,newPaidOwnerAdded:false,coveredByOldPrice:false,priceCoverageStatus:'ROOT_OWNER_REVIEW_HOLD',
        quantityNormClaimed:false,stockOrCalibrationConfirmed:false,actualTestResultAccepted:false,serverApprovalClaimed:false,
        sourceAutotestTimeConvertedToHours:false,full_technical_acceptance:false}};
    return{...body,row_sha256:estimateDeterministicHash(body)};
  });
  const parameters=[...input.parent.parameters,...child.parameters.map((p,index)=>({...p,ordinal:input.parent.parameters.length+index}))];
  const formulas=[...input.parent.formulas,...child.formulas],resources=[...input.parent.resources,...additions];
  for(const [kind,ids] of [['parameter',parameters.map(p=>p.parameter_id)],['formula',formulas.map(f=>f.formula_id)],['row',resources.map(r=>r.row_id)]] as const)
    if(new Set(ids).size!==ids.length)throw Error('LOW_CURRENT_CERTIFIER_DUPLICATE_'+kind.toUpperCase());
  if(resources.find(row=>row.row_id===usage.row_id)!==usage)throw Error('LOW_CURRENT_CERTIFIER_USAGE_OWNER_MUTATED');
  return{...input.parent,parameters,formulas,resources};
}

/** Fixed source counts, independent from generated resource definitions. */
export function lowCurrentCopperCertifierProExpectedR24(fronts:number){
  if(!Number.isSafeInteger(fronts)||fronts<1||fronts>1000000)throw Error('LOW_CURRENT_CERTIFIER_EXPLICIT_PAIR_COUNT_REQUIRED');
  return{pieces:{main:fronts,remote:fronts,'channel-adapters':2*fronts,'reference-patch-cord':fronts,
    'permanent-link-adapters':2*fronts,case:fronts,'usb-cable':fronts,'ac-adapters':2*fronts},
    documents:{'getting-started-guide':fronts},physicalPieceCount:11*fronts,documentCount:fronts,
    newPaidOwnerCount:0,newMachineHoursDerived:false,actualCalibrationAccepted:false};
}
