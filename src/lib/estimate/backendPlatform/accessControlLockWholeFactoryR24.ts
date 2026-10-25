import pack from '../../../../data/estimate-benchmarks/source-packs/access-control-lock-factory-whole-r24.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from '../v4/automaticConstructionOwnerR1';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {resolveInclusionGraph} from './inclusionGraph';
import {canonicalConditionParameterIds} from './canonicalEffectiveResourceQuantityV1';

const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
export const accessControlLockFactoryResourceIdsR24=()=>pack.parts.map(part=>pack.prefix+':'+part.key);
export function resolveAccessControlLockFactoryProfileR24(value:unknown){
  if(value===undefined||value===null||value==='')return{kind:'CLARIFICATION_REQUIRED' as const,parameterId:pack.profileId};
  if(value===pack.notSelected)return{kind:'NOT_SELECTED' as const};
  if(value===pack.selected12V)return{kind:'DECLARED_FACTORY_EXECUTION_NOT_PROJECT_APPROVAL' as const,voltageV:12 as const};
  if(value===pack.selected24V)return{kind:'DECLARED_FACTORY_EXECUTION_NOT_PROJECT_APPROVAL' as const,voltageV:24 as const};
  throw Object.assign(new Error('ACS_LOCK_FACTORY_PROFILE_INVALID'),{code:'ACS_LOCK_FACTORY_PROFILE_INVALID'});
}

/** Complete delivery inventory of a declared lock execution. Actual door,
 * voltage, release logic, stock and installation norms are separate evidence.
 * Native lock quantity and every existing payment/QA scope stay unchanged. */
export function appendAccessControlLockWholeFactoryR24(input:Readonly<{
  catalogId:string;parent:AutomaticOwnerDefinition;expectedCapturedComputationSha256:string;rootSourceKey:string;rootNormId:string;
}>):AutomaticOwnerDefinition{
  const base=input.parent,owner=pack.existingOwner;
  if(input.catalogId!==pack.catalogId)throw Error('ACS_LOCK_FACTORY_EXISTING_OWNER_REQUIRED');
  if(!/^[a-f0-9]{64}$/.test(input.expectedCapturedComputationSha256)
    ||hash({parameters:base.parameters,formulas:base.formulas,resources:base.resources})!==input.expectedCapturedComputationSha256)
    throw Error('ACS_LOCK_FACTORY_EXACT_CAPTURE_REQUIRED');
  if(!input.rootSourceKey.trim()||!input.rootNormId.trim()||input.rootSourceKey===owner.sourceKey)
    throw Error('ACS_LOCK_FACTORY_REAL_MANUFACTURER_SOURCE_REQUIRED');
  const unitRows=base.resources.filter(row=>row.row_id===owner.rowId),unit=unitRows[0];
  if(unitRows.length!==1||!unit||unit.row_sha256!==owner.rowSha256||unit.formula_id!==owner.formulaId||unit.unit_id!=='pcs'
    ||unit.cost_owner_id!==owner.rowId||unit.resource_graph.costTreatment!=='OWN_COST')
    throw Error('ACS_LOCK_FACTORY_EXACT_NATIVE_LOCK_OWNER_REQUIRED');
  const quantity=base.formulas.find(row=>row.formula_id===owner.formulaId);
  if(!quantity||quantity.expression_source!==owner.exactQuantityExpression||quantity.output_unit_id!=='pcs'
    ||JSON.stringify(quantity.input_parameter_ids)!==JSON.stringify(['acs_lock_count']))
    throw Error('ACS_LOCK_FACTORY_EXACT_NATIVE_LOCK_QUANTITY_REQUIRED');
  const ids=accessControlLockFactoryResourceIdsR24();
  if(ids.length!==10||new Set(ids).size!==10||base.resources.some(row=>ids.includes(row.row_id)))
    throw Error('ACS_LOCK_FACTORY_EXACT_TEN_NEW_COMPONENTS_REQUIRED');
  const expected=[['armature',1,'pcs'],['case-screws-m5x20',2,'pcs'],['anchor-pin',1,'pcs'],['anchor-sleeve',1,'pcs'],
    ['anchor-through-sleeve',1,'pcs'],['anchor-bolt-m6x35',1,'pcs'],['anchor-sealing-ring',1,'pcs'],['anchor-washer',1,'pcs'],
    ['manual',1,'document'],['factory-package',1,'package']];
  if(JSON.stringify(pack.parts.map(part=>[part.key,part.countPerUnit,part.unitId]))!==JSON.stringify(expected))
    throw Error('ACS_LOCK_FACTORY_WHOLE_SOURCE_ROSTER_REQUIRED');
  const selected={kind:'or' as const,operands:[{kind:'equals' as const,parameterId:pack.profileId,value:pack.selected12V},
    {kind:'equals' as const,parameterId:pack.profileId,value:pack.selected24V}]};
  const rows:AutomaticRowSpec[]=pack.parts.map(part=>({rowId:pack.prefix+':'+part.key,formulaId:pack.prefix+':formula:'+part.key,
    title:part.titleRu,section:'Заводская поставка электромагнитного замка',category:part.category,unitId:part.unitId,
    expression:'('+quantity.expression_source+')*'+part.countPerUnit,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:selected}));
  const child=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:input.rootSourceKey,normId:input.rootNormId,
    sourceMetadata:{source_title:pack.scopeRu,source_document_version:pack.primary.revision,definition_hash:pack.primary.sha256,
      artifact_sha256:pack.primary.sha256,exact_locator:pack.primary.locator},applicabilityRu:pack.scopeRu,
    ordinary:[{id:pack.profileId,title:'Какое исполнение заводской поставки замка выбрано?',kind:'ordinary',valueType:'enum',unitId:null,
      values:[pack.notSelected,pack.selected12V,pack.selected24V]}],profile:[],conditional:[],rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:pack.notCoveredRu});
  const parameters=[...base.parameters,...child.parameters.map((row,index)=>({...row,ordinal:base.parameters.length+index}))];
  const parameterIds=new Set(parameters.map(row=>row.parameter_id));
  for(const formula of child.formulas)for(const id of formula.input_parameter_ids)
    if(!parameterIds.has(id))throw Error('ACS_LOCK_FACTORY_UNDECLARED_NATIVE_QUANTITY_INPUT:'+id);
  const additions=child.resources.map((row,index)=>{
    const part=pack.parts[index];if(!part)throw Error('ACS_LOCK_FACTORY_SOURCE_PART_MISSING');
    const{row_sha256:_previous,...original}=row;
    const body={...original,ordinal:base.resources.length+index,cost_owner_id:owner.rowId,
      resource_graph:{...row.resource_graph,parentCostOwnerId:owner.rowId,includedInResourceOwnerRowId:owner.rowId,
        sourceFactoryDeliveryV1:{sourceArtifactSha256:pack.primary.sha256,parentLockRowId:owner.rowId,
          sourceCountPerUnit:part.countPerUnit,countEvidence:part.countEvidence,notAnAdditionalOrder:true,
          priceScope:'EXACT_COMPLETE_LOCK_VENDOR_SCOPE_REVIEW_REQUIRED',actualProjectApproval:false,
          integratedDoorSensorDoesNotReplaceExternalOwner:true,pinMayAlreadyBeInstalled:true},
        derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,
          parameterIds:[...quantity.input_parameter_ids],reasonRu:'Включённые части заводской поставки связаны с прежним количеством замков; отдельный заказ и второй владелец оплаты не создаются.'}},
      source_metadata:{...row.source_metadata,normativeTrace:[],sourceRole:'MANUFACTURER_FACTORY_DELIVERY_NOT_INSTALLATION_APPLICATION_NORM',
        sourceKey:input.rootSourceKey,source_artifact_sha256:pack.primary.sha256,official_url:pack.primary.officialUrl,sourceLocator:pack.primary.locator,
        sourceCountPerUnit:part.countPerUnit,countEvidence:part.countEvidence,factoryDeliveryRegistryNormId:input.rootNormId,
        nativeParentRowId:owner.rowId,nativeParentFormulaId:owner.formulaId,includedWithFactoryUnit:true,
        sourceOrProjectApproval:false,actualSupplierPriceScopeConfirmed:false,newLabourHours:false,wholeOperationalDoorAccepted:false}};
    resolveInclusionGraph(body.inclusion_ast,{});
    for(const id of canonicalConditionParameterIds(body.inclusion_ast))if(!parameterIds.has(id))throw Error('ACS_LOCK_FACTORY_UNDECLARED_SELECTION_INPUT:'+id);
    return{...body,row_sha256:estimateDeterministicHash(body)};
  });
  const formulas=[...base.formulas,...child.formulas],resources=[...base.resources,...additions];
  for(const [kind,all] of [['parameter',parameters.map(row=>row.parameter_id)],['formula',formulas.map(row=>row.formula_id)],
    ['resource',resources.map(row=>row.row_id)]] as const)
    if(new Set(all).size!==all.length)throw Error('ACS_LOCK_FACTORY_DUPLICATE_'+kind.toUpperCase());
  return{...base,parameters,formulas,resources,ordinaryParameterIds:[...base.ordinaryParameterIds,pack.profileId]};
}
