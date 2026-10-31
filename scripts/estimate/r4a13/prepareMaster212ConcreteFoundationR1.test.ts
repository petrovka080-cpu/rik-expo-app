/** Canonical Jest registration of the isolated source oracle; assertions preserved. */
import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import {master212ConcreteMasterConfigR1 as config}from'./prepareMaster212ConcreteFoundationR1';
import {MASTER212_CONCRETE_SUCCESSOR_PACK_R1 as pack,master212ConcreteCapturedRepresentativeR1 as captured,compileMaster212ConcreteSuccessorR1 as compile}from'../../../src/lib/estimate/v4/master212ConcreteFoundationSuccessorR1';
const root=process.cwd();
const snapshot=JSON.parse(readFileSync(root+'/'+pack.snapshotPath,'utf8'));
for(const t of pack.targets)test(t.kind+': actual standard config factory sourcepins, verifyCore and shortInput path',async()=>{
 const c=config({releaseId:snapshot.parentRelease.definitionReleaseId,searchReleaseId:snapshot.parentRelease.searchReleaseId,sourceRoot:root},t.catalogId);
 assert.equal(c.shortInput[pack.selectorId],pack.newChoiceRu);assert.equal(c.applicability.primaryMeasureSelectionV1.selectorParameterId,pack.selectorId);
 assert.deepEqual(c.runtimeProfileInput,captured(t.catalogId).baseline.input_values);assert.equal(c.passport.physicalResultRu,captured(t.catalogId).passport.physical_result_ru);
 for(const[id,value]of Object.entries(c.runtimeProfileInput!))assert.deepEqual(c.acceptanceInput[id],value,'Retained runtime fixture must match publisher acceptance input: '+id);
 assert.deepEqual(Object.keys(c.runtimeProfileClassification!).sort(),Object.keys(c.runtimeProfileInput!).sort());assert.deepEqual(Object.keys(c.runtimeProfileSourceIds!).sort(),Object.keys(c.runtimeProfileInput!).sort());
 assert.equal((await c.verifyCore()).status,'PASS_EXACT_PREPARATION_SUBWORK_WHOLE_FOUNDATION_REMAINS_PARTIAL');
 const model={...captured(t.catalogId),parameters:[...c.parameterDefinitions],formulas:[...c.formulaDefinitions],resources:[...c.resourceDefinitions]};
 const r=await compile(model,c.shortInput);assert.equal(r.rows.filter(r=>r.row_id.startsWith('master212:concrete-preparation:')).length,8);assert(r.preliminaryNeeds.length>50);
 for(const p of c.parameterDefinitions.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'))if(p.parameter_id.startsWith('m212_'))assert.deepEqual(c.binding.retainParentBindings!.newParameterSources[p.parameter_id]!.sourceIds,[]);
});
