// One exact current-v2 successor. The shared publisher remains the sole writer.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {createCanonicalDefinitionClonePlan,canonicalPublisherQuantityScopeIsConsistent} from './canonicalDefinitionPublisherR1';
import {prepareEuroflexFactoryHalfLayoutCurrentR3,type EuroflexCurrentContextR3} from './prepareEuroflexFactoryHalfLayoutCurrentR3';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

type Json=Record<string,any>;
const contract='rik-expo-app.euroflex-factory-half-current.r3';
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
 const definitionSha256=hash({contract,parentDefinitionSha256:parent.definition.definition_sha256,
  parameters:r.parameters,formulas:r.formulas,resources:r.resources});
 const decision:Json={...parent.passport.decision,status:'GREEN',allowed:true,waveContract:contract,
  quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,
  activationAllowed:false,productionEligible:false,
  factoryHalfCurrentR3:{...r.passport.decision.factoryHalfCurrentR3,governedDraftOnly:true,installationAcceptance:false}};
 const plan=createCanonicalDefinitionClonePlan({contract,
  definition:{id:definitionId,releaseId:input.releaseId,catalogId,definitionVersion:3,
   passport:parent.definition.passport,applicability:r.definition.applicability,definitionSha256,
   sourceMetadata:{...parent.definition.source_metadata,contract,masterSha256:input.masterSha256,
    predecessorDefinitionId:parent.definition.id,sourcePreimageSha256:prepared.sourcePreimageSha256,
    preservedDelivery:true,activationAllowed:false,productionEligible:false}},
  representative:r,parameterTruthMetadata:p=>({...p.truth_metadata}),
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
 assert.deepEqual(plan.bindings.map(b=>[b.locator_id,b.applicability]),parent.bindings.map(b=>[b.locator_id,b.applicability]));
 return {plan,sourcePreimageSha256:prepared.sourcePreimageSha256,
  sameRowManualFieldBindings:prepared.sameRowManualFieldBindings,
  manualPriceMigrationBindings:prepared.manualPriceMigrationBindings,
  automaticGenericPriceInheritanceAllowed:false,preservedNormativeBindingCount:16,
  publicationReady:false,runtimeAccepted:false};
}
