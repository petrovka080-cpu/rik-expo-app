import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isAbsolute,resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {masonryGlassOpeningExistingConfigR223,masonryGlassOpeningActualEntriesR223,
 masonryGlassOpeningRetainedPureR223} from './prepareMasonryGlassOpeningExistingOwnerR223';
import {GLASS_OPENING_CHOICE_ID_R223 as selector,GLASS_OPENING_LEGACY_R223 as legacy,
 GLASS_OPENING_OWN_R223 as glass,GLASS_OPENING_AREA_R223 as area} from '../../../src/lib/estimate/v4/masonryGlassOpeningExistingOwnerR223';

const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);

/** One dependent fail-fast case. All ordinary retained/map/ownership guards
 * run before the first of eight markers. This is a finite WORK gate only. */
test('one existing opening card retains legacy and whole glass03/04 without q transfer',async()=>{
 const root=process.env.MASONRY_R223_SOURCE_ROOT;assert(root,'MASONRY_R223_SOURCE_ROOT_REQUIRED');
 const config=masonryGlassOpeningExistingConfigR223({sourceRoot:root,
  releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a',
  outputRoot:resolve(root,'test-output-not-publication')});
 assert.equal(config.catalogAppend,undefined);assert.equal(config.catalogId,'canonical-work:base:masonry_interior_opening_lay_standard');
 assert.equal(config.binding.retainParentBindings?.capturedParent.definition.id,'0907686f-95b4-55a7-838d-afc0743b151d');
 assert.deepEqual(config.runtimeProfileInput,{});assert.deepEqual(config.runtimeProfileClassification,{});assert.deepEqual(config.runtimeProfileSourceIds,{});
 const scope=config.parameterDefinitions.find(p=>p.parameter_id===selector);assert(scope);
 assert.equal(scope.truth_metadata.visibility_role,'USER_INPUT');assert.equal(scope.truth_metadata.value_source_role,'USER_INPUT');
 assert.equal(scope.default_value,null);assert(record(scope.constraints_json));assert.deepEqual(scope.constraints_json.values,[legacy,glass]);
 assert(record(scope.truth_metadata.provenance));
 assert.equal(scope.truth_metadata.provenance.consumer_input_role_v1,'OBJECT_FACT');
 assert.equal(scope.truth_metadata.provenance.project_approval_claimed,false);
 const oldQ=config.parameterDefinitions.find(p=>p.parameter_id==='q');assert(oldQ);assert.equal(oldQ.default_value,null);
 assert.equal(oldQ.unit_id,'m2');assert.equal(oldQ.truth_metadata.value_source_role,'VISIBLE_BASELINE_ASSUMPTION');
 assert.deepEqual(oldQ.truth_metadata.visible_when,{kind:'and',operands:[{kind:'selected',parameterId:selector,value:legacy},{kind:'literal',value:true}]});
 assert.equal(config.parameterDefinitions.find(p=>p.parameter_id===area)?.default_value,null);
 assert.equal(config.applicability.sourceProfileSelectionV1,undefined,'NO_NEW_SOURCE_PRODUCER');
 assert.equal(config.parameterDefinitions.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').length,20);
 assert.equal(config.resourceDefinitions.filter(r=>r.row_id.startsWith('masonry:glass-block:')).length,38);
 assert.equal(config.resourceDefinitions.filter(r=>r.row_id.startsWith('masonry_interior_opening_lay_standard_')).length,59);
 assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 masonryGlassOpeningRetainedPureR223(config,root);assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 assert(config.verifyCore);const result=await config.verifyCore();assert.equal(masonryGlassOpeningActualEntriesR223(),8);
 assert.equal(result.actualCoreEntries,8);assert.equal(result.results,5);assert.equal(result.ordinaryResults,4);
 assert.equal(result.preliminaryResults,1);assert.equal(result.rejects,3);assert.equal(result.full,false);
 const out=process.env.MASONRY_R223_ACTUAL_OUTPUT;assert(out);
 const final:unknown=JSON.parse(readFileSync(resolve(out,'FINAL_R223.json'),'utf8'));
 assert(final&&typeof final==='object');
});

// ROOT supplies an actual pre-APPLY current proof context. No synthetic
// successful receipt, future IDs, SQL results or source absence is generated.
test('root first opening apply: explicit operational219 with historical216 and fail-closed proof pins',async()=>{
 const path=process.env.MASONRY_R223_FIRST_APPLY_CONTEXT_PATH;assert(path,'ACTUAL_ROOT_FIRST_APPLY_CONTEXT_REQUIRED');
 const context:Parameters<typeof masonryGlassOpeningExistingConfigR223>[0]=JSON.parse(readFileSync(path,'utf8'));
 const proof=context.rootFirstApplyR223;assert(proof);
 const projection=proof.publisherSourceProjection;assert(projection);assert(projection.files.length>0);
 const {rootFirstApplyR223:_proof,...historical}=context;
 const original=masonryGlassOpeningExistingConfigR223(historical),prepared=masonryGlassOpeningExistingConfigR223(context);
 assert.equal(original.masterSha256,'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40');
 assert.equal(original.verifyTargetPrecondition,undefined);assert.equal(original.capturedScopedNormativeRegistry,undefined);
 assert.equal(prepared.masterSha256,'66ef69e13c4c189c17215dd614ac35714d2f98c8a944fb859a8a2c9eb450154c');
 assert.equal(prepared.masterPath,proof.operationalMasterPin.path);assert(prepared.verifyTargetPrecondition);assert(prepared.capturedScopedNormativeRegistry);
 assert(prepared.sourcePaths.every(path=>!isAbsolute(path)&&!path.startsWith('../')));
 const masterProjection=projection.files.find(file=>resolve(file.original.path)===resolve(proof.operationalMasterPin.path));
 assert(masterProjection,'ACTUAL_OPERATIONAL_MASTER_PROJECTION_REQUIRED');
 assert(prepared.sourcePaths.some(path=>resolve(path)===resolve(masterProjection.projected.path)));
 assert(!prepared.sourcePaths.some(path=>resolve(path)===resolve(proof.operationalMasterPin.path)));
 assert.deepEqual(prepared.parameterDefinitions,original.parameterDefinitions);assert.deepEqual(prepared.formulaDefinitions,original.formulaDefinitions);
 assert.deepEqual(prepared.resourceDefinitions,original.resourceDefinitions);assert.deepEqual(prepared.binding,original.binding);
 assert.equal(prepared.applicability.fullTechnicalAcceptance,false);assert.equal(prepared.passport.unresolvedApplicableResourceRowIds?.length,20);
 assert.equal(masonryGlassOpeningActualEntriesR223(),0);
 const reject=(value:typeof context,pattern:RegExp)=>assert.throws(()=>masonryGlassOpeningExistingConfigR223(value),pattern);
 reject({...context,rootFirstApplyR223:undefined},/MASONRY_OPENING_ROOT_APPLY_CONTEXT/);
 reject({...context,rootFirstApplyR223:{...proof,operationalMasterPin:{path:original.masterPath,sha256:original.masterSha256}}},/OPERATIONAL_MASTER219_REQUIRED/);
 reject({...context,rootFirstApplyR223:{...proof,operationalMasterPin:{...proof.operationalMasterPin,path:original.masterPath}}},/OPERATIONAL_MASTER_BYTES/);
 assert.notEqual(proof.currentPointerSha256,proof.parentSnapshot.sha256);
 reject({...context,rootFirstApplyR223:{...proof,currentPointerSha256:proof.parentSnapshot.sha256}},/CURRENT_POINTER_SHA/);
 reject({...context,rootFirstApplyR223:{...proof,parentSnapshot:{...proof.parentSnapshot,path:'../outside.json'}}},/ARTIFACT_PIN/);
 assert.notEqual(proof.parentSnapshot.sha256,proof.scopedRegistry.sha256);
 reject({...context,rootFirstApplyR223:{...proof,parentSnapshot:{...proof.parentSnapshot,sha256:proof.scopedRegistry.sha256}}},/ARTIFACT_SHA/);

 const withProjection=(publisherSourceProjection:typeof projection)=>({...context,rootFirstApplyR223:{...proof,publisherSourceProjection}});
 reject(withProjection(undefined as never),/SOURCE_PROJECTION_REQUIRED/);
 reject(withProjection({...projection,canonicalRoot:projection.canonicalRoot+'.outside'}),/SOURCE_PROJECTION_CANONICAL_ROOT/);
 reject({...context,sourceRoot:resolve(context.sourceRoot,'..')},/R103_INPUT_BYTES|ENOENT|SOURCE_PROJECTION_SOURCE_ROOT/);
 reject(withProjection({...projection,runtimeEvidenceRoot:projection.canonicalRoot}),/SOURCE_PROJECTION_RUNTIME_ROOT/);
 reject(withProjection({...projection,files:projection.files.filter(file=>file!==masterProjection)}),/SOURCE_PROJECTION_MISSING_EXTERNAL_PIN/);
 reject(withProjection({...projection,files:[...projection.files,projection.files[0]!]}),/SOURCE_PROJECTION_DUPLICATE_ORIGINAL/);
 const alter=(replacement:NonNullable<typeof masterProjection>)=>projection.files.map(file=>file===masterProjection?replacement:file);
 reject(withProjection({...projection,files:alter({...masterProjection,projected:{...masterProjection.projected,sha256:proof.parentSnapshot.sha256}})}),/SOURCE_PROJECTION_SHA_IDENTITY/);
 reject(withProjection({...projection,files:alter({...masterProjection,projected:{...masterProjection.projected,path:proof.operationalMasterPin.path}})}),/SOURCE_PROJECTION_PROJECTED_PATH_SCOPE/);
 assert.notEqual(proof.parentSnapshot.sha256,masterProjection.original.sha256);
 reject(withProjection({...projection,files:alter({original:{...masterProjection.original,sha256:proof.parentSnapshot.sha256},
  projected:{...masterProjection.projected,sha256:proof.parentSnapshot.sha256}})}),/SOURCE_PROJECTION_ORIGINAL_BYTES/);
 // No fake SQL result is supplied. This real pin barrier must issue zero SQL;
 // all live NORMAL/LOCKED DB work remains the selected publisher's R70 owner.
 const noQueries={query:async()=>{throw new Error('PIN_CALLBACK_MUST_NOT_QUERY');}} as never;
 await prepared.verifyTargetPrecondition(noQueries,'PREFLIGHT');await prepared.verifyTargetPrecondition(noQueries,'LOCKED_BEFORE');
 assert.equal(masonryGlassOpeningActualEntriesR223(),0);
});
