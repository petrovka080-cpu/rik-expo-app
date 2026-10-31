import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {buildPublishedWallF271,prepareWallCeramicCementExistingOwnerF271,wallRetainedPureF271,type WallContextF271,assertWallCurrentRetainedParentF279,prepareWallCeramicCementExistingOwnerCurrentF279} from './prepareWallCeramicCementExistingOwnerF271';
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


test('F279 ordinary Config closes over the actual substrate composition without norm or procurement promotion',()=>{
 const contextPath=process.env.WALL_F279_CONTEXT_PATH;assert(contextPath,'ROOT_ACTUAL_PINNED_WALL_CONTEXT_REQUIRED');
 const context:WallContextF271=JSON.parse(readFileSync(contextPath,'utf8'));
 assert(!Object.hasOwn(context,'wallSubstrateObjectScopeF279'),'SUPPLY_THE_UNMODIFIED_ACTUAL_CONTEXT');
 const base=prepareWallCeramicCementExistingOwnerF271(context);
 const config=prepareWallCeramicCementExistingOwnerF271({...context,wallSubstrateObjectScopeF279:'OBJECT_STATE_ONLY'});
 assert.equal(config.catalogId,base.catalogId);assert.equal(config.catalogAppend,undefined);
 assert.equal(config.parameterDefinitions.length,11);assert.deepEqual(config.parameterDefinitions.slice(0,10),base.parameterDefinitions);
 assert.deepEqual(config.formulaDefinitions,base.formulaDefinitions);assert.deepEqual(config.resourceDefinitions.map(r=>r.row_id),base.resourceDefinitions.map(r=>r.row_id));
 const fact=config.parameterDefinitions.find(p=>p.parameter_id===WALL_SUBSTRATE_FACT_F279);assert(fact);
 assert.equal(fact.ordinal,10);assert.equal(fact.default_value,null);assert.equal(fact.required,false);
 assert.equal(fact.truth_metadata.value_source_role,'USER_INPUT');assert.equal(fact.truth_metadata.visibility_role,'USER_INPUT');
 assert(Array.isArray(fact.truth_metadata.resource_branch_consumers));assert(fact.truth_metadata.resource_branch_consumers.includes(WALL_SUBSTRATE_NEED_F279));
 for(const before of base.resourceDefinitions){const row=config.resourceDefinitions.find(r=>r.row_id===before.row_id);assert(row);
  if(row.row_id!==WALL_SUBSTRATE_NEED_F279){assert.deepEqual(row,before);continue;}
  assert.equal(row.formula_id,before.formula_id);assert.equal(row.cost_owner_id,before.cost_owner_id);
  assert.equal(row.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(row.procurement_eligible,false);
 }
 const unresolved=config.parameterDefinitions.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM');
 assert.equal(unresolved.length,6);assert(unresolved.every(p=>p.default_value===null));
 assert(config.resourceDefinitions.filter(r=>r.row_id.startsWith('tile-wall:kg15-01901')).every(r=>!r.procurement_eligible));
 assert.equal(config.applicability.fullTechnicalAcceptance,false);assert.equal(config.projectSourcePackagePath,undefined);
 assert(config.sourcePaths.includes('scripts/estimate/r4a13/wallCeramicProvisionScopeF279.ts'));
 const checked=wallRetainedPureF271(config,context.sourceRoot);assert.equal(checked.unknownProvision6,6);
 assert.throws(()=>prepareWallCeramicCementExistingOwnerF271({...context,wallSubstrateObjectScopeF279:undefined}),/F279_EXPLICIT_CONTEXT_REQUIRED/);
 // The retained pure guard must inspect this actual Config, not reconstruct an
 // unmodified ten-parameter model and accidentally verify a different branch.
 assert.throws(()=>wallRetainedPureF271({...config,parameterDefinitions:base.parameterDefinitions},context.sourceRoot));
 assert.equal(typeof config.verifyCore,'function');
 // No verifyCore call, synthetic success receipt, object facts or SQL here.
});

import {assembleMasterSingleDefinitionManagedRegistryCandidateR1} from './prepareMasterSingleDefinitionSuccessorR1';

type CurrentF279TestContext=WallContextF271&Readonly<{fixtureKind:string;sourceAdmission:boolean;actualCapturedSourceAbsence:boolean;
 publisherAdmitted:boolean;actualCurrentPacketPath:string;actualCurrentAcceptancePath:string;managedOutputPath:string}>;
const currentRecordF279=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function currentSourceInputsF279(){
 const path=process.env.WALL_F279_SOURCE_TEST_CONTEXT;assert(path,'ROOT_CURRENT_F279_SOURCE_TEST_CONTEXT_REQUIRED');
 const context:CurrentF279TestContext=JSON.parse(readFileSync(path,'utf8'));
 assert.equal(context.fixtureKind,'TEST_ONLY_SOURCE_PREIMAGE_EXPECTATION_NOT_DB_PROOF');
 assert.equal(context.sourceAdmission,false);assert.equal(context.actualCapturedSourceAbsence,false);assert.equal(context.publisherAdmitted,false);
 const acceptance:{status:string;readOnly:boolean;transactionRolledBack:boolean;rawRowsReadTwice:boolean;definitionReleaseId:string;searchReleaseId:string;
  results:{catalogId:string;fullParent:{path:string;sha256:string}}[]}=JSON.parse(readFileSync(context.actualCurrentAcceptancePath,'utf8'));
 assert.equal(acceptance.status,'PASS_READONLY_R257_ONE_SELECTED_EXISTING_PARENT_WITH_PROJECTED_CONTEXT');
 assert(acceptance.readOnly&&acceptance.transactionRolledBack&&acceptance.rawRowsReadTwice);assert.equal(acceptance.results.length,1);
 const bytes=readFileSync(context.actualCurrentPacketPath);assert.equal(context.actualCurrentPacketPath,acceptance.results[0]!.fullParent.path);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),acceptance.results[0]!.fullParent.sha256);
 const packet:unknown=JSON.parse(bytes.toString('utf8'));
 return{context,packet,origin:{definitionReleaseId:acceptance.definitionReleaseId,searchReleaseId:acceptance.searchReleaseId}};
}

test('F279 current RR source positive uses the existing factory normpack and six unresolved needs without registry authority',()=>{
 const{context,packet,origin}=currentSourceInputsF279();
 const base=prepareWallCeramicCementExistingOwnerCurrentF279(context,packet,origin);
 const config=prepareWallCeramicCementExistingOwnerCurrentF279({...context,wallSubstrateObjectScopeF279:'OBJECT_STATE_ONLY'},packet,origin);
 assert.deepEqual([base.parameterDefinitions.length,base.formulaDefinitions.length,base.resourceDefinitions.length],[10,81,81]);
 assert.deepEqual([config.parameterDefinitions.length,config.formulaDefinitions.length,config.resourceDefinitions.length],[11,81,81]);
 const pure=wallRetainedPureF271(config,context.sourceRoot);assert.equal(pure.unknownProvision6,6);assert.equal(pure.old59Preserved,true);
 assert.equal(pure.native10,10);assert.equal(pure.included6,6);assert.equal(pure.FULL,false);
 const needs=config.parameterDefinitions.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM');
 assert.equal(needs.length,6);assert(needs.every(p=>p.default_value===null));
 assert(config.resourceDefinitions.filter(r=>r.row_id.startsWith('tile-wall:kg15-01901')).every(r=>!r.procurement_eligible));
 assert.deepEqual(config.formulaDefinitions,base.formulaDefinitions);
 assert.deepEqual(config.resourceDefinitions.map(r=>[r.row_id,r.cost_owner_id,r.formula_id,r.unit_id]),base.resourceDefinitions.map(r=>[r.row_id,r.cost_owner_id,r.formula_id,r.unit_id]));
 const opt=config.binding.retainParentBindings;assert(opt);
 // Erase the UNIT expectation before deriving the genuine managed body. The
 // existing assembler has no dependency on a claimed DB absence or core run.
 const{capturedSourcePreimage:_unitOnlyExpectation,...retainedWithoutClaim}=opt;
 const candidateConfig={...config,binding:{...config.binding,retainParentBindings:retainedWithoutClaim}};
 const managed=assembleMasterSingleDefinitionManagedRegistryCandidateR1(candidateConfig,{projectSourcePackage:null,projectSourcePackageSet:null});
 assert.equal(managed.existingRegistryReuse,null);assert.equal(managed.retentionCandidate.newSource.source_key,'wall_ceramic_glazed_cement_mortar_krer15_01_019_01_f266');
 assert.equal(managed.retentionCandidate.newLocators.length,1);
 assert.match(managed.retentionCandidate.newSource.id,/^[0-9a-f-]{36}$/u);
 assert.match(managed.retentionCandidate.newLocators[0]!.id,/^[0-9a-f-]{36}$/u);
 const fromUnit=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null});
 assert.deepEqual(managed.retentionCandidate.newSource,fromUnit.retentionCandidate.newSource);
 assert.deepEqual(managed.retentionCandidate.newLocators,fromUnit.retentionCandidate.newLocators);
 writeFileSync(context.managedOutputPath,JSON.stringify({status:'ACTUAL_EXISTING_PURE_ASSEMBLER_MANAGED_BODY_ONLY_NOT_DB_PREIMAGE',
  contract:config.contract,stopCode:config.stopCode,catalogId:config.catalogId,parentReleaseId:config.parentReleaseId,normId:config.normId,
  newSource:managed.retentionCandidate.newSource,newLocators:managed.retentionCandidate.newLocators,
  capturedSourcePreimageProved:false,registryQueried:false,coreInvoked:false,normalLockedAdmitted:false,publisherAdmitted:false,FULL:false},null,2)+'\n',{flag:'wx'});
});

test('F279 current RR source rejects changed retained row baseline and passport before factory composition',()=>{
 const{context,packet,origin}=currentSourceInputsF279();
 for(const mutation of ['row-owner','baseline-value','passport']){
  const bad:unknown=structuredClone(packet);assert(currentRecordF279(bad)&&currentRecordF279(bad.capture));
  if(mutation==='row-owner'){const rows=bad.capture.resources;assert(Array.isArray(rows)&&rows.every(currentRecordF279));rows[0]!.cost_owner_id='hostile-second-owner';}
  else if(mutation==='baseline-value'){assert(currentRecordF279(bad.capture.baseline)&&currentRecordF279(bad.capture.baseline.input_values));bad.capture.baseline.input_values.q=101;}
  else{assert(currentRecordF279(bad.contentPassport)&&currentRecordF279(bad.contentPassport.decision));bad.contentPassport.decision.quantityScope='FULL';}
  assert.throws(()=>prepareWallCeramicCementExistingOwnerCurrentF279(context,bad,origin));
 }
});

test('F279 current RR source allows only the actual global membership envelope and rejects source or child drift',()=>{
 const{context,packet,origin}=currentSourceInputsF279();assertWallCurrentRetainedParentF279(context.sourceRoot,packet,origin);
 for(const key of ['source_release_id','definition_version_id','approved_template_baseline_id']){
  const bad:unknown=structuredClone(packet);assert(currentRecordF279(bad)&&currentRecordF279(bad.membership));bad.membership[key]='11111111-1111-4111-8111-111111111111';
  assert.throws(()=>assertWallCurrentRetainedParentF279(context.sourceRoot,bad,origin));
 }
 assert.throws(()=>assertWallCurrentRetainedParentF279(context.sourceRoot,packet,{...origin,definitionReleaseId:'11111111-1111-4111-8111-111111111111'}));
});
