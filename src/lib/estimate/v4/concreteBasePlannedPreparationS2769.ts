import pack from '../../../../data/estimate-benchmarks/source-packs/concrete-base-planned-preparation-two-s27-69.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {industrialVacuumDedustingKrer13R1} from './industrialVacuumDedustingKrer13R1';
import {floorPreparationFreshDefaultsS2769 as defaults,assertFloorPreparationIntentS2769} from '../backendPlatform/canonicalFloorPreparationIntentS2769';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import type {PurchaseGroupRepresentative as Model} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const reference=require('../../../../data/estimate-benchmarks/fixtures/aggressive-floor-four-v4-parents-and-barrier-s27-69.json') as {barrier:Model};
const sha=(value:unknown)=>canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(value));
const eq=(parameterId:string,value:string)=>({kind:'equals' as const,parameterId,value});
const and=(...operands:Record<string,unknown>[])=>({kind:'and' as const,operands});
const or=(...operands:Record<string,unknown>[])=>({kind:'or' as const,operands});
const planned=eq(pack.modeId,pack.plannedMode);
const prefix='floor-demolition-preparation';
const slot=(key:string)=>'floor_demolition_'+key+'_quantity_application';
const source={source_title:'КРЕР46-2015 п.1.20/1.27 и КРЕР13-2015',source_document_version:'2015',
 definition_hash:pack.dustSource.sha256,artifact_sha256:pack.dustSource.sha256,exact_locator:pack.dustSource.locatorRu};
function mapped<T>(v:T):T{
 if(typeof v==='string')return v.replace(/\bbarrier_vertical_area_m2\b/gu,pack.barrierAreaId) as T;
 if(Array.isArray(v))return v.map(mapped) as T;
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,mapped(x)])) as T;
 return v;
}

/** Exact published parents only. Old norms and owners remain independent;
 * new intent has a separate, reversible branch. */
export function buildConcreteBasePlannedPreparationS2769(parent:Model):Model{
 const target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id),b=reference.barrier;
 if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_sha256!==target.parentSha256
  ||parent.definition.definition_version!==target.predecessorVersion||parent.parameters.length!==target.parameterCount||parent.resources.length!==target.resourceCount)
  throw Error('CONCRETE_BASE_EXACT_TWO_PARENTS_REQUIRED');
 if(b.definition.id!==pack.barrierReference.definitionId||b.definition.definition_sha256!==pack.barrierReference.definitionSha256||b.resources.length!==11)
  throw Error('PLANNED_FLOOR_ACCEPTED_BARRIER_DRIFT');
 const r=structuredClone(parent);
 r.definition.applicability={...r.definition.applicability,primaryMeasureParameterId:'base_volume_m3'};
 const protection=pack.stages[0]!,dust=pack.stages[1]!;
 const stagePlan=(s:typeof protection)=>and(planned,eq(s.id,s.planned));
 const nonPlan=(s:typeof protection)=>and(planned,or(...[s.provided,s.covered,s.notRequired].map(v=>eq(s.id,v))));
 const barrierScope=and(stagePlan(protection),eq(pack.barrierMethodId,pack.barrierValue));
 const dustScope=and(stagePlan(dust),eq(pack.dustMethodId,pack.dustValue));
 const extras=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:String(parent.definition.catalog_id),sourceId:pack.dustSource.sourceId,
  normId:'norm:kg:krer:'+pack.dustSource.norm+':2015',sourceMetadata:source,applicabilityRu:pack.scopeRu,deferMissingProjectFactsToRows:true,
  ordinary:[{id:pack.dustAreaId,title:'Площадь всей поверхности после разборки для обеспыливания, м²',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000001,requiredWhen:dustScope as never},
   {id:pack.barrierAreaId,title:'Площадь вертикального защитного ограждения, м²',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000001,requiredWhen:barrierScope as never},
   {id:pack.conditionsId,title:'Условия выполнения планируемой подготовки',valueType:'enum',unitId:null,kind:'conditional',values:[pack.conditionsValue],requiredWhen:or(barrierScope,dustScope) as never},
   ...pack.stages.map(s=>({id:s.evidenceId,title:s.titleRu+': фактическое основание, акт приёмки или другая смета и владелец стоимости',
    valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:nonPlan(s) as never})),
   ...pack.stages.map(s=>({id:slot(s.key),title:'Норма приложения: '+s.titleRu,valueType:'decimal' as const,unitId:'item',kind:'internal' as const,min:0}))],
  profile:[{id:pack.modeId,title:'Состав подготовки к демонтажу',valueType:'enum',unitId:null,kind:'profile',values:[pack.legacyMode,pack.plannedMode],defaultValue:pack.plannedMode},
   ...pack.stages.map(s=>({id:s.id,title:s.titleRu,valueType:'enum' as const,unitId:null,kind:'profile' as const,values:[s.planned,s.provided,s.covered,s.notRequired],defaultValue:s.planned})),
   {id:pack.barrierMethodId,title:'Планируемая конструкция защиты',valueType:'enum',unitId:null,kind:'profile',values:[pack.barrierValue,pack.otherBarrierValue],defaultValue:pack.barrierValue},
   {id:pack.dustMethodId,title:'Планируемый способ обеспыливания',valueType:'enum',unitId:null,kind:'profile',values:[pack.dustValue,pack.otherDustValue],defaultValue:pack.dustValue}],
  conditional:[],excludedUnownedAssumptions:['Факт выполнения подготовки не следует из её планирования.','Площади обеспыливания и ограждения не выводятся из объёма бетона.','Другой способ рассчитывает приложение.'],
  rows:pack.stages.flatMap(s=>[
   {rowId:prefix+':'+s.key+':scope',formulaId:prefix+':formula:'+s.key+':scope',section:'Основания состава подготовки',category:'construction_work',title:'Основание без повторной оплаты: '+s.titleRu,
    unitId:'item',expression:slot(s.key),procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const,inclusion:nonPlan(s) as never},
  ])});
 for(const p of extras.parameters){
  const stage=pack.stages.find(s=>slot(s.key)===p.parameter_id),isDefault=Object.hasOwn(defaults,p.parameter_id);
  const visible=p.parameter_id===pack.modeId?null:p.parameter_id===pack.barrierAreaId?barrierScope:p.parameter_id===pack.dustAreaId?dustScope:p.parameter_id===pack.conditionsId?or(barrierScope,dustScope):p.parameter_id===pack.barrierMethodId?stagePlan(protection):p.parameter_id===pack.dustMethodId?stagePlan(dust):
   pack.stages.find(s=>s.evidenceId===p.parameter_id)?nonPlan(pack.stages.find(s=>s.evidenceId===p.parameter_id)!):planned;
  r.parameters.push({...p,ordinal:r.parameters.length,default_value:null,truth_metadata:stage?unresolvedApplicationNormTruthR1(p.truth_metadata,'Источник и расчёт другого способа получает приложение; пользователь не вводит норму.'):
   {...p.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},...(visible?{visible_when:visible}:{}),
    ...(isDefault?{visibility_role:'USER_INPUT',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',input_origin_class:'VISIBLE_PRELIMINARY_ENGINEERING_PROFILE',runtime_profile_value:true,preliminary_compilation_allowed:true}:{}),
    guide:{...(p.truth_metadata.guide as Record<string,unknown>),guide_short_ru:p.parameter_id===pack.modeId?'Новый план включён только для новой сметы. В сохранённой смете прежний состав удерживается до явного изменения.':
     p.parameter_id===pack.barrierAreaId?'Собственный обмер ограждения: длина × высота. Полная норма включает установку и последующую разборку. Частично установленная защита требует другого расчёта.':
     p.parameter_id===pack.dustAreaId?'Отдельно измерьте всю поверхность после разборки. Объём бетона в м³ не определяет её площадь; площадь ограждения также не заменяет этот обмер.':
     p.parameter_id===protection.id?'Полная норма включает установку и разборку. Если защита уже установлена и нужна только разборка, выберите выполнение здесь и другой способ: приложение рассчитает остаток. Будущая работа в другой смете относится к другому владельцу стоимости, а не к уже выполненной.':
     pack.stages.some(s=>s.evidenceId===p.parameter_id)?'Укажите конкретный принятый этап, основание ненужности либо другую смету и владельца стоимости. План другой работы не означает, что этап уже выполнен.':
     'Видимый предварительный состав; измените по фактическим условиям участка. Это не подтверждение ранее выполненной работы.'}}});
 }
 r.formulas.push(...extras.formulas.map(f=>({...f,ast_sha256:sha(f.ast)})));
 for(const original of extras.resources){
  const s=pack.stages.find(s=>original.row_id.includes(':'+s.key+':'))!,scope=original.row_id.endsWith(':scope');
  r.resources.push({...original,ordinal:r.resources.length,row_type:'other',semantic_owner:String(parent.definition.catalog_id)+':'+original.row_id,
   source_metadata:{...original.source_metadata,normativeTrace:[],sourceRole:scope?'PROJECT_SCOPE_FACT_WITHOUT_SEPARATE_PAYMENT':'UNRESOLVED_APPLICATION_NORM'},
   resource_graph:{...original.resource_graph,...(scope?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'PROJECT_SCOPE',groupId:prefix+':'+s.key,
    groupTitleRu:s.titleRu,titleRu:original.title_ru,reasonRu:'Состояние этапа и отдельное основание сохранены. Повторная физическая работа в эту смету не включается.',
    exactScopeWhen:{kind:'literal',value:false},contextWhen:nonPlan(s),satisfiedWhen:{kind:'not_equals',parameterId:s.evidenceId,value:''},objectFactParameterId:s.evidenceId,
    unknownObjectValues:['не проверено','неизвестно','не знаю'],requiredFactParameterIds:[s.evidenceId],coveringRowIds:[],originalRowIds:[],sourceEvidence:[{sha256:pack.barrierReference.source.sha256,locator:'КРЕР46 п.1.20/1.27'}]}}:{})}});
 }
 for(const original of b.formulas){const expression=mapped(String(original.expression_source)),f=compileFormulaGraph(expression);
  r.formulas.push({...original,expression_source:expression,ast:f.ast,input_parameter_ids:f.inputParameterIds,ast_sha256:sha(f.ast)});}
 for(const original of b.resources){const row=mapped(structuredClone(original));
  r.resources.push({...row,ordinal:r.resources.length,inclusion_ast:barrierScope,semantic_owner:String(parent.definition.catalog_id)+':'+row.row_id,
   resource_graph:{...row.resource_graph,semanticOwnerId:String(parent.definition.catalog_id)+':'+row.row_id,
    inputParameterIds:[pack.barrierAreaId,pack.conditionsId,...target.scopeParameterIds],scopeContextParameterIds:[pack.modeId,protection.id],
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix+':protection',groupTitleRu:protection.titleRu,
     operationId:prefix+':protection:board-frame',operationTitleRu:'Установка и последующая разборка вертикального ограждения',processOrdinal:0,completionCriterionRu:'Ограждение принятой конструкции установлено и после демонтажа снято.'},
    admittedSubworkReuseS2769:{definitionId:b.definition.id,definitionSha256:b.definition.definition_sha256,sourceRowId:row.row_id}}});
 }
 r.bindings.push(...structuredClone(b.bindings));
 const vacuum=industrialVacuumDedustingKrer13R1(pack.dustAreaId);
 r.formulas.push(...vacuum.formulas.map(f=>({...f,ast_sha256:sha(f.ast)})));
 for(const row of vacuum.resources)r.resources.push({...row,ordinal:r.resources.length,row_type:row.unit_id==='man_hour'?'labor':row.category==='equipment'?'equipment':'other',
  semantic_owner:String(parent.definition.catalog_id)+':'+row.row_id,inclusion_ast:dustScope,
  resource_graph:{...row.resource_graph,semanticOwnerId:String(parent.definition.catalog_id)+':'+row.row_id,
   inputParameterIds:[pack.conditionsId,...target.scopeParameterIds],scopeContextParameterIds:[pack.modeId,dust.id],
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix+':dedusting',groupTitleRu:dust.titleRu,
    operationId:prefix+':dedusting:vacuum',operationTitleRu:'Обеспыливание всей площади и контроль качества',processOrdinal:40,completionCriterionRu:'После разборки обеспылена вся принятая площадь, качество проверено.'}},
  source_metadata:{...row.source_metadata,use_restriction:pack.scopeRu,sourceRole:'OFFICIAL_KG_UNIT_RATE',qualityControlIncluded:true,separateMachinistNormAbsent:true,
   source_artifact_sha256:pack.dustSource.sha256,normativeResourceCode:row.row_id.endsWith(':workers')?pack.dustSource.workers.resourceCode:row.row_id.endsWith(':vacuum')?pack.dustSource.vacuum.resourceCode:pack.dustSource.norm,
   normativeTrace:(row.source_metadata?.normativeTrace as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_KG_UNIT_RATE'}))}});
 for(const row of r.resources.filter(row=>row.row_id.endsWith(':adjacent-protection')||row.row_id.endsWith(':dust-control'))){
  const s=row.row_id.endsWith(':adjacent-protection')?protection:dust,method=s===protection?pack.barrierMethodId:pack.dustMethodId,other=s===protection?pack.otherBarrierValue:pack.otherDustValue;
  row.inclusion_ast=or(eq(pack.modeId,pack.legacyMode),and(stagePlan(s),eq(method,other)));
 }
 const consumers=buildMasterParameterCalculationConsumers(r);
 r.baseline.input_values={...r.baseline.input_values,...defaults,[pack.barrierAreaId]:12,[pack.dustAreaId]:35.5,[pack.conditionsId]:pack.conditionsValue};
 for(const p of r.parameters){const id=p.parameter_id,added=!parent.parameters.some(old=>old.parameter_id===id);
  const factTitles:Record<string,string>={base_volume_m3:'Объём разбираемого бетонного основания, м³',existing_covering_confirmed:'На чём выполнено бетонное основание',
   object_conditions:'Как разбирается основание',base_volume_reference:'Документ с обмером объёма и описанием основания'};
  if(factTitles[id])p.title_ru=factTitles[id];
  p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,
   formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  if(id==='base_volume_m3'||id===pack.dustAreaId)p.truth_metadata={...p.truth_metadata,value_source_role:'USER_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'}};
  r.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];r.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
  if(added){p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,
   formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
   if(Object.hasOwn(r.baseline.input_values,id))r.baseline.input_classification[id]=Object.hasOwn(defaults,id)?'ASSUMPTION':'VALIDATION_FIXTURE';
   r.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];r.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
   r.baseline.uom_by_parameter[id]=p.unit_id;r.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
   r.baseline.normative_source_ids[id]=[...new Set([...Object.values(parent.baseline.normative_source_ids).flat(),...Object.values(b.baseline.normative_source_ids).flat(),pack.dustSource.sourceId])];
  }
 }
 r.baseline.parameter_schema_sha256=sha(r.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 r.passport.included_scope_ru=[...r.passport.included_scope_ru,pack.scopeRu];
 const unresolvedRows=[...(parent.passport.decision.unresolvedResourceRowIds??[]),...extras.resources.map(row=>row.row_id)];
 for(const entry of r.passport.decision.independentCompletenessMap.entries.filter((e:{expectedResourceId:string})=>['adjacent-protection','dust-control'].includes(e.expectedResourceId)))entry.condition='LEGACY_COMPOSITION_OR_EXPLICIT_OTHER_METHOD';
 r.passport.decision={...r.passport.decision,floorPlannedPreparationContract:pack.contract,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,
  acceptedCompleteQuantityBranch:'EXACT_CONCRETE_VOLUME_WITH_INDEPENDENT_DUST_AND_BARRIER_AREAS_AND_CONFIRMED_NORMAL_CONDITIONS_AND_WASTE_SCOPE',legacyAbsenceMeansKeepComposition:true,newPhysicalNormSources:0,
  preliminaryCompositionOnly:true,unresolvedResourceRowIds:unresolvedRows};
 r.passport.capability_matrix=r.passport.capability_matrix.map((entry:Record<string,unknown>)=>entry.capability==='FULL_APPLICABLE_SCOPE'
  ? {...entry,status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:unresolvedRows}:entry);
 // Expectations come from the frozen accepted barrier map and the literal
 // three-resource operation in the official vacuum table, independently of
 // what this builder happened to emit.
 r.passport.decision.independentCompletenessMap.entries.push(...mapped(structuredClone(b.passport.decision.independentCompletenessMap.entries))
  .map((entry:Record<string,unknown>)=>({...entry,condition:'EXACT_PLANNED_FULL_BARRIER_WITH_OWN_MEASURE'})));
 const dustPrefix='dust:industrial-vacuum:krer13-06-004-01';
 r.passport.decision.independentCompletenessMap.entries.push(...[
  {id:'operation',unitId:'m2',category:'construction_work',specification:'Обеспыливание всей принятой поверхности с включённым контролем качества',rate:'1',parent:'workers'},
  {id:'workers',unitId:'man_hour',category:'construction_work',specification:'000-1003-0; рабочие среднего разряда3,0',rate:'0.1'},
  {id:'vacuum',unitId:'machine_hour',category:'equipment',specification:'33-0620; пылесос промышленный',rate:'0.10'},
 ].map(item=>({expectedResourceId:dustPrefix+':'+item.id,operationId:dustPrefix,unitId:item.unitId,category:item.category,specification:item.specification,
  sourceId:pack.dustSource.sourceId,condition:'EXACT_PLANNED_VACUUM_WITH_INDEPENDENT_SURFACE_MEASURE',quantityRule:pack.dustAreaId+' * '+item.rate,
  formulaId:dustPrefix+':formula:'+item.id,priceRelation:item.parent?'INCLUDED_IN_PARENT':'OWN_COST',
  resolution:item.parent?{kind:'INCLUDED_COMPONENT_ROW',rowId:dustPrefix+':'+item.id,parentRowId:dustPrefix+':'+item.parent}:{kind:'ROW',rowId:dustPrefix+':'+item.id}})));
 for(const row of r.resources){const {row_sha256:_old,...body}=row;row.row_sha256=sha(body);}
 return r;
}

export function compileConcreteBasePlannedPreparationS2769(parent:Model,input:Record<string,unknown>,runtime:Record<string,unknown>=defaults){
 const r=buildConcreteBasePlannedPreparationS2769(parent);assertFloorPreparationIntentS2769(String(parent.definition.catalog_id),{...runtime,...input});
 return compileAutomaticConstructionOwnerR1({catalogId:String(parent.definition.catalog_id),compilerVersion:pack.contract,primaryMeasureParameterId:'base_volume_m3',
  definition:{parameters:r.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:r.formulas as unknown as AutomaticOwnerDefinition['formulas'],resources:r.resources as unknown as AutomaticOwnerDefinition['resources'],
   runtimeInput:runtime as Record<string,string>,runtimeClassification:Object.fromEntries(Object.keys(runtime).map(id=>[id,'ASSUMPTION' as const])),runtimeSourceIds:Object.fromEntries(Object.keys(runtime).map(id=>[id,[pack.dustSource.sourceId]])),ordinaryParameterIds:['base_volume_m3',pack.barrierAreaId,pack.dustAreaId]},submittedParameters:input});
}
