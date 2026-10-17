import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import pins from '../../../data/estimate-benchmarks/fixtures/curing-control-eighteen-current-parents-r1.json';
import {createCanonicalDefinitionClonePlan,type CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalManualPriceMigrationBindings as bindings} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
export const curingControlTitles12ContractR1='rik-expo-app.curing-control-structure-titles12.r1';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
export function assembleCuringControlTitles12ForwardR1(input:Readonly<{parents:readonly Json[];releaseId:string;
 sourceHead:string;sourceTree:string;sourceFingerprint:string;sourceFreezeSha256:string;masterSha256:string;acceptanceEvidenceSha256:string}>){
 assert.equal(input.parents.length,18);assert.equal(new Set(input.parents.map(p=>p.definition.catalog_id)).size,18);
 const models:Json[]=[],preservedCatalogIds:string[]=[];
 for(const parent of input.parents){
  const d=parent.definition,catalogId=String(d.catalog_id),pin=pins.parents.find(p=>p.catalogId===catalogId);
  assert(pin,'CURING_CONTROL12_EXACT_PARENT_REQUIRED');assert.equal(d.id,pin.definitionId);assert.equal(d.definition_version,pin.definitionVersion);assert.equal(d.definition_sha256,pin.definitionSha256);
  const old=parent.resources.find((r:Json)=>r.row_id===pin.controlRowId);assert(old);assert.equal(old.row_sha256,pin.controlRowSha256);assert.equal(old.title_ru,pin.oldTitleRu);
  const primary=parent.parameters.filter((p:Json)=>p.parameter_id==='cured_concrete_volume_m3'),p=primary[0];
  if(primary.length!==1||p.unit_id!=='m3'||p.value_type!=='decimal'||p.truth_metadata?.semantic_parameter_key!==catalogId+':cured_concrete_volume_m3'||d.applicability.primaryMeasureParameterId!=='cured_concrete_volume_m3'){
   const error=new Error('RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED:'+catalogId) as Error&{code:string};error.code='RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED';throw error;
  }
  assert.equal(parent.parameters.length,108);assert.equal(parent.formulas.length,46);assert.equal(parent.resources.length,46);assert.equal(parent.bindings.length,16);
  if(!pin.changeRequired){preservedCatalogIds.push(catalogId);continue;}
  const parameters=structuredClone(parent.parameters),formulas=structuredClone(parent.formulas),resources:Json[]=structuredClone(parent.resources);
  assert(parameters.every((p:Json)=>p.default_value==null));
  resources.find(r=>r.row_id===pin.controlRowId)!.title_ru=pin.newTitleRu;
  const contract=curingControlTitles12ContractR1,definitionSha256=hash({contract,catalogId,parameters,formulas,resources});
  const definitionId=uuid([input.sourceFingerprint,contract,catalogId,'definition']),baselineId=uuid([input.sourceFingerprint,contract,catalogId,'baseline']);
  const decision={...parent.passport.decision,labelOnlyCorrection:true,engineeringAccepted:false,completeProjectEstimateAccepted:false,supplierOrderConfirmed:false,activationAllowed:false,productionEligible:false};
  // This delta changes a caption only. Keep the exact existing parameter and
  // decision contract; the title correction has separate authoring provenance.
  const publisherContract='rik-expo-app.curing18-individual-materials.r1';
  assert(d.source_metadata.contract===publisherContract&&parent.passport.decision.waveContract===publisherContract
   &&parameters.every((p:Json)=>p.truth_metadata?.contract===publisherContract),'CONTROL12_PUBLISHER_CONTRACT_REQUIRED');
  const plan=createCanonicalDefinitionClonePlan({contract:publisherContract,
   definition:{id:definitionId,releaseId:input.releaseId,catalogId,definitionVersion:9,definitionSha256,
    applicability:structuredClone(d.applicability),passport:structuredClone(d.passport),
    sourceMetadata:{...d.source_metadata,contract:publisherContract,titleCorrectionContract:contract,sourceFingerprint:input.sourceFingerprint,masterSha256:input.masterSha256,sourceFreezeSha256:input.sourceFreezeSha256,
     predecessorDefinitionId:d.id,predecessorBaselineLeafId:parent.baseline.id,titleOnlyCorrection:true,changedControlRowId:pin.controlRowId,physicalAndPriceBindingsUnchanged:true,activationAllowed:false,productionEligible:false}},
   representative:{parameters,formulas,resources,bindings:parent.bindings.map((b:Json)=>({row_id:b.row_id,locator_id:b.locator_id,applicability:b.applicability})),
    baseline:structuredClone(parent.baseline),passport:{contract_version:parent.passport.contract_version,included_scope_ru:structuredClone(parent.passport.included_scope_ru),capability_matrix:structuredClone(parent.passport.capability_matrix)}},
   parameterTruthMetadata:p=>structuredClone(p.truth_metadata),resourceId:r=>uuid([input.sourceFingerprint,contract,catalogId,'resource',r.row_id]),
   resourceSemanticOwner:r=>String(r.semantic_owner),resourceSha256:r=>hash({contract,catalogId,resource:r}),
   baseline:{id:baselineId,key:`${contract}:${input.sourceFingerprint}:${catalogId}`,sourceDefinitionVersionId:d.id,supersedesBaselineId:parent.baseline.id,
    acceptedReleaseId:input.releaseId,acceptanceEvidenceSha256:input.acceptanceEvidenceSha256,validationScenarioRefs:structuredClone(parent.baseline.validation_scenario_refs)},
   passport:{physicalResultRu:parent.passport.physical_result_ru,excludedScopeRu:structuredClone(parent.passport.excluded_scope_ru),decision,
    payloadSha256:hash({definitionSha256,decision}),sourceHead:input.sourceHead,sourceTree:input.sourceTree},
   bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:16});
  assert.deepEqual(bindings(plan),bindings(parent as any),'CONTROL_TITLE_CORRECTION_CHANGED_MANUAL_PRICE_BINDING');
  models.push({plan,primaryMeasureParameterId:'cured_concrete_volume_m3',changedRowId:pin.controlRowId,newTitleRu:pin.newTitleRu,
   searchPatch:{},parentDefinitionId:d.id,parameterSchemaUnchanged:true,formulaAstsUnchanged:true});
 }
 assert.equal(models.length,12);assert.equal(preservedCatalogIds.length,6);
 return {contract:curingControlTitles12ContractR1,models,preservedCatalogIds,automaticHistoricalRowMigrationPerformed:false,engineeringAccepted:false};
}
