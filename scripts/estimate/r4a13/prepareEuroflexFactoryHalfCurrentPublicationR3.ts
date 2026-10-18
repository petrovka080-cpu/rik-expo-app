// One exact current-v2 successor. The shared publisher remains the sole writer.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {createCanonicalDefinitionClonePlan,canonicalPublisherQuantityScopeIsConsistent} from './canonicalDefinitionPublisherR1';
import {prepareEuroflexFactoryHalfLayoutCurrentR3,type EuroflexCurrentContextR3} from './prepareEuroflexFactoryHalfLayoutCurrentR3';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

type Json=Record<string,any>;
const contract='rik-expo-app.euroflex-factory-half-current.r3';
const publisherContract='rik-expo-app.selected-material-delivery-forward.r1';
const hash=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};

export function prepareEuroflexFactoryHalfCurrentPublicationR3(parent:PurchaseGroupRepresentative,context:EuroflexCurrentContextR3,
 input:Readonly<{releaseId:string;sourceHead:string;sourceTree:string;masterSha256:string;evidenceSha256:string}>){
 assert.match(input.releaseId,/^[a-f0-9-]{36}$/u);
 for(const value of [input.sourceHead,input.sourceTree])assert.match(value,/^[a-f0-9]{40}$/u);
 for(const value of [input.masterSha256,input.evidenceSha256])assert.match(value,/^[a-f0-9]{64}$/u);
 const prepared=prepareEuroflexFactoryHalfLayoutCurrentR3(parent,context),r=prepared.previewRepresentative;
 const catalogId=parent.definition.catalog_id,definitionId=uuid([contract,input.releaseId,catalogId]),baselineId=uuid([definitionId,'baseline']);
 assert.equal(context.priceRouteBindings.length,0,'EXACT_CURRENT_PRICE_BINDING_SET');
 assert.equal(r.parameters.length,45);assert.equal(r.formulas.length,25);assert.equal(r.resources.length,25);assert.equal(r.bindings.length,16);
 assert(parent.parameters.every(parameter=>parameter.truth_metadata?.contract===publisherContract));
 const parentParameterIds=new Set(parent.parameters.map(parameter=>parameter.parameter_id));
 const addedParameters=r.parameters.filter(parameter=>!parentParameterIds.has(parameter.parameter_id));
 assert.equal(addedParameters.length,1);
 // Keep the existing delivery publisher contract, including its server-derived trip provenance.
 // The added layout fact carries its feature identity before either dependent digest is calculated.
 addedParameters[0]!.truth_metadata={...addedParameters[0]!.truth_metadata,
  contract:publisherContract,featureContract:contract};
 r.baseline.parameter_schema_sha256=hash(r.parameters.map(parameter=>({parameterId:parameter.parameter_id,
  unitId:parameter.unit_id,valueType:parameter.value_type,constraints:parameter.constraints_json,truth:parameter.truth_metadata})));
 const parentRowIds=new Map(parent.resources.map(row=>[String(row.id),String(row.row_id)]));
 const bindingRowId=(binding:Json)=>{
  const rowId=parentRowIds.get(String(binding.resource_spec_id));
  assert(rowId,'EXACT_PARENT_BINDING_RESOURCE_REQUIRED');
  assert(binding.row_id===undefined||binding.row_id===rowId,'BINDING_ROW_IDENTITY_DRIFT');
  return rowId;
 };
 const representative={...r,bindings:r.bindings.map(binding=>({...binding,row_id:bindingRowId(binding)}))};
 const definitionSha256=hash({contract,parentDefinitionSha256:parent.definition.definition_sha256,
  parameters:r.parameters,formulas:r.formulas,resources:r.resources});
 const decision:Json={...parent.passport.decision,status:'GREEN',allowed:true,waveContract:publisherContract,
  quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,
  activationAllowed:false,productionEligible:false,
  factoryHalfCurrentR3:{...r.passport.decision.factoryHalfCurrentR3,featureContract:contract,
   governedDraftOnly:true,installationAcceptance:false}};
 const plan=createCanonicalDefinitionClonePlan({contract:publisherContract,
  definition:{id:definitionId,releaseId:input.releaseId,catalogId,definitionVersion:3,
   passport:parent.definition.passport,applicability:r.definition.applicability,definitionSha256,
   sourceMetadata:{...parent.definition.source_metadata,contract,masterSha256:input.masterSha256,
    predecessorDefinitionId:parent.definition.id,sourcePreimageSha256:prepared.sourcePreimageSha256,
    preservedDelivery:true,activationAllowed:false,productionEligible:false}},
  representative,parameterTruthMetadata:p=>({...p.truth_metadata}),
  resourceId:row=>uuid([definitionId,row.row_id]),resourceSemanticOwner:row=>String(row.semantic_owner??`${catalogId}:${row.row_id}`),
  resourceSha256:row=>hash(row),
  baseline:{id:baselineId,key:`${contract}:${definitionId}`,sourceDefinitionVersionId:parent.definition.id,
   supersedesBaselineId:parent.baseline.id,acceptedReleaseId:input.releaseId,acceptanceEvidenceSha256:input.evidenceSha256,
   validationScenarioRefs:[...(parent.baseline.validation_scenario_refs??[]),
    {scenario:'CURRENT_V2_TO_V3_FACTORY_HALF_5250_BY_4000',factoryFullPieces:80,factoryHalfPieces:8,
     actualEndPlanConfirmationRequired:true,realProject:false,acceptanceEvidenceSha256:input.evidenceSha256}]},
  passport:{physicalResultRu:parent.passport.physical_result_ru,excludedScopeRu:parent.passport.excluded_scope_ru,
   decision,payloadSha256:hash({definitionSha256,decision}),sourceHead:input.sourceHead,sourceTree:input.sourceTree},
  bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:16});
 assert(canonicalPublisherQuantityScopeIsConsistent(plan),'UNCHANGED_UNRESOLVED_SCOPE_REQUIRED');
 const rowIds=new Map(plan.resources.map(row=>[row.id,row.row_id]));
 const orderedBindings=(bindings:Json[])=>bindings.sort((a,b)=>String(a.row_id).localeCompare(String(b.row_id))
  ||String(a.locator_id).localeCompare(String(b.locator_id)));
 assert.deepEqual(orderedBindings(plan.bindings.map(b=>({row_id:rowIds.get(String(b.resource_spec_id)),
  locator_id:b.locator_id,applicability:b.applicability}))),
  orderedBindings(parent.bindings.map(b=>({row_id:bindingRowId(b),locator_id:b.locator_id,applicability:b.applicability}))));
 return {plan,sourcePreimageSha256:prepared.sourcePreimageSha256,
  sameRowManualFieldBindings:prepared.sameRowManualFieldBindings,
  manualPriceMigrationBindings:prepared.manualPriceMigrationBindings,
  automaticGenericPriceInheritanceAllowed:false,preservedNormativeBindingCount:16,
  publicationReady:false,runtimeAccepted:false};
}
