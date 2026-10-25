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
