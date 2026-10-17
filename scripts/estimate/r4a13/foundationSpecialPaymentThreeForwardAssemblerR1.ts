import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {createCanonicalDefinitionClonePlan,type CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {buildFoundationSpecialPaymentThreeR1 as build,foundationSpecialPaymentThreeContractR1 as contract} from './foundationSpecialPaymentThreeR1';
import type {assemblePlacementMaterialModelsForwardR1 as Ordinary} from './placementMaterialModelsForwardAssemblerR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {buildMasterParameterCalculationConsumers as consumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalManualPriceMigrationBindings as priceBindings} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
export function assembleFoundationSpecialPaymentThreeForwardR1(input:Parameters<typeof Ordinary>[0]){
 assert.equal(input.parents.length,3);
 const models=input.parents.map(parent=>{
  const model=build(parent as any),catalogId=model.catalogId,parameters=model.parameters,formulas=model.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})),resources=model.resources;
  const {formulaConsumers,resourceConsumers}=consumers({parameters,formulas,resources});
  const baseline=structuredClone(parent.baseline);baseline.parameter_schema_sha256=hash(parameters);baseline.formula_consumer_ids=formulaConsumers;baseline.resource_consumer_row_ids=resourceConsumers;
  for(const id of model.newParameterIds){
   assert(!Object.hasOwn(baseline.input_values,id));baseline.input_classification[id]='VALIDATION_FIXTURE';baseline.uom_by_parameter[id]=null;baseline.normative_source_ids[id]=[];
   baseline.guide_provenance_ru[id]='Подтверждённый проектный тариф; значения по умолчанию нет. Тестовый выбор не является нормой или подтверждённым заказом.';
  }
  const definitionSha256=hash({contract,catalogId,parameters,formulas,resources}),decision={...parent.passport.decision,waveContract:contract,engineeringAccepted:false,completeProjectEstimateAccepted:false,supplierOrderConfirmed:false,activationAllowed:false,productionEligible:false};
  const limitationRu=model.newParameterIds.length?'Для основной доставки бетона и вывоза грунта требуется выбрать по одной подтверждённой схеме отдельной оплаты.':'Оператор вибратора оплачивается только в составе работы по уплотнению; ставка механизма имеет отдельную границу.';
  const plan=createCanonicalDefinitionClonePlan({contract,
   definition:{id:uuid([input.sourceFingerprint,catalogId,'definition']),releaseId:input.releaseId,catalogId,definitionVersion:parent.definition.definition_version+1,definitionSha256,
    applicability:{...parent.definition.applicability},passport:{...parent.definition.passport},sourceMetadata:{...parent.definition.source_metadata,contract,sourceFingerprint:input.sourceFingerprint,sourceFreezeSha256:input.sourceFreezeSha256,masterSha256:input.masterSha256,
     predecessorDefinitionId:parent.definition.id,predecessorBaselineLeafId:parent.baseline.id,changedPriceScopeRowIds:model.changedPriceRowIds,limitationRu,activationAllowed:false,productionEligible:false}},
   representative:{parameters,formulas,resources,bindings:parent.bindings.map((b:Json)=>({row_id:b.row_id,locator_id:b.locator_id,applicability:b.applicability})),baseline,
    passport:{...parent.passport,included_scope_ru:[...parent.passport.included_scope_ru,limitationRu]}},
   parameterTruthMetadata:p=>({...p.truth_metadata,contract,semantic_parameter_key:`${catalogId}:${p.parameter_id}`,formula_consumers:formulaConsumers[p.parameter_id],resource_branch_consumers:resourceConsumers[p.parameter_id]}),
   resourceId:r=>uuid([input.sourceFingerprint,catalogId,'resource',r.row_id]),resourceSemanticOwner:r=>r.semantic_owner,
   resourceSha256:r=>hash({contract,catalogId,resource:r}),
   baseline:{id:uuid([input.sourceFingerprint,catalogId,'baseline']),key:`${contract}:${input.sourceFingerprint}:${catalogId}`,sourceDefinitionVersionId:parent.definition.id,supersedesBaselineId:parent.baseline.id,
    acceptedReleaseId:input.releaseId,acceptanceEvidenceSha256:input.acceptanceEvidenceSha256,validationScenarioRefs:[...parent.baseline.validation_scenario_refs,
     {scenario:'PAYMENT_BOUNDARY_REQUIRES_CONFIRMED_PROJECT_TARIFF',newInputsHaveNoDefault:true,realProject:false}]},
   passport:{physicalResultRu:parent.passport.physical_result_ru,excludedScopeRu:parent.passport.excluded_scope_ru,decision,payloadSha256:hash({definitionSha256,decision,limitationRu}),sourceHead:input.sourceHead,sourceTree:input.sourceTree},
   bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:parent.bindings.length});
  const old=priceBindings(parent as any),next=priceBindings(plan);
  for(const id of model.unchangedResourceIds)assert.equal(next[id],old[id],'SPECIAL3_UNCHANGED_PRICE_BINDING:'+id);
  for(const id of model.changedPriceRowIds)assert.notEqual(next[id],old[id],'SPECIAL3_CHANGED_PRICE_BINDING:'+id);
  return {plan,primaryMeasureParameterId:model.primaryMeasureParameterId,searchPatch:{primary_uom:model.primaryMeasureParameterId==='slab_area_m2'?'м²':'м³',short_scope_ru:parent.passport.physical_result_ru+' '+limitationRu,
   key_distinguishing_parameters:plan.parameters.filter(p=>p.truth_metadata?.visibility_role!=='INTERNAL_ONLY').map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,titleRu:p.title_ru,required:p.required})),
   required_inputs_count:plan.parameters.filter(p=>p.required&&p.truth_metadata?.visibility_role!=='INTERNAL_ONLY').length,
   clarification_fields:plan.parameters.filter(p=>p.required&&p.truth_metadata?.visibility_role!=='INTERNAL_ONLY').map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,titleRu:p.title_ru})),
   included_boundaries:plan.passport.included_scope_ru,excluded_boundaries:plan.passport.excluded_scope_ru},honestUnconsumedParameterIds:parameters.filter(p=>resourceConsumers[p.parameter_id]!.length===0).map(p=>p.parameter_id)};
 });
 return {contract,models,preservedCatalogIds:[],engineeringAccepted:false,automaticHistoricalRowMigrationPerformed:false};
}
