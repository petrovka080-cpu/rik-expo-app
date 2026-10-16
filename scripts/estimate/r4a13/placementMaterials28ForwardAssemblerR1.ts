import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {createCanonicalDefinitionClonePlan,type CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {buildPlacementMaterials28R1 as build,placementMaterials28ContractR1 as contract} from './placementMaterials28R1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {buildMasterParameterCalculationConsumers as consumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalManualPriceMigrationBindings as priceBindings,canonicalStoredManualPricesCanMigrate as canMigrate} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
export {placementMaterials28ContractR1} from './placementMaterials28R1';
const passportContract='real-professional-estimates-r3.content-passport.v1';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
export function assemblePlacementMaterials28ForwardR1(input:Readonly<{
 parents:readonly Json[];sources:readonly Json[];locators:readonly Json[];releaseId:string;sourceHead:string;sourceTree:string;
 sourceFingerprint:string;sourceFreezeSha256:string;masterSha256:string;acceptanceEvidenceSha256:string;
}>){
 assert.equal(input.parents.length,28);
 const models=input.parents.map(parent=>{
  const model=build(parent as any),catalogId=model.catalogId;
  assert.equal(parent.definition.definition_version,12);assert.equal(parent.resources.length,41);
  const parameters=model.parameters.map((p,ordinal)=>({...p,ordinal})),formulas=model.formulas.map(f=>({...f,ast_sha256:hash(f.ast)}));
  const resources:Json[]=model.resources.map(r=>({...r,row_type:r.category==='construction_work'?'labor':r.category==='delivery'?'service':r.category}));
  const {formulaConsumers,resourceConsumers}=consumers({parameters,formulas,resources});
  const definitionSha256=hash({contract,catalogId,parameters,formulas,resources});
  const definitionId=uuid([input.sourceFingerprint,catalogId,'definition']),baselineId=uuid([input.sourceFingerprint,catalogId,'baseline']);
  const primary=parameters.find(p=>p.parameter_id===model.primaryMeasureParameterId)!;assert(primary);
  const boundLocators=input.locators.filter(l=>parent.bindings.some((b:Json)=>b.locator_id===l.id));
  const methodSources=input.sources.filter(s=>boundLocators.some(l=>l.source_id===s.id));assert.equal(methodSources.length,3,'PLACEMENT28_SOURCE_CLOSURE_MISSING');
  const limitationRu='Для каждой применимой материальной позиции нужны собственные проектные количество, наименование, условия оплаты и поставки. Неизвестные данные не принимаются равными нулю.';
  const includedScopeRu=[...parent.passport.included_scope_ru,'Отдельные проектные материалы подачи и уплотнения бетона, обработки поверхности, ухода, рабочего шва и зимнего прогрева.',limitationRu];
  const excludedScopeRu=[...parent.passport.excluded_scope_ru,'Дополнительная оплата уже учтённых работ, механизмов и доставки; неподтверждённые нормы, цены и готовый заказ.'];
  // The parent's example count, mass and document references were classified
  // NORMATIVE. They are project facts and cannot become runtime defaults here.
  const baseline={contract_version:parent.baseline.contract_version,parameter_schema_sha256:hash(parameters),
   input_values:{[model.primaryMeasureParameterId]:1},input_classification:Object.fromEntries(parameters.map(p=>[p.parameter_id,'VALIDATION_FIXTURE'])),
   uom_by_parameter:Object.fromEntries(parameters.map(p=>[p.parameter_id,p.unit_id])),formula_consumer_ids:formulaConsumers,resource_consumer_row_ids:resourceConsumers,
   normative_source_ids:Object.fromEntries(parameters.map(p=>[p.parameter_id,model.retiredAggregateParameterIds.includes(p.parameter_id)?[]:(parent.baseline.normative_source_ids?.[p.parameter_id]??[])])),
   guide_provenance_ru:Object.fromEntries(parameters.map(p=>[p.parameter_id,'Проектный факт или внутренний расчётный выход; тестовый пример не является нормативом и не подставляется автоматически.'])),
   proposal_source_refs:methodSources.map(source=>({sourceId:source.source_key,locatorId:boundLocators.find(l=>l.source_id===source.id)!.id,coverage:source.source_key.includes('nrmca')?'EXISTING_READY_MIX_ORDER_RULE':'METHOD_APPLICABILITY_ONLY',universalConsumptionClaimed:false,universalProductivityClaimed:false}))};
  const decision={contract:passportContract,waveContract:contract,status:'GREEN',allowed:true,quantityScope:'FULL',
   scopeMeaning:'EXISTING_PLACEMENT_AND_COMPACTION_WITH_EXPLICIT_SELECTED_PROJECT_MATERIALS',projectScheduleRequired:true,
   engineeringAccepted:false,completeProjectEstimateAccepted:false,supplierOrderConfirmed:false,priceState:'PARTIAL_NEEDS_PRICE',activationAllowed:false,productionEligible:false};
  const plan=createCanonicalDefinitionClonePlan({contract,
   definition:{id:definitionId,releaseId:input.releaseId,catalogId,definitionVersion:13,definitionSha256,
    applicability:{...parent.definition.applicability,primaryMeasureParameterId:model.primaryMeasureParameterId,individualMaterialPaymentV1:true},
    passport:{...parent.definition.passport,canonicalRuName:model.titleRu,projectScheduleRequired:true},
    sourceMetadata:{...parent.definition.source_metadata,contract,masterSha256:input.masterSha256,sourceFingerprint:input.sourceFingerprint,
     sourceFreezeSha256:input.sourceFreezeSha256,predecessorDefinitionId:parent.definition.id,predecessorBaselineLeafId:parent.baseline.id,
     retiredAggregateMaterialRowIds:model.retiredAggregateRowIds,changedOwnerInputRows:model.modifiedOwnerInputRows,
     preservedParentRowIds:model.preservedParentRowIds,exampleProjectInputsAreNotNorms:true,runtimeProfileInput:{},engineeringAccepted:false,limitationRu,activationAllowed:false,productionEligible:false}},
   representative:{parameters,formulas,resources,bindings:parent.bindings.map((b:Json)=>({row_id:b.row_id,locator_id:b.locator_id,applicability:b.applicability})),
    baseline,passport:{contract_version:passportContract,included_scope_ru:includedScopeRu,capability_matrix:[
     {capability:'PARAMETERS',status:'GREEN'},{capability:'FORMULAS_AND_PHYSICAL_PARITY',status:'GREEN'},
     {capability:'FULL_APPLICABLE_SCOPE',status:'GREEN',projectScheduleRequired:true,engineeringAccepted:false},{capability:'PRICE',status:'GREEN_UNKNOWN_IS_NULL'}]}},
   parameterTruthMetadata:p=>({...p.truth_metadata,contract,semantic_parameter_key:`${catalogId}:${p.parameter_id}`,formula_consumers:formulaConsumers[p.parameter_id],resource_branch_consumers:resourceConsumers[p.parameter_id]}),
   resourceId:r=>uuid([input.sourceFingerprint,catalogId,'resource',r.row_id]),resourceSemanticOwner:r=>`${catalogId}:${r.row_id}`,
   resourceSha256:r=>hash({contract,catalogId,resource:r}),
   baseline:{id:baselineId,key:`${contract}:${input.sourceFingerprint}:${catalogId}`,sourceDefinitionVersionId:parent.definition.id,supersedesBaselineId:parent.baseline.id,
    acceptedReleaseId:input.releaseId,acceptanceEvidenceSha256:input.acceptanceEvidenceSha256,
    validationScenarioRefs:[{scenario:'EXPLICIT_PRIMARY_ONLY_VALIDATION_FIXTURE',fixture:{[model.primaryMeasureParameterId]:1},runtimeProfile:{},realProject:false}]},
   passport:{physicalResultRu:parent.passport.physical_result_ru,excludedScopeRu,decision,payloadSha256:hash({definitionSha256,decision,includedScopeRu,excludedScopeRu}),sourceHead:input.sourceHead,sourceTree:input.sourceTree},
   bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:parent.bindings.length});
  const oldBindings=priceBindings(parent as any),newBindings=priceBindings(plan);
  for(const id of model.preservedParentRowIds)assert.equal(newBindings[id],oldBindings[id],'PERSISTED_PLAN_CHANGED_COMPATIBLE_PRICE_BINDING:'+id);
  for(const id of model.modifiedOwnerInputRows)assert(!canMigrate({rowOverrides:{[id]:{unitPrice:'100',provenance:{kind:'manual'}}},customRows:[],fromBindings:oldBindings,toBindings:newBindings}),'PERSISTED_PLAN_BYPASSED_OWNER_INPUT_REVIEW');
  assert(Object.values(plan.baseline.input_classification).every(v=>v==='VALIDATION_FIXTURE'));
  return {plan,primaryMeasureParameterId:model.primaryMeasureParameterId,
   searchPatch:{primary_uom:'м³',short_scope_ru:parent.passport.physical_result_ru+' '+limitationRu,
    key_distinguishing_parameters:plan.parameters.filter(p=>p.truth_metadata?.visibility_role!=='INTERNAL_ONLY').map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,titleRu:p.title_ru,required:p.required})),
    required_inputs_count:plan.parameters.filter(p=>p.required&&p.truth_metadata?.visibility_role!=='INTERNAL_ONLY').length,
    clarification_fields:plan.parameters.filter(p=>p.required&&p.truth_metadata?.visibility_role!=='INTERNAL_ONLY').map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,titleRu:p.title_ru})),
    included_boundaries:includedScopeRu,excluded_boundaries:excludedScopeRu},
   honestUnconsumedParameterIds:parameters.filter(p=>resourceConsumers[p.parameter_id]!.length===0).map(p=>p.parameter_id)};
 });
 return {contract,models,preservedCatalogIds:[],engineeringAccepted:false,automaticHistoricalRowMigrationPerformed:false};
}
