import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {prepareWallCeramicCementExistingOwnerF271,type WallContextF271} from './prepareWallCeramicCementExistingOwnerF271';
test('existing wall01901 ordinary Config,source guards,6quantity cases and1known-price case',async()=>{
 const p=process.env.WALL_F271_CONTEXT_PATH;assert(p,'ROOT_PINNED_CONTEXT_REQUIRED');
 const context:WallContextF271=JSON.parse(readFileSync(p,'utf8'));
 const config=prepareWallCeramicCementExistingOwnerF271(context);
 await config.verifyCore();
});
