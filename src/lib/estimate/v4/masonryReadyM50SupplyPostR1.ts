import pack from '../../../../data/estimate-benchmarks/source-packs/masonry-ready-m50-supply-post-kt3111176-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileMaster33MasonryR1} from './master33MasonryWallSystemsR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

type Json=Record<string,any>;
const fixture=require('../../../../data/estimate-benchmarks/fixtures/masonry-ready-m50-post-current-parent-r1.json') as {parentFileSha256:string;captures:Json[]};
export const READY_M50_SUPPLY_POST_R1=pack;
export const readyM50PostIdR1=(key:string)=>'m50post_'+key.replaceAll('-','_');
export const readyM50PostRowIdR1=(key:string)=>pack.prefix+':'+key;
const copy=<T,>(v:T):T=>structuredClone(v);
const check=(v:unknown,code:string):void=>{if(!v)throw Error('M50_POST_'+code);};
const rehash=(row:Json):Json=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:hash(body)};};
const decl=(row:Json)=>Object.fromEntries(Object.entries(row).filter(([k])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(k)));
const selected=(parameterId:string,value:string)=>({kind:'selected',parameterId,value});
const wallVolume='(m33_masonry_wall_length_m*m33_masonry_wall_height_m-m33_masonry_openings_area_m2)*0.25-m33_masonry_nonmasonry_insert_volume_m3';
const mortarVolume='('+wallVolume+')*0.234';
const active={kind:'and',operands:[selected(pack.selectorId,pack.selectorValue),selected(pack.parentSelector,pack.parentSelectedValue),{kind:'formula_greater_than',expression:wallVolume,unitId:'m3',value:0}]};

/** Four source-known roster counts are distinct from product/site/supply admission.
 * This historical author method never becomes a current KG regulatory norm. */
export function assertReadyM50PostSourceR1(p:typeof pack=pack){
 check(p.source.sha256==='fac02f9833c4844770519dc8560ec579b118e9b665f920cebf5cf38e4434fc28'&&p.normId==='КТ3.1-1.11-76','EXACT_SOURCE_REQUIRED');
 check(p.wholeOrganization.sequentialPosts==='1'&&!p.wholeOrganization.parallelPostsAllowed&&p.wholeOrganization.twoTubsLoadedTogether&&p.wholeOrganization.oneTubLiftedAtATime&&!p.wholeOrganization.preliminaryRemixing,'EXACT_WHOLE_SERIAL_ORGANIZATION_REQUIRED');
 check(p.roster.map(r=>[r.key,r.quantity,r.unitId].join('|')).join(';')==='rotating-tubs|3|piece;steel-boxes|4|piece;shovels|2|piece;rigger-crew|2|person','LITERAL_COUNT_AND_UNIT_REQUIRED');
 check(p.roster[0]!.drawingInternal==='1062'&&p.roster[1]!.drawingInternal==='1107'&&p.roster[0]!.capacityM3==='0.8'&&p.roster[1]!.capacityM3==='0.27','SOURCE_PRODUCT_REFERENCES_REQUIRED');
 check(p.wholeOrganization.crew.map(r=>[r.grade,r.quantity,r.unitId].join('|')).join(';')==='II|1|person;IV|1|person','EXACT_CREW_HEADCOUNT_NOT_HOURS');
 check(p.full===0&&p.closedNeeds===0&&p.newlyQuantifiedRosterCategories===4&&p.sourceLiteratureReferenceOnly.notUsedInAnyFormula,'HONEST_PARTIAL_REQUIRED');
}
export function readyM50PostCaptureR1(){return copy(fixture.captures[0]!) as Json;}
export function readyM50PostCapturedRepresentativeR1():Rep{
 const c=readyM50PostCaptureR1(),ids=new Map(c.resources.map((r:Json)=>[r.id,r.row_id]));
 return{definition:c.definition,baseline:c.baseline,parameters:c.parameters,formulas:c.formulas,resources:c.resources,passport:c.contentPassport,bindings:c.bindings.map((b:Json)=>({row_id:ids.get(b.resource_spec_id),locator_id:b.locator_id,applicability:b.applicability}))};
}
/** Uses the existing automatic owner. No new labour, crane or purchasing owner. */
function buildPostPart(parent:Rep){
 assertReadyM50PostSourceR1();
 const externalIds=[...pack.geometryIds,pack.parentSelector],external=externalIds.map(id=>{const q=parent.parameters.find(q=>q.parameter_id===id);check(q,'PARENT_GEOMETRY_AND_METHOD_REQUIRED:'+id);return{id,title:q!.title_ru,valueType:q!.value_type,unitId:q!.unit_id,kind:'ordinary',...(q!.constraints_json?.values?{values:q!.constraints_json.values}:{}),...(q!.constraints_json?.min==null?{}:{min:q!.constraints_json.min})} as AutomaticParameterSpec;});
 const project=[...pack.projectFacts,{key:'stock-record',titleRu:'Ведомость наличия и состояния совместимого инвентаря'}];
 const ordinary:AutomaticParameterSpec[]=[...external,{id:pack.selectorId,title:'Способ подачи готового раствора',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.noPostValue,pack.selectorValue]},...project.map(p=>({id:readyM50PostIdR1(p.key+'_reference'),title:p.titleRu,valueType:'text' as const,unitId:null,kind:'ordinary' as const})),...pack.stockFacts.map(p=>({id:readyM50PostIdR1('available_'+p.key),title:p.titleRu,valueType:'integer' as const,unitId:'piece',kind:'ordinary' as const,min:0})),...pack.internalGaps.map(g=>({id:readyM50PostIdR1('unresolved_'+g.key),title:g.titleRu,valueType:'decimal' as const,unitId:g.unitId||null,kind:'internal' as const,min:0}))];
 const row=(key:string,title:string,category:string,unitId:string,expression:string,inputParameterIds:string[]=[]):AutomaticRowSpec=>({rowId:readyM50PostRowIdR1(key),formulaId:readyM50PostRowIdR1('formula:'+key),section:pack.titleRu,title,category,unitId,expression,inputParameterIds,costTreatment:'INFORMATIONAL_SCOPE',procurement:false});
 const projectRefs=project.filter(p=>!['price-scope','stock-record'].includes(p.key)).map(p=>readyM50PostIdR1(p.key+'_reference'));
 const specs:AutomaticRowSpec[]=[...pack.roster.map(r=>row(r.key,r.titleRu,r.category,r.unitId,r.quantity)),
  row('project-operation-gate','Подача готового раствора по фактическому ППР','work','m3',mortarVolume,projectRefs),
  row('supply-scope-gate','Обеспечение поста в подтверждённой границе поставки','service','m3',mortarVolume,[readyM50PostIdR1('price-scope_reference'),readyM50PostIdR1('stock-record_reference')]),
  ...pack.stockFacts.map(s=>{const literal=pack.roster.find(r=>r.key===s.key)!;return row('stock-shortfall:'+s.key,'Непокрытая наличием потребность: '+literal.titleRu,literal.category,'piece','max(0,'+literal.quantity+'-'+readyM50PostIdR1('available_'+s.key)+')',[readyM50PostIdR1('stock-record_reference')]);}),
  ...pack.internalGaps.map(g=>row('need:'+g.key,g.titleRu,'service',g.unitId,readyM50PostIdR1('unresolved_'+g.key)))];
 const d=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locator},applicabilityRu:'Один последовательный пост подачи готового М50 без перемешивания; исторический авторский roster. Фактическая техническая применимость, ППР и поставка проверяются отдельно.',ordinary,profile:[],conditional:[],rows:specs,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['Нет универсального комплекта на произвольную стройку или каждый м³.','Нет числа параллельных постов или расхода СИЗ из численности.','Нет дополнительной оплаты0.40чел.-ч/м³ либо машино-часов из графика.','Нет заказа первоначального инвентаря из нормативного наличия.']});
 const parameters=d.parameters.map(q=>{
  const gap=pack.internalGaps.find(g=>q.parameter_id===readyM50PostIdR1('unresolved_'+g.key));
  if(gap)return{...q,required:false,default_value:null,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,gap.missing)};
  if(externalIds.includes(q.parameter_id))return q;
  const selector=q.parameter_id===pack.selectorId;
  return{...q,required:false,default_value:null,constraints_json:{...q.constraints_json,...(selector?{forbiddenWhen:{kind:'and',operands:[selected(pack.selectorId,pack.selectorValue),{kind:'not',operand:selected(pack.parentSelector,pack.parentSelectedValue)}]}}:{requiredWhen:active})},truth_metadata:{...q.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,preliminary_compilation_allowed:true,visible_when:selector?selected(pack.parentSelector,pack.parentSelectedValue):active,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(q.truth_metadata.guide as Json),guide_kind:'PROJECT_DEFINED',source_role:selector?'DECLARED_WORK_SCOPE':'PROJECT_DOCUMENTATION',source_document:selector?pack.sourceId:'ACTUAL_OBJECT_PPR_INVENTORY_SUPPLY_DOCUMENTATION',source_snapshot_hash:pack.source.sha256,guide_short_ru:selector?'Выбор отдельной последовательной технологии не подтверждает её техническую применимость или готовность объекта.':q.title_ru+': фактический документ или наличие объекта; это не подтверждение неизвестной нормы.'}}};
 });
 const resources=d.resources.map(r=>{
  const key=r.row_id.slice(pack.prefix.length+1),literal=pack.roster.find(x=>x.key===key),gap=pack.internalGaps.find(x=>key==='need:'+x.key),shortfall=key.startsWith('stock-shortfall:');
  return rehash({...r,inclusion_ast:active,resource_graph:{...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.titleRu,operationId:pack.prefix+':operation:'+(gap?gap.key:shortfall?'supply-stock':key.endsWith('-gate')?key:'source-roster'),operationTitleRu:gap?.titleRu??(shortfall?'Проверить фактическое наличие инвентаря':pack.titleRu),processOrdinal:gap?80:shortfall?50:20,completionCriterionRu:'Известный состав источника показан отдельно от технического допуска, фактического ППР и поставки.'}},source_metadata:{...r.source_metadata,sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':literal?'HISTORICAL_AUTHOR_SOURCE_KNOWN_PHYSICAL_ROSTER':shortfall?'ACTUAL_STOCK_SHORTFALL_INFORMATION_ONLY':'ACTUAL_PROJECT_OR_SUPPLY_GATE',source_artifact_sha256:pack.source.sha256,exact_locator:literal?.locator??pack.source.locator,sourceUnit:literal?.unitId??null,sourceLiteralCount:literal?.quantity??null,sourceQuantityKnown:!!literal,sourceInventoryNotConsumption:!!literal,sourceOrganizationPosts:1,parallelPostsNotAdmitted:true,currentKgRegulatoryAdmission:false,automaticGenericPriceInheritanceAllowed:false,initialProcurementHeld:true,projectSourceAndSupplyGatesRemain:true,closedPhysicalNeed:false,full_technical_acceptance:false,...(literal?{drawingReferenceInternal:(literal as Json).drawingInternal??null,sourceCrewRoleDetails:literal.key==='rigger-crew'?pack.wholeOrganization.crew:null,headcountNotLabourHours:literal.key==='rigger-crew'}:{}),...(gap?{normativeTrace:[],normative_source_ids:[],gapKind:gap.gapKind,missingSource:gap.missing}:{}),...(shortfall?{shortfallIsNotPurchaseQuantity:true,governedPurchaseBalanceStillRequired:true}:{}),existingPaidOwnersOnly:['masonry:wall:krer08-02-001-07:labour','masonry:wall:krer08-02-001-08:labour','masonry:wall:krer08-02-001-07:tower-crane-own','masonry:wall:krer08-02-001-07:tower-crane-hired','masonry:wall:krer08-02-001-08:tower-crane-own','masonry:wall:krer08-02-001-08:tower-crane-hired']}});
 });
 return{...d,parameters,resources,externalIds};
}

/** Append a bounded internal method to the existing card. Every parent formula,
 * source row, inclusion AST, baseline value and payment owner is retained. */
export function buildReadyM50PostRetainedSuccessorR1(parent:Rep):Rep{
 const frozen=readyM50PostCapturedRepresentativeR1();
 check(parent.definition.catalog_id===pack.catalogId&&parent.definition.id===pack.currentDefinitionId&&parent.definition.definition_sha256===pack.currentDefinitionSha256,'EXACT_CURRENT_PARENT_REQUIRED');
 check(hash([parent.parameters,parent.formulas,parent.resources])===hash([frozen.parameters,frozen.formulas,frozen.resources]),'EXACT_PARENT_COMPUTATION_REQUIRED');
 const result=copy(parent),part=buildPostPart(parent),oldIds=new Set(parent.parameters.map(p=>p.parameter_id));
 for(const p of part.parameters.filter(p=>!part.externalIds.includes(p.parameter_id)))result.parameters.push({...decl(p),ordinal:result.parameters.length} as any);
 for(const f of part.formulas)result.formulas.push({...decl(f),ordinal:result.formulas.length} as any);
 for(const r of part.resources)result.resources.push(rehash({...decl(r),ordinal:result.resources.length}) as any);
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;if(!oldIds.has(id))result.baseline.normative_source_ids[id]=p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[pack.sourceId];}
 result.definition.applicability={...result.definition.applicability,readyM50SerialPostR1:{contract:pack.contract,selectorId:pack.selectorId,oneSequentialSourcePost:true,newlyQuantifiedRosterCategories:4,closedPhysicalNeeds:0,allNewRowsInformational:true,initialInventoryPurchaseHeld:true,fullTechnicalAcceptance:false}};
 const oldNeeds=parent.passport.decision?.unresolvedResourceRowIds??[],newNeeds=part.resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id);
 result.passport.included_scope_ru=[...parent.passport.included_scope_ru,'В явно выбранном отдельном профиле: известный состав одного последовательного поста подачи готового раствора; техническая применимость, фактическое обеспечение и выполнение остаются отдельными проверками.'];
 result.passport.excluded_scope_ru=[...parent.passport.excluded_scope_ru,'Первоначальная покупка инвентаря, дополнительные часы такелажников/крана и подтверждение фактического подъёма из исторического roster не следуют.'];
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,completeTechnicalEstimateAccepted:false,newFullTechnologies:0,unresolvedResourceRowIds:[...new Set([...oldNeeds,...newNeeds])],readyM50Post:{newlyQuantifiedRosterCategories:4,closedPhysicalNeeds:0,knownCounts:[3,4,2,2],initialSupplyReady:false,personUnitDependency:pack.sharedDependency.key},independentCompletenessMap:readyM50PostCompletenessR1(parent)};
 result.passport.capability_matrix=[...(result.passport.capability_matrix??[]).filter((x:Json)=>x.capability!=='FULL_APPLICABLE_SCOPE'),{capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:result.passport.decision.unresolvedResourceRowIds}];
 return result;
}
export function readyM50PostCompletenessR1(parent:Rep=readyM50PostCapturedRepresentativeR1()){
 const operation=(key:string)=>pack.prefix+':operation:'+key;
 const additional=[...pack.roster.map(r=>({key:r.key,rowId:readyM50PostRowIdR1(r.key),formulaId:readyM50PostRowIdR1('formula:'+r.key),unitId:r.unitId,category:r.category,title:r.titleRu,operation:'source-roster',rule:'KNOWN_LITERAL_COUNT_ONE_SERIAL_SOURCE_POST_NOT_CLOSED_NEED'})),...pack.internalGaps.map(g=>({key:g.key,rowId:readyM50PostRowIdR1('need:'+g.key),formulaId:readyM50PostRowIdR1('formula:need:'+g.key),unitId:g.unitId,category:'service',title:g.titleRu,operation:g.key,rule:g.gapKind})),...(['project-operation-gate','supply-scope-gate'] as const).map(key=>({key,rowId:readyM50PostRowIdR1(key),formulaId:readyM50PostRowIdR1('formula:'+key),unitId:'m3',category:key==='project-operation-gate'?'work':'service',title:key==='project-operation-gate'?'Фактическое проектное обеспечение подачи':'Граница фактического обеспечения и поставки',operation:key,rule:'ACTUAL_PROJECT_RECORDS_NOT_SOURCE_NORM_CONFIRMATION'})),...pack.stockFacts.map(s=>({key:'stock-shortfall:'+s.key,rowId:readyM50PostRowIdR1('stock-shortfall:'+s.key),formulaId:readyM50PostRowIdR1('formula:stock-shortfall:'+s.key),unitId:'piece',category:pack.roster.find(r=>r.key===s.key)!.category,title:s.titleRu,operation:'supply-stock',rule:'ACTUAL_AVAILABLE_STOCK_SHORTFALL_INFO_NOT_INITIAL_PURCHASE'}))].map(x=>({expectedResourceId:pack.prefix+':expected:'+x.key,operationId:operation(x.operation),requiredOperationIds:[operation(x.operation)],sourceId:pack.sourceId,category:x.category,unitId:x.unitId||null,condition:pack.selectorValue,specification:x.title,quantityRule:x.rule,formulaId:x.formulaId,resolution:{kind:'ROW',rowId:x.rowId}}));
 const inherited=parent.passport.decision?.independentCompletenessMap as Json|undefined;
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:pack.source.sha256,evidenceReferences:[...new Set([...(inherited?.evidenceReferences??[]),pack.source.path])],entries:[...(inherited?.entries??[]),...additional],fullTechnicalAcceptance:false,newFullTechnologies:0,newlyQuantifiedRosterCategories:4,closedPhysicalNeeds:0,parentWholeMasonryBoundaryRetained:true};
}
export function compileReadyM50PostR1(model:Rep,input:Record<string,unknown>,options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']}={}){return compileMaster33MasonryR1(model,input,options);}
