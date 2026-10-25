import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {buildPublishedWallF271} from './prepareWallCeramicCementExistingOwnerF271';
import {resolveCanonicalScopeRequirementV1} from '../../../src/lib/estimate/backendPlatform/canonicalScopeRequirementV1';
import {WALL_METHOD_F271,WALL_CEMENT_F271,WALL_LEGACY_F271} from '../../../src/lib/estimate/v4/wallCeramicCementExistingOwnerF271';
import {withWallSubstrateScopeF279,wallSubstrateScopeRequirementF279,WALL_SUBSTRATE_FACT_F279,WALL_SUBSTRATE_NEED_F279,
 WALL_SUBSTRATE_READY_F279,WALL_SUBSTRATE_REQUIRED_F279,WALL_SUBSTRATE_UNKNOWN_F279} from './wallCeramicProvisionScopeF279';

test('TEST_ONLY object-state scope uses existing owner and never admits a quantity or payment',()=>{
 const contextPath=process.env.WALL_F271_CONTEXT_PATH;assert(contextPath,'ROOT_PINNED_R266_CONTEXT_REQUIRED');
 const context:{sourceRoot:string}=JSON.parse(readFileSync(contextPath,'utf8'));
 const raw=readFileSync(resolve(context.sourceRoot,'data/estimate-benchmarks/fixtures/wall-ceramic-current-parent-r266.json'));
 assert.equal(createHash('sha256').update(raw).digest('hex'),'f39a6c6cc1689c2e4fd009cec8101a2028321050b8b5db656fe3e7b5e0de09d6');
 const packet:{readOnly:boolean;capture:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>}=JSON.parse(raw.toString('utf8'));
 assert.equal(packet.readOnly,true);const c=packet.capture;
 assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length],[1,59,59]);
 const before=buildPublishedWallF271({...c,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']});
 const after=withWallSubstrateScopeF279(before);
 assert.deepEqual(after.parameters.slice(0,10).map(p=>[p.parameter_id,p.ordinal]),before.parameters.map(p=>[p.parameter_id,p.ordinal]));
 assert.equal(after.parameters.length,11);assert.equal(new Set(after.parameters.map(p=>p.ordinal)).size,11);
 assert.deepEqual(after.parameters.map(p=>p.ordinal),Array.from({length:11},(_,index)=>index));
 assert.deepEqual(after.formulas,before.formulas);assert.deepEqual(after.resources.map(r=>r.row_id),before.resources.map(r=>r.row_id));
 const samples:[Record<string,string>,string][]=[
  [{[WALL_METHOD_F271]:WALL_CEMENT_F271},'OBJECT_FACT_REQUIRED'],
  [{[WALL_METHOD_F271]:WALL_CEMENT_F271,[WALL_SUBSTRATE_FACT_F279]:WALL_SUBSTRATE_READY_F279},'COMPLETED'],
  [{[WALL_METHOD_F271]:WALL_CEMENT_F271,[WALL_SUBSTRATE_FACT_F279]:WALL_SUBSTRATE_REQUIRED_F279},'SCOPE_UNVERIFIED'],
  [{[WALL_METHOD_F271]:WALL_CEMENT_F271,[WALL_SUBSTRATE_FACT_F279]:WALL_SUBSTRATE_UNKNOWN_F279},'OBJECT_FACT_REQUIRED'],
  [{[WALL_METHOD_F271]:WALL_LEGACY_F271,[WALL_SUBSTRATE_FACT_F279]:WALL_SUBSTRATE_READY_F279},'SCOPE_UNVERIFIED']];
 for(const[parameters,expected]of samples){
  const decision=resolveCanonicalScopeRequirementV1({graph:{costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementV1:wallSubstrateScopeRequirementF279()},
   rowId:WALL_SUBSTRATE_NEED_F279,parameters,parameterIds:new Set([WALL_METHOD_F271,WALL_SUBSTRATE_FACT_F279]),
   resourceIds:new Set([WALL_SUBSTRATE_NEED_F279]),knownQuantityRowIds:new Set()});
  assert(decision);assert.equal(decision.status,expected);assert.equal(decision.numericNormAccepted,false);assert.equal(decision.separatePaymentAccepted,false);
 }
});
