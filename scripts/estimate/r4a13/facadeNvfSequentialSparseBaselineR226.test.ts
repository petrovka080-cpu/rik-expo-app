import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {isAbsolute,resolve} from 'node:path';
import {buildMasterRetainedSparseBaselineMetadataR1,masterRetainedSparseBaselineMetadataMatchesR1}
  from './masterSingleDefinitionRetainParentBindingsR1';
import {facadeNvfSequentialSparseFixturesR226,facadeNvfSequentialSparseNegativeCasesR226,
  type SequentialSparseFixtureR226} from './facadeNvfSequentialSparseBaselineR226.fixtures';
import {facadeVentilatedSteelMasterConfigR5,verifyFacadeVentilatedSteelRetainedR5}
  from './prepareFacadeVentilatedSteelExistingOwnerR5';

const markerContract='master-retained-sparse-baseline-metadata/v1';
// Explicitly synthetic for pure metadata unit tests. It is never a publication,
// captured DB identity or an authenticated project/source assertion.
const TEST_ONLY_PREDECESSOR_CAPTURE_SHA256='e'.repeat(64);
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
let fixtures:readonly SequentialSparseFixtureR226[]=[];
let fixtureContext:Readonly<{releaseId:string;searchReleaseId:string;sourceRoot:string}>|null=null;
const model=(fixture:SequentialSparseFixtureR226)=>({baseline:{...fixture.representative,contract_version:'APPROVED_TEMPLATE_BASELINE_R54_V1'},parameters:fixture.model.parameters,
  formulas:fixture.model.formulas,resources:fixture.model.resources});
function withActualOwnerMarker(fixture:SequentialSparseFixtureR226){
  const next=structuredClone(fixture),input=model(next);
  // Use ROOT's actual common builder. The earlier subject proposal is not an emitter.
  next.representative.proposal_source_refs.push(buildMasterRetainedSparseBaselineMetadataR1(input,TEST_ONLY_PREDECESSOR_CAPTURE_SHA256));
  return next;
}

beforeAll(()=>{
  // ROOT's existing runner writes this small pinned test context from a held
  // accepted release/readset. No SQL, production fallback or invented release.
  const path=process.env.FACADE_NVF_SPARSE_FIXTURE_CONTEXT_JSON,expected=process.env.FACADE_NVF_SPARSE_FIXTURE_CONTEXT_SHA256;
  assert(path&&isAbsolute(path)&&expected&&/^[0-9a-f]{64}$/u.test(expected),'PINNED_EXISTING_SOURCE_FIXTURE_CONTEXT_REQUIRED');
  assert(statSync(path).size<=16*1024);const bytes=readFileSync(path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
  const value:unknown=JSON.parse(bytes.toString('utf8'));assert(record(value));
  assert(typeof value.releaseId==='string'&&typeof value.searchReleaseId==='string'&&typeof value.sourceRoot==='string');
  assert(isAbsolute(value.sourceRoot));assert.equal(resolve(value.sourceRoot),resolve(__dirname,'../../..'),'ONE_ACTUAL_SOURCE_ROOT');
  fixtureContext={releaseId:value.releaseId,searchReleaseId:value.searchReleaseId,sourceRoot:value.sourceRoot};
  fixtures=facadeNvfSequentialSparseFixturesR226(fixtureContext);
  assert.equal(fixtures.length,2);assert.equal(facadeNvfSequentialSparseNegativeCasesR226.length,11);
});

describe('owner dispatch existing NVF sequential sparse metadata coverage SOURCE_ONLY',()=>{
  test('changed common owner preserves existing exact R62 current-v6 retained guard without core',()=>{
    const context=fixtureContext;assert(context);const config=facadeVentilatedSteelMasterConfigR5(context);
    verifyFacadeVentilatedSteelRetainedR5(config,path=>resolve(context.sourceRoot,path));
  });
  test.each([
    ['CURRENT_V6_TO_STEEL',0,4,117,115],
    ['ACTUAL_STEEL_TO_PORCELAIN',1,7,197,195],
  ] as const)('%s preserves sparse input and metadata without invented values',(_name,index,inputs,classification,sources)=>{
    const fixture=fixtures[index];assert(fixture);const before=JSON.stringify(fixture);
    expect(masterRetainedSparseBaselineMetadataMatchesR1(model(fixture),TEST_ONLY_PREDECESSOR_CAPTURE_SHA256)).toBe(false);
    const marked=withActualOwnerMarker(fixture);
    expect(masterRetainedSparseBaselineMetadataMatchesR1(model(marked),TEST_ONLY_PREDECESSOR_CAPTURE_SHA256)).toBe(true);
    expect(masterRetainedSparseBaselineMetadataMatchesR1(model(marked),'f'.repeat(64))).toBe(false);
    expect([Object.keys(marked.representative.input_values).length,Object.keys(marked.representative.input_classification).length,
      Object.keys(marked.representative.normative_source_ids).length]).toEqual([inputs,classification,sources]);
    expect(marked.representative.input_values).toEqual(fixture.representative.input_values);
    expect(marked.representative.normative_source_ids).toEqual(fixture.representative.normative_source_ids);
    expect(marked.representative.formula_consumer_ids).toEqual(fixture.representative.formula_consumer_ids);
    expect(marked.representative.resource_consumer_row_ids).toEqual(fixture.representative.resource_consumer_row_ids);
    expect(JSON.stringify(fixture)).toBe(before);
    const duplicate=structuredClone(marked);const marker=duplicate.representative.proposal_source_refs.find(row=>row.contract===markerContract);assert(marker);
    duplicate.representative.proposal_source_refs.push(structuredClone(marker));
    expect(masterRetainedSparseBaselineMetadataMatchesR1(model(duplicate),TEST_ONLY_PREDECESSOR_CAPTURE_SHA256)).toBe(false);
  });

  test.each(facadeNvfSequentialSparseNegativeCasesR226)('rejects $name using existing common owner',negative=>{
    // Eleven named Jest cases, each checked against both source-model transitions.
    // They are not two extra publication/core runs, and do not assert DB capture.
    for(const fixture of fixtures){
      const original=JSON.stringify(fixture),mutated=negative.mutate(withActualOwnerMarker(fixture));
      if(negative.marker==='OMIT'){
        const refs=mutated.representative.proposal_source_refs;
        for(let i=refs.length-1;i>=0;i--)if(refs[i]!.contract===markerContract)refs.splice(i,1);
      }
      if(negative.marker==='STALE_SCHEMA'){
        const parameter=mutated.model.parameters[0];assert(parameter);parameter.title_ru+=' TEST_ONLY_SCHEMA_CHANGED_AFTER_MARKER';
      }
      expect(masterRetainedSparseBaselineMetadataMatchesR1(model(mutated),TEST_ONLY_PREDECESSOR_CAPTURE_SHA256)).toBe(false);
      expect(JSON.stringify(fixture)).toBe(original);
    }
  });
});
