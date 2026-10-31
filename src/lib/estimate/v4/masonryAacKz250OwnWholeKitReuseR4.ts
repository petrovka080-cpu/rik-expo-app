import rawKit from '../../../../data/estimate-benchmarks/source-packs/masonry-aac-kz250-own-table8-kit-reuse-r4.json';
import physical from '../../../../data/estimate-benchmarks/source-packs/masonry-ready-m50-whole-supply-cycle-r2.json';
import {MASONRY_AAC_KZ250_WHOLE_R4 as own} from './masonryAacKz250WholeCycleR4';
import {MASONRY_AAC_FIRST_ROW_FEED_REUSE_R4 as feed} from './masonryAacKz250WholeFirstRowFeedReuseR4';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateOperationReference,canonicalEstimateOperationReferences,type CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import type {CanonicalPublisherJson as Json} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

export const MASONRY_AAC_OWN_WHOLE_KIT_R4='masonry-aac-kz250-own-table8-whole-kit-reuse/r4';
const row=(key:string)=>own.prefix+':table8:'+key;
const id=(key:string)=>'aackz4_table8_'+key.replaceAll('-','_');
const check=(value:unknown,code:string):void=>{if(!value)throw Error('AAC_OWN_WHOLE_KIT_R4_'+code);};
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown):string=>{if(typeof value!=='string'||!value.trim())throw Error('AAC_OWN_WHOLE_KIT_R4_SOURCE_TEXT');return value;};
const decl=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
const rehash=(value:Json):Json=>{const{row_sha256:_old,...body}=value;return{...body,row_sha256:hash(body)};};
type KitEntry=Readonly<{number:number;key:string;title:string;quantity:string|null;unitId:string;page:number;purpose:string;specification:string;operations:string[];ownerRowId:string;alias:boolean;selectedMethodCount:string|null;currentPpeProofRequired:boolean}>;

/** Interpret all three already captured source pages. A source brigade label
 * never becomes a numeric norm, a crew-size guess or available site stock. */
function entries():KitEntry[]{
 check(rawKit.contract===MASONRY_AAC_OWN_WHOLE_KIT_R4&&rawKit.source.sha256===own.source.sha256
  &&rawKit.targetDefinitionId===own.currentParent.definitionId&&rawKit.targetDefinitionSha256===own.currentParent.definitionSha256,'EXACT_EXISTING_SOURCE');
 const values:KitEntry[]=rawKit.records.map(value=>{
  const source:Record<string,unknown>=value,number=source.number,quantity=source.sourceQuantity;
  if(typeof number!=='number'||!Number.isInteger(number)||number<1||number>41)throw Error('AAC_OWN_WHOLE_KIT_R4_SOURCE_NUMBER');
  if(quantity!==null&&(typeof quantity!=='string'||!/^[1-9][0-9]*$/.test(quantity)))throw Error('AAC_OWN_WHOLE_KIT_R4_SOURCE_COUNT');
  const page=source.sourcePdfPage;if(typeof page!=='number'||![41,42,43].includes(page))throw Error('AAC_OWN_WHOLE_KIT_R4_SOURCE_PAGE');
  const operations=source.operationKeys;if(!Array.isArray(operations)||!operations.every((key:unknown):key is string=>typeof key==='string'&&key.length>0))throw Error('AAC_OWN_WHOLE_KIT_R4_SOURCE_OPERATIONS');
  const reuse=source.reuse;if(reuse!==undefined&&!record(reuse))throw Error('AAC_OWN_WHOLE_KIT_R4_ALIAS_DECLARATION');
  return{number,key:text(source.key),title:text(source.publicTitleRu),quantity,unitId:text(source.unitId),page,purpose:text(source.purposeRu),specification:text(source.specificationRu),operations,
   ownerRowId:reuse?text(reuse.existingOwnerRowId):text(source.newInformationalRowId),alias:reuse!==undefined,
   selectedMethodCount:reuse?text(reuse.retainedSelectedMethodSourceCount):null,currentPpeProofRequired:source.sourceEditionIsNotCurrentPpeApproval===true};
 });
 check(values.length===41&&new Set(values.map(value=>value.number)).size===41&&new Set(values.map(value=>value.key)).size===41,'WHOLE_TABLE');
 check(values.filter(value=>value.quantity===null).map(value=>value.number).join(',')==='35,36,37,38,39,40,41','BRIGADE_QUANTITIES_NOT_INVENTED');
 check(values.filter(value=>value.alias).map(value=>value.number).join(',')==='1,8,10,13,19','EXACT_SHARED_OWNERS');
 const sourceDrill:unknown=rawKit.records.find(value=>value.number===5);
 check(values.find(value=>value.number===5)?.quantity==='1'&&record(sourceDrill)&&sourceDrill.sameMixingLimitRpm===300
  &&values.find(value=>value.number===11)?.quantity==='1','OWN_DRILL_AND_MANUAL_SAW');
 return values;
}

const facts=[
 {key:'actual-inventory-ref',title:'Привязанная ведомость фактического оснащения',role:'SITE_SURVEY'},
 {key:'actual-equipment-passports-ref',title:'Привязанные паспорта фактического оборудования',role:'SELECTED_EQUIPMENT_PASSPORT'},
 {key:'actual-access-rigging-plan-ref',title:'Привязанная проектная схема доступа и грузозахватов',role:'ENGINEERING_DESIGN'},
 {key:'actual-current-safety-ref',title:'Привязанное обеспечение действующей защиты на объекте',role:'PROJECT_DOCUMENTATION'},
] as const;
const active={kind:'and',operands:[{kind:'selected',parameterId:own.selectorId,value:own.selectorValue},
 {kind:'selected',parameterId:feed.selectorId,value:feed.selectorValue},
 {kind:'formula_greater_than',expression:'(m33_masonry_wall_length_m*m33_masonry_wall_height_m-m33_masonry_openings_area_m2)*0.25',unitId:'m3',value:0}]};
export function masonryAacOwnWholeKitSourceMapR4(){return entries();}

/** Independent expected list from the captured whole table and saved physical
 * component, not from the implementation's current resource rows. */
export function masonryAacOwnWholeKitCompletenessEntriesR4(){
 const condition=own.selectorId+'='+own.selectorValue+' AND '+feed.selectorId+'='+feed.selectorValue;
 const expected=entries().map(entry=>{
  const old=entry.alias?physical.roster.find(item=>physical.prefix+':'+item.key===entry.ownerRowId):null;
  check(!entry.alias||old,'EXACT_EXPECTED_SOURCE_ALIAS');
  return{expectedResourceId:row('expected:'+entry.key),operationId:own.prefix+':operation:'+entry.operations[0],requiredOperationIds:entry.operations.map(key=>own.prefix+':operation:'+key),sourceId:own.sourceId,condition,
   category:old?.category??'equipment',unitId:entry.unitId,specification:entry.title,
   quantityRule:entry.number===8?'EXISTING_WHOLE_THREE_BOX_METHOD_COVERS_TABLE8_ONE_NO_SUM':entry.quantity===null?'ACTUAL_REQUIRED_QUANTITY_NOT_NUMERIC_SOURCE_BRIGADE_LABEL':'SOURCE_TABLE8_WHOLE_BRIGADE_STOCK_'+entry.quantity,
   formulaId:old?physical.prefix+':formula:'+old.key:row('formula:'+entry.key),resolution:{kind:'ROW',rowId:entry.ownerRowId}};
 });
 return[...expected,...['actual-kit-scope','whole-kit-coverage'].map(key=>({expectedResourceId:row('expected:'+key),operationId:row('operation:'+key),requiredOperationIds:[row('operation:'+key)],sourceId:own.sourceId,condition,category:'service',unitId:'set',specification:key==='actual-kit-scope'?'Bound actual whole-kit and current safety applicability':'Preserved complete source physical roster coverage',quantityRule:key==='actual-kit-scope'?'MANDATORY_ACTUAL_OBJECT_SCOPE_NOT_SOURCE_STOCK_COUNT':'MANDATORY_WHOLE_PHYSICAL_ROSTER_COVERAGE_NOT_ANOTHER_PAYMENT',formulaId:row('formula:'+key),resolution:{kind:'ROW',rowId:row(key)}}))];
}

/** Apply the source's complete table to the existing whole AAC method. Five
 * physical owners are reused; a mixer stock count is not a second machine-hour
 * charge. Existing financial norms and all open actual-object needs remain. */
export function applyMasonryAacKz250OwnWholeKitReuseR4(parent:Rep):Rep{
 check(parent.definition.id===own.currentParent.definitionId&&parent.definition.definition_sha256===own.currentParent.definitionSha256,'EXACT_AAC_PARENT');
 const source=entries(),fresh=source.filter(value=>!value.alias),unknown=source.filter(value=>value.quantity===null);
 check(fresh.length===36&&!parent.resources.some(resource=>resource.row_id===row('actual-kit-scope')),'NEW_WHOLE_KIT_ONLY_ONCE');
 const physicalById=new Map(parent.resources.map(resource=>[resource.row_id,resource]));
 check(new Set(source.map(entry=>entry.ownerRowId)).size===41&&fresh.every(entry=>entry.ownerRowId===row(entry.key)&&!physicalById.has(entry.ownerRowId)),'UNIQUE_PHYSICAL_OWNERS_NO_REDECLARED_STOCK');
 for(const entry of source.filter(value=>value.alias)){
  const resource=physicalById.get(entry.ownerRowId),formula=parent.formulas.find(formula=>formula.formula_id===resource?.formula_id);
  check(resource&&resource.unit_id===entry.unitId&&resource.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'
   &&resource.procurement_eligible===false&&resource.source_metadata.sourceInventoryNotConsumption===true
   &&formula?.expression_source===entry.selectedMethodCount,'EXISTING_WHOLE_PHYSICAL_OWNER:'+entry.number);
  if(entry.number===8)check(entry.quantity==='1'&&entry.selectedMethodCount==='3'&&entry.ownerRowId.endsWith(':boxes'),'TABLE8_ONE_NEVER_REPLACES_OR_ADDS_TO_THREE');
  else check(entry.quantity===entry.selectedMethodCount,'EXACT_SOURCE_ALIAS_COUNT:'+entry.number);
 }
 const main=parent.resources.find(resource=>resource.row_id===own.prefix+':main-labour'),machine=parent.resources.find(resource=>resource.row_id===own.prefix+':glue-mix-machine');
 check(main?.resource_graph.costTreatment==='OWN_COST'&&machine?.resource_graph.costTreatment==='OWN_COST','EXISTING_ONLY_FINANCIAL_OWNERS');
 const operationSources=new Map<string,{operation:CanonicalEstimateOperationReference;rows:string[]}>();
 for(const resource of parent.resources)for(const operation of canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1)){
  if(operation.groupId!==own.prefix||!operation.operationId.startsWith(own.prefix+':operation:'))continue;
  const prior=operationSources.get(operation.operationId);if(prior)prior.rows.push(resource.row_id);else operationSources.set(operation.operationId,{operation,rows:[resource.row_id]});
 }
 const references=(keys:readonly string[])=>keys.map(key=>{
  const found=operationSources.get(own.prefix+':operation:'+key);check(found,'EXISTING_SOURCE_OPERATION:'+key);
  return{operationId:found!.operation.operationId,operationTitleRu:found!.operation.operationTitleRu,
   completionCriterionRu:found!.operation.completionCriterionRu,processOrdinal:found!.operation.processOrdinal,
   whenResourcePresent:[...new Set(found!.rows)]};
 });
 const scopeFacts=[...facts.map(fact=>id(fact.key)),...unknown.map(entry=>id(entry.key+'_required_count'))];
 const ordinary:AutomaticParameterSpec[]=[...facts.map(fact=>({id:id(fact.key),title:fact.title,valueType:'text' as const,unitId:null,kind:'ordinary' as const})),
  ...unknown.map(entry=>({id:id(entry.key+'_required_count'),title:'Требуемое количество по привязанной ведомости: '+entry.title,valueType:'integer' as const,unitId:'piece',kind:'ordinary' as const,min:1}))];
 const rows:AutomaticRowSpec[]=[...fresh.map(entry=>({rowId:entry.ownerRowId,formulaId:row('formula:'+entry.key),section:'Собственный полный исходный комплект газобетонной кладки',title:entry.title,category:'equipment',unitId:entry.unitId,
  expression:entry.quantity??id(entry.key+'_required_count'),...(entry.currentPpeProofRequired?{inputParameterIds:[id('actual-current-safety-ref')]}:{}),costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
  {rowId:row('actual-kit-scope'),formulaId:row('formula:actual-kit-scope'),section:'Фактическое обеспечение газобетонной кладки',title:'Совместимость и полное фактическое обеспечение исходного комплекта',category:'service',unitId:'set',expression:'0',inputParameterIds:scopeFacts,costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
  {rowId:row('whole-kit-coverage'),formulaId:row('formula:whole-kit-coverage'),section:'Сохранность цельного исходного комплекта',title:'Сохранность всех применимых позиций исходного комплекта',category:'service',unitId:'set',expression:'0',costTreatment:'INFORMATIONAL_SCOPE',procurement:false}];
 const part=buildAutomaticConstructionOwnerR1({contract:MASONRY_AAC_OWN_WHOLE_KIT_R4,semanticOwner:own.prefix,sourceId:own.sourceId,normId:'TNKSN_RK_8.07-06-2019_TABLE8_WHOLE_SOURCE_BRIGADE_KIT_NOT_CONSUMPTION',
  sourceMetadata:{source_title:'Собственный полный исходный комплект газобетонной кладки',source_document_version:'Kazakhstan2019; same captured source; table8 PDF41–43',definition_hash:own.source.sha256,artifact_sha256:own.source.sha256,exact_locator:'PDF41–43, table8 lines1–41; no numerical count in lines35–41'},
  applicabilityRu:'Тот же собственный способ стены250мм, первая подача готового раствора целой принятой схемой. Исходный запас не становится расходом, фактическим наличием, новым заказом или подтверждением действующих средств защиты. Новых геометрических и ресурсных вопросов в обычной форме нет.',ordinary,profile:[],conditional:[],rows,deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['No count inferred from brigade label','No extra crane, shovel, trowel, caliper or mortar box','Table8single box does not replace whole three-box flow','No second glue-preparation or cutting labour','No MBS work-envelope dependency for own manual saw','No current PPE approval from historical source standards','No scaffold maker BOM or glue vessel inferred','No actual stock, norm consumption, new procurement or full acceptance']});
 const result=structuredClone(parent),oldParameterIds=new Set(parent.parameters.map(parameter=>parameter.parameter_id));
 for(const parameter of part.parameters){
  const quantity=unknown.find(entry=>id(entry.key+'_required_count')===parameter.parameter_id),fact=facts.find(fact=>id(fact.key)===parameter.parameter_id);
  check(quantity||fact,'DECLARED_APPLICATION_FACT');const role=quantity?'ENGINEERING_DESIGN':fact!.role;
  const constraints=parameter.constraints_json??{},provenance=parameter.truth_metadata.provenance??{},guide=parameter.truth_metadata.guide;
  if(!record(constraints)||!record(provenance)||!record(guide))throw Error('AAC_OWN_WHOLE_KIT_R4_GENERATED_PARAMETER_RECORD');
  const{requiredWhen:_required,...remaining}=constraints;
  result.parameters.push({...decl(parameter),ordinal:result.parameters.length,required:false,default_value:null,constraints_json:remaining,truth_metadata:{...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',visible_when:{kind:'literal',value:false},value_source_role:role,source_confirmation_required:true,runtime_profile_value:false,hidden_default_forbidden:true,provenance:{...provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',input_channel_v1:'BOUND_ACTUAL_OBJECT_RECORD_NOT_CONSUMER_QUESTION'},guide:{...guide,guide_kind:'PROJECT_DEFINED',source_role:role,guide_short_ru:quantity?'Источник сообщает только «на бригаду». Число не угадывается по составу звена и не является числовой нормой. Приложение использует отдельную привязанную ведомость требуемой защиты объекта.':'Отдельная привязанная запись фактического объекта; исходный комплект не подтверждает наличие, паспорта, доступ и действующую защиту.'}}});
 }
 for(const formula of part.formulas)result.formulas.push({...decl(formula),ordinal:result.formulas.length});
 for(const resource of part.resources){
  const entry=fresh.find(entry=>entry.ownerRowId===resource.row_id),scope=resource.row_id===row('actual-kit-scope'),coverage=resource.row_id===row('whole-kit-coverage');
  const uses=entry?references(entry.operations):[{operationId:row('operation:'+(scope?'actual-kit-scope':'whole-kit-coverage')),operationTitleRu:resource.title_ru,completionCriterionRu:'Исходный полный комплект сопоставлен с реальной ведомостью, паспортами, доступом и действующей защитой.',processOrdinal:0}];
  result.resources.push(rehash({...decl(resource),ordinal:result.resources.length,inclusion_ast:active,resource_graph:{...resource.resource_graph,
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:own.prefix,groupTitleRu:own.titleRu,...uses[0],additionalOperations:uses.slice(1)},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,specificationRu:entry?.number===5?'220В; корзинчатая насадка; до300об/мин':entry?.number===11?'Ручная распиловка газобетонных блоков':null,detailsRu:[]},
   ...(scope?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:row('actual-kit-scope'),groupTitleRu:'Фактическое обеспечение исходного комплекта',titleRu:resource.title_ru,reasonRu:'Полный перечень источника не доказывает требуемое число средств защиты, фактические паспорта, наличие, совместимость доступа и грузозахватов. Эти потребности нельзя закрыть выбором технологии, ручным нулём или ссылкой на старый стандарт.',exactScopeWhen:active,sourceEvidence:[{...own.source,locator:'PDF41–43 table8 entire41lines; actual readiness separate'}],coveringRowIds:source.map(entry=>entry.ownerRowId),originalRowIds:[main!.row_id,machine!.row_id],objectFactParameterId:id('actual-inventory-ref'),unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:scopeFacts}}:coverage?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:row('whole-kit-coverage'),groupTitleRu:'Сохранность цельного исходного комплекта',titleRu:resource.title_ru,reasonRu:'Пять прежних владельцев и все новые исходные позиции составляют один перечень. Их физическое исключение не может оставить отметку о полном обеспечении; новая оплата не создаётся.',exactScopeWhen:active,sourceEvidence:[{...own.source,locator:'PDF41–43 table8 all41lines; selected whole three-box source method retained'}],coveringRowIds:source.map(entry=>entry.ownerRowId),originalRowIds:[main!.row_id,machine!.row_id],costExclusionBreaksScopeV1:true}}:{}),
  },source_metadata:{...resource.source_metadata,sourceCountry:'Kazakhstan',sourceEdition:'2019',sourceTable8Number:entry?.number??null,sourceLiteralQuantity:entry?.quantity??null,sourceQuantityText:entry?.quantity===null?'На бригаду':entry?.quantity??null,sourceInventoryNotConsumption:entry!==undefined,sourceCountIsNotActualAvailability:true,sourceSpecificationInternal:entry?.specification??null,sourceQuantityIsNotNewNorm:true,initialProcurementHeld:true,automaticGenericPriceInheritanceAllowed:false,
   existingFinancialOwnerRowIds:entry?.number===5?[machine!.row_id,main!.row_id]:entry?.number===11?[main!.row_id]:[],newPaidOwner:false,newProcurementOwner:false,closedParentNeeds:0,fullTechnicalAcceptance:false}}));
 }
 // Share the existing exact physical owners; never allocate the table stock
 // into another row or change the accepted whole method's three-box quantity.
 for(const entry of source.filter(entry=>entry.alias)){
  const index=result.resources.findIndex(resource=>resource.row_id===entry.ownerRowId),resource=result.resources[index]!,primary=canonicalEstimateOperationReference(resource.resource_graph.operationCompositionV1);
  check(primary?.groupId===own.prefix,'EXISTING_OWN_GROUP');if(!primary)throw Error('AAC_OWN_WHOLE_KIT_R4_PRIMARY_REQUIRED');
  const related=[...(primary.additionalOperations??[]),...references(entry.operations)].filter((reference,index,array)=>reference.operationId!==primary.operationId&&array.findIndex(prior=>prior.operationId===reference.operationId)===index);
  result.resources[index]=rehash({...resource,resource_graph:{...resource.resource_graph,operationCompositionV1:{...primary,additionalOperations:related},ownKzTable8AliasV1:{contract:MASONRY_AAC_OWN_WHOLE_KIT_R4,tableLine:entry.number,sourceTableCount:entry.quantity,existingSelectedMethodCount:entry.selectedMethodCount,doNotSum:true,primaryOwnerPreserved:true,sourceTableCountIsNotActualAvailability:true,sourceSpecificationInternal:entry.specification,...(entry.number===1?{sourceNominalCraneCapacityT:'10',actualCapacityCompatibilityConfirmed:false,sourceCraneCapacityIsNotExistingEquipmentPassport:true,oldMachineHourNormsNotTransferred:true}:{})}}});
 }
 check(same(parent.formulas,result.formulas.slice(0,parent.formulas.length))&&same(parent.bindings,result.bindings),'EXISTING_FORMULAS_AND_BINDINGS_UNCHANGED');
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!oldParameterIds.has(key))result.baseline.normative_source_ids[key]=[own.sourceId];}
 result.passport.decision.independentCompletenessMap.entries.push(...masonryAacOwnWholeKitCompletenessEntriesR4());
 result.definition.applicability={...result.definition.applicability,masonryAacOwnWholeKitR4:{contract:MASONRY_AAC_OWN_WHOLE_KIT_R4,sourceTableLines:41,reusedPhysicalOwners:5,addedInformationalOwners:36,unquantifiedSourceBrigadeLines:7,ownManualSawNoMbsDependency:true,ownDrillMaximumRpm:300,ordinaryInputsAdded:0,newPaidOwners:0,newProcurementOwners:0,wholeTechnicalAcceptance:false}};
 result.passport.decision={...result.passport.decision,completeTechnicalEstimateAccepted:false,masonryAacOwnWholeKitR4:{sourceWholeTableUsed:true,actualSiteAndProtectionUnconfirmed:true,existingWholeNeedsRemainOpen:true,closedParentNeeds:0,newPaidOwners:0,newProcurementOwners:0,full:0}};
 return result;
}
