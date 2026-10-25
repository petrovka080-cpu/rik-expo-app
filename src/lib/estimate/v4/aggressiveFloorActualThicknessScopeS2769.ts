import pack from '../../../../data/estimate-benchmarks/source-packs/aggressive-floor-actual-thickness-four-s27-69.json';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash,stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {floorDemolitionDefinitionS2752,FLOOR_DEMOLITION_SERIES_S2752 as covering} from './floorDemolitionSeriesS2752';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';

export const aggressiveFloorActualThicknessBindingS2769=pack;
export const aggressiveFloorWorkScopeIdS2769='aggressive_floor_work_scope_confirmed';
export const aggressiveFloorProtectionScopeIdS2769='aggressive_floor_adjacent_protection_scope';
export const aggressiveFloorDustScopeIdS2769='aggressive_floor_dust_control_scope';
export const aggressiveFloorWasteModeIdS2769='aggressive_floor_waste_handling_mode';
export const aggressiveFloorWasteScopeValuesS2769=covering;
const prefix='f09:aggressive_environment_cement_or_concrete_floor_25mm_demolition';
const sha=(v:unknown)=>canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(v));
const scope={kind:'equals',parameterId:aggressiveFloorWorkScopeIdS2769,value:pack.workScopeValue};
const normSlot=(id:string)=>'aggressive_floor_'+id.replaceAll('-','_')+'_quantity_application';
const source={source_title:'КРЕР46-2015: 46-04-011-12/13 и отдельный состав по п.1.20/1.27',source_document_version:pack.source.edition,
 definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:'П.1.1 стр5; п.1.15 стр6; п.1.20/1.27 стр7; описание12/13 стр58; ресурсы стр59/60'};
const serviceProfile=floorDemolitionDefinitionS2752(2);
const serviceParameters=serviceProfile.parameters.filter(p=>!['floor_covering_area_m2','existing_covering_confirmed','object_conditions'].includes(p.parameter_id));
const replacements:Record<string,string>={existing_covering_confirmed:aggressiveFloorWorkScopeIdS2769,object_conditions:aggressiveFloorWorkScopeIdS2769,
 ...Object.fromEntries(serviceParameters.map(p=>[p.parameter_id,p.parameter_id==='waste_handling_mode'?aggressiveFloorWasteModeIdS2769:'aggressive_floor_'+p.parameter_id]))};
const tokens=new RegExp('\\b('+Object.keys(replacements).sort((a,b)=>b.length-a.length).join('|')+')\\b','gu');
function mapped<T>(value:T):T{
 if(typeof value==='string')return value.replace(tokens,id=>replacements[id]!) as T;
 if(Array.isArray(value))return value.map(mapped) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,mapped(v)])) as T;
 return value;
}

/** Bind observed millimetres in the existing decimal FormulaGraph. No local
 * preprocessor supplies hidden inputs: published models run the same compiler. */

export const aggressiveFloorActualThicknessHistoricalBindingSha256S2769='058b951aa0bd1f9d471d132b5bf5517efbb5cee262a0ee528a0c85147a6f4456';
export type aggressiveFloorActualThicknessScopeS2769HistoricalBindingContext=Readonly<{binding:typeof pack;sourcePackSha256:string}>;
/** Read-only proof reconstruction can use only the exact pinned old binding.
 * Every non-target byte-semantic field must still equal this versioned recipe;
 * no historical caller can inject a different norm or arithmetic. */
function historicalTargets(context?:aggressiveFloorActualThicknessScopeS2769HistoricalBindingContext){
 if(!context)return pack.targets;
 if(context.sourcePackSha256!==aggressiveFloorActualThicknessHistoricalBindingSha256S2769
  ||canonicalEstimateSha256HexText(canonicalEstimateStableJson(context.binding))!==aggressiveFloorActualThicknessHistoricalBindingSha256S2769)throw Error('PINNED_HISTORICAL_BINDING_REQUIRED');
 const {targets:_active,...active}=pack,{targets:_historical,...historical}=context.binding;
 if(canonicalEstimateStableJson(active)!==canonicalEstimateStableJson(historical))throw Error('HISTORICAL_RECIPE_SEMANTICS_DRIFT');
 return context.binding.targets;
}
export function buildAggressiveFloorActualThicknessSuccessorS2769(parent:PurchaseGroupRepresentative,historical?:aggressiveFloorActualThicknessScopeS2769HistoricalBindingContext):PurchaseGroupRepresentative{
 const target=historicalTargets(historical).find(t=>t.catalogId===parent.definition.catalog_id);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_sha256!==target.parentSha256
  ||parent.definition.definition_version!==3||parent.parameters.length!==4||parent.resources.length!==5||parent.formulas.length!==5)
  throw Error('AGGRESSIVE_FLOOR_EXACT_FOUR_V3_PARENTS_REQUIRED');
 const result=structuredClone(parent);
 const legacyIds=[pack.legacyProfileParameterId,pack.legacyConfirmedParameterId,pack.legacyThicknessStepsParameterId];
 for(const p of result.parameters.filter(p=>[pack.legacyProfileParameterId,pack.legacyConfirmedParameterId,pack.legacyThicknessStepsParameterId].includes(p.parameter_id))){
  const {neutral_value:_neutral,neutral_value_meaning_ru:_meaning,...truth}=p.truth_metadata;
  p.required=false;p.default_value=null;
  p.truth_metadata={...truth,contract:pack.contract,visibility_role:'INTERNAL_ONLY',value_source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY',
   input_origin_class:'APPROVED_PROJECT_OR_METHOD_STATEMENT',source_confirmation_required:false,hidden_default_forbidden:true,
   provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   guide:{...truth.guide,guide_version:pack.contract,guide_short_ru:'Приложение выбирает принятую колонку и выводит целые шаги5мм из фактической толщины. Пользователь не вводит норму или коэффициент.'}};
 }
 for(const f of result.formulas){
  const expression=String(f.expression_source).replaceAll(pack.legacyThicknessStepsParameterId,
   `((${pack.actualThicknessParameterId} - ${pack.baseThicknessMm}) / ${pack.thicknessStepMm})`);
  const compiled=compileFormulaGraph(expression);
  Object.assign(f,{expression_source:expression,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:sha(compiled.ast)});
 }
 const extras=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:String(parent.definition.catalog_id),
  sourceId:pack.contract+':krer46',normId:'norm:kg:krer:46-04-011-12-13:2015',sourceMetadata:source,applicabilityRu:pack.scopeRu,
  ordinary:[
   {id:pack.actualThicknessParameterId,title:'Фактическая толщина существующего покрытия, мм',valueType:'integer',unitId:'mm',kind:'ordinary',min:5},
   {id:aggressiveFloorWorkScopeIdS2769,title:'Материал, условия и способ разборки покрытия',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.workScopeValue]},
   {id:aggressiveFloorProtectionScopeIdS2769,title:'Защита прилегающих частей по принятому проекту',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.adjacentProtectionNotRequiredValue,pack.adjacentProtectionProvidedValue,pack.adjacentProtectionNeededValue]},
   {id:aggressiveFloorDustScopeIdS2769,title:'Обеспыливание этого этапа',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.dustControlProvidedValue,pack.dustControlNeededValue]},
   ...pack.sourceNeeds.map(g=>({id:normSlot(g.id),title:g.titleRu,valueType:'decimal' as const,unitId:'item',kind:'internal' as const,min:0})),
  ],
  profile:[],conditional:[],excludedUnownedAssumptions:['Неподтверждённые нормы ограждений и обеспыливания','Масса, тара и рейсы, выведенные из площади или толщины'],deferMissingProjectFactsToRows:true,
  rows:pack.sourceNeeds.map(g=>({rowId:prefix+':'+g.id,formulaId:prefix+':formula:'+g.id,section:'Дополнительные требования первичного источника',category:'work',title:g.titleRu,
   unitId:'item',expression:normSlot(g.id),procurement:false,inputParameterIds:[g.id==='adjacent-protection'?aggressiveFloorProtectionScopeIdS2769:aggressiveFloorDustScopeIdS2769],
   inclusion:{kind:'equals' as const,parameterId:g.id==='adjacent-protection'?aggressiveFloorProtectionScopeIdS2769:aggressiveFloorDustScopeIdS2769,
    value:g.id==='adjacent-protection'?pack.adjacentProtectionNeededValue:pack.dustControlNeededValue}})),
 });
 for(const p of extras.parameters){
  const gap=pack.sourceNeeds.find(g=>normSlot(g.id)===p.parameter_id);
  result.parameters.push({...p,ordinal:result.parameters.length,truth_metadata:gap?unresolvedApplicationNormTruthR1(p.truth_metadata,gap.reasonRu):
   {...p.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}});
 }
 result.parameters.find(p=>p.parameter_id===pack.actualThicknessParameterId)!.constraints_json.multipleOf=pack.thicknessStepMm;
 for(const r of result.resources){
  const {row_sha256:_hash,...body}=r;
  const graph={...r.resource_graph,
   scopeContextParameterIds:(r.resource_graph.scopeContextParameterIds??[]).filter((id:string)=>!legacyIds.includes(id)),
   inputParameterIds:[...new Set([...(r.resource_graph.inputParameterIds??[]).filter((id:string)=>!legacyIds.includes(id)),pack.actualThicknessParameterId,aggressiveFloorWorkScopeIdS2769])]};
  const title=r.row_id===prefix+':operation'?'Разборка цементного или бетонного покрытия пола по фактической толщине':r.title_ru;
  if(r.row_id===prefix+':operation'&&graph.publicResourcePresentationV1){
   graph.publicResourcePresentationV1={...graph.publicResourcePresentationV1,nameRu:title,sourceTitleRu:title};
  }
  const content={...body,title_ru:title,inclusion_ast:scope,resource_graph:graph};
  Object.assign(r,{...content,row_sha256:estimateDeterministicHash(content)});
 }
 result.formulas.push(...extras.formulas.map(f=>({...f,ast_sha256:sha(f.ast)})));
 for(const r of extras.resources){const gap=pack.sourceNeeds.find(g=>r.row_id===prefix+':'+g.id)!;
  const content={...r,ordinal:result.resources.length,row_type:'other',semantic_owner:String(parent.definition.catalog_id)+':'+r.row_id,
   source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:'UNRESOLVED_APPLICATION_NORM',
   requirementSourceSha256:pack.source.sha256,requirementLocator:gap.id==='adjacent-protection'?'КРЕР46 п.1.20, стр7':'КРЕР46 п.1.27, стр7',unresolvedReasonRu:gap.reasonRu}};
  result.resources.push({...content,row_sha256:estimateDeterministicHash(content)});
 }
 for(const old of serviceParameters){const p=mapped(structuredClone(old));
  result.parameters.push({...p,ordinal:result.parameters.length,required:p.parameter_id===aggressiveFloorWasteModeIdS2769,default_value:null,
   truth_metadata:{...p.truth_metadata,contract:pack.contract,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},
    ...(p.constraints_json?.requiredWhen?{visible_when:p.constraints_json.requiredWhen}:{})}});
 }
 for(const key of ['waste-service','waste-onsite-service']){
  const old=serviceProfile.resources.find(r=>r.row_id==='floor-demolition:end-grain:'+key)!;
  const oldFormula=serviceProfile.formulas.find(f=>f.formula_id===old.formula_id)!;
  const f=mapped(structuredClone(oldFormula)),formulaId=prefix+':formula:'+key;
  const formula=compileFormulaGraph(mapped(String(oldFormula.expression_source)));
  result.formulas.push({...f,formula_id:formulaId,expression_source:mapped(String(oldFormula.expression_source)),
   ast:formula.ast,input_parameter_ids:formula.inputParameterIds,ast_sha256:sha(formula.ast)});
  const r=mapped(structuredClone(old)),rowId=prefix+':'+key;
  const inclusion={kind:'and',operands:[scope,{kind:'equals',parameterId:aggressiveFloorWasteModeIdS2769,
   value:key==='waste-service'?covering.contractorModeValue:covering.onSiteExtraModeValue}]};
  const title=key==='waste-service'?'Дополнительное обращение со снятым цементным или бетонным покрытием — полная согласованная услуга':
   'Дополнительное обращение со снятым цементным или бетонным покрытием на объекте — полная согласованная услуга';
  const content={...r,row_id:rowId,ordinal:result.resources.length,formula_id:formulaId,title_ru:title,cost_owner_id:rowId,row_type:'service',
   semantic_owner:String(parent.definition.catalog_id)+':'+rowId,inclusion_ast:inclusion,
   resource_graph:{...r.resource_graph,formulaId,costTreatment:'OWN_COST',semanticOwnerId:String(parent.definition.catalog_id)+':'+rowId,
    titleSpecificationParameterIds:[...new Set([...((r.resource_graph as Record<string,unknown>).titleSpecificationParameterIds as string[]??[]),
     'aggressive_floor_waste_service_specification_ref','aggressive_floor_waste_lowering_loading_scope',
     ...(key==='waste-service'?['aggressive_floor_haul_distance_km']:[])])],
    titleSpecificationParameterLabelsRu:{aggressive_floor_waste_service_specification_ref:'Спецификация услуги',
     aggressive_floor_waste_lowering_loading_scope:'Состав спуска и погрузки',
     ...(key==='waste-service'?{aggressive_floor_haul_distance_km:'Расстояние внешней перевозки, км'}:{})},
    operationCompositionV1:{...r.resource_graph.operationCompositionV1,groupId:'aggressive-floor-waste',groupTitleRu:'Дополнительное обращение с отходами',
     operationId:'aggressive-floor-waste:'+key,operationTitleRu:'Полная согласованная услуга'},
    publicResourcePresentationV1:{...r.resource_graph.publicResourcePresentationV1,nameRu:title,sourceTitleRu:title},
    acceptedServiceReuseS2769:{sourceContract:covering.contract,physicalNormNotClaimed:true,massNeverFromAreaOrThickness:true}},
   source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:'PROJECT_DEFINED_SERVICE_SCOPE_REQUIRES_CONFIRMED_SPECIFICATION',
    no_published_productivity_or_quantity_norm:true,physicalRateColumnNotAppliedToService:true}};
  result.resources.push({...content,row_sha256:estimateDeterministicHash(content)});
 }
 const planId=prefix+':waste-plan',planFormulaId=prefix+':formula:waste-plan',planFormula=compileFormulaGraph('floor_covering_area_m2');
 result.formulas.push({formula_id:planFormulaId,expression_source:'floor_covering_area_m2',output_unit_id:'m2',
  ast:planFormula.ast,input_parameter_ids:planFormula.inputParameterIds,ast_sha256:sha(planFormula.ast)});
 const plan={row_id:planId,ordinal:result.resources.length,section:'Принятая схема обращения со снятыми материалами',category:'construction_work',row_type:'other',
  title_ru:'Схема обращения со снятым цементным или бетонным покрытием — площадь участка, без повторной оплаты',unit_id:'m2',formula_id:planFormulaId,
  cost_owner_id:planId,semantic_owner:String(parent.definition.catalog_id)+':'+planId,procurement_eligible:false,inclusion_ast:scope,
  resource_graph:{formulaId:planFormulaId,costTreatment:'INFORMATIONAL_SCOPE',normalizedUom:'m2',inputParameterIds:[aggressiveFloorWasteModeIdS2769],
   titleSpecificationParameterIds:[aggressiveFloorWasteModeIdS2769],titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — ',
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:'Принятая схема обращения со снятым покрытием',
    sourceTitleRu:'Подтверждённый факт объекта',detailsRu:['Площадь обозначает участок; масса отходов, тара и рейсы из неё не выводятся.']},
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'aggressive-floor-waste',groupTitleRu:'Дополнительное обращение с отходами',
    operationId:'aggressive-floor-waste:accepted-scope',operationTitleRu:'Принятая схема обращения',processOrdinal:20,
    completionCriterionRu:'Подтверждён способ обращения со снятыми материалами и границы дополнительных услуг.'}},
  source_metadata:{truth_contract_version:'R3',synthetic:false,sourceRole:'OBJECT_CONFIRMED_WASTE_BOUNDARY',normativeTrace:[],source_artifact_sha256:pack.source.sha256}};
 result.resources.push({...plan,row_sha256:estimateDeterministicHash(plan)});
 const consumers=buildMasterParameterCalculationConsumers(result);
 const oldFixtureStep=parent.baseline.input_values[pack.legacyThicknessStepsParameterId];
 if(!Number.isSafeInteger(oldFixtureStep)||oldFixtureStep<-4)throw Error('AGGRESSIVE_FLOOR_ACCEPTED_BASELINE_THICKNESS_REQUIRED');
 result.baseline.input_values={...parent.baseline.input_values,[pack.actualThicknessParameterId]:pack.baseThicknessMm+pack.thicknessStepMm*oldFixtureStep,
  [aggressiveFloorWorkScopeIdS2769]:pack.workScopeValue,[aggressiveFloorProtectionScopeIdS2769]:pack.adjacentProtectionNeededValue,[aggressiveFloorDustScopeIdS2769]:pack.dustControlNeededValue,
  [aggressiveFloorWasteModeIdS2769]:covering.retainModeValue};
 result.baseline.input_classification=Object.fromEntries(Object.keys(result.baseline.input_values).map(id=>[id,'VALIDATION_FIXTURE']));
 for(const p of result.parameters){const id=p.parameter_id;
  p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,
   formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
  result.baseline.uom_by_parameter[id]=p.unit_id;
  result.baseline.normative_source_ids[id]=[...new Set(Object.values(parent.baseline.normative_source_ids).flat())];
  result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
 }
 result.baseline.parameter_schema_sha256=sha(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 result.passport.included_scope_ru=[...parent.passport.included_scope_ru,pack.scopeRu];
 result.passport.decision={...parent.passport.decision,aggressiveFloorActualThicknessContract:pack.contract,
  completeTechnicalEstimateAccepted:false,quantityScope:'PARTIAL',technicalStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,
  unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),retainedPhysicalOwners:5,newPhysicalNormSources:0,
  legacyUnboundSourceReferences:structuredClone(parent.baseline.normative_source_ids),wasteScopeIntegrationPending:false};
 return result;
}

export function compileAggressiveFloorActualThicknessS2769(parent:PurchaseGroupRepresentative,input:Record<string,unknown>){
 const r=buildAggressiveFloorActualThicknessSuccessorS2769(parent);
 return compileAutomaticConstructionOwnerR1({catalogId:String(parent.definition.catalog_id),compilerVersion:pack.contract,primaryMeasureParameterId:'floor_covering_area_m2',
  definition:{parameters:r.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:r.formulas as unknown as AutomaticOwnerDefinition['formulas'],
   resources:r.resources as unknown as AutomaticOwnerDefinition['resources'],runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['floor_covering_area_m2',pack.actualThicknessParameterId]},
  submittedParameters:input});
}
