import pack from '../../../../data/estimate-benchmarks/source-packs/pvc-floor-complete-four-s27-69.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {industrialVacuumDedustingKrer13R1} from './industrialVacuumDedustingKrer13R1';
import {floorDemolitionDefinitionS2752,FLOOR_DEMOLITION_SERIES_S2752 as waste} from './floorDemolitionSeriesS2752';
import {floorPreparationFreshDefaultsS2769,assertFloorPreparationIntentS2769} from '../backendPlatform/canonicalFloorPreparationIntentS2769';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import type {PurchaseGroupRepresentative as Model} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const barrier=require('../../../../data/estimate-benchmarks/fixtures/aggressive-floor-four-v4-parents-and-barrier-s27-69.json').barrier as Model;
type Json=Record<string,unknown>;
const sha=(v:unknown)=>canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(v));
const eq=(parameterId:string,value:unknown)=>({kind:'equals',parameterId,value});
const and=(...operands:Json[])=>({kind:'and',operands});
const or=(...operands:Json[])=>({kind:'or',operands});
const nonempty=(parameterId:string)=>({kind:'not_equals',parameterId,value:''});
const unknownBasisValues=['неизвестно','не знаю','не проверено','не обследовано'];
const knownBasis=(id:string)=>and(nonempty(id),...unknownBasisValues.map(value=>({kind:'not_equals',parameterId:id,value})));
const yes={kind:'literal',value:true};
const prefix='pvc-floor-complete';
const scopeId=(key:string)=>prefix+':check:'+key;
const slot=(key:string)=>'pvc_floor_'+key+'_scope_application';
const planned=eq(pack.modeId,pack.plannedMode);
const ordinary=and(eq(pack.siteConditionId,pack.ordinarySiteValue),knownBasis(pack.siteConditionBasisId),eq(pack.materialId,true));
const stagePlan=(s:typeof pack.stages[number])=>and(planned,eq(s.id,s.planned));
const nonPlan=(s:typeof pack.stages[number])=>and(planned,or(...[s.provided,s.covered,s.notRequired].map(v=>eq(s.id,v))));
export const pvcFloorRetainPlanValueS2769='Оставить снятый ПВХ на объекте; дополнительные услуги и внешний вывоз не включать';
export const pvcFloorFreshDefaultsS2769={...floorPreparationFreshDefaultsS2769,[pack.wasteModeId]:pvcFloorRetainPlanValueS2769};
const source={source_title:'КРЕР46-2015 п.1.1/1.20/1.27; КРЕР13-2015 13-06-004-01',source_document_version:'2015',
 definition_hash:pack.mainNorm.sha256,artifact_sha256:pack.mainNorm.sha256,exact_locator:pack.mainNorm.locatorRu};
function replace<T>(v:T,replacements:Record<string,string>):T{
 if(typeof v==='string')return v.replace(new RegExp('\\b('+Object.keys(replacements).sort((a,b)=>b.length-a.length).join('|')+')\\b','gu'),id=>replacements[id]!) as T;
 if(Array.isArray(v))return v.map(x=>replace(x,replacements)) as T;
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,replace(x,replacements)])) as T;
 return v;
}

/** A new whole-project boundary for four exact historical PVC consumers.
 * Source column14 and its two old physical owners are retained. No mass,
 * hazard condition or previously completed operation follows from absence. */
export function buildPvcFloorCompleteFourS2769(parent:Model):Model{
 const t=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id);
 if(!t||parent.definition.id!==t.predecessorDefinitionId||parent.definition.definition_sha256!==t.parentSha256
  ||parent.definition.definition_version!==t.predecessorVersion||parent.parameters.length!==3||parent.resources.length!==2)
  throw Error('PVC_FLOOR_EXACT_FOUR_V1_PARENTS_REQUIRED');
 if(barrier.definition.id!==pack.barrierReference.definitionId||barrier.definition.definition_sha256!==pack.barrierReference.definitionSha256||barrier.resources.length!==11)
  throw Error('PVC_FLOOR_ACCEPTED_BARRIER_DRIFT');
 const r=structuredClone(parent),protection=pack.stages[0]!,dust=pack.stages[1]!;
 for(const row of r.resources)row.resource_graph={...row.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix+':demolition',groupTitleRu:'Разборка ПВХ и условия участка',
  operationId:prefix+':demolition:main',operationTitleRu:'Разборка листового или рулонного ПВХ с включёнными перемещениями',processOrdinal:10,completionCriterionRu:'Покрытие снято; уборка, сортировка и перемещения выполнены в границах принятой нормы.'}};
 r.definition.applicability={...r.definition.applicability,primaryMeasureParameterId:'floor_covering_area_m2'};
 const barrierSelected=and(stagePlan(protection),eq(pack.barrierMethodId,pack.barrierValue));
 const dustSelected=and(stagePlan(dust),eq(pack.dustMethodId,pack.dustValue));
 const barrierScope=and(barrierSelected,ordinary),dustScope=and(dustSelected,ordinary);
 const activePrep=or(barrierSelected,dustSelected);
 const extra=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:String(parent.definition.catalog_id),sourceId:'kg_krer_46_2015_reconstruction_official',
  normId:'norm:kg:krer:46-04-011-14:2015',sourceMetadata:source,applicabilityRu:pack.scopeRu,deferMissingProjectFactsToRows:true,
  ordinary:[{id:pack.barrierAreaId,title:'Площадь вертикального защитного ограждения, м²',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000001,requiredWhen:barrierSelected as never},
   {id:pack.siteConditionId,title:'Условия участка по обследованию',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.ordinarySiteValue,pack.specialSiteValue,pack.unknownSiteValue]},
   {id:pack.siteConditionBasisId,title:'Основание сведений об участке: обследование, акт или описание проверенных условий',valueType:'text',unitId:null,kind:'ordinary'},
   {id:pack.conditionsId,title:'Условия выполнения планируемой подготовки',valueType:'enum',unitId:null,kind:'conditional',values:[pack.conditionsValue],requiredWhen:activePrep as never},
   ...pack.stages.map(s=>({id:s.evidenceId,title:s.titleRu+': основание ненужности, принятый этап либо другая смета и владелец стоимости',valueType:'text' as const,unitId:null,kind:'conditional' as const,requiredWhen:nonPlan(s) as never})),
   ...['demolition','conditions','protection','dedusting','waste'].map(key=>({id:slot(key),title:'Проверка обязательного состава: '+key,valueType:'decimal' as const,unitId:'item',kind:'internal' as const,min:0}))],
  profile:[{id:pack.modeId,title:'Состав подготовки к демонтажу',valueType:'enum',unitId:null,kind:'profile',values:[pack.legacyMode,pack.plannedMode],defaultValue:pack.plannedMode},
   ...pack.stages.map(s=>({id:s.id,title:s.titleRu,valueType:'enum' as const,unitId:null,kind:'profile' as const,values:[s.planned,s.provided,s.covered,s.notRequired],defaultValue:s.planned})),
   {id:pack.barrierMethodId,title:'Планируемая конструкция защиты',valueType:'enum',unitId:null,kind:'profile',values:[pack.barrierValue,pack.otherBarrierValue],defaultValue:pack.barrierValue},
   {id:pack.dustMethodId,title:'Планируемый способ обеспыливания',valueType:'enum',unitId:null,kind:'profile',values:[pack.dustValue,pack.otherDustValue],defaultValue:pack.dustValue}],conditional:[],
  excludedUnownedAssumptions:['Агрессивная среда в названии не определяет фактические вредные вещества и специальные условия участка.','Планирование не подтверждает ранее выполненные работы.','Площадь не задаёт массу, возврат материала, тару или рейсы.'],
  rows:[['demolition','Разборка ПВХ с включёнными уборкой, перемещением и сортировкой'],['conditions','Условия участка и применимость выбранной технологии'],['protection',protection.titleRu],['dedusting',dust.titleRu],['waste','План обращения со снятым ПВХ']].map(([key,title])=>({
   rowId:scopeId(key!),formulaId:prefix+':formula:check:'+key,section:'Проверки полного состава работы',category:'construction_work',title:title!,unitId:'item',expression:slot(key!),procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const}))});
 for(const p of extra.parameters){
  const internal=p.parameter_id.endsWith('_scope_application'),isDefault=Object.hasOwn(floorPreparationFreshDefaultsS2769,p.parameter_id);
  const stage=pack.stages.find(s=>s.evidenceId===p.parameter_id);
  const visible=p.parameter_id===pack.modeId||[pack.siteConditionId,pack.siteConditionBasisId].includes(p.parameter_id)?null:
   stage?nonPlan(stage):p.parameter_id===pack.barrierAreaId?barrierSelected:p.parameter_id===pack.conditionsId?activePrep:
   p.parameter_id===pack.barrierMethodId?stagePlan(protection):p.parameter_id===pack.dustMethodId?stagePlan(dust):planned;
  r.parameters.push({...p,ordinal:r.parameters.length,default_value:null,truth_metadata:internal?unresolvedApplicationNormTruthR1(p.truth_metadata,'Это проверка состава без числовой нормы и отдельной оплаты. Источник и расчёт специальной технологии получает приложение.'):
   {...p.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},...(visible?{visible_when:visible}:{}),
    ...(isDefault?{visibility_role:'USER_INPUT',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',input_origin_class:'VISIBLE_PRELIMINARY_ENGINEERING_PROFILE',runtime_profile_value:true,preliminary_compilation_allowed:true}:{}),
    guide:{...(p.truth_metadata.guide as Json),guide_short_ru:p.parameter_id===pack.siteConditionId?'Укажите результат обследования. Промышленный пылесос и деревянное ограждение не заменяют обезвреживание, герметизацию или специальные временные системы.':
     p.parameter_id===pack.barrierAreaId?'Собственный обмер: длина × высота. Полная норма включает установку и последующую разборку.':
     stage?'Укажите конкретный этап и основание; будущая работа в другой смете не является уже выполненной.':'Предварительный состав можно изменить. Поиск нормы и расчёт другого способа выполняет приложение.'}}});
 }
 r.formulas.push(...extra.formulas.map(f=>({...f,ast_sha256:sha(f.ast)})));
 const evidence=[{sha256:pack.mainNorm.sha256,locator:pack.mainNorm.locatorRu}];
 for(const original of extra.resources){
  const key=original.row_id.split(':').at(-1)!,s=pack.stages.find(s=>s.key===key);
  const requirement:Json={contractVersion:'canonical-scope-requirement/v1',kind:key==='conditions'?'OBJECT_SCOPE':key==='waste'?'PROJECT_SCOPE':'INCLUDED',groupId:prefix+':'+key,
   groupTitleRu:original.title_ru,titleRu:original.title_ru,reasonRu:key==='conditions'?'Применимость нормы подтверждается материалом и обследованными условиями; специальную технологию рассчитывает приложение.':
    key==='waste'?'Исключение вывоза из КРЕР не доказывает его ненужность. Требуется выбранная схема; для дополнительной услуги — масса и полная спецификация.':
    'Планируемая работа учтена своими ресурсами; иной владелец стоимости или ненужность требуют основания. Прежнее отсутствие сведений не подтверждает выполнение.',
   exactScopeWhen:key==='demolition'?eq(pack.materialId,true):key==='conditions'?ordinary:key==='waste'?{kind:'literal',value:false}:and(s===protection?barrierScope:dustScope,eq(pack.conditionsId,pack.conditionsValue)),
   contextWhen:yes,coveringRowIds:key==='demolition'?parent.resources.map(x=>x.row_id):s===protection?barrier.resources.map(x=>x.row_id):s===dust?industrialVacuumDedustingKrer13R1('floor_covering_area_m2').resources.map(x=>x.row_id):[],originalRowIds:[],sourceEvidence:evidence};
  if(key==='conditions')Object.assign(requirement,{objectFactParameterId:pack.siteConditionId,unknownObjectValues:[pack.unknownSiteValue,'неизвестно','не знаю'],objectFactMode:'PROJECT_APPLICABILITY_ONLY',
   projectOperationContextsV1:[{when:yes,resourceRowIds:parent.resources.map(x=>x.row_id),applicabilityWhen:and(eq(pack.materialId,true),knownBasis(pack.siteConditionBasisId)),requiredFactParameterIds:[pack.materialId,pack.siteConditionBasisId],unknownFactValues:{[pack.siteConditionBasisId]:unknownBasisValues}}]});
  else if(s)Object.assign(requirement,{satisfiedWhen:and(nonPlan(s),knownBasis(s.evidenceId))});
  else if(key==='waste')Object.assign(requirement,{satisfiedWhen:and(planned,or(...[pvcFloorRetainPlanValueS2769,waste.contractorModeValue,waste.onSiteExtraModeValue].map(v=>eq(pack.wasteModeId,v)))),objectFactParameterId:pack.wasteModeId,unknownObjectValues:['неизвестно','не знаю'],requiredFactParameterIds:[pack.wasteModeId]});
  if(requirement.kind==='INCLUDED')requirement.costExclusionBreaksScopeV1=true;
  if(key==='conditions'||key==='demolition'){requirement.groupId=prefix+':demolition';requirement.groupTitleRu='Разборка ПВХ и условия участка';}
  r.resources.push({...original,ordinal:r.resources.length,row_type:'other',semantic_owner:String(parent.definition.catalog_id)+':'+original.row_id,
   resource_graph:{...original.resource_graph,scopeRequirementV1:requirement},source_metadata:{...original.source_metadata,normativeTrace:[],sourceRole:'MANDATORY_PROJECT_SCOPE_CHECK_WITHOUT_SEPARATE_PAYMENT'}});
 }
 for(const f of barrier.formulas){const expression=replace(String(f.expression_source),{barrier_vertical_area_m2:pack.barrierAreaId}),compiled=compileFormulaGraph(expression);
  r.formulas.push({...f,expression_source:expression,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:sha(compiled.ast)});}
 for(const old of barrier.resources){const row=replace(structuredClone(old),{barrier_vertical_area_m2:pack.barrierAreaId});
  r.resources.push({...row,ordinal:r.resources.length,inclusion_ast:barrierScope,semantic_owner:String(parent.definition.catalog_id)+':'+row.row_id,
   resource_graph:{...row.resource_graph,semanticOwnerId:String(parent.definition.catalog_id)+':'+row.row_id,inputParameterIds:[pack.conditionsId],scopeContextParameterIds:[pack.modeId,protection.id,pack.siteConditionId,pack.siteConditionBasisId,pack.materialId],
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix+':protection',groupTitleRu:protection.titleRu,operationId:prefix+':protection:board-frame',operationTitleRu:'Установка и последующая разборка вертикального ограждения',processOrdinal:0,completionCriterionRu:'Полная принятая конструкция установлена и после разборки снята.'},
    admittedSubworkReuseS2769:{definitionId:barrier.definition.id,definitionSha256:barrier.definition.definition_sha256,sourceRowId:row.row_id}}});}
 r.bindings.push(...structuredClone(barrier.bindings));
 const vacuum=industrialVacuumDedustingKrer13R1('floor_covering_area_m2');
 r.formulas.push(...vacuum.formulas.map(f=>({...f,ast_sha256:sha(f.ast)})));
 for(const row of vacuum.resources)r.resources.push({...row,ordinal:r.resources.length,row_type:row.unit_id==='man_hour'?'labor':row.category==='equipment'?'equipment':'other',semantic_owner:String(parent.definition.catalog_id)+':'+row.row_id,inclusion_ast:dustScope,
  resource_graph:{...row.resource_graph,semanticOwnerId:String(parent.definition.catalog_id)+':'+row.row_id,inputParameterIds:[pack.conditionsId],scopeContextParameterIds:[pack.modeId,dust.id,pack.siteConditionId,pack.siteConditionBasisId,pack.materialId],
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix+':dedusting',groupTitleRu:dust.titleRu,operationId:prefix+':dedusting:vacuum',operationTitleRu:'Обеспыливание всей площади с контролем качества',processOrdinal:40,completionCriterionRu:'Вся площадь обеспылена, качество проверено.'}},
  source_metadata:{...row.source_metadata,use_restriction:pack.scopeRu,sourceRole:'OFFICIAL_KG_UNIT_RATE',source_artifact_sha256:pack.dustSource.sha256,qualityControlIncluded:true,separateMachinistNormAbsent:true,
   normativeTrace:((row.source_metadata?.normativeTrace??[]) as Json[]).map(t=>({...t,sourceRole:'OFFICIAL_KG_UNIT_RATE'}))}});
 // Reuse the admitted complete-service contract, never a physical rate or a
 // density conversion. Keep every specification gate and its one cost owner.
 const services=floorDemolitionDefinitionS2752(2),serviceParameters=services.parameters.filter(p=>!['floor_covering_area_m2','existing_covering_confirmed','object_conditions'].includes(p.parameter_id));
 const mappings={existing_covering_confirmed:pack.materialId,object_conditions:pack.siteConditionId,...Object.fromEntries(serviceParameters.map(p=>[p.parameter_id,p.parameter_id==='waste_handling_mode'?pack.wasteModeId:'pvc_floor_'+p.parameter_id]))};
 for(const old of serviceParameters){const p=replace(structuredClone(old),mappings),isMode=p.parameter_id===pack.wasteModeId;
  const activeWhen=isMode?planned:and(planned,(p.constraints_json?.requiredWhen??yes) as Json);
  p.constraints_json={...p.constraints_json,requiredWhen:activeWhen,...(isMode?{values:[pvcFloorRetainPlanValueS2769,waste.contractorModeValue,waste.onSiteExtraModeValue]}:{})};
  r.parameters.push({...p,ordinal:r.parameters.length,required:false,default_value:null,truth_metadata:{...p.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},
   visible_when:activeWhen,required_when:activeWhen,...(isMode?{visibility_role:'USER_INPUT',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',input_origin_class:'VISIBLE_PRELIMINARY_ENGINEERING_PROFILE',runtime_profile_value:true,preliminary_compilation_allowed:true}:{}),
   guide:{...((p.truth_metadata as Json).guide as Json),guide_short_ru:isMode?'Предварительный план: оставить снятый материал на объекте в пределах включённых перемещений. Если нужен дополнительный спуск, тара или вывоз — измените схему; массу и состав услуги укажите отдельно.':((p.truth_metadata as Json).guide as Json)?.guide_short_ru}}});}
 for(const key of ['waste-service','waste-onsite-service']){
  const old=services.resources.find(r=>r.row_id==='floor-demolition:end-grain:'+key)!,oldFormula=services.formulas.find(f=>f.formula_id===old.formula_id)!;
  const expression=replace(String(oldFormula.expression_source),mappings),formula=compileFormulaGraph(expression),formulaId=prefix+':formula:'+key,rowId=prefix+':'+key;
  r.formulas.push({...oldFormula,formula_id:formulaId,expression_source:expression,ast:formula.ast,input_parameter_ids:formula.inputParameterIds,ast_sha256:sha(formula.ast)});
  const row=replace(structuredClone(old),mappings),title='Дополнительное обращение со снятым ПВХ'+(key==='waste-service'?' с внешним вывозом':' на объекте')+' — полная согласованная услуга';
  r.resources.push({...row,row_id:rowId,ordinal:r.resources.length,formula_id:formulaId,title_ru:title,cost_owner_id:rowId,row_type:'service',semantic_owner:String(parent.definition.catalog_id)+':'+rowId,
   inclusion_ast:and(planned,ordinary,eq(pack.wasteModeId,key==='waste-service'?waste.contractorModeValue:waste.onSiteExtraModeValue)),
   resource_graph:{...row.resource_graph,formulaId,costTreatment:'OWN_COST',semanticOwnerId:String(parent.definition.catalog_id)+':'+rowId,
    inputParameterIds:((row.resource_graph as Json).inputParameterIds as string[]).filter(id=>id!==pack.siteConditionId&&id!==pack.materialId),
    titleSpecificationParameterIds:[...new Set([...(((row.resource_graph as Json).titleSpecificationParameterIds as string[])??[]),'pvc_floor_waste_service_specification_ref','pvc_floor_waste_lowering_loading_scope',...(key==='waste-service'?['pvc_floor_haul_distance_km']:[])])],
    operationCompositionV1:{...row.resource_graph.operationCompositionV1,groupId:prefix+':waste',groupTitleRu:'Дополнительное обращение с отходами',operationId:prefix+':'+key},
    publicResourcePresentationV1:{...row.resource_graph.publicResourcePresentationV1,nameRu:title,sourceTitleRu:title},acceptedServiceReuseS2769:{sourceContract:waste.contract,physicalNormNotClaimed:true,massNeverFromAreaOrThickness:true}},
   source_metadata:{...row.source_metadata,normativeTrace:[],sourceRole:'PROJECT_DEFINED_SERVICE_SCOPE_REQUIRES_CONFIRMED_SPECIFICATION',no_published_productivity_or_quantity_norm:true,physicalRateColumnNotAppliedToService:true}});
  const checkId=scopeId(key),check=r.resources.find(x=>x.row_id===scopeId('waste'))!;
  r.resources.push({...structuredClone(check),row_id:checkId,ordinal:r.resources.length,title_ru:'Полнота выбранной услуги обращения со снятым ПВХ',cost_owner_id:checkId,semantic_owner:String(parent.definition.catalog_id)+':'+checkId,
   inclusion_ast:and(planned,eq(pack.wasteModeId,key==='waste-service'?waste.contractorModeValue:waste.onSiteExtraModeValue)),
   resource_graph:{...check.resource_graph,scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:prefix+':waste',groupTitleRu:'Полная согласованная услуга обращения с ПВХ',
    titleRu:'Ресурс выбранной дополнительной услуги обращения со снятым ПВХ',reasonRu:'Нужны подтверждённые масса и полная спецификация услуги; исключённый ресурс сохраняет разрыв состава.',exactScopeWhen:yes,sourceEvidence:evidence,coveringRowIds:[rowId],originalRowIds:[],costExclusionBreaksScopeV1:true}}});
 }
 const planFormula=compileFormulaGraph('floor_covering_area_m2'),planFormulaId=prefix+':formula:waste-plan';
 r.formulas.push({formula_id:planFormulaId,expression_source:'floor_covering_area_m2',output_unit_id:'m2',ast:planFormula.ast,input_parameter_ids:planFormula.inputParameterIds,ast_sha256:sha(planFormula.ast)});
 r.resources.push({row_id:prefix+':waste-plan',ordinal:r.resources.length,section:'Принятая схема обращения со снятым ПВХ',category:'construction_work',row_type:'other',title_ru:'План обращения со снятым ПВХ — участок без повторной оплаты',unit_id:'m2',formula_id:planFormulaId,cost_owner_id:prefix+':waste-plan',semantic_owner:String(parent.definition.catalog_id)+':waste-plan',procurement_eligible:false,
  inclusion_ast:and(planned,ordinary),resource_graph:{formulaId:planFormulaId,costTreatment:'INFORMATIONAL_SCOPE',normalizedUom:'m2',inputParameterIds:[pack.wasteModeId],titleSpecificationParameterIds:[pack.wasteModeId],
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:'План обращения со снятым ПВХ',sourceTitleRu:'Выбранный план работ',detailsRu:['Площадь обозначает участок; масса, тара, рейсы и выход годного материала из неё не выводятся.']},
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix+':waste',groupTitleRu:'Обращение со снятым ПВХ',operationId:prefix+':waste:plan',operationTitleRu:'Выбранный план обращения со снятым материалом',processOrdinal:30,completionCriterionRu:'Выбраны границы планируемых работ и дополнительные услуги по применимости.'}},
  source_metadata:{truth_contract_version:'R3',synthetic:false,sourceRole:'VISIBLE_PROJECT_WASTE_PLAN',normativeTrace:[]}});
 const profile=r.parameters.find(p=>p.parameter_id===pack.profileId)!;profile.required=false;profile.default_value=null;
 profile.truth_metadata={...profile.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'SOURCE_CONFIRMED',input_origin_class:'AUTHORITATIVE_SOURCE',source_confirmation_required:false,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},guide:{guide_short_ru:'Приложение применяет принятую колонку14 для листового или рулонного ПВХ; пользователь сообщает фактический материал.'}};
 r.parameters.find(p=>p.parameter_id===pack.materialId)!.title_ru='Снимается листовое или рулонное покрытие из ПВХ';
 const consumers=buildMasterParameterCalculationConsumers(r);
 r.baseline.input_values={...parent.baseline.input_values,...pvcFloorFreshDefaultsS2769,[pack.barrierAreaId]:12,[pack.siteConditionId]:pack.ordinarySiteValue,[pack.siteConditionBasisId]:'Контрольное обследование участка ПВХ',[pack.conditionsId]:pack.conditionsValue};
 r.baseline.input_classification=Object.fromEntries(Object.keys(r.baseline.input_values).map(id=>[id,id===pack.profileId?'NORMATIVE':Object.hasOwn(pvcFloorFreshDefaultsS2769,id)?'ASSUMPTION':'VALIDATION_FIXTURE']));
 for(const p of r.parameters){const id=p.parameter_id;
  p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:String(parent.definition.catalog_id)+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  r.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];r.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];r.baseline.uom_by_parameter[id]=p.unit_id;
  r.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;r.baseline.normative_source_ids[id]=[...new Set([...Object.values(parent.baseline.normative_source_ids).flat(),...Object.values(barrier.baseline.normative_source_ids).flat(),pack.dustSource.sourceId])];
 }
 r.baseline.parameter_schema_sha256=sha(r.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 r.passport.included_scope_ru=[...r.passport.included_scope_ru,pack.scopeRu];
 const map=r.passport.decision.independentCompletenessMap;
 const haul=map.entries.find((e:Json)=>e.operationId==='offsite_waste_haul');Object.assign(haul,{condition:'EXPLICIT_PROJECT_WASTE_PLAN',detailPrinciple:'OUTSIDE_RATE_REQUIRES_PROJECT_SCOPE',resolution:{kind:'CONDITIONAL_PROJECT_SCOPE',rowId:scopeId('waste'),serviceRowIds:[prefix+':waste-service',prefix+':waste-onsite-service']}});
 map.entries.find((e:Json)=>e.operationId==='internal_debris_handling_within_object').specification='КРЕР46 п.1.1: уборка, спуск через окно в лотках, суммарно до130м, в том числе до50м от объекта; сортировка и штабелирование пригодного материала. Не масса и не фактический выход годного ПВХ.';
 map.entries.push(...replace(structuredClone(barrier.passport.decision.independentCompletenessMap.entries),{barrier_vertical_area_m2:pack.barrierAreaId}).map((e:Json)=>({...e,condition:'EXACT_PLANNED_FULL_BARRIER_WITH_OWN_MEASURE'})),
  ...[{id:'operation',unit:'m2',rate:'1',parent:'workers'},{id:'workers',unit:'man_hour',rate:'0.1'},{id:'vacuum',unit:'machine_hour',rate:'0.10'}].map(e=>({expectedResourceId:'dust:industrial-vacuum:krer13-06-004-01:'+e.id,operationId:'industrial-vacuum-full-area-quality-included',unitId:e.unit,sourceId:pack.dustSource.sourceId,specification:pack.dustSource.locatorRu,condition:'EXACT_PLANNED_VACUUM_ORDINARY_SITE',quantityRule:'floor_covering_area_m2 * '+e.rate,priceRelation:e.parent?'INCLUDED_IN_PARENT':'OWN_COST',resolution:e.parent?{kind:'INCLUDED_COMPONENT_ROW',rowId:'dust:industrial-vacuum:krer13-06-004-01:'+e.id,parentRowId:'dust:industrial-vacuum:krer13-06-004-01:'+e.parent}:{kind:'ROW',rowId:'dust:industrial-vacuum:krer13-06-004-01:'+e.id}})));
 r.passport.decision={...r.passport.decision,pvcFloorCompleteFourContract:pack.contract,floorPlannedPreparationContract:pack.contract,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,
  acceptedCompleteQuantityBranch:'EXACT_PVC_ORDINARY_SURVEYED_SITE_PLANNED_PREPARATION_AND_EXPLICIT_WASTE_SCOPE',newPhysicalNormSources:0,preliminaryCompositionOnly:true,legacyLimitedNormDoesNotProveWholeProject:true,unresolvedResourceRowIds:['demolition','conditions','protection','dedusting','waste','waste-service','waste-onsite-service'].map(scopeId)};
 r.passport.capability_matrix=r.passport.capability_matrix.map((entry:Json)=>entry.capability==='FULL_APPLICABLE_SCOPE'?{...entry,status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:r.passport.decision.unresolvedResourceRowIds}:entry);
 // Scope checks consume already compiled physical rows. Keep original owners
 // first and put the checks after every possible covering resource.
 r.resources.sort((a,b)=>Number(a.row_id.startsWith(prefix+':check:'))-Number(b.row_id.startsWith(prefix+':check:')));
 for(const [ordinal,row] of r.resources.entries()){row.ordinal=ordinal;const{row_sha256:_old,...body}=row;row.row_sha256=sha(body);}
 return r;
}
export function compilePvcFloorCompleteFourS2769(parent:Model,input:Json,runtime?:Json){
 const r=buildPvcFloorCompleteFourS2769(parent),approved=runtime??canonicalApprovedBaselineRuntimeParameters(r.baseline);assertFloorPreparationIntentS2769(String(parent.definition.catalog_id),{...approved,...input});
 return compileAutomaticConstructionOwnerR1({catalogId:String(parent.definition.catalog_id),compilerVersion:pack.contract,primaryMeasureParameterId:'floor_covering_area_m2',
  definition:{parameters:r.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:r.formulas as unknown as AutomaticOwnerDefinition['formulas'],resources:r.resources as unknown as AutomaticOwnerDefinition['resources'],runtimeInput:approved as Record<string,string>,runtimeClassification:Object.fromEntries(Object.keys(approved).map(id=>[id,id===pack.profileId?'NORMATIVE':'ASSUMPTION'])) as AutomaticOwnerDefinition['runtimeClassification'],runtimeSourceIds:Object.fromEntries(Object.keys(approved).map(id=>[id,[pack.dustSource.sourceId]])),ordinaryParameterIds:['floor_covering_area_m2',pack.barrierAreaId]},submittedParameters:input});
}
