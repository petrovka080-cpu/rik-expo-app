import pack from '../../../../data/estimate-benchmarks/source-packs/master212-concrete-foundation-successor-r1.json';
import cyclePack from '../../../../data/estimate-benchmarks/source-packs/concrete-monolithic-cycle-master212-r1.json';
import {buildConcreteMonolithicCycleM212R1,concreteCycleComponentsM212R1,CONCRETE_CYCLE_M212_R1_TARGETS,CONCRETE_CYCLE_M212_R1_PRIMARY as structuralVolume}from'./concreteMonolithicCycleM212R1';
import {buildConcretePreparationKrer0600101M212R1,CONCRETE_PREPARATION_M212_R1_SOURCE as prep}from'./concretePreparationKrer0600101M212R1';
import {buildMasterParameterCalculationConsumers}from'../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {resolveCanonicalEstimateExplicitRowCategory}from'../backendPlatform/canonicalEstimateRowCategory';
import {compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition}from'../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash}from'../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep}from'../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticParameterSpec,type AutomaticRowSpec}from'./automaticConstructionOwnerR1';
type Json=Record<string,any>;
const fixture=require('../../../../data/estimate-benchmarks/fixtures/master212-concrete-two-current-r1.json')as{captures:Json[]};
export const MASTER212_CONCRETE_SUCCESSOR_PACK_R1=pack;
export const MASTER212_CONCRETE_STRUCTURAL_PRIMARY_R1=structuralVolume;
const copy=<T,>(x:T):T=>structuredClone(x),eq=(parameterId:string,value:string)=>({kind:'equals',parameterId,value});
const and=(...operands:unknown[]):Json=>({kind:'and',operands});
const check=(ok:unknown,c:string):void=>{if(!ok)throw Error('MASTER212_CONCRETE_'+c);};
const decl=(r:Json)=>Object.fromEntries(Object.entries(r).filter(([k])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(k)));
const category=(c:string)=>resolveCanonicalEstimateExplicitRowCategory(c)??(c==='construction_work'?'work':c);
const rehash=(r:Json)=>{const{row_sha256:_old,...body}=r;return{...body,row_sha256:hash(body)};};
export function master212ConcreteCapturedParentR1(catalogId:string){const c=fixture.captures.find(c=>c.definition.catalog_id===catalogId);check(c,'EXACT_TWO_CURRENT_TARGET_REQUIRED');return copy(c!);}
export function master212ConcreteCapturedRepresentativeR1(catalogId:string):Rep{
 const c=master212ConcreteCapturedParentR1(catalogId),rows=new Map(c.resources.map((r:Json)=>[r.id,r.row_id]));
 return{definition:c.definition,baseline:c.baseline,passport:c.contentPassport,parameters:c.parameters,formulas:c.formulas,resources:c.resources,bindings:c.bindings.map((b:Json)=>({row_id:rows.get(b.resource_spec_id),locator_id:b.locator_id,applicability:b.applicability}))};
}
export function master212ConcreteSelectionMetadataR1(catalogId:string){const t=pack.targets.find(t=>t.catalogId===catalogId);check(t,'EXACT_PRIMARY_TARGET_REQUIRED');
 return{contract:'canonical-primary-measure-selection/v1',selectorParameterId:pack.selectorId,selections:[{selectorValue:pack.legacyChoiceRu,primaryMeasureParameterId:t!.legacyPrimary,unitId:t!.legacyUnit},{selectorValue:pack.newChoiceRu,primaryMeasureParameterId:structuralVolume,unitId:'m3'}]};
}
function append(result:Rep,part:{parameters:readonly Json[];formulas:readonly Json[];resources:readonly Json[]},catalogId:string,condition:Json){
 for(const p of part.parameters){check(!result.parameters.some(q=>q.parameter_id===p.parameter_id),'NEW_PARAMETER_COLLISION:'+p.parameter_id);result.parameters.push({...decl(p),ordinal:result.parameters.length});}
 for(const f of part.formulas){check(!result.formulas.some(q=>q.formula_id===f.formula_id),'NEW_FORMULA_COLLISION:'+f.formula_id);result.formulas.push({...decl(f),ordinal:result.formulas.length});}
 for(const r of part.resources){check(!result.resources.some(q=>q.row_id===r.row_id),'NEW_RESOURCE_COLLISION:'+r.row_id);const resolved=category(r.category);
  result.resources.push(rehash({...decl(r),ordinal:result.resources.length,category:resolved==='work'?'labor':resolved,semantic_owner:catalogId+':'+r.row_id,inclusion_ast:and(condition,r.inclusion_ast)}));}
}
function retainedScopeNeeds(kind:string){
 const needs=pack.retainedScopeNeeds.filter(n=>n.kind===kind),positive={kind:'greater_than' as const,parameterId:structuralVolume,value:0};
 const conditional:AutomaticParameterSpec[]=needs.map(n=>({id:n.parameterId,title:n.titleRu,valueType:'decimal',unitId:n.unitId,min:0,kind:'internal'}));
 const rows:AutomaticRowSpec[]=needs.map(n=>({rowId:n.needId,formulaId:n.needId+':formula',section:n.operationTitleRu,title:n.titleRu,category:n.category,unitId:n.unitId,expression:n.parameterId,inclusion:positive,costTreatment:'INFORMATIONAL_SCOPE',procurement:false}));
 const d=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:'master212:'+kind+':retained-full-scope',sourceId:pack.sourceId,normId:'DECLARED_ORIGINAL_FINAL_SCOPE_NOT_A_CONSUMPTION_NORM',sourceMetadata:{source_title:'Сохранённые операции исходного полного фундамента',source_document_version:'MASTER2.12; exact current captured parent',definition_hash:pack.parentFileSha256,artifact_sha256:pack.parentFileSha256,exact_locator:'Exact current parent operation identities and independently authored physical obligations'},applicabilityRu:pack.scopeRu,ordinary:[{id:structuralVolume,title:'Чистый объём конструкции',valueType:'decimal',unitId:'m3',min:0,kind:'ordinary'}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['Старые budget-нормы, фасовки, цены и значения площадного примера не используются в новой ветви.']});
 return{parameters:d.parameters.filter(p=>p.parameter_id!==structuralVolume).map(p=>({...p,required:false,default_value:null,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,needs.find(n=>n.parameterId===p.parameter_id)!.reasonRu)})),formulas:d.formulas,resources:d.resources.map(r=>{const n=needs.find(n=>n.needId===r.row_id)!;return rehash({...r,resource_graph:{...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'master212:'+kind+':retained-full-scope',groupTitleRu:'Полный цикл фундамента',operationId:'master212:'+kind+':retained-operation:'+n.operationKey,operationTitleRu:n.operationTitleRu,completionCriterionRu:n.reasonRu}},source_metadata:{...r.source_metadata,sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],normative_source_ids:[],missingAuthority:n.missingAuthority,missingProjectFact:n.projectFact,nextStepRu:n.nextStepRu,automaticGenericPriceInheritanceAllowed:false,full_technical_acceptance:false}});})};
}
/** Retains every old logical row/formula/default/source binding. New branch has
 * independent structural/preparation geometry, no legacy q, budget ratios or
 * saved price transfer, and explicitly keeps all full-foundation operations. */
export function buildMaster212ConcreteFoundationSuccessorR1(parent:Rep):Rep{
 const t=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id);check(t,'EXACT_TWO_CURRENT_TARGET_REQUIRED');const frozen=master212ConcreteCapturedRepresentativeR1(t!.catalogId);
 check(parent.definition.id===t!.definitionId&&parent.definition.definition_version===t!.definitionVersion&&parent.definition.definition_sha256===t!.definitionSha256&&hash([parent.parameters,parent.formulas,parent.resources])===hash([frozen.parameters,frozen.formulas,frozen.resources]),'EXACT_CURRENT_PARENT_COMPUTATION_REQUIRED');
 const result=copy(parent),selected=eq(pack.selectorId,pack.newChoiceRu),legacy=eq(pack.selectorId,pack.legacyChoiceRu);
 for(const r of result.resources)r.inclusion_ast=and(r.inclusion_ast,legacy);
 for(const p of result.parameters){const oldRequired=p.constraints_json?.requiredWhen,wasRequired=p.required;
  p.required=false;p.constraints_json={...p.constraints_json,...(wasRequired||oldRequired?{requiredWhen:oldRequired?and(legacy,oldRequired):legacy}:{})};
  p.truth_metadata={...p.truth_metadata,visible_when:p.truth_metadata?.visible_when?and(legacy,p.truth_metadata.visible_when):legacy};
 }
 const component=buildConcreteMonolithicCycleM212R1(t!.catalogId),preparation=buildConcretePreparationKrer0600101M212R1();
 append(result,component,t!.catalogId,selected);
 append(result,retainedScopeNeeds(t!.kind),t!.catalogId,selected);
 // Preparation geometry is independent. A structural volume0 suppresses the
 // entire new full-foundation branch even if a stale subwork input remains.
 const fullActive=and(selected,{kind:'greater_than',parameterId:structuralVolume,value:0});
 append(result,preparation,t!.catalogId,fullActive);
 const completePreparation=and({kind:'greater_than',parameterId:prep.measure.parameterId,value:0},eq(prep.method.id,prep.method.value),eq(prep.fit.id,prep.fit.value));
 const preparationNeed=result.resources.find(r=>r.row_id==='master212:concrete-cycle:r1:need:blinding')!;
 preparationNeed.inclusion_ast=and(preparationNeed.inclusion_ast,{kind:'not',operand:completePreparation});
 const structural=result.parameters.find(p=>p.parameter_id===structuralVolume)!;
 structural.required=false;structural.default_value=null;structural.constraints_json={...structural.constraints_json,requiredWhen:selected};
 structural.truth_metadata={...structural.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'USER_MEASURED',source_confirmation_required:false,visible_when:selected,provenance:{consumer_input_role_v1:'OBJECT_GEOMETRY'},guide:{...structural.truth_metadata.guide,guide_kind:'MEASUREMENT_RULE',guide_short_ru:'Чистый геометрический объём несущей конструкции по проекту. Подготовка имеет отдельный объём; прежняя площадь/объём не подставляется.'}};
 for(const p of result.parameters.filter(p=>!parent.parameters.some(q=>q.parameter_id===p.parameter_id)))p.truth_metadata={...p.truth_metadata,visible_when:p.truth_metadata?.visible_when?and(selected,p.truth_metadata.visible_when):selected};
 result.parameters.push({parameter_id:pack.selectorId,ordinal:result.parameters.length,title_ru:'Состав полного фундамента',value_type:'enum',unit_id:null,required:true,default_value:null,constraints_json:{values:[pack.legacyChoiceRu,pack.newChoiceRu]},truth_metadata:{visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{guide_kind:'PROJECT_DEFINED',guide_short_ru:pack.scopeRu,source_role:'DECLARED_WORK_SCOPE',source_document:pack.sourceId,source_locator:'MASTER2.12 §2Б; complete accepted component arrays; КРЕР06-01-001-01 exact column',source_snapshot_hash:pack.masterSha256,guide_version:pack.contract,applicability:pack.scopeRu,verified_at:'2026-10-22',guide_validation_policy:'MANDATORY_BLOCK'}}});
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,semantic_parameter_key:t!.catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
  if(!parent.parameters.some(q=>q.parameter_id===id))result.baseline.normative_source_ids[id]=p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[pack.sourceId];}
 const needs=result.resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id);
 result.definition.applicability={...result.definition.applicability,primaryMeasureParameterId:structuralVolume,primaryMeasureSelectionV1:master212ConcreteSelectionMetadataR1(t!.catalogId),fullTechnicalAcceptance:false,newFullTechnologies:0,master212ConcreteFoundationContract:pack.contract,originalFinalFoundationScopeRetained:true,preparationIsIndependentSubwork:true};
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:needs,completeTechnicalEstimateAccepted:false,newFullTechnologies:0,independentCompletenessMap:master212ConcreteCompletenessMapR1(t!.catalogId),originalFinalFoundationScopeRetained:true};
 result.passport.capability_matrix=[...result.passport.capability_matrix.filter((c:Json)=>c.capability!=='FULL_APPLICABLE_SCOPE'),{capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:needs}];
 const oldParameterIds=new Set(parent.parameters.map(p=>p.parameter_id));
 check(result.formulas.slice(parent.formulas.length).every(f=>f.input_parameter_ids.every((id:string)=>!oldParameterIds.has(id))),'LEGACY_PARAMETER_IS_NOT_NEW_GEOMETRY_OR_NORM');
 check(result.parameters.filter(p=>!oldParameterIds.has(p.parameter_id)).every(p=>p.default_value===null),'NO_NEW_PROJECT_OR_NORM_DEFAULTS');
 return result;
}
/** The expectation roster is source-authored, never generated from emitted
 * candidate resources. Each accepted component is reused in its entirety. */
export function master212ConcreteCompletenessMapR1(catalogId:string){check(pack.targets.some(t=>t.catalogId===catalogId),'EXACT_MAP_TARGET_REQUIRED');
 const stageOp:Record<string,string>={placement:'placement',reinforcement:'reinforcement',frami:'formwork',embedded:'embedded'};
 const accepted=concreteCycleComponentsM212R1(CONCRETE_CYCLE_M212_R1_TARGETS.find(t=>t.catalogId===catalogId)!);
 const expected=Object.entries(stageOp).flatMap(([sourceStage,stage])=>(cyclePack.requiredComponentRows as Json)[sourceStage].map((id:string)=>{const source=(accepted as unknown as Json)[stage].resources.find((r:Json)=>r.row_id===id);check(source,'INDEPENDENT_ACCEPTED_SOURCE_ROW_MISSING');return{expectedResourceId:'reused:'+stage+':'+id,operationId:'master212:concrete-cycle:r1:operation:'+stage,requiredOperationIds:['master212:concrete-cycle:r1:operation:'+stage],category:source.category,unitId:source.unit_id,sourceId:pack.sourceId,condition:pack.newChoiceRu,specification:'Entire accepted '+sourceStage+' component source row '+id,quantityRule:'EXACT_ACCEPTED_COMPONENT_SOURCE_WITH_ITS_PROJECT_INPUTS_NOT_UNIVERSAL_CONCRETE_RATIO',formulaId:'master212:concrete-cycle:r1:'+stage+':formula:'+source.formula_id,resolution:{kind:'ROW',rowId:'master212:concrete-cycle:r1:'+stage+':'+id}};}));
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:prep.source.sha256,evidenceReferences:[prep.source.path,pack.masterPath,...pack.sourcePins.map(p=>p.path)],entries:[...expected.map(e=>({...e,category:category(e.category)})),
  ...prep.resources.map(r=>({expectedResourceId:'preparation:'+r.key,operationId:prep.prefix+':operation:'+r.operationId,requiredOperationIds:[prep.prefix+':operation:'+r.operationId],category:r.category==='labor'?'work':r.category,unitId:r.unitId,sourceId:pack.sourceId,condition:prep.method.value+'; '+prep.fit.value,specification:r.titleRu,quantityRule:'NET_PREPARATION_VOLUME_TIMES_EXACT_PRIMARY_COLUMN_RATE_PER100M3',formulaId:prep.prefix+':formula:'+r.key,resolution:{kind:'ROW',rowId:prep.prefix+':'+r.key}})),
  ...cyclePack.residual.map(n=>({expectedResourceId:n.needId,operationId:n.operationId,requiredOperationIds:[n.operationId],category:n.category==='labor'?'work':n.category,unitId:n.unitId,sourceId:pack.sourceId,condition:pack.newChoiceRu,specification:n.titleRu,quantityRule:'UNRESOLVED_NORM_OR_PROJECT_FACT_NO_ARBITRARY_SCALAR',formulaId:n.needId+':formula',resolution:{kind:'ROW',rowId:n.needId}})),
  ...prep.needs.map(n=>({expectedResourceId:'preparation:need:'+n.key,operationId:prep.prefix+':operation:'+n.operationId,requiredOperationIds:[prep.prefix+':operation:'+n.operationId],category:n.category==='labor'?'work':n.category,unitId:n.unitId,sourceId:pack.sourceId,condition:pack.newChoiceRu,specification:n.titleRu,quantityRule:'UNRESOLVED_PHYSICAL_PROVISION_NO_ARBITRARY_SCALAR',formulaId:prep.prefix+':formula:need:'+n.key,resolution:{kind:'ROW',rowId:prep.prefix+':need:'+n.key}})),
  ...pack.retainedScopeNeeds.filter(n=>n.kind===pack.targets.find(t=>t.catalogId===catalogId)!.kind).map(n=>({expectedResourceId:n.needId,operationId:'master212:'+n.kind+':retained-operation:'+n.operationKey,requiredOperationIds:['master212:'+n.kind+':retained-operation:'+n.operationKey],category:n.category,unitId:n.unitId,sourceId:pack.sourceId,condition:pack.newChoiceRu,specification:n.titleRu,quantityRule:'ORIGINAL_FINAL_SCOPE_RETAINED_NO_OLD_BUDGET_QUANTITY_OR_PRICE_TRANSFER',formulaId:n.needId+':formula',resolution:{kind:'ROW',rowId:n.needId}})),
 ],operationCategoryMatrix:cyclePack.operationCategoryMatrix,preparationOperationCategoryMatrix:prep.operationCategoryMatrix,retainedOperationCategoryMatrix:pack.retainedOperationCategoryMatrix.filter(c=>c.kind===pack.targets.find(t=>t.catalogId===catalogId)!.kind),retainedOperationMapping:(pack.retainedOperationMapping as Json)[pack.targets.find(t=>t.catalogId===catalogId)!.kind],fullTechnicalAcceptance:false,newFullTechnologies:0};
}
export async function compileMaster212ConcreteSuccessorR1(model:Rep,input:Record<string,unknown>){
 const t=pack.targets.find(t=>t.catalogId===model.definition.catalog_id)!;
 return compileCanonicalEstimateCore({operation:'compile',catalogId:t.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:input[pack.selectorId]===pack.legacyChoiceRu?t.legacyPrimary:structuralVolume,parameterDefinitions:model.parameters as unknown as CanonicalEstimateParameterDefinition[],formulaDefinitions:model.formulas as unknown as CanonicalEstimateFormulaDefinition[],resourceDefinitions:model.resources as unknown as CanonicalEstimateResourceDefinition[],submittedParameters:input,confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:512,hashJson:async x=>hash(x)});
}
