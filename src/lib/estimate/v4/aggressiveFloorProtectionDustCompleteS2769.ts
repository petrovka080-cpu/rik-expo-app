import pack from '../../../../data/estimate-benchmarks/source-packs/aggressive-floor-complete-protection-dust-four-s27-69.json';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {aggressiveFloorActualThicknessBindingS2769 as old,aggressiveFloorProtectionScopeIdS2769 as protection,
 aggressiveFloorDustScopeIdS2769 as dust,aggressiveFloorWasteModeIdS2769 as waste,aggressiveFloorWasteScopeValuesS2769 as wasteScope,
 aggressiveFloorWorkScopeIdS2769 as work} from './aggressiveFloorActualThicknessScopeS2769';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {industrialVacuumDedustingKrer13R1} from './industrialVacuumDedustingKrer13R1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

export const aggressiveFloorCompleteBindingS2769=pack;
const frozen=require('../../../../data/estimate-benchmarks/fixtures/aggressive-floor-four-v4-parents-and-barrier-s27-69.json') as {barrier:PurchaseGroupRepresentative};
const sha=(v:unknown)=>canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(v));
const eq=(parameterId:string,value:string)=>({kind:'equals' as const,parameterId,value});
const and=(...operands:Record<string,unknown>[])=>({kind:'and' as const,operands});
const floorScope=eq(work,old.workScopeValue);
const barrierScope=and(floorScope,eq(protection,old.adjacentProtectionNeededValue),eq(pack.barrierMethodParameterId,pack.barrierValue));
const dustScope=and(floorScope,eq(dust,old.dustControlNeededValue),eq(pack.dustMethodParameterId,pack.dustValue));
export const aggressiveFloorPlannedDefaultsS2769:Record<string,string>={
 [protection]:old.adjacentProtectionNeededValue,[dust]:old.dustControlNeededValue,[waste]:wasteScope.retainModeValue,
 [pack.barrierMethodParameterId]:pack.barrierValue,[pack.dustMethodParameterId]:pack.dustValue};
const replacement={barrier_vertical_area_m2:pack.barrierAreaParameterId};
function mapped<T>(value:T):T{
 if(typeof value==='string')return value.replace(/\bbarrier_vertical_area_m2\b/gu,replacement.barrier_vertical_area_m2) as T;
 if(Array.isArray(value))return value.map(mapped) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,mapped(v)])) as T;
 return value;
}

/** Add admitted subworks to exact published v4 parents. Existing ten owners
 * stay stable. Unsupported methods still expose their original source needs. */

export const aggressiveFloorProtectionDustHistoricalBindingSha256S2769='ce583f84e6e888982c780a334d11f464b00cbbe52d3642834f798aee89108fe7';
export type aggressiveFloorProtectionDustCompleteS2769HistoricalBindingContext=Readonly<{binding:typeof pack;sourcePackSha256:string}>;
/** Read-only proof reconstruction can use only the exact pinned old binding.
 * Every non-target byte-semantic field must still equal this versioned recipe;
 * no historical caller can inject a different norm or arithmetic. */
function historicalTargets(context?:aggressiveFloorProtectionDustCompleteS2769HistoricalBindingContext){
 if(!context)return pack.targets;
 if(context.sourcePackSha256!==aggressiveFloorProtectionDustHistoricalBindingSha256S2769
  ||canonicalEstimateSha256HexText(canonicalEstimateStableJson(context.binding))!==aggressiveFloorProtectionDustHistoricalBindingSha256S2769)throw Error('PINNED_HISTORICAL_BINDING_REQUIRED');
 const {targets:_active,...active}=pack,{targets:_historical,...historical}=context.binding;
 if(canonicalEstimateStableJson(active)!==canonicalEstimateStableJson(historical))throw Error('HISTORICAL_RECIPE_SEMANTICS_DRIFT');
 return context.binding.targets;
}
export function buildAggressiveFloorProtectionDustCompleteS2769(parent:PurchaseGroupRepresentative,historical?:aggressiveFloorProtectionDustCompleteS2769HistoricalBindingContext):PurchaseGroupRepresentative{
 const target=historicalTargets(historical).find(t=>t.catalogId===parent.definition.catalog_id),b=frozen.barrier;
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_sha256!==target.parentSha256
  ||parent.definition.definition_version!==4||parent.resources.length!==10||parent.parameters.length!==19)
  throw Error('AGGRESSIVE_FLOOR_EXACT_FOUR_V4_PARENTS_REQUIRED');
 if(b.definition.id!==pack.barrierReference.definitionId||b.definition.definition_sha256!==pack.barrierReference.definitionSha256||b.resources.length!==11)
  throw Error('AGGRESSIVE_FLOOR_ACCEPTED_BARRIER_REFERENCE_DRIFT');
 const r=structuredClone(parent);
 const added=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:String(parent.definition.catalog_id),sourceId:pack.dustSource.sourceId,
  normId:'norm:kg:krer:'+pack.dustSource.norm+':2015',sourceMetadata:{source_title:'КРЕР13-2015 и КРЕР46-2015',source_document_version:'2015',
   definition_hash:pack.dustSource.sha256,artifact_sha256:pack.dustSource.sha256,exact_locator:pack.dustSource.locatorRu},applicabilityRu:pack.scopeRu,
  ordinary:[{id:pack.barrierAreaParameterId,title:'Площадь вертикального защитного ограждения, м²',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000001,
   requiredWhen:barrierScope as never}],
  profile:[{id:pack.barrierMethodParameterId,title:'Планируемая конструкция защиты прилегающих частей',valueType:'enum',unitId:null,kind:'profile',
   values:[pack.barrierValue,pack.otherBarrierValue],defaultValue:pack.barrierValue},
   {id:pack.dustMethodParameterId,title:'Планируемый способ обеспыливания',valueType:'enum',unitId:null,kind:'profile',
    values:[pack.dustValue,pack.otherDustValue],defaultValue:pack.dustValue}],conditional:[],rows:[],excludedUnownedAssumptions:[],deferMissingProjectFactsToRows:true});
 for(const p of added.parameters)r.parameters.push({...p,ordinal:r.parameters.length});
 for(const row of r.resources.filter(row=>row.row_id.endsWith(':adjacent-protection')||row.row_id.endsWith(':dust-control'))){
  const isBarrier=row.row_id.endsWith(':adjacent-protection');
  row.inclusion_ast=and(floorScope,eq(isBarrier?protection:dust,isBarrier?old.adjacentProtectionNeededValue:old.dustControlNeededValue),
   eq(isBarrier?pack.barrierMethodParameterId:pack.dustMethodParameterId,isBarrier?pack.otherBarrierValue:pack.otherDustValue));
 }
 for(const original of b.formulas){
  const expression=mapped(String(original.expression_source)),compiled=compileFormulaGraph(expression);
  r.formulas.push({...original,expression_source:expression,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:sha(compiled.ast)});
 }
 for(const original of b.resources){
  const row=mapped(structuredClone(original));
  r.resources.push({...row,ordinal:r.resources.length,inclusion_ast:barrierScope,
   semantic_owner:String(parent.definition.catalog_id)+':'+row.row_id,
   resource_graph:{...row.resource_graph,semanticOwnerId:String(parent.definition.catalog_id)+':'+row.row_id,
    inputParameterIds:[pack.barrierAreaParameterId,pack.barrierMethodParameterId],scopeContextParameterIds:[protection],
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'aggressive-floor-protection',groupTitleRu:'Защита прилегающих частей',
     operationId:'aggressive-floor-protection:vertical-board-frame',operationTitleRu:'Устройство и последующая разборка вертикального ограждения',processOrdinal:0,
     completionCriterionRu:'Установлено и после демонтажа снято ограждение принятой конструкции по собственному обмеру.'},
    admittedSubworkReuseS2769:{definitionId:b.definition.id,definitionSha256:b.definition.definition_sha256,sourceRowId:row.row_id}}});
 }
 r.bindings.push(...structuredClone(b.bindings));
 const vacuum=industrialVacuumDedustingKrer13R1('floor_covering_area_m2');
 r.formulas.push(...vacuum.formulas.map(f=>({...f,ast_sha256:sha(f.ast)})));
 for(const original of vacuum.resources){
  const code=original.row_id.endsWith(':workers')?pack.dustSource.workers.resourceCode:original.row_id.endsWith(':vacuum')?pack.dustSource.vacuum.resourceCode:pack.dustSource.norm;
  r.resources.push({...original,ordinal:r.resources.length,row_type:original.unit_id==='man_hour'?'labor':original.category==='equipment'?'equipment':'other',
   semantic_owner:String(parent.definition.catalog_id)+':'+original.row_id,inclusion_ast:dustScope,
   resource_graph:{...original.resource_graph,semanticOwnerId:String(parent.definition.catalog_id)+':'+original.row_id,
    scopeContextParameterIds:[dust],inputParameterIds:[pack.dustMethodParameterId],
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'aggressive-floor-dedusting',groupTitleRu:'Обеспыливание',
     operationId:'aggressive-floor-dedusting:industrial-vacuum',operationTitleRu:'Обеспыливание промышленным пылесосом с контролем качества',processOrdinal:30,
     completionCriterionRu:'Обеспылена вся принятая площадь после разборки, качество проверено.'}},
   source_metadata:{...original.source_metadata,sourceRole:'OFFICIAL_KG_UNIT_RATE',normativeResourceCode:code,normativeRatePerM2:original.unit_id==='m2'?1:0.1,
    source_artifact_sha256:pack.dustSource.sha256,qualityControlIncluded:true,separateMachinistNormAbsent:true,
    normativeTrace:(original.source_metadata?.normativeTrace as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_KG_UNIT_RATE'}))}});
 }
 r.definition.passport={...r.definition.passport,canonicalRuName:target.publicTitleRu};
 const consumers=buildMasterParameterCalculationConsumers(r);
 r.baseline.input_values={...r.baseline.input_values,...aggressiveFloorPlannedDefaultsS2769,[pack.barrierAreaParameterId]:12};
 for(const p of r.parameters){
  const id=p.parameter_id,profile=Object.hasOwn(aggressiveFloorPlannedDefaultsS2769,id);
  const conditional=id===pack.barrierMethodParameterId?eq(protection,old.adjacentProtectionNeededValue):id===pack.dustMethodParameterId?eq(dust,old.dustControlNeededValue):null;
  p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,
   formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id],
   ...(profile?{visibility_role:'USER_INPUT',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',input_origin_class:'VISIBLE_PRELIMINARY_ENGINEERING_PROFILE',
    runtime_profile_value:true,preliminary_compilation_allowed:true,source_confirmation_required:false,
    provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...p.truth_metadata.guide,
     guide_short_ru:'Видимый типовой состав планируемой работы. Защита и обеспыливание включены в эту смету; замените по условиям объекта. Это не отметка о ранее выполненных работах.',
     guide_validation_policy:'ADVISORY_REASON_REQUIRED'}}:{}) ,
   ...(conditional?{visible_when:conditional}:{})};
  if(profile){p.default_value=null;r.baseline.input_classification[id]='ASSUMPTION';}
  else if(!Object.hasOwn(r.baseline.input_classification,id)&&Object.hasOwn(r.baseline.input_values,id))r.baseline.input_classification[id]='VALIDATION_FIXTURE';
  if(id===pack.barrierAreaParameterId)p.truth_metadata={...p.truth_metadata,source_confirmation_required:false,visible_when:barrierScope,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...p.truth_metadata.guide,guide_short_ru:'Фактическая площадь вертикального ограждения по его длине и высоте; не площадь пола. Включены установка и последующая разборка.'}};
  r.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];r.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
  r.baseline.uom_by_parameter[id]=p.unit_id;r.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
  r.baseline.normative_source_ids[id]=[...new Set([...(r.baseline.normative_source_ids[id]??['kg_krer_46_2015_reconstruction_official']),pack.dustSource.sourceId])];
 }
 r.baseline.parameter_schema_sha256=sha(r.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 r.passport.included_scope_ru=[...r.passport.included_scope_ru,pack.scopeRu];
 r.passport.decision={...r.passport.decision,aggressiveFloorProtectionDustContract:pack.contract,
  acceptedCompleteQuantityBranch:'EXACT_VERTICAL_BOARD_FRAME_AND_ENTIRE_FLOOR_INDUSTRIAL_VACUUM_WITH_ACCEPTED_WASTE_SCOPE',
  completeTechnicalEstimateAccepted:false,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,
  newPhysicalNormSources:1,reusedAdmittedBarrierDefinitionId:b.definition.id};
 const map=r.passport.decision.independentCompletenessMap;
 for(const row of r.resources.filter(row=>!parent.resources.some(oldRow=>oldRow.row_id===row.row_id)))map.entries.push({
  expectedResourceId:row.row_id,operationId:row.resource_graph.operationCompositionV1.operationId,category:row.category,specification:row.title_ru,unitId:row.unit_id,
  condition:'EXACT_SELECTED_SUBWORK_METHOD_AND_OWN_MEASURE',sourceId:row.row_id.startsWith('dust:')?pack.dustSource.sourceId:'kg_krer_46_2015_reconstruction_official',
  quantityRule:row.row_id.startsWith('dust:')?'FLOOR_M2_TIMES_KRER13_RATE_PER_ONE_M2':'INDEPENDENT_BARRIER_M2_TIMES_ADMITTED_KRER46_RATE_PER_100M2',
  priceRelation:row.resource_graph.costTreatment,formulaId:row.formula_id,resolution:{kind:'ROW',rowId:row.row_id}});
 for(const row of r.resources){const {row_sha256:_old,...body}=row;row.row_sha256=sha(body);}
 return r;
}

export function compileAggressiveFloorProtectionDustCompleteS2769(parent:PurchaseGroupRepresentative,input:Record<string,unknown>){
 const r=buildAggressiveFloorProtectionDustCompleteS2769(parent);
 return compileAutomaticConstructionOwnerR1({catalogId:String(parent.definition.catalog_id),compilerVersion:pack.contract,primaryMeasureParameterId:'floor_covering_area_m2',
  definition:{parameters:r.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:r.formulas as unknown as AutomaticOwnerDefinition['formulas'],
   resources:r.resources as unknown as AutomaticOwnerDefinition['resources'],runtimeInput:aggressiveFloorPlannedDefaultsS2769,
   runtimeClassification:Object.fromEntries(Object.keys(aggressiveFloorPlannedDefaultsS2769).map(id=>[id,'ASSUMPTION' as const])),
   runtimeSourceIds:Object.fromEntries(Object.keys(aggressiveFloorPlannedDefaultsS2769).map(id=>[id,['kg_krer_46_2015_reconstruction_official',pack.dustSource.sourceId]])),
   ordinaryParameterIds:['floor_covering_area_m2',old.actualThicknessParameterId,pack.barrierAreaParameterId]},submittedParameters:input});
}
