import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,linkSync} from 'node:fs';
import {resolve,dirname,join,isAbsolute} from 'node:path';
import {masonryBrickColumnWholePackR117 as columnPack} from '../../../src/lib/estimate/v4/masonryBrickColumnSixProfileWholeNormalR117';
import {masterScopedNormativeRegistryCaptureSha256R1,type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as digest} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasonryBrickColumnExistingContextR161} from './prepareMasonryBrickColumnExistingOwnerR161';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fixture from '../../../data/estimate-benchmarks/fixtures/masonry-brick-column-existing-owner-finite-r161.json';
import {masonryBrickColumnExistingConfigR161,masonryBrickColumnExistingActualEntriesR161} from './prepareMasonryBrickColumnExistingOwnerR161';

test('existing column: normal pure plus exact44native/6included proof before one TEST_ONLY native-priced case',{timeout:110000},async()=>{
 const sourceRoot=process.env.MASONRY_R161_SOURCE_ROOT,outputRoot=process.env.MASONRY_R161_ACTUAL_OUTPUT,
  masterPath=process.env.MASONRY_R161_MASTER_PATH,masterSha256=process.env.MASONRY_R161_MASTER_SHA256,expectedBranch=process.env.MASONRY_R161_EXPECTED_BRANCH;
 assert(sourceRoot&&outputRoot&&masterPath&&masterSha256&&expectedBranch,'ROOT_FRESH_CURRENT_CUT_AND_CONTEXT_REQUIRED');
 const config=masonryBrickColumnExistingConfigR161({sourceRoot,outputRoot,masterPath,masterSha256,expectedBranch,releaseId:fixture.releaseId,searchReleaseId:fixture.searchReleaseId});
 assert.equal(config.catalogId,'canonical-work:base:masonry_interior_column_lay_standard');assert.equal(config.catalogAppend,undefined);
 assert.equal(config.parameterDefinitions.length,105);assert.equal(config.resourceDefinitions.length,177);assert.equal(config.runtimeProfileInput&&Object.keys(config.runtimeProfileInput).length,0);
 assert(config.binding.retainParentBindings);assert.equal(masonryBrickColumnExistingActualEntriesR161(),0);
 const final=await config.verifyCore();assert.equal(masonryBrickColumnExistingActualEntriesR161(),1);
 assert.equal(final.actualEntries,1);assert.equal(final.results,1);assert.equal(final.quantitative19Replay,0);assert.equal(final.full,false);
});

// This test has no fabricated successful receipt or future UUID fixture. ROOT
// may run ONLY this named test after a real opening APPLY + fresh R70/scoped
// capture, supplying its actual context. It never calls core or publisher.
test('root second release binding: rejects mutations of actual committed opening evidence without core',{timeout:110000},()=>{
 const contextPath=process.env.MASONRY_R161_SECOND_RELEASE_CONTEXT_PATH;
 assert(contextPath,'ACTUAL_ROOT_POST_OPENING_CONTEXT_REQUIRED_NO_SYNTHETIC_SUCCESS');
 const context:MasonryBrickColumnExistingContextR161=JSON.parse(readFileSync(contextPath,'utf8'));
 const proof=context.rootSecondReleaseBindingR161;assert(proof);
 mkdirSync(context.outputRoot,{recursive:true});
 assert.equal(masonryBrickColumnExistingActualEntriesR161(),0);
 const config=masonryBrickColumnExistingConfigR161(context);
 assert.equal(config.parentReleaseId,context.releaseId);assert.equal(config.parentSearchReleaseId,context.searchReleaseId);
 assert.notEqual(config.parentReleaseId,fixture.releaseId);assert.notEqual(config.parentSearchReleaseId,fixture.searchReleaseId);
 assert.equal(config.catalogAppend,undefined);assert(config.verifyTargetPrecondition);assert(config.capturedScopedNormativeRegistry);
 assert.equal(config.parameterDefinitions.length,105);assert.equal(config.formulaDefinitions.length,177);assert.equal(config.resourceDefinitions.length,177);
 const retained=config.binding.retainParentBindings;assert(retained);assert.equal(retained.capturedParent.definition.definition_version,3);
 assert.notEqual(retained.capturedParent.definition.release_id,context.releaseId,'OLD_DEFINITION_RELEASE_ID_STAYS_HISTORICAL');
 assert.deepEqual(retained.capturedSourcePreimage,{sourceKey:config.sourceId,expected:null});
 assert.equal(config.binding.reuseExistingNormativeRegistry,undefined);
 assert.equal(config.passport.unresolvedApplicableResourceRowIds?.length,68);
 const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
 type Json=Record<string,unknown>;
 function rec(value:unknown):Json{assert(value!==null&&typeof value==='object'&&!Array.isArray(value));return value as Json;}
 function rows(value:unknown):unknown[]{assert(Array.isArray(value));return value;}
 type Artifact='openingReceipt'|'parentSnapshot'|'scopedRegistry';
 function negativeArtifact(name:Artifact,tag:string,mutate:(value:Json)=>void):MasonryBrickColumnExistingContextR161{
  // Only this newly created negative namespace is edited. Historical source
  // inputs are linked read-only by this test; pinned evidence gets fresh copies.
  const root=mkdtempSync(join(context.outputRoot,'column-release-negative-'+tag+'-'));
  const logicals=['data/estimate-benchmarks/fixtures/masonry-column-current-full-parent-r161.json',
   ...[columnPack.immutableOriginal03Pack,columnPack.immutableAccepted03_04WholePack,columnPack.immutableAccepted03_04IndependentMap,
    columnPack.immutableR116OwnFourProfileRoster,columnPack.immutableR116OwnFourProfileStageMap,columnPack.source].map(pin=>pin.path)];
  for(const logical of new Set(logicals)){
   if(isAbsolute(logical))continue;
   const target=resolve(root,logical);mkdirSync(dirname(target),{recursive:true});linkSync(resolve(context.sourceRoot,logical),target);
  }
  for(const key of ['openingReceipt','parentSnapshot','scopedRegistry'] as const){
   const pin=proof![key],target=resolve(root,pin.path);mkdirSync(dirname(target),{recursive:true});
   writeFileSync(target,readFileSync(resolve(context.sourceRoot,pin.path)),{flag:'wx'});
  }
  const pin=proof![name],path=resolve(root,pin.path),value=rec(JSON.parse(readFileSync(path,'utf8')));mutate(value);
  const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');writeFileSync(path,bytes);
  return{...context,sourceRoot:root,rootSecondReleaseBindingR161:{...proof!,[name]:{path:pin.path,sha256:hash(bytes)}}};
 }
 function reject(value:MasonryBrickColumnExistingContextR161,pattern:RegExp){
  assert.throws(()=>masonryBrickColumnExistingConfigR161(value),pattern);assert.equal(masonryBrickColumnExistingActualEntriesR161(),0);
 }
 const {rootSecondReleaseBindingR161:_omitted,...withoutOptIn}=context;
 assert.throws(()=>masonryBrickColumnExistingConfigR161(withoutOptIn),'NO_OPT_IN_MUST_KEEP_ORIGINAL_FIXTURE_PAIR_GUARD');
 reject({...context,rootSecondReleaseBindingR161:undefined},/MASONRY_COLUMN_ROOT_RELEASE_CONTEXT/);
 assert.notEqual(proof.currentPointerSha256,proof.parentSnapshot.sha256);
 reject({...context,rootSecondReleaseBindingR161:{...proof,currentPointerSha256:proof.parentSnapshot.sha256}},/CURRENT_POINTER_SHA/);
 reject({...context,releaseId:fixture.releaseId,searchReleaseId:fixture.searchReleaseId},/ACTUAL_SUCCESSOR_PAIR/);
 reject({...context,rootSecondReleaseBindingR161:{...proof,openingReceipt:{...proof.openingReceipt,sha256:proof.parentSnapshot.sha256}}},/ARTIFACT_SHA/);
 reject({...context,rootSecondReleaseBindingR161:{...proof,parentSnapshot:{...proof.parentSnapshot,path:'../outside.json'}}},/ARTIFACT_PIN/);
 reject(negativeArtifact('openingReceipt','body-checksum',value=>{value.mutationPerformed=false;}),/RECEIPT_SHA/);
 reject(negativeArtifact('openingReceipt','dry-run',value=>{
  value.mutationPerformed=false;value.idempotent=false;const {receiptSha256:_old,...body}=value;value.receiptSha256=digest(body);
 }),/COMMITTED_OPENING_RECEIPT/);
 reject(negativeArtifact('parentSnapshot','old-membership',value=>{rec(rows(value.membership)[0]).release_id=fixture.releaseId;}),/MANIFEST_ANCHOR_DRIFT/);
 reject(negativeArtifact('parentSnapshot','rewritten-definition-release',value=>{rec(rec(value.capture).definition).release_id=context.releaseId;}),/PARENT_FULL_CAPTURE_DRIFT/);
 reject(negativeArtifact('parentSnapshot','changed-legacy-resource',value=>{rec(rows(rec(value.capture).resources)[0]).title_ru='TEST_ONLY_NEGATIVE_CHANGED_RESOURCE';}),/PARENT_FULL_CAPTURE_DRIFT/);
 const actualScope=rec(JSON.parse(readFileSync(resolve(context.sourceRoot,proof.scopedRegistry.path),'utf8')));
 const openingSource=rows(actualScope.sourceRows).map(rec).find(row=>row.sourceKey==='source:masonry:glass-block:r103:opening-fill');assert(openingSource);
 reject(negativeArtifact('parentSnapshot','populated-source-preimage',value=>{value.newSources=[JSON.parse(String(openingSource.raw))];}),/NEW_SOURCE_NOT_EXACT/);
 reject(negativeArtifact('scopedRegistry','old-empty-scope',value=>{
  value.sourceRows=[];value.locatorRows=[];
  value.captureSha256=masterScopedNormativeRegistryCaptureSha256R1(value as unknown as Omit<MasterCapturedScopedNormativeRegistryR1,'captureSha256'>);
 }),/FRESH_SCOPE_MUST_RETAIN_OPENING/);
 reject(negativeArtifact('scopedRegistry','different-scope',value=>{
  rec(value.scope).normId='';value.captureSha256=masterScopedNormativeRegistryCaptureSha256R1(value as unknown as Omit<MasterCapturedScopedNormativeRegistryR1,'captureSha256'>);
 }),/EXACT_GENERATED_SCOPE/);
 assert.equal(masonryBrickColumnExistingActualEntriesR161(),0);
});
