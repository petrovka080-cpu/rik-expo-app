import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import currentRelease from '../../../data/estimate-benchmarks/r568-local-developer-canonical-release.json';
import {facadeVentilatedHplMasterConfigR5} from './prepareFacadeVentilatedHplExistingOwnerR5';
import {resolveMasterRetainedBaselineInputClassificationR1 as classify} from './prepareMasterSingleDefinitionSuccessorR1';

const expected={
  floors:{value:15,unit:'pcs'},
  facade_area_m2:{value:5000,unit:'m2'},
  source_prompt:{value:'Фасады, высотное остекление и доступ: монтаж вентилируемого фасада',unit:null},
};
function setup(){
  const config=facadeVentilatedHplMasterConfigR5({releaseId:currentRelease.definitionReleaseId,
    searchReleaseId:currentRelease.searchReleaseId,sourceRoot:resolve(__dirname,'../../..')});
  const retained=config.binding.retainParentBindings;assert(retained);
  return{config,retained};
}
type ClassificationInput=NonNullable<Parameters<typeof classify>[2]>;
function syntheticFixture(classes:Readonly<Record<string,string>>):ClassificationInput{
  // TEST_ONLY helper inputs, never a registered fixture/capture or source norm.
  const {retained}=setup(),capture=retained.capturedParent;
  return{capturedParent:{...capture,baseline:{...capture.baseline,
    input_classification:{...capture.baseline.input_classification,...classes}}},
    legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1',
      parameterSources:{TEST_ONLY_fixture:['TEST_ONLY_fixture_source'],TEST_ONLY_derived:['TEST_ONLY_fixture_source']}}};
}

describe('facade existing publisher retained baseline classification R5',()=>{
  test('keeps all three exact historical assumptions while runtime profiles stay empty',()=>{
    const {config,retained}=setup(),before=structuredClone(retained),baseline=retained.capturedParent.baseline;
    assert.deepEqual(config.runtimeProfileInput,{});assert.deepEqual(config.runtimeProfileClassification,{});assert.deepEqual(config.runtimeProfileSourceIds,{});
    assert.deepEqual(Object.keys(baseline.input_values).sort(),Object.keys(expected).sort());
    for(const[id,fact]of Object.entries(expected)){
      assert.deepEqual(baseline.input_values[id],fact.value);assert.equal(baseline.uom_by_parameter[id],fact.unit);
      assert.equal(baseline.input_classification[id],'ASSUMPTION');
      assert.equal(classify(id,config.runtimeProfileClassification??{},retained),'ASSUMPTION');
    }
    assert.deepEqual(retained,before);assert.deepEqual(config.runtimeProfileInput,{});
  },30000);

  test('keeps existing explicit new norm/derived and undeclared default fallback',()=>{
    const {retained}=setup(),runtime={TEST_ONLY_new_norm:'NORMATIVE',TEST_ONLY_new_derived:'DERIVED'};
    assert.equal(classify('TEST_ONLY_new_norm',runtime,retained),'NORMATIVE');
    assert.equal(classify('TEST_ONLY_new_derived',runtime,retained),'DERIVED');
    assert.equal(classify('TEST_ONLY_undeclared',runtime,retained),'VALIDATION_FIXTURE');
    assert.equal(classify('TEST_ONLY_undeclared',{},undefined),'VALIDATION_FIXTURE');
  },30000);

  test('rejects a declared template field with an invalid captured classification',()=>{
    const {retained}=setup();
    for(const id of Object.keys(expected)){
      const bad={...retained,capturedParent:{...retained.capturedParent,baseline:{...retained.capturedParent.baseline,
        input_classification:{...retained.capturedParent.baseline.input_classification,[id]:'VALIDATION_FIXTURE'}}}};
      assert.throws(()=>classify(id,{},bad),new RegExp('MASTER_RETAINED_BASELINE_CLASSIFICATION_INVALID:'+id));
    }
  },30000);

  test('preserves only the captured validation/derived fixture classification',()=>{
    const fixture=syntheticFixture({TEST_ONLY_fixture:'VALIDATION_FIXTURE',TEST_ONLY_derived:'DERIVED'}),before=structuredClone(fixture);
    assert.equal(classify('TEST_ONLY_fixture',{},fixture),'VALIDATION_FIXTURE');
    assert.equal(classify('TEST_ONLY_derived',{},fixture),'DERIVED');assert.deepEqual(fixture,before);
  },30000);

  test('rejects an invalid captured fixture classification',()=>{
    const fixture=syntheticFixture({TEST_ONLY_fixture:'ASSUMPTION',TEST_ONLY_derived:'DERIVED'});
    assert.throws(()=>classify('TEST_ONLY_fixture',{},fixture),/MASTER_RETAINED_BASELINE_CLASSIFICATION_INVALID:TEST_ONLY_fixture/);
  },30000);

  test('keeps both optional historical text values absent without inventing inputs',()=>{
    const {config,retained}=setup(),before=structuredClone(retained),baseline=retained.capturedParent.baseline;
    for(const id of ['project_location','drawings_or_specification']){
      assert.equal(Object.hasOwn(baseline.input_values,id),false);assert.equal(Object.hasOwn(baseline.input_classification,id),false);
      assert.equal(classify(id,config.runtimeProfileClassification??{},retained),'VALIDATION_FIXTURE');
      assert.equal(Object.hasOwn(config.runtimeProfileInput??{},id),false);
    }
    assert.deepEqual(retained,before);assert.deepEqual(config.runtimeProfileInput,{});
  },30000);
});
