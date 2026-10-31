import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {facadeFamilyReadyRecipesR2 as ready,facadeFamilyHeldRecipesR3 as held,
 assertFacadeReadyRecipeIdentitiesR3 as identities,assertFacadeReadyPublicationRouteR3 as route} from './facadeFamilyReadyRecipesR2';
import {resolveFacadeFamilyReadyRecipeR3 as select,runFacadeFamilyReadyCheckR3 as dispatch} from './runFacadeFamilyReadyCheckR3';
import {runFacadeSteelSidingReadyCheckR2 as legacySteel} from './runFacadeSteelSidingReadyCheckR2';
import {runMasterSingleDefinitionSuccessorR1 as publisher} from './prepareMasterSingleDefinitionSuccessorR1';

// Only the side-effecting publisher is replaced. The production READY/HOLD
// declarations, resolver, common entry and legacy entry are the actual modules.
jest.mock('./prepareMasterSingleDefinitionSuccessorR1',()=>({
 ...jest.requireActual('./prepareMasterSingleDefinitionSuccessorR1'),
 runMasterSingleDefinitionSuccessorR1:jest.fn(async()=>{throw Error('UNEXPECTED_PUBLICATION_CALL');}),
}));

const envKeys=['GOX_FACADE_PARENT_RELEASE_ID','GOX_FACADE_PARENT_SEARCH_RELEASE_ID','GOX_FACADE_OUTPUT_DIRECTORY',
 'GOX_FACADE_TECHNOLOGY_KEY','GOX_FACADE_CATALOG_ID'] as const;
const original=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
const snapshot=ready.map(r=>({...r})),heldSnapshot=held.map(r=>({...r}));
const mockedPublisher=publisher as jest.MockedFunction<typeof publisher>;
const raw=process.env.FACADE_OWNER_DISPATCH_RAW_DIR;
let completed=0;
const dump=(value:unknown)=>{if(raw){mkdirSync(raw,{recursive:true});writeFileSync(resolve(raw,'owner-dispatch-proof.json'),JSON.stringify(value,null,2)+'\n');}};
beforeEach(()=>{for(const key of envKeys)delete process.env[key];mockedPublisher.mockClear();});
afterEach(()=>{
 assert.equal(mockedPublisher.mock.calls.length,0,'NO_PUBLISHER_CALL_FROM_FOCUSED_GATE');
 assert.deepEqual(ready,snapshot,'ACTUAL_READY_REGISTRY_NOT_REPLACED_OR_MUTATED');assert.deepEqual(held,heldSnapshot);
 for(const key of envKeys){const value=original[key];if(value===undefined)delete process.env[key];else process.env[key]=value;}
 completed++;dump({completedFocusedCases:completed,ready:5,held:2,publisherCalls:0,canonicalCoreCalls:0,SQL:0,registryReplaced:false,
  actualResolverAndEntries:true,newFULL:0});
});

describe('owner dispatch',()=>{
 test('actual finite registry has five admitted entries and two exact owner HOLD declarations',()=>{
  assert.deepEqual(ready.map(r=>r.technologyKey),['insulated_thin_render_whole_profiles','face_brick_cladding','natural_stone_mortar_cladding','ceramic_tile_mortar_cladding','improved_cement_lime_render']);
  assert.deepEqual(held.map(r=>r.technologyKey),['insulated_steel_siding_historical','insulated_ventilated_porcelain']);
  assert(held.every(r=>r.route==='HOLD'&&r.existingPublicOwner==='canonical-work:expanded:ventilated_facade'));
  assert(held.every(r=>!('configFactory'in r)));identities([...ready,...held]);
 });
 test('actual resolver selects each of the five entries by exact key, catalog and their consistent pair',()=>{
  for(const r of ready){assert.equal(select({technologyKey:r.technologyKey}),r);assert.equal(select({catalogId:r.catalogId}),r);
   assert.equal(select({technologyKey:r.technologyKey,catalogId:r.catalogId}),r);route(r.route);}
  assert.deepEqual([...new Set(ready.map(r=>r.route))].sort(),['NORMAL_CATALOG_APPEND','RETAINED_PARENT_SUCCESSOR']);
 });
 test('actual resolver rejects either declared HOLD by exact key or proposed catalog',()=>{
  for(const r of held){assert.throws(()=>select({technologyKey:r.technologyKey}),{code:'GOX_FACADE_TECHNOLOGY_HELD'});
   assert.throws(()=>select({catalogId:r.catalogId}),{code:'GOX_FACADE_TECHNOLOGY_HELD'});
   assert.throws(()=>select({technologyKey:r.technologyKey,catalogId:ready[0]!.catalogId}),{code:'GOX_FACADE_TECHNOLOGY_HELD'});}
 });
 test('actual common entry rejects both HOLDs before release context, Config or publisher',async()=>{
  for(const r of held){await assert.rejects(()=>dispatch({technologyKey:r.technologyKey}),{code:'GOX_FACADE_TECHNOLOGY_HELD'});
   await assert.rejects(()=>dispatch({catalogId:r.catalogId}),{code:'GOX_FACADE_TECHNOLOGY_HELD'});}
  assert(envKeys.every(key=>process.env[key]===undefined),'NO_VALIDATION_DB_OR_RELEASE_CONTEXT_WAS_REQUIRED');
 });
 test('legacy steel entry uses the same held fixed key even when the environment requests a valid different work',async()=>{
  process.env.GOX_FACADE_TECHNOLOGY_KEY=ready[0]!.technologyKey;process.env.GOX_FACADE_CATALOG_ID=ready[0]!.catalogId;
  await assert.rejects(()=>legacySteel(),{code:'GOX_FACADE_TECHNOLOGY_HELD'});
 });
 test('actual resolver and common entry reject unknown or conflicting selectors without publication',async()=>{
  for(const selection of [{technologyKey:'unknown_facade_work'},{catalogId:'canonical-work:unknown:facade'},{}]){
   assert.throws(()=>select(selection),{code:'GOX_FACADE_FINITE_REGISTERED_TECHNOLOGY_REQUIRED'});
   await assert.rejects(()=>dispatch(selection),{code:'GOX_FACADE_FINITE_REGISTERED_TECHNOLOGY_REQUIRED'});
  }
  assert.throws(()=>select({technologyKey:ready[0]!.technologyKey,catalogId:ready[1]!.catalogId}),{code:'GOX_FACADE_READY_SELECTION_MISMATCH'});
  for(const technologyKey of [' ',ready[0]!.technologyKey+' ',null,1])assert.throws(()=>select({technologyKey}),{code:'GOX_FACADE_READY_SELECTION_INVALID'});
 });
 test('the reusable production identity policy rejects duplicate keys and duplicate catalogs in finite data',()=>{
  assert.throws(()=>identities([...ready,ready[0]!]),{code:'GOX_FACADE_READY_SELECTION_AMBIGUOUS'});
  assert.throws(()=>identities([...ready,{technologyKey:'another_exact_work',catalogId:ready[0]!.catalogId}]),{code:'GOX_FACADE_READY_SELECTION_AMBIGUOUS'});
  assert.throws(()=>identities([...ready,{technologyKey:ready[0]!.technologyKey,catalogId:'canonical-work:test:another'}]),{code:'GOX_FACADE_READY_SELECTION_AMBIGUOUS'});
  assert.throws(()=>identities([{technologyKey:' ',catalogId:'canonical-work:test:invalid'}]),{code:'GOX_FACADE_READY_IDENTITY_INVALID'});
 });
 test('the same production route policy admits only the two normal publisher routes',()=>{
  route('NORMAL_CATALOG_APPEND');route('RETAINED_PARENT_SUCCESSOR');
  for(const value of ['HOLD','REUSE_EXISTING_PUBLISHED_CURRENT_DEFINITIONS','UNKNOWN','',undefined,null])
   assert.throws(()=>route(value),{code:'GOX_FACADE_READY_ROUTE_NOT_SUPPORTED'});
 });
});
