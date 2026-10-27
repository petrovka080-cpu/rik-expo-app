import source from '../../../../data/estimate-benchmarks/source-packs/facade-factory-panel-vertical-grip-r3.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {compareFormulaGraphDecimals as cmp,isFormulaGraphExactDecimal} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
const isSourceMetadataObject=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function sourceProvenance(value:unknown):Record<string,unknown>{
 if(value==null)return{};
 if(!isSourceMetadataObject(value))throw new Error('FACADE_PANEL_GRIP_SOURCE_PROVENANCE_OBJECT_REQUIRED');
 return value;
}
function sourceGuide(value:unknown):Record<string,unknown>{
 if(!isSourceMetadataObject(value))throw new Error('FACADE_PANEL_GRIP_SOURCE_GUIDE_OBJECT_REQUIRED');
 return value;
}

// Internal reusable component draft. No public catalog/registry/publisher entry.
// Selected source-specific panel method must be proved by the enclosing factory
// panel technology. This is not a whole wall/facade or a generic crane service.
const prefix='facade:factory-panel-vertical-grip:r3';
const rid=(key:string)=>prefix+':'+key;
export const facadePanelGripFrontPrimaryR3='panel_grip_actual_fronts';
export const facadePanelGripMethodR3='Вертикальный подъём заводской минераловатной панели200мм за прямой верхний торец исходным согласованным комплектом';
const facts=['panel_grip_exact_method','panel_grip_actual_PPR','panel_grip_panel_passport','panel_grip_device_inspection','panel_grip_perlift_fit','panel_grip_actual_conditions','panel_grip_inspection_state'] as const;
const needParameter=(key:string)=>'panel_grip_unknown_'+key.replaceAll('-','_');

/** Source classification only. Decimal comparator is the existing core helper;
 * no invented kg capacity:200/300 here are panel thickness, not WLL.
 * The original full case provides2devices/2securing sets regardless of active1/2. */
export function facadePanelGripMinimumActiveR3(lengthM:string):'1'|'2'{
 if(typeof lengthM!=='string'||!isFormulaGraphExactDecimal(lengthM)||cmp(lengthM,'0')<=0||cmp(lengthM,'6')>0)throw Object.assign(new Error('PANEL_GRIP_SOURCE_LENGTH_SCOPE_REQUIRED'),{code:'PARAMETER_VALIDATION_FAILED'});
 return cmp(lengthM,'4.6')<=0?'1':'2';
}
export function facadePanelGripPostDefinitionR3():AutomaticOwnerDefinition{
 if(source.fullCaseRoster.length!==14||source.source.manual.sha256!=='dad3769bfe70ed6d10015f9621216edeba8dfbf6c8b43bc4369c4170273a4bf9')throw Error('PANEL_GRIP_EXACT_PRIMARY_CASE_REQUIRED');
 const primary=facadePanelGripFrontPrimaryR3,positive={kind:'greater_than' as const,parameterId:primary,value:0};
 const text=(id:string,title:string):AutomaticParameterSpec=>({id,title,unitId:null,valueType:'text',kind:'conditional',requiredWhen:positive});
 const exact=(id:string,title:string,value:string):AutomaticParameterSpec=>({id,title,unitId:null,valueType:'enum',kind:'conditional',values:[value],requiredWhen:positive});
 const conditional:AutomaticParameterSpec[]=[
  exact(facts[0],'Точный согласованный способ подъёма',facadePanelGripMethodR3),
  text(facts[1],'Фактический ППР одного последовательного подъёма на каждый обеспеченный фронт'),
  text(facts[2],'Паспорт исходной совместимой заводской минераловатной панели и принятой схемы подъёма'),
  text(facts[3],'Действующая маркировка осмотра и комплектность исходного устройства'),
  exact(facts[4],'Результат проверки крепления перед каждым подъёмом','ЗАЗОР_НУЛЕВОЙ_ПЕРЕМЕЩЕНИЯ_И_ДЕФЕКТЫ_ОТСУТСТВУЮТ_СТРАХОВКА_ЗАКРЕПЛЕНА'),
  exact(facts[5],'Принятые условия выполнения подъёма','УСЛОВИЯ_ППР_ДОПУСКАЮТ_ПОДЪЁМ_СИЛЬНЫЙ_ВЕТЕР_ОТСУТСТВУЕТ'),
  exact(facts[6],'Текущий статус осмотра по маркировке устройства','СРОК_ОСМОТРА_ДЕЙСТВУЕТ_ВОЗВРАТ_ИЛИ_РЕМОНТ_НЕ_ТРЕБУЕТСЯ'),
  {id:'panel_grip_nominal_length_m',title:'Фактическая номинальная длина поднимаемой панели',unitId:'m',valueType:'decimal',kind:'conditional',min:0,max:6,requiredWhen:positive},
  {id:'panel_grip_thickness_mm',title:'Толщина выбранной исходной панели200мм',unitId:'mm',valueType:'decimal',kind:'conditional',min:200,max:200,requiredWhen:positive},
  {id:'panel_grip_concurrent_panels_per_front',title:'Число одновременно поднимаемых панелей на одном последовательном фронте',unitId:'piece',valueType:'integer',kind:'conditional',min:1,max:1,requiredWhen:positive},
  ...source.protectedNeeds.map(n=>({id:needParameter(n.key),title:n.titleRu,unitId:null,valueType:'decimal' as const,kind:'internal' as const,min:0})),
 ];
 const context=[...facts,'panel_grip_nominal_length_m','panel_grip_thickness_mm','panel_grip_concurrent_panels_per_front'];
 const row=(key:string,title:string,category:string,unit:string,expression:string,more:Partial<AutomaticRowSpec>={}):AutomaticRowSpec=>({rowId:rid(key),formulaId:rid('formula:'+key),section:'Оснастка вертикального подъёма заводских стеновых панелей',title,category,unitId:unit,expression,inclusion:positive,inputParameterIds:context,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',...more});
 const rows:AutomaticRowSpec[]=[row('kit-period-service','Обеспечение исходным комплектом захватов на принятый период рабочего фронта','equipment','set',primary,{costTreatment:'OWN_COST',procurement:true}),
  ...source.fullCaseRoster.map(item=>row('stock:'+item.key,item.titleRu,'equipment',item.unitId,primary+'*'+item.quantityPerOriginalCase)),
  ...source.protectedNeeds.map(n=>row('need:'+n.key,n.titleRu,n.category,n.unitId??'',needParameter(n.key))),
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:prefix,sourceId:'gox_facade_factory_panel_vertical_grip_post_r3',normId:'RPT2011V_VER009_ORIGINAL_CASE_VERTICAL200_MAX6M',sourceMetadata:{source_title:'Исходный комплект вертикального подъёма заводских минераловатных панелей',source_document_version:'RPT2011-Vver00914.11.2024;SPA07.2026',definition_hash:source.source.manual.sha256,artifact_sha256:source.source.manual.sha256,exact_locator:'gripPDF2,13–18;manufacturer-specific;selected200mm;oneoriginalcaseperfront'},applicabilityRu:'Только внутренний компонент согласованного заводского панельного метода. Не самостоятельный полный фасад. Количество оснастки по буквальной ведомости исходного кейса; труд,кран,доступ и прочие нормы остаются видимыми потребностями.',ordinary:[{id:primary,title:'Фактическое число одновременно обеспеченных последовательных подъёмных фронтов по ППР',unitId:'set',valueType:'integer',kind:'ordinary',min:0}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:source.returnAndExclusionRules});
 const operations=source.wholeBoundedOperations;
 return {...built,ordinaryParameterIds:['panel_grip_nominal_length_m'],parameters:built.parameters.map(p=>{
  const n=source.protectedNeeds.find(n=>p.parameter_id===needParameter(n.key));
  return n?{...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,n.missing)}
   :p.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?p:{...p,...(p.parameter_id==='panel_grip_nominal_length_m'?{constraints_json:{...p.constraints_json,exclusiveMin:0}}:{}),truth_metadata:{...p.truth_metadata,
    visibility_role:p.parameter_id==='panel_grip_nominal_length_m'?'USER_INPUT':'INTERNAL_ONLY',
    value_source_role:p.parameter_id==='panel_grip_nominal_length_m'?'USER_MEASURED':p.parameter_id==='panel_grip_thickness_mm'||p.parameter_id==='panel_grip_exact_method'||p.parameter_id==='panel_grip_panel_passport'?'MANUFACTURER_CONFIRMED':p.parameter_id==='panel_grip_actual_fronts'||p.parameter_id==='panel_grip_concurrent_panels_per_front'||p.parameter_id==='panel_grip_actual_PPR'?'PROJECT_DOCUMENTATION':'SITE_SURVEY',
    source_confirmation_required:false,preliminary_compilation_allowed:p.parameter_id!=='panel_grip_nominal_length_m',
    ...(p.parameter_id==='panel_grip_nominal_length_m'?{guide:{...sourceGuide(p.truth_metadata.guide),guide_kind:'MEASUREMENT_RULE',source_role:'USER_MEASURED',guide_short_ru:'Измерьте номинальную длину поднимаемой панели в метрах.'}}:{}),
    provenance:{...sourceProvenance(p.truth_metadata.provenance),consumer_input_role_v1:p.parameter_id==='panel_grip_nominal_length_m'?'OBJECT_FACT':'APPLICATION_TECHNICAL',
     ...(p.parameter_id==='panel_grip_nominal_length_m'?{}:{source_readback_only_v1:true,consumer_question_allowed:false})}}};
 }),resources:built.resources.map(r=>{
  const key=r.row_id.slice(prefix.length+1),n=source.protectedNeeds.find(n=>key==='need:'+n.key),stock=source.fullCaseRoster.find(item=>key==='stock:'+item.key),f=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  const uses=key==='kit-period-service'?operations:stock?.key==='key19'?operations.filter(o=>o.key==='adjust'):stock?.key==='case'?operations.filter(o=>['receive-inspect','inspect-return'].includes(o.key)):operations;
  const op=uses[0]!,{row_sha256:_old,...body}=r;
  const next={...body,resource_graph:{...r.resource_graph,...(n?{}:{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...f.input_parameter_ids],reasonRu:'Измените фактическое число обеспеченных фронтов по ППР. Буквальный состав исходного комплекта не заменяется произвольным количеством.'}}),...(stock?{includedInResourceOwnerRowId:rid('kit-period-service')}:{}),operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:'Оснастка вертикального подъёма заводских стеновых панелей',operationId:rid('operation:'+op.key),operationTitleRu:op.titleRu,processOrdinal:1,additionalOperations:uses.slice(1).map((o,index)=>({operationId:rid('operation:'+o.key),operationTitleRu:o.titleRu,processOrdinal:index+2,completionCriterionRu:'Применён тот же исходный комплект в указанной операции подъёмного цикла; условия ППР и незакрытые потребности сохранены.'})),completionCriterionRu:n?n.missing:'Исходный ограниченный комплект; обязательные реальные условия подъёма и незакрытые нормы отдельно.'}},source_metadata:{...r.source_metadata,source_artifact_sha256:source.source.manual.sha256,sourceRole:n?'UNRESOLVED_APPLICATION_NORM':stock?'LITERAL_ORIGINAL_COMPLETE_CASE_STOCK':'WHOLE_ORIGINAL_KIT_PERIOD_PROVISION_NO_RETAIL_PRICE',normativeTrace:n?[]:[{sourceId:'gox_facade_factory_panel_vertical_grip_post_r3',source_artifact_sha256:source.source.manual.sha256,exact_locator:stock?'PDF2casecontents':'PDF13–18selectedwholeverticalmethod'}],sourceStockNotConsumption:!!stock,inventoryQuantityNotActiveLiftCount:!!stock,sourceKitNotCraneOrWholeFacade:true,priceOnlyActualPPRPeriod:key==='kit-period-service',automaticGenericPriceInheritanceAllowed:false,...(n?{normative_source_ids:[],sourceNormQuantityAccepted:false,missingFact:n.missing}:{}),newFull:0,full_technical_acceptance:false}};
  return {...next,row_sha256:hash(next)};
 })};
}
export function compileFacadePanelGripPostR3(parameters:Record<string,unknown>,options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];confirmedParameters?:CanonicalEstimateCompileCoreInput['confirmedParameters']}={}){
 if(Object.keys(parameters).some(id=>id!=='panel_grip_nominal_length_m'))throw Object.assign(new Error('PANEL_GRIP_TECHNICAL_FACTS_REQUIRE_TRUSTED_READBACK'),{code:'PARAMETER_VALIDATION_FAILED'});
 const d=facadePanelGripPostDefinitionR3();
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:source.contract,catalogId:'INTERNAL_COMPONENT_NOT_PUBLIC_CATALOG',primaryMeasureParameterId:facadePanelGripFrontPrimaryR3,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:options.confirmedParameters??{},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:hash});
}
/** TEST_ONLY. No defaults/actual acts/accepted site evidence. */
export function facadePanelGripControlR3(more:Record<string,unknown>={}){return{panel_grip_actual_fronts:'1',panel_grip_nominal_length_m:'4.6',panel_grip_thickness_mm:'200',panel_grip_concurrent_panels_per_front:'1',panel_grip_exact_method:facadePanelGripMethodR3,panel_grip_actual_PPR:'TEST_ONLY one sequential lift per front;not a real PPR',panel_grip_panel_passport:'TEST_ONLY exact original approved200mm SPA panel,straightupperend',panel_grip_device_inspection:'TEST_ONLY fullcase;valid markedinspection;notactualreceipt',panel_grip_perlift_fit:'ЗАЗОР_НУЛЕВОЙ_ПЕРЕМЕЩЕНИЯ_И_ДЕФЕКТЫ_ОТСУТСТВУЮТ_СТРАХОВКА_ЗАКРЕПЛЕНА',panel_grip_actual_conditions:'УСЛОВИЯ_ППР_ДОПУСКАЮТ_ПОДЪЁМ_СИЛЬНЫЙ_ВЕТЕР_ОТСУТСТВУЕТ',panel_grip_inspection_state:'СРОК_ОСМОТРА_ДЕЙСТВУЕТ_ВОЗВРАТ_ИЛИ_РЕМОНТ_НЕ_ТРЕБУЕТСЯ',...more};}
