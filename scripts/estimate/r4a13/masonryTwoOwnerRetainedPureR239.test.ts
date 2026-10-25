import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {masonryBrickColumnExistingConfigR161,masonryBrickColumnExistingPureR161,masonryBrickColumnExistingActualEntriesR161}
 from './prepareMasonryBrickColumnExistingOwnerR161';
import {masonryGlassOpeningExistingConfigR223,masonryGlassOpeningRetainedPureR223,masonryGlassOpeningActualEntriesR223}
 from './prepareMasonryGlassOpeningExistingOwnerR223';

test('two existing owners: original pure retained representatives only; no core or database',()=>{
 const root=process.env.MASONRY_R239_SOURCE_ROOT,output=process.env.MASONRY_R239_PURE_OUTPUT;
 assert(root&&output,'PINNED_SNAPSHOT_AND_FRESH_OUTPUT_REQUIRED');mkdirSync(output,{recursive:true});
 const save=(name:string,value:unknown)=>writeFileSync(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 const parent={releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a',sourceRoot:root,outputRoot:output};
 assert.equal(masonryBrickColumnExistingActualEntriesR161(),0);assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 save('00_ENTRY_BEFORE_ASSERTIONS',{columnCore:0,openingCore:0,selectedCallbacks:['masonryBrickColumnExistingPureR161','masonryGlassOpeningRetainedPureR223'],SQL:0});
 const column=masonryBrickColumnExistingConfigR161({...parent,masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt',
  masterSha256:'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40',expectedBranch:'codex/r4-a5-clean-08b18902'});
 const columnPure=masonryBrickColumnExistingPureR161(column,root);save('01_COLUMN_EXISTING_PURE_RETURN',columnPure);
 assert.equal(masonryBrickColumnExistingActualEntriesR161(),0);assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 const opening=masonryGlassOpeningExistingConfigR223(parent);
 const openingPure=masonryGlassOpeningRetainedPureR223(opening,root);save('02_OPENING_EXISTING_PURE_RETURN',openingPure);
 assert.equal(masonryBrickColumnExistingActualEntriesR161(),0);assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 save('FINAL_TWO_OWNER_PURE_R239',{status:'PASS_ORIGINAL_TWO_RETAINED_PURE_REPRESENTATIVES_NO_CORE_OR_DATABASE',columnPure,openingPure,
  columnCoreEntries:0,openingCoreEntries:0,pricedCore:0,SQL:0,publisher:0,newAdmission:false,FULL:false});
});
