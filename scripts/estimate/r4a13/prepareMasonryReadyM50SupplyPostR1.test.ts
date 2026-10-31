import assert from 'node:assert/strict';
import {readyM50PostConfigR1 as config,assertReadyM50PostPersonUnitR1 as unitGate} from './prepareMasonryReadyM50SupplyPostR1';
import {READY_M50_SUPPLY_POST_R1 as pack,readyM50PostCapturedRepresentativeR1 as captured} from '../../../src/lib/estimate/v4/masonryReadyM50SupplyPostR1';
import {normalizeCanonicalProfessionalBoqUnit} from '../../../src/lib/estimate/canonicalUnits';

const root=(globalThis as any).__M50_POST_SOURCE_ROOT__ as string|undefined;
const make=()=>config({releaseId:'TEST_ONLY_PARENT_RELEASE',searchReleaseId:'TEST_ONLY_PARENT_SEARCH_RELEASE',...(root?{sourceRoot:root}:{})});
test('M50 ordinary samecard config retains old baseline and exact captured provenance',()=>{
 const c=make(),p=captured();assert.equal(c.catalogId,pack.catalogId);assert.deepEqual(c.expectedParentShape,[96,68,72]);assert.deepEqual(c.runtimeProfileInput,p.baseline.input_values);assert.deepEqual(c.acceptanceInput,p.baseline.input_values);assert.equal(c.binding.retainParentBindings?.successorProvenanceContinuation?.capturedSourceMetadata.retainedParentBindingSuccessorV1.parentDefinitionId,'7237aa95-be0f-5b6d-a638-5f06b9381749');assert.equal((c.applicability as any).fullTechnicalAcceptance,false);
});
test('M50 ordinary shortInput selects both compatible parent system and bounded post',()=>{
 const c=make();assert.equal(c.shortInput[pack.parentSelector],pack.parentSelectedValue);assert.equal(c.shortInput[pack.selectorId],pack.selectorValue);assert.equal(c.shortInput[pack.parentPrimary],10);assert(!Object.keys(c.shortInput).some(k=>k.includes('unresolved_')||k.includes('available_')));
});
test('M50 normal recipe requires canonical person count unit, never a local fallback',()=>{
 if(String(normalizeCanonicalProfessionalBoqUnit('person'))==='person')unitGate();else assert.throws(()=>unitGate(),/CANONICAL_BOQ_PERSON_HEADCOUNT_INFO_UNIT_REQUIRED/);
});
test('M50 ordinary verifyCore executes fullmodel arithmetic and oldreplay before exact sharedunit gate',async()=>{
 const c=make();if(String(normalizeCanonicalProfessionalBoqUnit('person'))==='person'){const result=await c.verifyCore!();assert.equal((result as any).knownRosterCategories,4);}else await assert.rejects(()=>c.verifyCore!(),/CANONICAL_BOQ_PERSON_HEADCOUNT_INFO_UNIT_REQUIRED/);
});
