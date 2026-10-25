import assert,{AssertionError} from 'node:assert/strict';
import {test} from 'node:test';
import {mkdirSync,writeFileSync,readFileSync,linkSync,mkdtempSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import displaySource from '../../../data/estimate-benchmarks/source-packs/masonry-glass-m25-display-link-r152.json';
import {masonryGlassOpeningExistingConfigR223,masonryGlassOpeningRetainedGuardInputR223,masonryGlassOpeningActualEntriesR223}
 from './prepareMasonryGlassOpeningExistingOwnerR223';

const historical='data/estimate-benchmarks/source-artifacts/masonry-r152/prepare-r152-historical-5af670e3.txt';
const current='scripts/estimate/r4a13/prepareMasonryGlassOpeningExistingOwnerR223.ts';
const currentColumn='scripts/estimate/r4a13/prepareMasonryBrickColumnExistingOwnerR161.ts';
const historicalTest='data/estimate-benchmarks/source-artifacts/masonry-r152/standalone-test-historical-1279a169.txt';
const capture='data/estimate-benchmarks/fixtures/masonry-opening-current-full-parent-r223.json';
const historicalSha='5af670e31fd37f9972285c64d96dacf10329fc08b6b3297c11a518f4d85e7529';
const currentSha='213efc975346f78c749e9168748eb3c0ec4ddbede21d9eb98b65b1e1a5335df1';
const currentColumnSha='a1e89aa7fb80bbaf344484537d9e118ecc2e60935d27d7101e1d12e37b363e37';
const historicalTestSha='1279a1690935cbb353386942ac7726ccbb9836976c489edc5cd40ed8df2ecfa6';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

test('existing opening: historical exact bytes are passive; wrong historical artifact fails the existing Config source guard',()=>{
 const root=process.env.MASONRY_R239_SOURCE_ROOT,output=process.env.MASONRY_R281_SOURCE_PIN_OUTPUT;
 assert(root&&output,'PINNED_ROOT_AND_FRESH_OUTPUT_REQUIRED');mkdirSync(output,{recursive:true});
 const save=(name:string,value:unknown)=>writeFileSync(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 const context={releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a',sourceRoot:root,outputRoot:output};
 assert.equal(hash(readFileSync(resolve(root,current))),currentSha);
 assert.equal(hash(readFileSync(resolve(root,currentColumn))),currentColumnSha);
 assert.equal(hash(readFileSync(resolve(root,historical))),historicalSha);
 assert.equal(hash(readFileSync(resolve(root,historicalTest))),historicalTestSha);
 assert.equal(displaySource.inputs.length,13);
 assert.deepEqual(displaySource.inputs.filter(pin=>pin.path===historical),[{path:historical,sha256:historicalSha}]);
 assert.deepEqual(displaySource.inputs.filter(pin=>pin.path===historicalTest),[{path:historicalTest,sha256:historicalTestSha}]);
 assert(!displaySource.inputs.some(pin=>pin.path===current));
 assert(!displaySource.inputs.some(pin=>pin.path==='scripts/estimate/r4a13/prepareMasonryGlassM25OperationDisplayR152.ts'||pin.path==='scripts/estimate/r4a13/masonryGlassM25OperationDisplayR152.test.ts'));
 assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 const valid=masonryGlassOpeningExistingConfigR223(context);
 const registryProposal=masonryGlassOpeningRetainedGuardInputR223(valid);
 save('00_CORRECT_PASSIVE_ARTIFACT_CONFIG_RETURN',{sourceId:valid.sourceId,normId:valid.normId,catalogId:valid.catalogId,
  locatorKey:valid.locator.key,sourceArtifact:valid.sourceMetadata.artifact_sha256,
  proposalSourceId:registryProposal.newSource.id,proposalLocatorIds:registryProposal.newLocators.map(row=>row.id),
  sourcePathsIncludesHistory:valid.sourcePaths.includes(historical),actualCoreEntries:masonryGlassOpeningActualEntriesR223(),
  sourceRegistryActual:'UNREAD',normalLocked:'UNRUN',publication:0,FULL:false});
 assert(valid.sourcePaths.includes(historical));assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 // Create a separate negative filesystem fixture. No immutable input, source-root
 // file, shared hardlink or canonical file is modified, renamed or deleted.
 const negative=mkdtempSync(join(output,'wrong-historical-'));
 for(const logical of [capture,...displaySource.inputs.map(pin=>pin.path)]){
  const target=resolve(negative,logical);mkdirSync(dirname(target),{recursive:true});
  if(logical===historical)writeFileSync(target,'TEST_ONLY_WRONG_HISTORICAL_SOURCE_PIN_R281\n',{flag:'wx'});
  else linkSync(resolve(root,logical),target);
 }
 const wrongSha=hash(readFileSync(resolve(negative,historical)));assert.notEqual(wrongSha,historicalSha);
 let failure:unknown;
 try{masonryGlassOpeningExistingConfigR223({...context,sourceRoot:negative});}catch(error){failure=error;}
 save('01_WRONG_HISTORY_RAW_BEFORE_ASSERT',{name:failure instanceof Error?failure.name:null,
  message:failure instanceof Error?failure.message:null,actual:failure instanceof AssertionError?failure.actual:null,
  expected:failure instanceof AssertionError?failure.expected:null,wrongSha,expectedSha:historicalSha,
  actualCoreEntries:masonryGlassOpeningActualEntriesR223(),sourceRegistryActual:'UNREAD',SQL:0,publisher:0,FULL:false});
 assert(failure instanceof AssertionError,'EXISTING_CONFIG_MUST_REJECT_WRONG_HISTORY_HASH');
 assert.equal(failure.actual,wrongSha);assert.equal(failure.expected,historicalSha);assert(failure.message.includes(historical));
 assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 assert.equal(hash(readFileSync(resolve(root,historical))),historicalSha);
 assert.equal(hash(readFileSync(resolve(root,historicalTest))),historicalTestSha);
 assert.equal(hash(readFileSync(resolve(root,current))),currentSha);
 assert.equal(hash(readFileSync(resolve(root,currentColumn))),currentColumnSha);
 save('FINAL_SOURCE_PIN_REPAIR_R281',{status:'PASS_EXISTING_CONFIG_HISTORICAL_PIN_FAIL_CLOSED_ONLY',
  configConstructions:2,negativeConfigRejects:1,core:0,SQL:0,publisher:0,sourceRegistryActual:'UNREAD',normalLocked:'UNRUN',FULL:false});
});
