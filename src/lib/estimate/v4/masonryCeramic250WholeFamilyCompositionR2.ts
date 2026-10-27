import source from '../../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-whole-family-composition-r2.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {buildMasonryM50CycleSuccessorR2,masonryM50CycleIdR2,MASONRY_M50_WHOLE_CYCLE_R2 as supply,compileMasonryM50CycleR2} from './masonryReadyM50WholeSupplyCycleR2';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

type Json=Record<string,any>;
const pack=source as Json;
const clone=<T,>(value:T):T=>structuredClone(value);
const check=(value:unknown,code:string):void=>{if(!value)throw Error('MASONRY_CERAMIC250_WHOLE_FAMILY_R2_'+code);};
const declaration=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
const rehash=(value:Json):Json=>{const {row_sha256:_old,...body}=value;return {...body,row_sha256:hash(body)};};
const selected=(parameterId:string,value:string)=>({kind:'selected',parameterId,value});
const and=(...operands:Json[])=>({kind:'and',operands});
export const MASONRY_CERAMIC250_WHOLE_FAMILY_COMPOSITION_R2=source;
export const masonryCeramic250FamilyIdR2=(key:string)=>'mcf2_'+key.replaceAll('-','_');
export const masonryCeramic250FamilyRowR2=(key:string)=>pack.prefix+':'+key;
const id=masonryCeramic250FamilyIdR2,row=masonryCeramic250FamilyRowR2;
const wall='(m33_masonry_wall_length_m*m33_masonry_wall_height_m-m33_masonry_openings_area_m2)*0.25-m33_masonry_nonmasonry_insert_volume_m3';
const positive={kind:'formula_greater_than',expression:wall,unitId:'m3',value:0};
const active=and(selected(supply.parentSelector,supply.parentSelectedValue),selected(supply.selectorId,supply.selectorValue),selected(pack.selectorId,pack.selectorValue),positive);

/** Frozen source composition. It does not certify a project or erase a parent's
 * outstanding needs. Physical inventory and normative expenditure stay distinct. */
export function assertMasonryCeramic250FamilySourceR2():void{
 check(pack.parent.definitionId==='9e2b5498-7b4d-5f82-ace7-6c6b822b4ef8'&&pack.parent.version===9&&pack.parent.definitionSha256==='f72f853aaffcab2b21cf172e7a3371dbe80a378a8f74b2b427d255c775166c6b','EXACT_PARENT');
 check(pack.stock.length===29&&pack.stock.find((item:Json)=>item.key==='receiving-box')?.quantity==='10'&&pack.stock.find((item:Json)=>item.key==='masonry-line')?.quantity==='300','WHOLE_BRIGADE_STOCK');
 check(pack.panelProduct.sourceSha256==='63d78c98d0e7b55e148e812633d28e396f4b8a08473eb4cf0374857762a97ed1','EXACT_PANEL_ORIGINAL');
 check(pack.panelProduct.perCompletePanel.map((item:Json)=>[item.key,item.quantity,item.unitId].join('|')).join(';')==='panel-support|2|piece;panel-deck|1|piece;panel-insert|4|piece;panel-pin|4|set;panel-stud|20|piece;panel-bracket|4|piece;panel-suspension|2|piece;panel-nut|40|piece;panel-washer|40|piece','WHOLE_PANEL_BOM');
 check(pack.panelProduct.perCompletePanel.find((item:Json)=>item.key==='panel-deck').separateSupply===true,'DECK_NOT_HIDDEN');
 check(pack.boundary.full===0&&pack.boundary.parentNeedsClosed===0&&pack.boundary.newPaidOwners===0&&pack.boundary.newProcurementOwners===0&&pack.boundary.wholeFamilyReady===false,'NO_FALSE_FAMILY_ACCEPTANCE');
}

function buildPart(parent:Rep){
 assertMasonryCeramic250FamilySourceR2();
 const externalIds=[...supply.geometryIds,supply.parentSelector,supply.selectorId,masonryM50CycleIdR2('density_kg_m3')];
 const external=externalIds.map(parameterId=>{
  const found=parent.parameters.find(parameter=>parameter.parameter_id===parameterId);check(found,'EXTERNAL_INPUT:'+parameterId);
  return {id:parameterId,title:found!.title_ru,valueType:found!.value_type,unitId:found!.unit_id,kind:'ordinary',...(found!.constraints_json?.values?{values:found!.constraints_json.values}:{}),...(found!.constraints_json?.min==null?{}:{min:found!.constraints_json.min})} as AutomaticParameterSpec;
 });
 const ordinary:AutomaticParameterSpec[]=[...external,{id:pack.selectorId,title:'Комплект организации кирпичной кладки',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.noValue,pack.selectorValue]},
  ...pack.records.map((record:Json)=>({id:id(record.key+'_reference'),title:record.titleRu,valueType:'text',unitId:null,kind:'ordinary'} as AutomaticParameterSpec)),
  ...pack.measurements.map((record:Json)=>({id:id(record.key),title:record.titleRu,valueType:record.integer?'integer':'decimal',unitId:record.unitId,kind:'ordinary',min:record.min} as AutomaticParameterSpec))];
 const records=pack.records.map((record:Json)=>id(record.key+'_reference'));
 const measurements=pack.measurements.map((record:Json)=>id(record.key));
 const spec=(key:string,title:string,category:string,unitId:string,expression:string,inputParameterIds:string[]):AutomaticRowSpec=>({rowId:row(key),formulaId:row('formula:'+key),section:pack.titleRu,title,category,unitId,expression,inputParameterIds,costTreatment:'INFORMATIONAL_SCOPE',procurement:false});
 const rows:AutomaticRowSpec[]=[
  ...pack.stock.map((item:Json)=>spec(item.key,item.titleRu,item.category,item.unitId,item.quantity,records)),
  ...pack.panelProduct.perCompletePanel.map((item:Json)=>spec(item.key,item.titleRu,'equipment',item.unitId,'('+item.quantity+')*'+id('panel_count'),[id('panel_count'),id('panel-layout_reference'),id('panel-lifting_reference')])),
  ...pack.operationKeys.map((key:string)=>spec('operation:'+key,({
   'prepare-front':'Подготовка рабочего фронта кирпичной кладки',access:'Устройство и перемещение полного доступа для кладки','receive-front':'Приём готового раствора на рабочем фронте','lay-and-fit':'Кладка и ручная подгонка кирпича',control:'Операционный контроль и приёмка кирпичной кладки','clean-return':'Очистка, возврат инвентаря и сбор отходов кладки'
  } as Record<string,string>)[key],'work','m3',wall,[...records,...measurements]))];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:'KG08-02-001-07; VPTI1985 complete brigade stock; maker PK TU2013',
  sourceMetadata:{source_title:pack.titleRu,source_document_version:'KG2015/VPTI1985/TU2013; exact source editions retained independently',definition_hash:pack.sources.find((value:Json)=>value.id==='vpti1985').sha256,artifact_sha256:pack.sources.find((value:Json)=>value.id==='vpti1985').sha256,exact_locator:'VPTI1985 masonry whole brigade inventory and figure7(a); PK passport PDF2 complete supply'},
  applicabilityRu:'Исходный комплект на восемь каменщиков и полный состав панельных подмостей связываются с последовательным циклом готового М50. Это отдельная композиция существующей внутренней кирпичной стены 250 мм, без новых финансовых норм, закрытия старых потребностей и объявления FULL. Реальный ППР должен раскрывать полный доступ, захваты, ограждения, СИЗ и смежные работы.',
  ordinary,profile:[],conditional:[],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.boundary.notAllowed});
 const excess=(expression:string,unitId:string)=>and(active,{kind:'formula_greater_than',expression,unitId,value:0});
 const parameters=built.parameters.map(parameter=>{
  if(externalIds.includes(parameter.parameter_id))return parameter;
  const selector=parameter.parameter_id===pack.selectorId;
  const forbidden=selector?and(selected(pack.selectorId,pack.selectorValue),{kind:'or',operands:[{kind:'not',operand:selected(supply.parentSelector,supply.parentSelectedValue)},{kind:'not',operand:selected(supply.selectorId,supply.selectorValue)}]}):
   parameter.parameter_id===id('whole-adaptation_reference')?excess('m33_masonry_storey_height_m-'+pack.maximumStoreyHeightM,'m'):
   parameter.parameter_id===id('actual_ppr_served_height_m')?excess('m33_masonry_wall_height_m-'+id('actual_ppr_served_height_m'),'m'):
   parameter.parameter_id===id('receiver_payload_kg')?excess('0.1*'+masonryM50CycleIdR2('density_kg_m3')+'-'+id('receiver_payload_kg'),'kg'):
   parameter.parameter_id===id('panel_handler_allowable_kg')?excess('740+'+id('panel_extra_lifted_mass_kg')+'-'+id('panel_handler_allowable_kg'),'kg'):
   parameter.parameter_id===id('panel_crane_available_kg')?excess('740+'+id('panel_extra_lifted_mass_kg')+'+'+id('panel_handler_mass_kg')+'-'+id('panel_crane_available_kg'),'kg'):
   parameter.parameter_id===id('actual_panel_loaded_kg_m2')?excess(id('actual_panel_loaded_kg_m2')+'-400','kg/m2'):undefined;
  return {...parameter,required:false,default_value:null,constraints_json:{...parameter.constraints_json,...(!selector?{requiredWhen:active}:{}),...(forbidden?{forbiddenWhen:forbidden}:{})},truth_metadata:{...parameter.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,preliminary_compilation_allowed:true,visible_when:selector?selected(supply.parentSelector,supply.parentSelectedValue):active,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(parameter.truth_metadata.guide as Json),guide_kind:'PROJECT_DEFINED',source_role:selector?'DECLARED_WORK_SCOPE':'ACTUAL_PROJECT_DOCUMENT_OR_EQUIPMENT_MEASUREMENT',source_document:selector?pack.sourceId:'ACTUAL_MASONRY_PROJECT_PPR_FULL_PRODUCT_BOM_AND_RECORD',guide_short_ru:selector?'Целая композиция исходного рабочего комплекта; выбор не подтверждает объектный ППР и не закрывает всё семейство.':'Точный документ или измеряемое свойство объекта. Количество панелей задаётся ведомостью ППР, а детали каждой панели — первичным паспортом. Это не коэффициент расхода из объёма стены.'}}};
 });
 const resources=built.resources.map(resource=>{
  const key=resource.row_id.slice(pack.prefix.length+1),stock=pack.stock.find((value:Json)=>value.key===key),panel=pack.panelProduct.perCompletePanel.find((value:Json)=>value.key===key),marker=key.startsWith('operation:');
  const keys:string[]=stock?.operationKeys??[panel?'access':marker?key.slice('operation:'.length):'prepare-front'];
  const operations=keys.map((operationKey:string)=>({operationId:row('operation:'+operationKey),operationTitleRu:rows.find(value=>value.rowId===row('operation:'+operationKey))!.title,processOrdinal:pack.operationKeys.indexOf(operationKey)+1,completionCriterionRu:'Применимые операции и все фактические ресурсы раскрываются собственными источниками и объектными ведомостями. Источниковый запас сам по себе не равен полному обеспечению.'}));
  return rehash({...resource,inclusion_ast:active,resource_graph:{...resource.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.titleRu,...operations[0],...(operations.length>1?{additionalOperations:operations.slice(1)}:{})},publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[]}},source_metadata:{...resource.source_metadata,sourceRole:stock?'WHOLE_EIGHT_MASON_BRIGADE_SOURCE_STOCK':panel?'COMPLETE_PANEL_MAKER_BOM_MULTIPLIED_BY_ACTUAL_PPR_STOCK':'WHOLE_BRANCH_OPERATION_SCOPE',sourceLiteralQuantity:stock?.quantity??panel?.quantity??null,quantityBasis:stock?'SOURCE_WHOLE_BRIGADE_STOCK_NOT_PER_M3':panel?'MAKER_COMPONENTS_PER_PANEL_TIMES_ACTUAL_PPR_PANEL_COUNT':'SOURCE_NORM_WALL_VOLUME_SCOPE_NOT_ADDITIONAL_LABOUR',source_artifact_sha256:panel?pack.panelProduct.sourceSha256:pack.sources.find((value:Json)=>value.id==='vpti1985').sha256,sourceInventoryNotConsumption:!!(stock||panel),sourceIdentityInternal:stock?.sourceIdentity??null,sourceLimitInternal:stock?.limit??null,historicalProtectionStockIsNotCurrentCompletePpe:stock?.historicalProtectionStockIsNotCurrentCompletePpe??false,deckSeparatelySupplied:panel?.separateSupply??false,initialProcurementHeld:true,automaticGenericPriceInheritanceAllowed:false,closedParentNeeds:0,newPaidOwner:false,newProcurementOwner:false,full_technical_acceptance:false,actualExecutionAccepted:false}});
 });
 return {...built,parameters,resources,externalIds};
}

/** Existing exact brick parent -> ready-M50 whole flow -> whole brigade/access
 * composition. No new engine, publisher or revision migration is introduced. */
export function buildMasonryCeramic250WholeFamilySuccessorR2(parent:Rep):Rep{
 const base=buildMasonryM50CycleSuccessorR2(parent),parentParameterIds=new Set(parent.parameters.map(parameter=>parameter.parameter_id)),parentRowIds=new Set(parent.resources.map(resource=>resource.row_id));
 // The reused complete M50 component is registered as evidence inside this one
 // composite source. Change only these newly authored declarations; a retained
 // parent's registry arrays/metadata are never rebound or rewritten.
 for(const parameter of base.parameters)if(!parentParameterIds.has(parameter.parameter_id)){
  parameter.truth_metadata={...parameter.truth_metadata,componentEvidenceSourceId:supply.sourceId,guide:{...(parameter.truth_metadata.guide as Json),source_document:pack.sourceId}};
  base.baseline.normative_source_ids[parameter.parameter_id]=[pack.sourceId];
 }
 base.resources=base.resources.map(resource=>parentRowIds.has(resource.row_id)?resource:rehash({...resource,source_metadata:{...resource.source_metadata,sourceId:pack.sourceId,source_id:pack.sourceId,componentEvidenceSourceId:supply.sourceId,componentSourceCompositionReusedExactly:true}}) as any);
 const componentMap=base.passport.decision.independentCompletenessMap;
 componentMap.entries=componentMap.entries.map((entry:Json)=>entry.sourceId===supply.sourceId?{...entry,sourceId:pack.sourceId,componentEvidenceSourceId:supply.sourceId}:entry);
 const result=clone(base),part=buildPart(base),oldIds=new Set(base.parameters.map(parameter=>parameter.parameter_id));
 for(const parameter of part.parameters.filter(parameter=>!part.externalIds.includes(parameter.parameter_id)))result.parameters.push({...declaration(parameter),ordinal:result.parameters.length} as any);
 for(const formula of part.formulas)result.formulas.push({...declaration(formula),ordinal:result.formulas.length} as any);
 for(const resource of part.resources)result.resources.push(rehash({...declaration(resource),ordinal:result.resources.length}) as any);
 // Existing operation references share the same resource ID and owner. Each
 // related scope is visible only while its own selected marker is present.
 const operationId=(key:string)=>key.startsWith('m50:')?supply.prefix+':operation:'+key.slice(4):row('operation:'+key.slice(6));
 const operationReference=(key:string)=>{
  const marker=result.resources.find(value=>value.row_id===operationId(key));check(marker,'SHARED_OPERATION_MARKER:'+key);
  const op=marker!.resource_graph.operationCompositionV1 as Json;
  return {operationId:op.operationId,operationTitleRu:op.operationTitleRu,processOrdinal:op.processOrdinal,processRole:'PROCESS',completionCriterionRu:'Общий исходный ресурс используется этой операцией с прежним ID и единственным владельцем оплаты и закупки.',whenResourcePresent:[marker!.row_id]};
 };
 result.resources=result.resources.map(resource=>{
  const shared=pack.sharedRetainedResourceUses.find((use:Json)=>resource.row_id===pack.operationGroup.id+':'+use.rowKey);
  const op=resource.resource_graph.operationCompositionV1 as Json|undefined;
  if(!op)return resource;
  if(!parentRowIds.has(resource.row_id))return rehash({...resource,resource_graph:{...resource.resource_graph,operationCompositionV1:{...op,groupId:pack.operationGroup.id,groupTitleRu:pack.operationGroup.titleRu}}}) as any;
  if(!shared)return resource;
  return rehash({...resource,resource_graph:{...resource.resource_graph,operationCompositionV1:{...op,additionalOperations:[...(op.additionalOperations??[]),...shared.operations.map(operationReference)]}}}) as any;
 });
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!oldIds.has(key))result.baseline.normative_source_ids[key]=[pack.sourceId];}
 result.definition.applicability={...result.definition.applicability,masonryCeramic250WholeFamilyCompositionR2:{contract:pack.contract,selectorId:pack.selectorId,wholeEightMasonKit:true,wholePanelProductBom:true,m50WholeSupplyComponentReused:true,requiresWholeProjectEvidence:true,parentNeedsClosed:0,wholeFamilyReady:false,fullTechnicalAcceptance:false}};
 result.passport.included_scope_ru=[...base.passport.included_scope_ru,'В отдельном профиле: полный исходный комплект на восемь каменщиков, девять видов деталей каждой панели по паспорту и единая цепочка подготовки, готового раствора, кладки, контроля и уборки.'];
 result.passport.excluded_scope_ru=[...base.passport.excluded_scope_ru,'Исходный комплект и паспорт панели не заменяют полный объектный ППР доступа, ограждений, подъёмных комплектов, сертифицированных СИЗ, конструктивных подработ и внешней логистики.'];
 const inherited=base.passport.decision?.independentCompletenessMap as Json|undefined;
 const expected=[...pack.stock.map((item:Json)=>({key:item.key,category:item.category,unitId:item.unitId,title:item.titleRu,operations:item.operationKeys,quantityRule:'SOURCE_WHOLE_EIGHT_MASON_BRIGADE_LITERAL_'+item.quantity})),...pack.panelProduct.perCompletePanel.map((item:Json)=>({key:item.key,category:'equipment',unitId:item.unitId,title:item.titleRu,operations:['access'],quantityRule:'EXACT_MAKER_BOM_'+item.quantity+'_PER_ACTUAL_PPR_PANEL'})),...pack.operationKeys.map((key:string)=>({key:'operation:'+key,category:'work',unitId:'m3',title:part.resources.find(resource=>resource.row_id===row('operation:'+key))!.title_ru,operations:[key],quantityRule:'RETAINED_KG_WALL_SCOPE_NO_EXTRA_HOURS'}))];
 result.passport.decision={...base.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,completeTechnicalEstimateAccepted:false,newFullTechnologies:0,unresolvedResourceRowIds:[...(base.passport.decision?.unresolvedResourceRowIds??[])],masonryCeramic250WholeFamilyCompositionR2:{sourceStockRecords:29,panelBomRecords:9,parentNeedsClosed:0,familyComplete:false,wholeFamilyReady:false,newPaidOwners:0,newProcurementOwners:0},independentCompletenessMap:{...(inherited??{}),contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:pack.sources.find((value:Json)=>value.id==='vpti1985').sha256,evidenceReferences:[...(inherited?.evidenceReferences??[]),...pack.sources.map((value:Json)=>value.path??value.sha256)],entries:[...(inherited?.entries??[]),...expected.map((item:Json)=>({expectedResourceId:row('expected:'+item.key),operationId:row('operation:'+item.operations[0]),requiredOperationIds:item.operations.map((key:string)=>row('operation:'+key)),sourceId:pack.sourceId,category:item.category,unitId:item.unitId,specification:item.title,quantityRule:item.quantityRule,formulaId:row('formula:'+item.key),resolution:{kind:'ROW',rowId:row(item.key)}}))],parentNeedsClosed:0,newFullTechnologies:0,fullTechnicalAcceptance:false,wholeMasonryFamilyStillUnderComposition:true}};
 for(const use of pack.sharedRetainedResourceUses){
  const labour=['labour','operators'].includes(use.rowKey),crane=use.rowKey.startsWith('tower-crane'),brick=use.rowKey.startsWith('brick');
  result.passport.decision.independentCompletenessMap.entries.push({expectedResourceId:row('expected:shared:'+use.rowKey),operationId:operationId(use.operations[0]),requiredOperationIds:use.operations.map(operationId),sourceId:'kg_krer08_2015_masonry_walls_ceramic_aac_systems_r1',category:labour?'labor':crane?'equipment':'material',unitId:labour?'man_hour':crane?'machine_hour':brick?'piece':'m3',specification:'Исходный общий ресурс '+use.rowKey+' с прежним количеством, источником и единственным владельцем',quantityRule:'RETAINED_EXACT_KG_NORM_SHARED_REFERENCE_NOT_ALLOCATED_OR_PAID_AGAIN',formulaId:pack.operationGroup.id+':formula:'+use.rowKey,resolution:{kind:'ROW',rowId:pack.operationGroup.id+':'+use.rowKey}});
 }
 return result;
}

export const compileMasonryCeramic250WholeFamilyR2=compileMasonryM50CycleR2;
