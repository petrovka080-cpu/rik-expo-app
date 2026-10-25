import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {masonryGlassOpeningExistingConfigR223} from './prepareMasonryGlassOpeningExistingOwnerR223';
import {verifyMasonryGlassOpeningNativePriceHoldR223,masonryGlassOpeningPriceHoldActualEntriesR223}
 from './verifyMasonryGlassOpeningNativePriceHoldR223';

test('one priced source-cost HOLD case; prices and row requests grant no payment authority',async()=>{
 const sourceRoot=process.env.MASONRY_R223_SOURCE_ROOT;assert(sourceRoot);
 const config=masonryGlassOpeningExistingConfigR223({sourceRoot,releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',
  searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a',outputRoot:resolve(sourceRoot,'test-output-not-publication')});
 assert.equal(masonryGlassOpeningPriceHoldActualEntriesR223(),0);
 const result=await verifyMasonryGlassOpeningNativePriceHoldR223(config,sourceRoot);
 assert.equal(masonryGlassOpeningPriceHoldActualEntriesR223(),1);assert.equal(result.actualEntries,1);
 assert.equal(result.newCostAdmission,false);assert.equal(result.procurement,false);assert.equal(result.full,false);
 assert.equal(result.currentLabourOnlyTotal,'1955');assert.equal(result.referenceOnlyTotalNotAdmitted,'6434');
});
