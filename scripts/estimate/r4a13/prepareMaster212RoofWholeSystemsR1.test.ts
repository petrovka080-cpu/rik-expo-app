import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {master212RoofMasterConfigR1 as config,verifyMaster212RoofFamilyArithmeticR1 as arithmetic,assertMaster212RoofExactMachineAdmissionsR1 as machineGate} from './prepareMaster212RoofWholeSystemsR1';
import {MASTER212_ROOF_PACK_R1 as pack,master212RoofCapturedRepresentativeR1 as captured,compileMaster212RoofWholeSystemR1 as compile,master212RoofSourceIdForCatalogR1 as sourceFor,buildMaster212RoofWholeSystemSuccessorR1 as build} from '../../../src/lib/estimate/v4/master212RoofWholeSystemsR1';
import {canonicalPublisherQuantityScopeIsConsistent as quantityScopeGate} from './canonicalDefinitionPublisherR1';
import {buildMasterCapabilityMatrix,buildMasterScopeReadiness} from './prepareMasterSingleDefinitionSuccessorR1';
import {assertMasterSingleDefinitionCapturedSourcePreimageR1 as sourceGuard} from './masterSingleDefinitionAppendGuardsR1';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {prepareMasterRetainedBindingRepresentativeR1} from './masterSingleDefinitionRetainParentBindingsR1';
const root=(globalThis as any).__ROOF_FAMILY_SOURCE_ROOT__??process.cwd();
const snapshot=JSON.parse(readFileSync(root+'/'+pack.snapshotPath,'utf8'));
for(const t of pack.targets)test(t.kind+': ordinary config current exact parent, baseline provenance and honest machine admission',async()=>{
 const c=config({releaseId:snapshot.parentRelease.definitionReleaseId,searchReleaseId:snapshot.parentRelease.searchReleaseId,sourceRoot:root},t.catalogId),old=captured(t.catalogId);
 assert.equal(c.shortInput[pack.selectorId],t.newChoiceRu);assert.equal(c.applicability.primaryMeasureSelectionV1.selectorParameterId,pack.selectorId);
 assert.deepEqual(c.acceptanceInput,old.baseline.input_values);assert.deepEqual(c.runtimeProfileInput,old.baseline.input_values);
 assert.deepEqual(c.runtimeProfileClassification,old.baseline.input_classification);assert.deepEqual(c.runtimeProfileSourceIds,Object.fromEntries(Object.keys(old.baseline.input_values).map(id=>[id,old.baseline.normative_source_ids[id]])));assert.deepEqual(Object.keys(c.runtimeProfileSourceIds!).sort(),Object.keys(c.runtimeProfileInput!).sort());assert(!Object.hasOwn(c.runtimeProfileInput!,'q'));assert(!Object.hasOwn(c.runtimeProfileSourceIds!,'q'));assert.deepEqual(c.binding.retainParentBindings!.capturedParent.baseline.normative_source_ids,old.baseline.normative_source_ids);
 assert.equal(c.passport.physicalResultRu,old.passport.physical_result_ru);
 const added=c.resourceDefinitions.filter(r=>!old.resources.some(x=>x.row_id===r.row_id));let admitted=true;try{machineGate(t.catalogId,added);}catch(e){admitted=false;assert.match(String(e),/EXACT_MACHINE_REGISTRY_ADMISSION_REQUIRED/);}
 if(admitted)assert.equal((await c.verifyCore!() as any).newFullTechnologies,0);else await assert.rejects(()=>c.verifyCore!(),/EXACT_MACHINE_REGISTRY_ADMISSION_REQUIRED/);
 const model={...old,parameters:[...c.parameterDefinitions],formulas:[...c.formulaDefinitions],resources:[...c.resourceDefinitions]};
 const r=await compile(model,c.shortInput);assert.equal(r.rows.length,t.kind==='flat_mastic'?45:t.kind==='pitched_metal'?21:22);assert(r.preliminaryNeeds.length>30);
 for(const p of c.parameterDefinitions.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'))if(p.parameter_id.startsWith('m212_'))assert.deepEqual(c.binding.retainParentBindings!.newParameterSources[p.parameter_id]!.sourceIds,[]);
});
test('three deterministic catalog source keys preserve strict absent preimages and one literal evidence payload',()=>{const inputs={releaseId:snapshot.parentRelease.definitionReleaseId,searchReleaseId:snapshot.parentRelease.searchReleaseId,sourceRoot:root};const all=pack.targets.map(t=>config(inputs,t.catalogId));assert.equal(new Set(all.map(c=>c.sourceId)).size,3);for(const c of all){assert.equal(c.sourceId,sourceFor(c.catalogId));assert.deepEqual(c.binding.retainParentBindings!.capturedSourcePreimage,{sourceKey:c.sourceId,expected:null});sourceGuard({stopCode:'ROOF_TEST',sourceId:c.sourceId},c.binding.retainParentBindings!.capturedSourcePreimage,null,'BEFORE');assert.throws(()=>sourceGuard({stopCode:'ROOF_TEST',sourceId:c.sourceId},c.binding.retainParentBindings!.capturedSourcePreimage,{source_key:c.sourceId} as any,'BEFORE'),/CAPTURED_SOURCE_PREIMAGE_CHANGED/);assert.deepEqual(c.sourceMetadata,all[0]!.sourceMetadata);assert.deepEqual(c.locator,all[0]!.locator);assert(c.binding.retainParentBindings);}});
for(const t of pack.targets)test(t.kind+': real retained binder keeps captured source closure and q provenance',()=>{
 const cfg=config({releaseId:snapshot.parentRelease.definitionReleaseId,searchReleaseId:snapshot.parentRelease.searchReleaseId,sourceRoot:root},t.catalogId),old=captured(t.catalogId),c=cfg.binding.retainParentBindings!.capturedParent;
 const newSource={id:'TEST_ONLY_NEW_SOURCE',source_key:cfg.sourceId,title_ru:'TEST_ONLY',authority:'TEST_ONLY',official_url:pack.sourceArtifacts[0]!.officialUrl,artifact_sha256:pack.sourceArtifacts[0]!.sha256,effective_from:null,effective_to:null,metadata:{}};
 const newLocators=[{id:'TEST_ONLY_NEW_LOCATOR',source_id:newSource.id,locator_key:'TEST_ONLY_ROOF_FAMILY',locator:{},excerpt_sha256:pack.sourceArtifacts[0]!.sha256}];
 const bound=[cfg.binding.rowId,...cfg.binding.additionalRowIds!];
 const declaration={...old,parameters:[...cfg.parameterDefinitions],formulas:[...cfg.formulaDefinitions],resources:[...cfg.resourceDefinitions],newBindings:bound.map(rowId=>({row_id:rowId,locator_id:newLocators[0]!.id,applicability:{exactSource:true}})),successorProvenance:{contract:pack.contract,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:cfg.binding.retainParentBindings!.capturedParentSha256}};
 const result=prepareMasterRetainedBindingRepresentativeR1({config:cfg,newSource,newLocators},declaration as any);
 assert.equal(result.expectedNormativeBindingCount,c.bindings.length+bound.length);assert.deepEqual(result.normativeSourceIds.q,c.baseline.normative_source_ids.q);
 for(const id of Object.keys(c.baseline.normative_source_ids))assert.deepEqual(result.normativeSourceIds[id],c.baseline.normative_source_ids[id],id);
 assert(result.normativeSourceClosure.includes(cfg.sourceId));
});

for(const t of pack.targets)test(t.kind+': scoped new declarations retain old provenance, exact owners and literal source traces',()=>{
 const cfg=config({releaseId:snapshot.parentRelease.definitionReleaseId,searchReleaseId:snapshot.parentRelease.searchReleaseId,sourceRoot:root},t.catalogId),old=captured(t.catalogId),model=build(old),sourceId=sourceFor(t.catalogId);
 assert.notEqual(sourceId,pack.sourceId);
 for(const p of model.parameters.filter(p=>!old.parameters.some(x=>x.parameter_id===p.parameter_id))){
  const unresolved=p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM';
  assert.deepEqual(model.baseline.normative_source_ids[p.parameter_id],unresolved?[]:[sourceId]);
  assert.deepEqual(cfg.binding.retainParentBindings!.newParameterSources[p.parameter_id]!.sourceIds,unresolved?[]:[sourceId]);
  assert(!JSON.stringify(p).includes('"'+pack.sourceId+'"'));
  if(!unresolved){const guide=p.truth_metadata.guide;for(const key of ['guide_short_ru','source_role','guide_version','source_snapshot_hash','applicability','verified_at','source_locator'])assert.equal(typeof guide[key],'string',p.parameter_id+':'+key);assert.match(guide.source_snapshot_hash,/^[0-9a-f]{64}$/);assert.equal(guide.guide_validation_policy,'MANDATORY_BLOCK');}
 }
 for(const p of old.parameters)assert.deepEqual(model.baseline.normative_source_ids[p.parameter_id],old.baseline.normative_source_ids[p.parameter_id]);
 assert.deepEqual(model.baseline.input_values,old.baseline.input_values);
 assert.deepEqual(model.baseline.input_classification,old.baseline.input_classification);
 for(const row of old.resources){const actual=model.resources.find(x=>x.row_id===row.row_id)!;assert.deepEqual(actual.source_metadata,row.source_metadata);assert.equal(actual.cost_owner_id,row.cost_owner_id);}
 for(const row of model.resources.filter(p=>!old.resources.some(x=>x.row_id===p.row_id))){
  const{row_sha256,...body}=row;assert.equal(row_sha256,hash(body));
  assert(!JSON.stringify(row).includes('"'+pack.sourceId+'"'));
  if(row.source_metadata.sourceRole==='OFFICIAL_EXACT_WHOLE_ROOF_COLUMN')for(const trace of row.source_metadata.normativeTrace as any[]){assert.equal(trace.sourceId,sourceId);assert.equal(trace.source_id,sourceId);}
  if(row.resource_graph.wholeRoofComponentReuseM212R1)assert(row.source_metadata.normativeTrace?.length);
 }
 const gaps=cfg.passport.unresolvedApplicableResourceRowIds!;
 for(const id of old.passport.decision.unresolvedResourceRowIds)assert(gaps.includes(id),'RETAIN_OLD_SCOPE_GAP:'+id);
 assert.deepEqual(gaps,model.passport.decision.unresolvedResourceRowIds);
 const scopeInput=(ids:readonly string[])=>({parameters:cfg.parameterDefinitions,formulas:cfg.formulaDefinitions,resources:cfg.resourceDefinitions,baseline:model.baseline,passport:{decision:buildMasterScopeReadiness(ids,cfg.resourceDefinitions),capability_matrix:buildMasterCapabilityMatrix(ids,cfg.resourceDefinitions)}});
 assert(quantityScopeGate(scopeInput(gaps)),'WHOLE_RETAINED_AND_NEW_SCOPE_PASSPORT_MUST_PASS_UNCHANGED_PUBLISHER');
 assert(!quantityScopeGate(scopeInput(gaps.filter(id=>id!==old.passport.decision.unresolvedResourceRowIds[0]))),'OMITTING_ONE_OLD_GAP_MUST_FAIL');
 for(const e of model.passport.decision.independentCompletenessMap.entries)assert.equal(e.sourceId,sourceId);
});
test('source namespace rejects an unregistered catalog',()=>assert.throws(()=>sourceFor('canonical-work:base:foreign'),/EXACT_TWO_CURRENT_TARGET_REQUIRED/));
