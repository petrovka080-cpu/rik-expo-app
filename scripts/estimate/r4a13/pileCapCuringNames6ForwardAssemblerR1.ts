import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import pins from '../../../data/estimate-benchmarks/fixtures/pile-cap-curing-names-six-current-parents-r1.json';
import {createCanonicalDefinitionClonePlan,type CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';

export const pileCapCuringNames6ContractR1='rik-expo-app.pile-cap-curing-names-six.r1';
const publisherContract='rik-expo-app.curing36-individual-materials.r1';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
const normalized=(v:string)=>v.toLocaleLowerCase('ru-RU').replace(/ё/gu,'е').replace(/[^0-9a-zа-я]+/gu,' ').trim();

export function assemblePileCapCuringNames6ForwardR1(input:Readonly<{parents:readonly Json[];searchDocuments:readonly Json[];releaseId:string;
 sourceHead:string;sourceTree:string;sourceFingerprint:string;sourceFreezeSha256:string;masterSha256:string;acceptanceEvidenceSha256:string}>){
 assert.equal(input.parents.length,54,'EXACT_FINAL54_CONTEXT_REQUIRED');
 assert.equal(new Set(input.parents.map(p=>p.definition.catalog_id)).size,54);
 assert.equal(input.searchDocuments.length,54);
 const models:Json[]=[],preservedCatalogIds:string[]=[];
 for(const parent of input.parents){
  const d=parent.definition,catalogId=String(d.catalog_id),pin=pins.parents.find(p=>p.catalogId===catalogId);
  assert(pin,'EXACT_FINAL54_PARENT_REQUIRED');assert.equal(d.id,pin.definitionId);assert.equal(d.definition_version,pin.definitionVersion);assert.equal(d.definition_sha256,pin.definitionSha256);
  if(!pin.changeRequired){preservedCatalogIds.push(catalogId);continue;}
  assert(typeof pin.oldTitleRu==='string'&&typeof pin.newTitleRu==='string'&&typeof pin.oldShortScopeRu==='string','EXACT_NAMING_CAPTIONS_REQUIRED');
  assert.equal(parent.parameters.length,108);assert.equal(parent.formulas.length,46);assert.equal(parent.resources.length,46);assert.equal(parent.bindings.length,16);
  const primary=parent.parameters.filter((p:Json)=>p.parameter_id==='cured_concrete_volume_m3');
  assert(primary.length===1&&primary[0].unit_id==='m3'&&primary[0].value_type==='decimal'
   &&primary[0].truth_metadata.semantic_parameter_key===catalogId+':cured_concrete_volume_m3'
   &&d.applicability.primaryMeasureParameterId==='cured_concrete_volume_m3','RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED');
  assert.equal(d.source_metadata.contract,publisherContract);assert.equal(parent.passport.decision.waveContract,publisherContract);
  assert(parent.parameters.every((p:Json)=>p.default_value==null&&p.truth_metadata.contract===publisherContract),'PRESERVED_PARAMETER_CONTRACT_REQUIRED');
  assert.equal(d.passport.canonicalRuName,pin.oldTitleRu);assert.equal(d.passport.physicalResultRu,pin.oldTitleRu);assert.equal(parent.passport.physical_result_ru,pin.oldTitleRu);
  assert(pin.oldTitleRu.includes('бетоном пьедестала'));assert.equal(pin.newTitleRu,pin.oldTitleRu.replace('бетоном пьедестала','бетоном ростверка'));
  const search=input.searchDocuments.filter(s=>s.catalog_id===catalogId);assert.equal(search.length,1);const s=search[0];
  assert.equal(s.definition_version_id,d.id);assert.equal(s.canonical_name_ru,pin.oldTitleRu);assert.equal(s.short_scope_ru,pin.oldShortScopeRu);
  assert.equal(s.normalized_canonical_name,normalized(pin.oldTitleRu));assert.deepEqual(s.normalized_aliases,s.aliases.map(normalized));
  const resources:Json[]=structuredClone(parent.resources);
  for(const r of resources){const operation=r.resource_graph.operationCompositionV1;assert.equal(operation.groupId,catalogId);assert.equal(operation.groupTitleRu,pin.oldTitleRu);operation.groupTitleRu=pin.newTitleRu;}
  const definitionPassport={...structuredClone(d.passport),canonicalRuName:pin.newTitleRu,physicalResultRu:pin.newTitleRu};
  const contract=pileCapCuringNames6ContractR1,definitionSha256=hash({contract,catalogId,passport:definitionPassport,parameters:parent.parameters,formulas:parent.formulas,resources,bindings:parent.bindings});
  const definitionId=uuid([input.sourceFingerprint,contract,catalogId,'definition']),baselineId=uuid([input.sourceFingerprint,contract,catalogId,'baseline']);
  const plan=createCanonicalDefinitionClonePlan({contract:publisherContract,
   definition:{id:definitionId,releaseId:input.releaseId,catalogId,definitionVersion:pin.definitionVersion+1,definitionSha256,passport:definitionPassport,applicability:structuredClone(d.applicability),
    sourceMetadata:{...d.source_metadata,namingCorrectionContract:contract,namingOnlyCorrection:true,sourceFingerprint:input.sourceFingerprint,masterSha256:input.masterSha256,sourceFreezeSha256:input.sourceFreezeSha256,
     predecessorDefinitionId:d.id,predecessorBaselineLeafId:parent.baseline.id,physicalAndPriceBindingsUnchanged:true,activationAllowed:false,productionEligible:false}},
   representative:{parameters:structuredClone(parent.parameters),formulas:structuredClone(parent.formulas),resources,
    bindings:parent.bindings.map((b:Json)=>({row_id:b.row_id,locator_id:b.locator_id,applicability:b.applicability})),baseline:structuredClone(parent.baseline),passport:structuredClone(parent.passport)},
   parameterTruthMetadata:p=>structuredClone(p.truth_metadata),resourceId:r=>uuid([input.sourceFingerprint,contract,catalogId,'resource',r.row_id]),resourceSemanticOwner:r=>String(r.semantic_owner),resourceSha256:r=>hash({contract,catalogId,resource:r}),
   baseline:{id:baselineId,key:`${contract}:${input.sourceFingerprint}:${catalogId}`,sourceDefinitionVersionId:d.id,supersedesBaselineId:parent.baseline.id,acceptedReleaseId:input.releaseId,
    acceptanceEvidenceSha256:input.acceptanceEvidenceSha256,validationScenarioRefs:structuredClone(parent.baseline.validation_scenario_refs)},
   passport:{physicalResultRu:pin.newTitleRu,excludedScopeRu:structuredClone(parent.passport.excluded_scope_ru),decision:structuredClone(parent.passport.decision),
    payloadSha256:hash({definitionSha256,physicalResultRu:pin.newTitleRu,decision:parent.passport.decision}),sourceHead:input.sourceHead,sourceTree:input.sourceTree},
   bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:16});
  assert.deepEqual(prices(plan),prices(parent as any),'NAMING_CORRECTION_CHANGED_MANUAL_PRICE_BINDINGS');
  assert.deepEqual(exclusions(plan),exclusions(parent as any),'NAMING_CORRECTION_CHANGED_MANUAL_EXCLUSION_BINDINGS');
  const name=normalized(pin.newTitleRu),terms=[...new Set([s.normalized_catalog_id,name,...name.split(' '),...s.normalized_aliases,...s.normalized_aliases.flatMap((a:string)=>a.split(' '))])];
  const searchPatch={canonical_name_ru:pin.newTitleRu,short_scope_ru:s.short_scope_ru.replace(pin.oldTitleRu,pin.newTitleRu),normalized_canonical_name:name,normalized_search_terms:terms,normalized_search_blob:terms.join('\u001f')};
  models.push({plan,parentDefinitionId:d.id,primaryMeasureParameterId:'cured_concrete_volume_m3',searchPatch,newTitleRu:pin.newTitleRu,parameterSchemaUnchanged:true,formulaAstsUnchanged:true});
 }
 assert.equal(models.length,6);assert.equal(preservedCatalogIds.length,48);
 return {contract:pileCapCuringNames6ContractR1,models,preservedCatalogIds,automaticHistoricalRowMigrationPerformed:false,engineeringAccepted:false};
}
