import pack from '../../../../data/estimate-benchmarks/source-packs/stone-cubes-waste-four-s27-69.json';
import {floorDemolitionDefinitionS2752,FLOOR_DEMOLITION_SERIES_S2752} from './floorDemolitionSeriesS2752';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash,stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {parseCanonicalCompositionSelectionV1} from '../backendPlatform/canonicalEstimateCompositionSelectionV1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

export const stoneCubesWasteBindingS2769=pack;
export const stoneCubesWasteModeIdS2769='stone_cubes_waste_handling_mode';
export const stoneCubesWorkScopeIdS2769='stone_cubes_work_scope_confirmed';
const mode=stoneCubesWasteModeIdS2769,workScope=stoneCubesWorkScopeIdS2769,prefix='f09:stone_tile_floor_demolition';
const selected=(value:string)=>({kind:'selected',parameterId:mode,value});
const modern={kind:'or',operands:[pack.retainModeValue,pack.onSiteExtraModeValue,pack.contractorModeValue].map(selected)};
const extra={kind:'or',operands:[pack.onSiteExtraModeValue,pack.contractorModeValue].map(selected)};
const modernScope={kind:'and',operands:[modern,{kind:'equals',parameterId:workScope,value:pack.confirmedWorkScopeValue},
 {kind:'greater_than',parameterId:'floor_covering_area_m2',value:0}]};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const sha=(value:unknown)=>canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(value));
/** A bundled service cannot silently reinstate a task explicitly excluded from
 * the predecessor. Restore that scope in the ordinary composition editor first. */
export function assertStoneCubesWasteSelectionS2769(parameters:Record<string,unknown>,selectionInput:unknown):void{
 if(![pack.onSiteExtraModeValue,pack.contractorModeValue].includes(String(parameters[mode])))return;
 const selection=parseCanonicalCompositionSelectionV1(selectionInput);if(!selection)return;
 const gaps=['packaging','other-descent','offsite-haul','disposal'];
 if(gaps.some(key=>selection.excludedRowIds.includes(prefix+':'+key)
  ||selection.excludedOperationKeys.includes(JSON.stringify(['stone-cubes-waste-plan',key]))))
  throw Object.assign(new Error('В сохранённой смете исключена часть обращения с отходами. Перед выбором полной услуги восстановите эти подработы в составе сметы либо сохраните прежний режим.'),
   {code:'COMPOSITION_SERVICE_SCOPE_CONFLICT'});
}
const shared:AutomaticOwnerDefinition=floorDemolitionDefinitionS2752(2);
const serviceIds=new Set(['floor-demolition:end-grain:waste-service','floor-demolition:end-grain:waste-onsite-service']);
const originalParameters=shared.parameters.filter(p=>!['floor_covering_area_m2','existing_covering_confirmed','object_conditions'].includes(p.parameter_id));
const replacements:Record<string,string>={existing_covering_confirmed:'stone_cubes_source_scope_confirmed',object_conditions:'stone_cubes_source_scope_confirmed',
 ...Object.fromEntries(originalParameters.map(p=>[p.parameter_id,p.parameter_id==='floor_waste_mass_t'?'stone_cubes_waste_mass_t':'stone_cubes_'+p.parameter_id]))};
const tokens=new RegExp('\\b('+Object.keys(replacements).sort((a,b)=>b.length-a.length).join('|')+')\\b','gu');
function mapped<T>(value:T):T{
 if(typeof value==='string')return value.replace(tokens,id=>replacements[id]!) as T;
 if(Array.isArray(value))return value.map(mapped) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,mapped(child)])) as T;
 return value;
}

/** Reuse the accepted full-service quantity basis. No waste mass, packaging,
 * productivity, vehicle or trip count is inferred from the covering area.
 * Unselected mode preserves the complete predecessor calculation. */
export function buildStoneCubesWasteSuccessorS2769(parent:PurchaseGroupRepresentative):PurchaseGroupRepresentative{
 const target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id);
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_sha256!==target.parentSha256
  ||parent.definition.definition_version!==5||parent.resources.length!==6||parent.parameters.length!==8)
  throw Error('STONE_CUBES_EXACT_FOUR_V5_PARENTS_REQUIRED');
 if(FLOOR_DEMOLITION_SERIES_S2752.retainModeValue!==pack.retainModeValue
  ||FLOOR_DEMOLITION_SERIES_S2752.coverageValue!==pack.coverageValue)throw Error('STONE_CUBES_ACCEPTED_SERVICE_SCOPE_DRIFT');
 const result=structuredClone(parent),physical=parent.resources.find(r=>r.row_id===prefix+':labor')!;
 if(!physical||parent.resources.filter(r=>r.source_metadata.sourceRole==='UNRESOLVED_SEPARATE_WASTE_SCOPE').length!==4)
  throw Error('STONE_CUBES_EXACT_LEGACY_OWNERS_REQUIRED');
 const additions=originalParameters.map(p=>{
  const next=mapped(structuredClone(p)),isMode=next.parameter_id===mode;
  return {...next,required:isMode,default_value:null,
   constraints_json:{...next.constraints_json,...(isMode?{values:[pack.legacyModeValue,pack.retainModeValue,pack.onSiteExtraModeValue,pack.contractorModeValue]}:{})},
   truth_metadata:{...next.truth_metadata,contract:pack.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+next.parameter_id,
    source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},
    ...(isMode?{}:{visible_when:next.constraints_json?.requiredWhen??extra}),
    guide:{...record(next.truth_metadata.guide),source_document:pack.contract,source_locator:pack.scopeRu,
     applicability:pack.scopeRu,source_snapshot_hash:pack.source.sha256}}};
 });
 result.parameters.push(...additions);
 const legacy=selected(pack.legacyModeValue);
 for(const p of result.parameters){
  if(!['existing_covering_profile','existing_stone_tile_covering_confirmed','stone_cubes_source_scope_confirmed'].includes(p.parameter_id))continue;
  p.required=false;p.constraints_json={...p.constraints_json,requiredWhen:legacy};p.truth_metadata={...p.truth_metadata,visible_when:legacy};
 }
 result.parameters.push({parameter_id:workScope,ordinal:result.parameters.length,value_type:'enum',unit_id:null,title_ru:'Материал покрытия и границы демонтажа',
  required:false,default_value:null,constraints_json:{values:[pack.confirmedWorkScopeValue],requiredWhen:modern},
  truth_metadata:{...structuredClone(parent.parameters.find(p=>p.parameter_id==='stone_cubes_source_scope_confirmed')!.truth_metadata),
   contract:pack.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+workScope,visibility_role:'USER_INPUT',
   value_source_role:'USER_OR_APPROVED_EXISTING_CONDITION_SURVEY',visible_when:modern,source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},hidden_default_forbidden:true,synthetic:false,
   guide:{...record(parent.parameters.find(p=>p.parameter_id==='stone_cubes_source_scope_confirmed')!.truth_metadata.guide),
    guide_kind:'ENUM_DECISION_RULE',guide_version:pack.contract,guide_short_ru:'Подтвердите материал и фактические границы работ. Нормативный труд приложение рассчитывает само.',
    source_document:'kg_krer_46_2015_reconstruction_official',source_locator:'КРЕР46-2015, техническая часть1.1, стр.5; колонка46-04-010-05, стр.57–58',
    source_snapshot_hash:pack.source.sha256,applicability:pack.scopeRu}}});
 for(const row of result.resources){
  const gap=row.source_metadata.sourceRole==='UNRESOLVED_SEPARATE_WASTE_SCOPE';
  const {row_sha256:_old,...body}=row,content={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'not',operand:modern}]},
   resource_graph:{...row.resource_graph,wasteScopeBranchS2769:{contract:pack.contract,modeParameterId:mode,legacyWhenUnselected:true,
    supersededOnlyByPositiveObjectChoice:true,oldManualDataRetained:true}},
   source_metadata:{...row.source_metadata,wasteScopeContract:pack.contract}};
  if(!gap){content.inclusion_ast={kind:'or',operands:[content.inclusion_ast,modernScope]};
   content.resource_graph={...content.resource_graph,inputParameterIds:['floor_covering_area_m2']};}
  Object.assign(row,{...content,row_sha256:estimateDeterministicHash(content)});
 }
 let ordinal=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
 for(const original of shared.resources.filter(r=>serviceIds.has(r.row_id))){
  const next=mapped(structuredClone(original)),key=original.row_id.endsWith(':waste-onsite-service')?'waste-onsite-service':'waste-service';
  const rowId=prefix+':'+key,formulaId=prefix+':formula:'+key;
  const originalFormula=shared.formulas.find(f=>f.formula_id===original.formula_id)!;
  const graph=compileFormulaGraph(mapped(originalFormula.expression_source!));
  result.formulas.push({...originalFormula,formula_id:formulaId,expression_source:mapped(originalFormula.expression_source!),ast:graph.ast,
   input_parameter_ids:graph.inputParameterIds,ast_sha256:sha(graph.ast)});
  const {row_sha256:_old,...body}=next,content={...body,row_id:rowId,ordinal:ordinal++,formula_id:formulaId,row_type:'service',
   semantic_owner:String(parent.definition.catalog_id)+':'+rowId,cost_owner_id:rowId,
   title_ru:key==='waste-service'?'Затаривание, дополнительный спуск, внешний вывоз и приём снятой каменной шашки по полной спецификации услуги'
    :'Дополнительное обращение со снятой каменной шашкой на объекте без внешнего вывоза по полной спецификации услуги',
   inclusion_ast:{kind:'and',operands:[modernScope,selected(key==='waste-service'?pack.contractorModeValue:pack.onSiteExtraModeValue)]},
   resource_graph:{...next.resource_graph,formulaId,semanticOwnerId:String(parent.definition.catalog_id)+':'+rowId,
    inputParameterIds:[...new Set([workScope,...(next.resource_graph.inputParameterIds as string[]).filter(id=>id!=='stone_cubes_source_scope_confirmed')])],
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'stone-cubes-waste-plan',groupTitleRu:'Дополнительное обращение с отходами',
     operationId:'stone-cubes-waste-plan:'+key,operationTitleRu:'Согласованная полная услуга',processOrdinal:30},
    publicResourcePresentationV1:{...record(next.resource_graph.publicResourcePresentationV1),nameRu:'Дополнительное обращение со снятой каменной шашкой',
     sourceTitleRu:'Полная согласованная услуга по принятой спецификации',detailsRu:[
      'Количество — подтверждённая масса в тоннах; цена за тонну относится ко всему указанному составу услуги.',
      'Включённые КРЕР уборка, сортировка и перемещения повторно не оплачиваются. Часы, тара и рейсы из площади не назначены.']},
    acceptedServiceReuseS2769:{sourceContract:FLOOR_DEMOLITION_SERIES_S2752.contract,sourcePackSha256:pack.sourcePackSha256,
     separateLegacyOwnersInactive:true,oldPricesNeverCopied:true}},
   source_metadata:{...next.source_metadata,sourceRole:'PROJECT_DEFINED_SERVICE_SCOPE_REQUIRES_CONFIRMED_SPECIFICATION',normativeTrace:[],
    exact_column:'46-04-010-05',source_artifact_sha256:pack.source.sha256,wasteScopeContract:pack.contract,
    legacySourceColumnNotUsedForNewLabor:true,no_published_productivity_or_quantity_norm:true}};
  result.resources.push({...content,row_sha256:estimateDeterministicHash(content)});
 }
 const planId=prefix+':waste-plan',planFormulaId=prefix+':formula:waste-plan',planGraph=compileFormulaGraph('floor_covering_area_m2');
 result.formulas.push({formula_id:planFormulaId,expression_source:'floor_covering_area_m2',output_unit_id:'m2',ast:planGraph.ast,
  input_parameter_ids:planGraph.inputParameterIds,ast_sha256:sha(planGraph.ast)});
 const plan={row_id:planId,ordinal:ordinal++,section:'Принятая схема обращения со снятыми материалами',category:'construction_work',row_type:'other',
  title_ru:'Обращение со снятой каменной шашкой — площадь разборки, без второй цены',unit_id:'m2',formula_id:planFormulaId,
  cost_owner_id:planId,semantic_owner:String(parent.definition.catalog_id)+':'+planId,procurement_eligible:false,
  inclusion_ast:modernScope,
  resource_graph:{formulaId:planFormulaId,costTreatment:'INFORMATIONAL_SCOPE',normalizedUom:'m2',inputParameterIds:[mode],
   titleSpecificationParameterIds:[mode],titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — ',
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:'Принятая схема обращения со снятой каменной шашкой',
    sourceTitleRu:'Подтверждённый факт объекта',detailsRu:['Площадь показывает границу разборки; она не является массой отходов, количеством тары или рейсов.']},
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'stone-cubes-waste-plan',groupTitleRu:'Дополнительное обращение с отходами',
    operationId:'stone-cubes-waste-plan:accepted-scope',operationTitleRu:'Принятая схема обращения',processOrdinal:20}},
  source_metadata:{truth_contract_version:'R3',synthetic:false,sourceRole:'OBJECT_CONFIRMED_WASTE_BOUNDARY',normativeTrace:[],
   source_artifact_sha256:pack.source.sha256,wasteScopeContract:pack.contract}};
 result.resources.push({...plan,row_sha256:estimateDeterministicHash(plan)});
 const order=['floor_covering_area_m2',mode,workScope];
 result.parameters.sort((a,b)=>{const ai=order.indexOf(a.parameter_id),bi=order.indexOf(b.parameter_id);return (ai<0?100+Number(a.ordinal):ai)-(bi<0?100+Number(b.ordinal):bi);});
 result.parameters=result.parameters.map((p,ordinal)=>({...p,ordinal}));
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,
  semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
  result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.normative_source_ids[id]??=[];
  result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
 }
 result.baseline.parameter_schema_sha256=sha(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 result.passport.decision={...result.passport.decision,wasteScopeContract:pack.contract,positiveObjectChoiceRequired:true,
  newPhysicalNorms:0,technicalScopeStatus:'NEEDS_SOURCE',modernScopeUsesObjectFacts:true,completeTechnicalEstimateAccepted:false};
 return result;
}

export function compileStoneCubesWasteS2769(parent:PurchaseGroupRepresentative,submittedParameters:Record<string,unknown>){
 const model=buildStoneCubesWasteSuccessorS2769(parent);
 return compileAutomaticConstructionOwnerR1({catalogId:String(parent.definition.catalog_id),compilerVersion:pack.contract,primaryMeasureParameterId:'floor_covering_area_m2',
  definition:{parameters:model.parameters,formulas:model.formulas,resources:model.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
   ordinaryParameterIds:['floor_covering_area_m2']} as unknown as AutomaticOwnerDefinition,submittedParameters});
}
