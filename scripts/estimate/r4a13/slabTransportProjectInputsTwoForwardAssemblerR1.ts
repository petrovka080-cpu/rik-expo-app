import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {createCanonicalDefinitionClonePlan,type CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import type {assemblePlacementMaterialModelsForwardR1 as Ordinary} from './placementMaterialModelsForwardAssemblerR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {buildMasterParameterCalculationConsumers as consumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalManualPriceMigrationBindings as priceBindings} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
export const slabTransportProjectInputsTwoContractR1='rik-expo-app.slab-transport-project-inputs.r2';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
export function buildSlabTransportProjectInputsTwoR1(parent:Json){
 const catalogId=String(parent.definition.catalog_id);assert(/_slab_foundation_pour_(standard|repair)$/u.test(catalogId));assert.equal(parent.parameters.length,83);assert.equal(parent.resources.length,109);assert.equal(parent.formulas.length,127);
 assert.equal(parent.definition.source_metadata.contract,'rik-expo-app.foundation-special3-payment-boundaries.r1');
 const parameters:Json[]=structuredClone(parent.parameters),changedParameterIds:string[]=[];
 for(const p of parameters.filter(p=>/^slab_(main_concrete|soil)_transport_(pricing_basis|price_scope_reference)$/u.test(p.parameter_id))){
  changedParameterIds.push(p.parameter_id);assert.equal(p.default_value,null);assert.equal(p.required,true);
  p.constraints_json={...p.constraints_json,...(p.value_type==='text'?{minLength:1,maxLength:1000}:{})};
  p.truth_metadata={...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',input_origin_class:'CONFIRMED_PROJECT_TARIFF',runtime_profile_value:false,hidden_default_forbidden:true,
   guide:{...p.truth_metadata.guide,guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION',source_document:'project_confirmed_transport_tariff',
    source_locator:'Confirmed project transport contract and exact separately billed tariff scope for this estimate',guide_validation_policy:'MANDATORY_BLOCK'}};
 }
 assert.equal(changedParameterIds.length,4);
 return {catalogId,parameters,formulas:structuredClone(parent.formulas) as Json[],resources:structuredClone(parent.resources) as Json[],changedParameterIds,primaryMeasureParameterId:'slab_area_m2'};
}
export function assembleSlabTransportProjectInputsTwoForwardR1(input:Parameters<typeof Ordinary>[0]){
 const contract=slabTransportProjectInputsTwoContractR1;assert.equal(input.parents.length,2);
 const models=input.parents.map(parent=>{
  const model=buildSlabTransportProjectInputsTwoR1(parent),{catalogId,parameters,resources}=model,formulas=model.formulas.map(f=>({...f,ast_sha256:hash(f.ast)}));
  const {formulaConsumers,resourceConsumers}=consumers({parameters,formulas,resources}),baseline=structuredClone(parent.baseline);baseline.parameter_schema_sha256=hash(parameters);baseline.formula_consumer_ids=formulaConsumers;baseline.resource_consumer_row_ids=resourceConsumers;
  const definitionSha256=hash({contract,catalogId,parameters,formulas,resources}),decision={...parent.passport.decision,waveContract:contract,activationAllowed:false,productionEligible:false};
  const plan=createCanonicalDefinitionClonePlan({contract,
   definition:{id:uuid([input.sourceFingerprint,catalogId,'definition']),releaseId:input.releaseId,catalogId,definitionVersion:parent.definition.definition_version+1,definitionSha256,
    applicability:parent.definition.applicability,passport:parent.definition.passport,sourceMetadata:{...parent.definition.source_metadata,contract,sourceFingerprint:input.sourceFingerprint,sourceFreezeSha256:input.sourceFreezeSha256,masterSha256:input.masterSha256,
     predecessorDefinitionId:parent.definition.id,predecessorBaselineLeafId:parent.baseline.id,changedProjectInputMetadataIds:model.changedParameterIds,resourcesAndQuantitiesUnchanged:true,activationAllowed:false,productionEligible:false}},
   representative:{parameters,formulas,resources,bindings:parent.bindings.map((b:Json)=>({row_id:b.row_id,locator_id:b.locator_id,applicability:b.applicability})),baseline,passport:parent.passport},
   parameterTruthMetadata:p=>({...p.truth_metadata,contract,semantic_parameter_key:`${catalogId}:${p.parameter_id}`,formula_consumers:formulaConsumers[p.parameter_id],resource_branch_consumers:resourceConsumers[p.parameter_id]}),
   resourceId:r=>uuid([input.sourceFingerprint,catalogId,'resource',r.row_id]),resourceSemanticOwner:r=>r.semantic_owner,resourceSha256:r=>hash({contract,catalogId,resource:r}),
   baseline:{id:uuid([input.sourceFingerprint,catalogId,'baseline']),key:`${contract}:${input.sourceFingerprint}:${catalogId}`,sourceDefinitionVersionId:parent.definition.id,supersedesBaselineId:parent.baseline.id,acceptedReleaseId:input.releaseId,acceptanceEvidenceSha256:input.acceptanceEvidenceSha256,validationScenarioRefs:parent.baseline.validation_scenario_refs},
   passport:{physicalResultRu:parent.passport.physical_result_ru,excludedScopeRu:parent.passport.excluded_scope_ru,decision,payloadSha256:hash({definitionSha256,decision}),sourceHead:input.sourceHead,sourceTree:input.sourceTree},
   bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:parent.bindings.length});
  const old=priceBindings(parent as any),next=priceBindings(plan);
  for(const id of resources.map(r=>r.row_id))assert.equal(next[id],old[id],'PROJECT_INPUT_METADATA_MUST_NOT_CHANGE_PRICE_MEANING:'+id);
  assert.deepEqual(plan.baseline.input_values,parent.baseline.input_values);assert.deepEqual(plan.baseline.normative_source_ids,parent.baseline.normative_source_ids);
  return {plan,primaryMeasureParameterId:model.primaryMeasureParameterId,searchPatch:{},honestUnconsumedParameterIds:parameters.filter(p=>resourceConsumers[p.parameter_id]!.length===0).map(p=>p.parameter_id)};
 });return {contract,models,preservedCatalogIds:[],engineeringAccepted:false,automaticHistoricalRowMigrationPerformed:false};
}
