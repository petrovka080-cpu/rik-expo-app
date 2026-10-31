import proof from '../../../../data/estimate-benchmarks/source-packs/masonry-aac-kz250-whole-first-row-feed-reuse-r4.json';
import {buildMasonryCeramic250EffectiveLiftSuccessorR4,MASONRY_M50_EFFECTIVE_LIFT_R4 as lift,m50LiftIdR4,m50LiftRowR4} from './masonryM50EffectiveLiftCorrectionR4';
import {masonryM50CycleCapturedRepresentativeR2,MASONRY_M50_WHOLE_CYCLE_R2 as flow,masonryM50CycleIdR2 as oldId,masonryM50CycleRowR2 as flowRow,assertMasonryM50CycleSourceR2} from './masonryReadyM50WholeSupplyCycleR2';
import {MASONRY_AAC_KZ250_WHOLE_R4 as own} from './masonryAacKz250WholeCycleR4';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {canonicalEstimateOperationReference,canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import type {CanonicalPublisherJson as Json} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

export const MASONRY_AAC_FIRST_ROW_FEED_REUSE_R4={
 contract:'masonry-aac-kz250-whole-first-row-feed-reuse/r4',
 sourceId:'masonry_aac_kz250_existing_whole_first_row_feed_reuse_r4',
 selectorId:'aackz4_first_row_feed_method',selectorValue:'EXACT_THREE_YAR1_BOXES_025M3',
 mortarOwner:own.prefix+':first_row_mortar',effectiveMortar:'aackz4_effective_first_row_m3',
 scopeRow:own.prefix+':first-row-feed-scope',
 coverageRow:own.prefix+':first-row-feed-coverage',
 physicalRowIds:[...flow.roster.map(item=>flowRow(item.key)),...flow.operations.map(item=>flowRow('operation:'+item.key)),flowRow('returned-mortar'),flowRow('waste-mortar')],
 operationIds:flow.operations.map(item=>flowRow('operation:'+item.key)),
} as const;
const reuse=MASONRY_AAC_FIRST_ROW_FEED_REUSE_R4;
const row=(key:string)=>own.prefix+':'+key;
const selected={kind:'selected',parameterId:own.selectorId,value:own.selectorValue};
const active={kind:'and',operands:[selected,{kind:'selected',parameterId:reuse.selectorId,value:reuse.selectorValue},{kind:'formula_greater_than',expression:'(m33_masonry_wall_length_m*m33_masonry_wall_height_m-m33_masonry_openings_area_m2)*0.25',unitId:'m3',value:0}]};
const check=(value:unknown,code:string):void=>{if(!value)throw Error('AAC_WHOLE_FIRST_ROW_FEED_R4_'+code);};
const decl=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
const rehash=(value:Json):Json=>{const{row_sha256:_old,...body}=value;return{...body,row_sha256:hash(body)};};
const parameters:Readonly<Record<string,string>>={
 [lift.effectiveMortarParameterId]:reuse.effectiveMortar,
 [oldId('density_kg_m3')]:'aackz4_mortar_density_kg_m3',
 [oldId('upper_mass_kg')]:'aackz4_handler_mass_kg',
 [oldId('upper_allowable_kg')]:'aackz4_handler_limit_kg',
 [oldId('crane_available_kg')]:'aackz4_crane_limit_kg',
};
const mapped=(id:string)=>parameters[id]??id;
function formula(value:Json):Json{
 const expression=String(value.expression_source).replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g,token=>mapped(token));
 const compiled=compileFormulaGraph(expression);
 return{...decl(value),expression_source:expression,ast:compiled.ast,input_parameter_ids:[...new Set([...compiled.inputParameterIds,...value.input_parameter_ids.map(mapped)])].sort(),ast_sha256:hash(compiled.ast)};
}
function operation(key:string){
 const source=flow.operations.find(item=>item.key===key);check(source,'DECLARED_OPERATION:'+key);
 return{operationId:flowRow('operation:'+source!.key),operationTitleRu:source!.titleRu,processOrdinal:source!.ordinal,completionCriterionRu:'Проверены точная тара, схема подачи и фактические документы первого ряда; раствор учитывается исходной позицией один раз.'};
}
const references=(keys:readonly string[])=>keys.map(key=>({...operation(key),whenResourcePresent:[flowRow('operation:'+key)]}));
function shareAt(resource:Json,keys:readonly string[]):Json{
 const owner=canonicalEstimateOperationReference(resource.resource_graph.operationCompositionV1);check(owner?.groupId===own.prefix,'OWN_GROUP:'+resource.row_id);
 const inherited=resource.resource_graph.operationCompositionV1 as Json;
 const additions=[...(inherited.additionalOperations??[]),...references(keys)];
 const unique=additions.filter((value,index)=>value.operationId!==owner!.operationId&&additions.findIndex(prior=>prior.operationId===value.operationId)===index);
 return rehash({...resource,resource_graph:{...resource.resource_graph,operationCompositionV1:{...inherited,additionalOperations:unique}}});
}

/** Reuse the accepted whole physical component on its exact original parent,
 * then adapt only the proven fresh-mortar interface to the existing AAC owner.
 * No foreign mortar rate, grade, wage, machine hour or price crosses this edge.
 * The remaining wet-feed labour/plant and complete provision stay unresolved. */
export function applyMasonryAacKz250WholeFirstRowFeedReuseR4(parent:Rep):Rep{
 check(parent.definition.id===own.currentParent.definitionId&&parent.definition.definition_sha256===own.currentParent.definitionSha256,'EXACT_AAC_PARENT');
 check(parent.definition.applicability.masonryAacKz250CurrentCardR4?.selectorValue===own.selectorValue,'CURRENT_AAC_PROFILE_REQUIRED');
 assertMasonryM50CycleSourceR2();
 check(flow.source.sha256===lift.makerEvidence.sha256&&flow.methodSource.sha256===own.source.sha256&&proof.maker.sha256===flow.source.sha256&&proof.ownMethod.sha256===own.source.sha256,'PROVEN_PRIMARY_COMPATIBILITY');
 check(proof.contract===reuse.contract&&proof.targetDefinitionId===parent.definition.id&&proof.targetDefinitionSha256===parent.definition.definition_sha256&&proof.ownMethod.firstRowMortarKind==='READY_CEMENT_SAND_OF_ACTUAL_DESIGN_GRADE'&&proof.ownMethod.firstRowMortarGrade===null&&proof.ownMethod.firstRowRateM3PerWallM3==='0.017'&&proof.newPaidOwners===0&&proof.newProcurementOwners===0&&proof.closedParentNeeds===0&&proof.full===0,'EXACT_COMPATIBLE_ADAPTATION_BOUNDARY');
 const result=structuredClone(parent),existingRows=new Set(result.resources.map(resource=>resource.row_id));
 check(!reuse.physicalRowIds.some(id=>existingRows.has(id))&&!existingRows.has(reuse.scopeRow),'PHYSICAL_COMPONENT_ALREADY_PRESENT');
 const mortar=result.resources.find(resource=>resource.row_id===reuse.mortarOwner);
 check(mortar?.unit_id==='m3'&&mortar.resource_graph.effectiveQuantityOutputV1?.parameterId===reuse.effectiveMortar&&mortar.resource_graph.costTreatment==='OWN_COST','SOLE_OWN_MORTAR_OWNER');
 const originalPaidFormula=result.formulas.find(item=>item.formula_id===mortar!.formula_id);
 check(originalPaidFormula&&originalPaidFormula.expression_source.includes('0.017'),'OWN_FIRST_ROW_RATE_NOT_FOREIGN_M50');
 const accepted=buildMasonryCeramic250EffectiveLiftSuccessorR4(masonryM50CycleCapturedRepresentativeR2());
 const sourceRows=accepted.resources.filter(resource=>reuse.physicalRowIds.includes(resource.row_id));
 check(sourceRows.length===19,'WHOLE_NINE_ROSTER_EIGHT_PROCESSES_TWO_ACTUAL_ROWS');
 const sourceRowIds=new Set(sourceRows.map(resource=>resource.row_id));
 const returnControl=accepted.resources.find(resource=>resource.row_id===m50LiftRowR4('return-balance'));
 check(returnControl,'ACCEPTED_POST_EFFECTIVE_RETURN_BALANCE');
 const requiredFormulas=new Set([...sourceRows.map(resource=>resource.formula_id),returnControl!.formula_id]);
 const sourceFormulas=accepted.formulas.filter(item=>requiredFormulas.has(item.formula_id));
 check(sourceFormulas.length===20,'EXACT_PHYSICAL_FORMULA_COUNT');
 const originalParameterIds=new Set(parent.parameters.map(parameter=>parameter.parameter_id));
 const imported=accepted.parameters.filter(parameter=>(parameter.parameter_id.startsWith('m50c2_')&&parameter.parameter_id!==flow.selectorId&&!parameters[parameter.parameter_id])||[m50LiftIdR4('effective_return_kg'),m50LiftIdR4('effective_waste_kg')].includes(parameter.parameter_id));
 for(const parameter of imported){
  check(!originalParameterIds.has(parameter.parameter_id),'PARAMETER_COLLISION:'+parameter.parameter_id);
  const constraints={...parameter.constraints_json};delete constraints.forbiddenWhen;
  if(constraints.requiredWhen)constraints.requiredWhen=active;
  const batch=parameter.parameter_id===oldId('batch_reference');
  const role=parameter.truth_metadata.value_source_role;
  result.parameters.push({...decl(parameter),ordinal:result.parameters.length,required:false,default_value:null,
   title_ru:batch?'Паспорт фактической партии цементно-песчаного раствора первого ряда':parameter.title_ru,constraints_json:constraints,
   truth_metadata:{...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',visible_when:active,provenance:{...parameter.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',wholeFirstRowFeedReuseV1:{contract:reuse.contract,sourceParameterId:parameter.parameter_id,sourceParentDefinitionId:flow.currentDefinitionId,materialGradeNotTransferred:true}},
    guide:{...parameter.truth_metadata.guide,source_role:role,guide_short_ru:batch?'Связанный документ фактической партии цементно-песчаного раствора первого ряда с маркой по проекту; это не сухой клей М150 и не кирпичный раствор М50.':'Внутренний источник или документ точной последовательной подачи первого ряда. Никаких вопросов о ресурсах в обычной форме; неизвестные факты не подставляются.'}}});
 }
 const selector=result.parameters.find(parameter=>parameter.parameter_id===reuse.selectorId);
 check(selector?.truth_metadata.visibility_role==='INTERNAL_ONLY'&&selector.truth_metadata.value_source_role==='SOURCE_BACKED_PRELIMINARY_PROFILE','SOURCE_OWNED_METHOD_SELECTOR');
 selector!.constraints_json={...selector!.constraints_json,values:[reuse.selectorValue]};
 selector!.truth_metadata={...selector!.truth_metadata,provenance:{...selector!.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',wholeFirstRowFeedSourceChoiceV1:{contract:reuse.contract,ownWholeMethodSelector:own.selectorId,ownWholeMethodValue:own.selectorValue,sourceProfileIsNotAnObjectDocument:true}},guide:{...selector!.truth_metadata.guide,guide_kind:'PROJECT_DEFINED',source_role:'SOURCE_BACKED_PRELIMINARY_PROFILE',source_document:own.sourceId,source_snapshot_hash:own.source.sha256,source_locator:proof.ownMethod.locator,guide_short_ru:'Приложение повторно применяет целую совместимую физическую последовательность подачи трёх ящиков к первому ряду выбранной исходной стены. Обычная форма её не конструирует; фактические документы и недостающие нормы остаются отдельно.'}};
 for(const source of sourceFormulas){check(!result.formulas.some(item=>item.formula_id===source.formula_id),'FORMULA_COLLISION:'+source.formula_id);result.formulas.push({...formula(source),ordinal:result.formulas.length});}
 for(const source of [...sourceRows,returnControl!]){
  const control=source.row_id===returnControl!.row_id;
  check(source.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&source.procurement_eligible===false,'NO_FOREIGN_PAYMENT_OR_PURCHASE');
  const graph=structuredClone(source.resource_graph),reference=canonicalEstimateOperationReference(graph.operationCompositionV1);check(reference,'SOURCE_OPERATION_REQUIRED');
  // These are context links from the physical source, not a request to adopt
  // its old brick selector or the old nominal mortar quantity.
  graph.scopeContextParameterIds=[own.selectorId,reuse.selectorId,...[...new Set((graph.scopeContextParameterIds??[]).map(mapped))].filter(id=>result.parameters.some(parameter=>parameter.parameter_id===id)&&id!==flow.parentSelector&&id!==flow.incompatibleSelector&&id!==flow.selectorId)];
  if(graph.inputParameterIds)graph.inputParameterIds=graph.inputParameterIds.map(mapped);
  graph.operationCompositionV1={...graph.operationCompositionV1,groupId:own.prefix,groupTitleRu:'Первый ряд газобетонной стены: подача раствора'};
  // This same complete source inventory has one retained primary owner.
  // Its repeated displays belong only to stages whose marker remains present.
  // The shared R24 graph preserves these existing-contract gates on edits.
  const physicalRoster=flow.roster.some(item=>source.row_id===flowRow(item.key));
  if(physicalRoster){const declared=graph.operationCompositionV1.additionalOperations as Json[]|undefined;graph.operationCompositionV1={...graph.operationCompositionV1,additionalOperations:(declared??[]).map(reference=>{check(reuse.operationIds.includes(reference.operationId),'EXACT_ROSTER_RELATED_OPERATION:'+reference.operationId);check(reference.whenResourcePresent==null||hash(reference.whenResourcePresent)===hash([reference.operationId]),'NO_FOREIGN_ROSTER_GATE_OVERRIDE');return{...reference,whenResourcePresent:[reference.operationId]};})};}
  if(graph.scopeRequirementV1)graph.scopeRequirementV1={...graph.scopeRequirementV1,groupId:own.prefix,groupTitleRu:'Подача раствора первого ряда',exactScopeWhen:active,originalRowIds:[reuse.mortarOwner],requiredFactParameterIds:graph.scopeRequirementV1.requiredFactParameterIds.map(mapped)};
  if(graph.derivedQuantityEditPolicyV1)graph.derivedQuantityEditPolicyV1={...graph.derivedQuantityEditPolicyV1,parameterIds:graph.derivedQuantityEditPolicyV1.parameterIds.map(mapped)};
  const marker=flow.operations.some(item=>source.row_id===flowRow('operation:'+item.key));
  result.resources.push(rehash({...decl(source),ordinal:result.resources.length,inclusion_ast:active,resource_graph:graph,
   source_metadata:{...source.source_metadata,adaptationContract:reuse.contract,materialGrade:null,materialSpecification:'Ready cement-sand first-course mortar of actual design grade',sourceParentDefinitionId:flow.currentDefinitionId,effectiveMortarOwnerRowId:reuse.mortarOwner,quantityBasis:marker?'OWN_EFFECTIVE_FIRST_ROW_MORTAR_NOT_BRICK_0234':control?'POST_EFFECTIVE_ACTUAL_RETURN_WASTE_BALANCE':source.source_metadata.quantityBasis,
    originalSourceBoundarySnapshot:{normativeTrace:source.source_metadata.normativeTrace,excludedUnownedAssumptions:source.source_metadata.excludedUnownedAssumptions},
    normativeTrace:[{sourceId:reuse.sourceId,source_id:reuse.sourceId,normId:'EXACT_MAKER_BOX_AND_KZ_THREE_BOX_PHYSICAL_METHOD_NOT_KG_M50_RATE',normVersion:'KZ2019 method and undated maker original',source_title:'Точная физическая последовательность подачи раствора первого ряда',exact_locator:flow.source.locator+'; KZ PDF14 first row, PDF35-36 table2 and PDF38 remix',source_definition_hash:flow.source.sha256}],
    excludedUnownedAssumptions:['No foreign M50 material, grade or financial rate','No calculated stock as actual available inventory','No invented wet-feed labour, crane hours or complete upper handler','No project conformity from international normative quantities'],
    sourceCountry:'Kazakhstan method plus exact manufacturer passport',sourceEdition:'2019 method; undated maker original',kgComplianceClaim:false,foreignFinancialNormTransferred:false,sourceInventoryNotConsumption:source.source_metadata.sourceInventoryNotConsumption===true,wetFeedLabourAndPlantNormStillUnknown:true,closedParentNeeds:0,full_technical_acceptance:false}}));
 }
 // Existing AAC upper/hook checks already use the same tested physical
 // expression. Preserve their IDs and expressions; add no second load check.
 for(const key of ['first-row-handler-control','first-row-crane-control'])check(result.resources.filter(resource=>resource.row_id===row(key)).length===1,'SINGLE_EXISTING_LOAD_CONTROL:'+key);
 const primaryFacts=flow.records.filter(record=>record.key!=='return-waste').map(record=>oldId(record.key+'_reference'));
 const exactFacts=[...primaryFacts,...['box1_eye_mm','box2_eye_mm','box3_eye_mm'].map(oldId),'aackz4_mortar_density_kg_m3','aackz4_handler_mass_kg','aackz4_handler_limit_kg','aackz4_crane_limit_kg'];
 const external:AutomaticParameterSpec[]=exactFacts.map(id=>{const found=result.parameters.find(parameter=>parameter.parameter_id===id);check(found,'EXACT_SOURCE_OBJECT_FACT:'+id);return{id,title:found!.title_ru,valueType:found!.value_type,unitId:found!.unit_id,kind:'ordinary'} as AutomaticParameterSpec;});
 const scopeSpec:AutomaticRowSpec={rowId:reuse.scopeRow,formulaId:row('formula:first-row-feed-scope'),section:'Подача раствора первого ряда',title:'Применимость целой подачи раствора первого ряда',category:'service',unitId:'set',expression:'0',inputParameterIds:exactFacts,costTreatment:'INFORMATIONAL_SCOPE',procurement:false};
 const coverageSpec:AutomaticRowSpec={rowId:reuse.coverageRow,formulaId:row('formula:first-row-feed-coverage'),section:'Подача раствора первого ряда',title:'Сохранность целого физического комплекта подачи',category:'service',unitId:'set',expression:'0',costTreatment:'INFORMATIONAL_SCOPE',procurement:false};
 const scope=buildAutomaticConstructionOwnerR1({contract:reuse.contract,semanticOwner:own.prefix,sourceId:reuse.sourceId,normId:'EXISTING_WHOLE_PHYSICAL_COMPONENT_NO_NEW_FINANCIAL_NORM',sourceMetadata:{source_title:'Применимость целой подачи готового раствора первого ряда',source_document_version:'KZ2019 and original manufacturer passport',definition_hash:flow.source.sha256,artifact_sha256:flow.source.sha256,exact_locator:flow.source.locator+'; '+flow.methodSource.locator},applicabilityRu:'Точный полный физический способ трёх ящиков для свежего цементно-песчаного раствора собственного первого ряда. Фактические характеристики и документы объекта не заменяют отсутствующие нормы труда, механизмов, доставки и защиты.',ordinary:external,profile:[],conditional:[],rows:[scopeSpec,coverageSpec],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['No foreign M50 material/grade/rate','No invented wet-feed man-hours or crane-hours','No source roster as purchased inventory','No object applicability from calculated international normative quantities']});
 for(const value of scope.formulas)result.formulas.push({...decl(value),ordinal:result.formulas.length});
 const scopeResource=scope.resources[0]!;
 result.resources.push(rehash({...decl(scopeResource),ordinal:result.resources.length,inclusion_ast:active,resource_graph:{...scopeResource.resource_graph,
  operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:own.prefix,groupTitleRu:'Подача раствора первого ряда',...operation('prepare')},
  scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:reuse.scopeRow,groupTitleRu:'Применимость целой подачи первого ряда',titleRu:scopeResource.title_ru,reasonRu:'Паспорт партии, проектная схема, фактические нагрузки и осмотр обязательны. Расчёт исходного нормативного расхода не подтверждает объект; исключение или ноль не заменяют документы.',exactScopeWhen:active,sourceEvidence:[flow.source,flow.methodSource],coveringRowIds:[],originalRowIds:[reuse.mortarOwner],objectFactParameterId:oldId('adoption_reference'),unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:exactFacts},
 },source_metadata:{...scopeResource.source_metadata,adaptationContract:reuse.contract,newPaidOwner:false,newProcurementOwner:false,closedParentNeeds:0,full_technical_acceptance:false}}));
 const coverage=scope.resources[1]!;
 result.resources.push(rehash({...decl(coverage),ordinal:result.resources.length,inclusion_ast:active,resource_graph:{...coverage.resource_graph,
  operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:own.prefix,groupTitleRu:'Подача раствора первого ряда',...operation('prepare')},
  scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:reuse.coverageRow,groupTitleRu:'Целый физический комплект подачи',titleRu:coverage.title_ru,reasonRu:'Исходный физический способ связан с девятью позициями рабочего комплекта и восемью стадиями. Исключение его части оставляет требование незавершённым и не означает сохранение полного способа.',exactScopeWhen:active,sourceEvidence:[flow.source,flow.methodSource],coveringRowIds:[...flow.roster.map(item=>flowRow(item.key)),...flow.operations.map(item=>flowRow('operation:'+item.key))],originalRowIds:[],costExclusionBreaksScopeV1:true},
 },source_metadata:{...coverage.source_metadata,adaptationContract:reuse.contract,physicalCoverageIsNotFinancialNormClosure:true,newPaidOwner:false,newProcurementOwner:false,closedParentNeeds:0,full_technical_acceptance:false}}));
 const shared=new Map<string,readonly string[]>([
  [reuse.mortarOwner,flow.operations.map(item=>item.key)],
  [row('whole_material_handling'),['prepare','load','feed','receive-front']],
  [row('whole_access'),['prepare','feed','receive-front']],
  [row('whole_cutting_ppe_control'),['prepare','load','feed','receive-front','clean','inspect']],
  [row('whole_residue_external_supply'),['receive','load','clean','inspect']],
 ]);
 result.resources=result.resources.map(resource=>shared.has(resource.row_id)?shareAt(resource,shared.get(resource.row_id)!):resource);
 for(const [id,keys] of shared){const found=result.resources.find(resource=>resource.row_id===id);check(found,'UNCHANGED_OWNER_OR_UNCLOSED_NEED:'+id);const actual=canonicalEstimateOperationReferences(found!.resource_graph.operationCompositionV1);for(const key of keys)check(actual.some(reference=>reference.groupId===own.prefix&&reference.operationId===flowRow('operation:'+key)),'ACTUAL_PROJECTOR_REFERENCE:'+key);}
 for(const source of sourceRows){check(sourceRowIds.has(source.row_id),'EXACT_SOURCE_ROW');const value=result.resources.find(resource=>resource.row_id===source.row_id)!;const roster=flow.roster.find(item=>flowRow(item.key)===source.row_id);if(roster){const actual=canonicalEstimateOperationReferences(value.resource_graph.operationCompositionV1);for(const key of roster.operations)check(actual.some(reference=>reference.groupId===own.prefix&&reference.operationId===flowRow('operation:'+key)),'WHOLE_ROSTER_PROJECTOR_REFERENCE:'+roster.key+':'+key);}}
 check(result.resources.filter(resource=>resource.row_id===reuse.mortarOwner).length===1&&hash(originalPaidFormula)===hash(result.formulas.find(item=>item.formula_id===mortar!.formula_id)),'OWN_MORTAR_FORMULA_AND_OWNER_PRESERVED');
 const unique=(items:Json[],key:string)=>new Set(items.map(item=>item[key])).size===items.length;
 check(unique(result.parameters,'parameter_id')&&unique(result.formulas,'formula_id')&&unique(result.resources,'row_id'),'DUPLICATE_ID');
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!originalParameterIds.has(key))result.baseline.normative_source_ids[key]=[reuse.sourceId];}
 result.definition.applicability={...result.definition.applicability,masonryAacWholeFirstRowFeedReuseR4:{contract:reuse.contract,physicalRows:19,operations:8,soleMortarOwner:reuse.mortarOwner,effectiveMortar:reuse.effectiveMortar,foreignPaidNormsTransferred:false,exactObjectDocumentsStillRequired:true,wholeTechnicalAcceptance:false}};
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,masonryAacWholeFirstRowFeedReuseR4:{contract:reuse.contract,sourceOnly:true,newPaidOwners:0,newProcurementOwners:0,closedParentNeeds:0,full:0,wetFeedLabourAndPlantNormStillUnknown:true}};
 return result;
}

/** Independent expectations are read from the accepted source decomposition,
 * never generated by iterating the adapter's resulting resources. */
export function masonryAacWholeFirstRowFeedCompletenessEntriesR4(){
 const condition=own.selectorId+'='+own.selectorValue+' AND '+reuse.selectorId+'='+reuse.selectorValue;
 const entry=(key:string,category:string,unitId:string,quantityRule:string,operations:readonly string[])=>({expectedResourceId:own.prefix+':expected:reused-first-row-feed:'+key,operationId:flowRow('operation:'+operations[0]),requiredOperationIds:operations.map(key=>flowRow('operation:'+key)),condition,sourceId:reuse.sourceId,category,unitId,specification:key,quantityRule,formulaId:flowRow('formula:'+key),resolution:{kind:'ROW',rowId:flowRow(key)}});
 return[
  ...flow.roster.map(item=>entry(item.key,item.category,item.unitId,'EXACT_SOURCE_WHOLE_SEQUENTIAL_FRONT_LITERAL_'+item.quantity+'_NOT_PURCHASE_OR_LABOUR_HOURS',item.operations)),
  ...flow.operations.map(item=>entry('operation:'+item.key,'work','m3','OWN_EFFECTIVE_FIRST_ROW_MORTAR_VOLUME_NOT_FOREIGN_RATE',[item.key])),
  ...(['returned-mortar','waste-mortar'] as const).map(key=>entry(key,'material','kg','ACTUAL_SAVED_RETURN_WASTE_NOT_ALLOWANCE',['clean'])),
  {expectedResourceId:own.prefix+':expected:reused-first-row-feed:return-balance',operationId:m50LiftRowR4('operation:return-balance'),requiredOperationIds:[m50LiftRowR4('operation:return-balance')],condition,sourceId:reuse.sourceId,category:'service',unitId:'kg',specification:'Accepted post-effective return/waste balance control',quantityRule:'MANDATORY_ZERO_EXCESS_FROM_OWN_EFFECTIVE_MORTAR',formulaId:m50LiftRowR4('formula:return-balance'),resolution:{kind:'ROW',rowId:m50LiftRowR4('return-balance')}},
  {expectedResourceId:own.prefix+':expected:reused-first-row-feed:object-scope',operationId:flowRow('operation:prepare'),requiredOperationIds:[flowRow('operation:prepare')],condition,sourceId:reuse.sourceId,category:'service',unitId:'set',specification:'Mandatory source/maker object applicability',quantityRule:'OBJECT_FACTS_NOT_CONSUMER_QUESTIONS_NOT_NORM_CONFIRMATION',formulaId:row('formula:first-row-feed-scope'),resolution:{kind:'ROW',rowId:reuse.scopeRow}},
  {expectedResourceId:own.prefix+':expected:reused-first-row-feed:coverage',operationId:flowRow('operation:prepare'),requiredOperationIds:[flowRow('operation:prepare')],condition,sourceId:reuse.sourceId,category:'service',unitId:'set',specification:'Whole accepted physical roster and stage coverage',quantityRule:'SOURCE_PHYSICAL_COVERAGE_NOT_AVAILABLE_STOCK_OR_FINANCIAL_COMPLETENESS',formulaId:row('formula:first-row-feed-coverage'),resolution:{kind:'ROW',rowId:reuse.coverageRow}},
 ];
}
