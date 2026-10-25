import pack from '../../../../data/estimate-benchmarks/source-packs/fire-alarm-rip24-06-whole-factory-delivery-r24.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from '../v4/automaticConstructionOwnerR1';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalConditionParameterIds} from './canonicalEffectiveResourceQuantityV1';
import {resolveInclusionGraph} from './inclusionGraph';

const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
export const fireAlarmReservedPowerWholeResourceIdsR24=()=>pack.parts.map(part=>pack.prefix+':'+part.key);
export function resolveFireAlarmReservedPowerProfileR24(value:unknown){
  if(value===undefined||value===null||value==='')return{kind:'CLARIFICATION_REQUIRED' as const,parameterId:pack.profileId};
  if(value===pack.notSelected)return{kind:'NOT_SELECTED' as const};
  if(value===pack.selectedProfile)return{kind:'SELECTED_FACTORY_DELIVERY_NOT_PROJECT_APPROVAL' as const};
  throw Object.assign(new Error('FIRE_RESERVED_POWER_PROFILE_INVALID'),{code:'FIRE_RESERVED_POWER_PROFILE_INVALID'});
}

/** Five source accessories accompany the existing PSU unit. Its exact native
 * quantity expression is reused, never replaced by a manufacturer work rate,
 * baseline quantity or a guessed post count. Old project/profile needs remain. */
export function appendFireAlarmReservedPowerWholeFactoryR24(input:Readonly<{
  catalogId:string;parent:AutomaticOwnerDefinition;expectedCapturedComputationSha256:string;rootSourceKey:string;rootNormId:string;
}>):AutomaticOwnerDefinition{
  const base=input.parent;
  if(input.catalogId!==pack.catalogId)throw Error('FIRE_RESERVED_POWER_EXISTING_OWNER_REQUIRED');
  if(!/^[a-f0-9]{64}$/.test(input.expectedCapturedComputationSha256)
    ||hash({parameters:base.parameters,formulas:base.formulas,resources:base.resources})!==input.expectedCapturedComputationSha256)
    throw Error('FIRE_RESERVED_POWER_EXACT_CAPTURE_REQUIRED');
  if(!input.rootSourceKey.trim()||!input.rootNormId.trim())throw Error('FIRE_RESERVED_POWER_ROOT_SOURCE_KEY_AND_NORM_ID_REQUIRED');
  const owners=pack.existingOwner;
  const supply=base.resources.filter(row=>row.row_id===owners.powerRowId);
  const unit=supply[0];
  if(supply.length!==1||!unit||unit.formula_id!==owners.powerFormulaId||unit.row_sha256!==owners.powerSourceRowSha256
    ||unit.unit_id!=='pcs'||unit.cost_owner_id!==owners.powerRowId||unit.resource_graph.costTreatment!=='OWN_COST')
    throw Error('FIRE_RESERVED_POWER_EXACT_NATIVE_UNIT_OWNER_REQUIRED');
  const quantity=base.formulas.find(formula=>formula.formula_id===owners.powerFormulaId);
  if(!quantity||typeof quantity.expression_source!=='string'||quantity.output_unit_id!=='pcs')
    throw Error('FIRE_RESERVED_POWER_NATIVE_QUANTITY_FORMULA_REQUIRED');
  const nativePsuExpression=quantity.expression_source;
  for(const rowId of [owners.batteryRowId,owners.panelRowId,owners.deviceFastenerRowId])
    if(base.resources.filter(row=>row.row_id===rowId).length!==1)throw Error('FIRE_RESERVED_POWER_NATIVE_BOUNDARY_ROW_REQUIRED:'+rowId);
  const ids=fireAlarmReservedPowerWholeResourceIdsR24();
  if(ids.length!==5||new Set(ids).size!==5||base.resources.some(row=>ids.includes(row.row_id)))throw Error('FIRE_RESERVED_POWER_EXACT_FIVE_NEW_COMPONENTS_REQUIRED');
  const expected=[['manual',1,'document'],['mounting-pair',4,'set'],['cable-gland',4,'pcs'],['cabinet-key',2,'pcs'],['factory-package',1,'package']];
  if(JSON.stringify(pack.parts.map(part=>[part.key,part.countPerDevice,part.unitId]))!==JSON.stringify(expected))
    throw Error('FIRE_RESERVED_POWER_ENTIRE_CURRENT_SOURCE_ROSTER_REQUIRED');
  const selected={kind:'equals' as const,parameterId:pack.profileId,value:pack.selectedProfile};
  const rows:AutomaticRowSpec[]=pack.parts.map(part=>({rowId:pack.prefix+':'+part.key,formulaId:pack.prefix+':formula:'+part.key,
    title:part.titleRu,section:'Заводская поставка резервированного источника питания',category:'equipment',unitId:part.unitId,
    expression:'('+nativePsuExpression+')*'+part.countPerDevice,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:selected}));
  const child=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:input.rootSourceKey,
    normId:input.rootNormId,sourceMetadata:{source_title:pack.scopeRu,source_document_version:pack.primary.revision,
      definition_hash:pack.primary.sha256,artifact_sha256:pack.primary.sha256,exact_locator:pack.primary.locator},applicabilityRu:pack.scopeRu,
    ordinary:[{id:pack.profileId,title:'Выбрано это исполнение заводской поставки источника питания?',kind:'ordinary',valueType:'enum',unitId:null,
      values:[pack.notSelected,pack.selectedProfile]}],profile:[],conditional:[],rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:pack.notCoveredRu});
  const parameters=[...base.parameters,...child.parameters.map((row,index)=>({...row,ordinal:base.parameters.length+index}))];
  const parameterIds=new Set(parameters.map(row=>row.parameter_id));
  const formulas=[...base.formulas,...child.formulas];
  for(const formula of child.formulas)for(const id of formula.input_parameter_ids)
    if(!parameterIds.has(id))throw Error('FIRE_RESERVED_POWER_UNDECLARED_NATIVE_FORMULA_INPUT:'+id);
  const additions=child.resources.map((row,index)=>{
    const part=pack.parts[index];if(!part)throw Error('FIRE_RESERVED_POWER_SOURCE_PART_MISSING');
    const{row_sha256:_prior,...original}=row;
    const body={...original,ordinal:base.resources.length+index,cost_owner_id:owners.powerRowId,
      resource_graph:{...row.resource_graph,parentCostOwnerId:owners.powerRowId,includedInResourceOwnerRowId:owners.powerRowId,
        sourceFactoryDeliveryV1:{sourceArtifactSha256:pack.primary.sha256,parentSupplyRowId:owners.powerRowId,
          sourceCountPerDevice:part.countPerDevice,sourceNativeUnit:part.nativeUnit,
          quantityBasis:'EXACT_EXISTING_PARENT_PSU_FORMULA_NOT_NEW_APPLICATION_RATE',priceScope:'EXACT_COMPLETE_FACTORY_UNIT_OWNER_REVIEW_REQUIRED',
          notAnAdditionalOrder:true,sourceOrProjectApproval:false},
        derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,
          parameterIds:[...quantity.input_parameter_ids],reasonRu:'Состав одной заводской поставки связан с прежним количеством источников; отдельный ручной заказ компонента не создаётся.'}},
      source_metadata:{...row.source_metadata,normativeTrace:[],sourceRole:'MANUFACTURER_FACTORY_DELIVERY_COMPONENT_NOT_INSTALLATION_LABOUR_NORM',
        sourceKey:input.rootSourceKey,source_artifact_sha256:pack.primary.sha256,official_url:pack.primary.officialUrl,sourceLocator:pack.primary.locator,
        sourceCountPerDevice:part.countPerDevice,factoryDeliveryRegistryNormId:input.rootNormId,nativeParentRowId:owners.powerRowId,nativeParentFormulaId:owners.powerFormulaId,
        includedWithFactoryUnit:true,actualSupplierScopeConfirmed:false,actualProjectApproval:false,
        batteryIncluded:false,labourHoursAdded:false,wholeOperationalPowerAccepted:false}};
    resolveInclusionGraph(body.inclusion_ast,{});
    for(const id of canonicalConditionParameterIds(body.inclusion_ast))if(!parameterIds.has(id))throw Error('FIRE_RESERVED_POWER_UNDECLARED_CONDITION:'+id);
    return{...body,row_sha256:estimateDeterministicHash(body)};
  });
  const resources=[...base.resources,...additions];
  for(const [kind,all] of [['parameter',parameters.map(row=>row.parameter_id)],['formula',formulas.map(row=>row.formula_id)],['resource',resources.map(row=>row.row_id)]] as const)
    if(new Set(all).size!==all.length)throw Error('FIRE_RESERVED_POWER_DUPLICATE_'+kind.toUpperCase());
  return{...base,parameters,formulas,resources,ordinaryParameterIds:[...base.ordinaryParameterIds,pack.profileId]};
}
