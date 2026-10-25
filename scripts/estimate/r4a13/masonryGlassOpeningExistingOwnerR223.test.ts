import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {masonryGlassOpeningExistingConfigR223,masonryGlassOpeningActualEntriesR223,
 masonryGlassOpeningRetainedPureR223} from './prepareMasonryGlassOpeningExistingOwnerR223';
import {GLASS_OPENING_CHOICE_ID_R223 as selector,GLASS_OPENING_LEGACY_R223 as legacy,
 GLASS_OPENING_OWN_R223 as glass,GLASS_OPENING_AREA_R223 as area} from '../../../src/lib/estimate/v4/masonryGlassOpeningExistingOwnerR223';

const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);

/** One dependent fail-fast case. All ordinary retained/map/ownership guards
 * run before the first of eight markers. This is a finite WORK gate only. */
test('one existing opening card retains legacy and whole glass03/04 without q transfer',async()=>{
 const root=process.env.MASONRY_R223_SOURCE_ROOT;assert(root,'MASONRY_R223_SOURCE_ROOT_REQUIRED');
 const config=masonryGlassOpeningExistingConfigR223({sourceRoot:root,
  releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a',
  outputRoot:resolve(root,'test-output-not-publication')});
 assert.equal(config.catalogAppend,undefined);assert.equal(config.catalogId,'canonical-work:base:masonry_interior_opening_lay_standard');
 assert.equal(config.binding.retainParentBindings?.capturedParent.definition.id,'0907686f-95b4-55a7-838d-afc0743b151d');
 assert.deepEqual(config.runtimeProfileInput,{});assert.deepEqual(config.runtimeProfileClassification,{});assert.deepEqual(config.runtimeProfileSourceIds,{});
 const scope=config.parameterDefinitions.find(p=>p.parameter_id===selector);assert(scope);
 assert.equal(scope.truth_metadata.visibility_role,'USER_INPUT');assert.equal(scope.truth_metadata.value_source_role,'USER_INPUT');
 assert.equal(scope.default_value,null);assert(record(scope.constraints_json));assert.deepEqual(scope.constraints_json.values,[legacy,glass]);
 assert(record(scope.truth_metadata.provenance));
 assert.equal(scope.truth_metadata.provenance.consumer_input_role_v1,'OBJECT_FACT');
 assert.equal(scope.truth_metadata.provenance.project_approval_claimed,false);
 const oldQ=config.parameterDefinitions.find(p=>p.parameter_id==='q');assert(oldQ);assert.equal(oldQ.default_value,null);
 assert.equal(oldQ.unit_id,'m2');assert.equal(oldQ.truth_metadata.value_source_role,'VISIBLE_BASELINE_ASSUMPTION');
 assert.deepEqual(oldQ.truth_metadata.visible_when,{kind:'and',operands:[{kind:'selected',parameterId:selector,value:legacy},{kind:'literal',value:true}]});
 assert.equal(config.parameterDefinitions.find(p=>p.parameter_id===area)?.default_value,null);
 assert.equal(config.applicability.sourceProfileSelectionV1,undefined,'NO_NEW_SOURCE_PRODUCER');
 assert.equal(config.parameterDefinitions.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').length,20);
 assert.equal(config.resourceDefinitions.filter(r=>r.row_id.startsWith('masonry:glass-block:')).length,38);
 assert.equal(config.resourceDefinitions.filter(r=>r.row_id.startsWith('masonry_interior_opening_lay_standard_')).length,59);
 assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 masonryGlassOpeningRetainedPureR223(config,root);assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 assert(config.verifyCore);const result=await config.verifyCore();assert.equal(masonryGlassOpeningActualEntriesR223(),8);
 assert.equal(result.actualCoreEntries,8);assert.equal(result.results,5);assert.equal(result.ordinaryResults,4);
 assert.equal(result.preliminaryResults,1);assert.equal(result.rejects,3);assert.equal(result.full,false);
 const out=process.env.MASONRY_R223_ACTUAL_OUTPUT;assert(out);
 const final:unknown=JSON.parse(readFileSync(resolve(out,'FINAL_R223.json'),'utf8'));
 assert(final&&typeof final==='object');
});
