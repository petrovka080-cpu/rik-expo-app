import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {RoofParapet004TechnicalPreparationR294 as Preparation} from './prepareRoofParapet004TechnicalWholeR294';
import {prepareRoofParapet004TechnicalProductionR1} from './prepareRoofParapet004TechnicalProductionR1';
import type {MasterCapturedScopedNormativeRegistryR1 as Formal} from './masterScopedNormativeRegistryPreimageR1';

type Json=Record<string,unknown>;
export type RoofParapet004PinR1=Readonly<{path:string;sha256:string}>;
type Pin=RoofParapet004PinR1;
type Five=Readonly<{first:Pin;second:Pin;semanticReceipt:Pin;closedGovernorReceipt:Pin;proposedInput:Pin}>;
export type RoofParapet004OperationalMasterR1=Readonly<{
 contract:'root-reviewed-operational-master/r1';historicalMasterPin:Pin;operationalMasterPin:Pin;precededReviewDecisionMasterPin:Pin;
}>;
export type RoofParapet004TargetBoundaryR1=Readonly<{
 artifactPins:readonly Pin[];currentPointerPin:Pin;currentReleasePath:string;parentReleaseId:string;parentSearchReleaseId:string;
 masterBinding:RoofParapet004OperationalMasterR1;
}>;
const HISTORICAL216='541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40';
const OPERATIONAL219='66ef69e13c4c189c17215dd614ac35714d2f98c8a944fb859a8a2c9eb450154c';
const PRECEDED218='3675b6e7e4dac0da2d1efed39ea7074899b5fa456d434385e8ae9ca5443fac66';
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function pinned(p:Pin){assert(path.isAbsolute(p.path)&&/^[a-f0-9]{64}$/u.test(p.sha256),'ABSOLUTE_REAL_FILE_PIN_REQUIRED');
 const s=fs.statSync(p.path);assert(s.isFile()&&s.size<=4*1024*1024,'PARSED_INPUT_CAP');const b=fs.readFileSync(p.path);assert.equal(sha(b),p.sha256,'PIN_DRIFT:'+p.path);return b;}
function read(p:Pin):unknown{return JSON.parse(pinned(p).toString('utf8'));}
function formal(v:unknown):v is Formal{
 if(!object(v)||v.contract!=='master-scoped-normative-registry-preimage/r1'||v.projection!=='pg-jsonb-text-utc-microseconds/r1'||!object(v.scope)||typeof v.captureSha256!=='string')return false;
 const s=v.scope,strings=(a:unknown):a is string[]=>Array.isArray(a)&&a.every(x=>typeof x==='string');
 return ['artifactSha256','normId','sourceKey','generatedSourceId'].every(k=>typeof s[k]==='string')&&strings(s.generatedLocatorIds)&&strings(s.generatedLocatorKeys)
  &&Array.isArray(v.sourceRows)&&v.sourceRows.every(r=>object(r)&&typeof r.id==='string'&&typeof r.sourceKey==='string'&&typeof r.raw==='string'&&(r.managedMatches===null||typeof r.managedMatches==='boolean'))
  &&Array.isArray(v.locatorRows)&&v.locatorRows.every(r=>object(r)&&typeof r.id==='string'&&typeof r.sourceId==='string'&&typeof r.locatorKey==='string'&&typeof r.raw==='string'
   &&Array.isArray(r.normIds)&&r.normIds.every(n=>n===null||typeof n==='string')&&(r.managedMatches===null||typeof r.managedMatches==='boolean'));
}
function closed(p:Pin){const v=read(p);assert(object(v)&&v.status==='EXPECTED_OUTCOME_AND_CLEAN_CLOSURE'&&v.exitCode===0&&v.error===null);
 assert.deepEqual(v.remainingOwnedProcesses,[]);assert.deepEqual(v.sourceDrift,[]);}

/** Real immutable-file/current-selection barrier. The existing publisher owns
 * live DB NORMAL/read/lock/reread/unchanged/REGISTERED checks. This callback
 * issues zero SQL and does not claim table locks at LOCKED_BEFORE: the shared
 * publisher invokes it before acquiring its own retained-parent table locks.
 */
export function assertRoofParapet004ProductionTargetBoundaryR1(input:RoofParapet004TargetBoundaryR1):void{
 assert.equal(input.masterBinding.contract,'root-reviewed-operational-master/r1');
 assert.equal(input.masterBinding.historicalMasterPin.sha256,HISTORICAL216,'HISTORICAL_MASTER216_PIN_REQUIRED');
 assert.equal(input.masterBinding.operationalMasterPin.sha256,OPERATIONAL219,'OPERATIONAL_MASTER219_SHA_REQUIRED');
 assert.equal(input.masterBinding.precededReviewDecisionMasterPin.sha256,PRECEDED218,'MASTER218_IS_PRECEDED_REVIEW_ONLY');
 for(const p of Object.values(input.masterBinding).filter((v):v is Pin=>typeof v!=='string'))pinned(p);
 assert(input.artifactPins.length>=5,'ACTUAL_CAPTURE_ARTIFACT_PINS_REQUIRED');for(const p of input.artifactPins)pinned(p);
 assert.equal(path.resolve(input.currentPointerPin.path),path.resolve(input.currentReleasePath),'CURRENT_POINTER_PATH_DRIFT');
 const pointer=read(input.currentPointerPin);assert(object(pointer));assert.equal(pointer.productionAccessed,false,'CURRENT_POINTER_NOT_LOCAL');
 assert.equal(pointer.definitionReleaseId,input.parentReleaseId,'CURRENT_POINTER_RELEASE_TUPLE_DRIFT');
 assert.equal(pointer.searchReleaseId,input.parentSearchReleaseId,'CURRENT_POINTER_SEARCH_TUPLE_DRIFT');
}

export type RoofParapet004PublisherSourceProjectionR1=Readonly<{
 canonicalRoot:string;runtimeEvidenceRoot:string;
 files:readonly Readonly<{original:Pin;projected:Pin}>[];
}>;
const CANONICAL_ROOT='C:\\dev\\rik-expo-app-r4a5-dc4f0ce7';
const inside=(root:string,file:string)=>{const r=path.relative(root,file);return r!==''&&!path.isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+path.sep);};
const normalized=(p:string)=>path.resolve(p).toLowerCase();

/** ROOT creates the small immutable copies before this call. No copy, rewrite,
 * Git or SQL is performed here. Validate the COMPLETE factory sourcePaths,
 * including its externally pinned currentFullParent, before shared9ec sees it.
 * Originals remain the callback/provenance references; sourceHashes/fingerprint
 * include exactly the verified canonical copies through the ordinary Config.
 */
export function assertRoofParapet004PublisherSourceProjectionR1(sourcePaths:readonly string[],input:RoofParapet004PublisherSourceProjectionR1):string[]{
 assert(path.isAbsolute(input.canonicalRoot)&&normalized(input.canonicalRoot)===normalized(CANONICAL_ROOT),'EXACT_CANONICAL_PUBLISHER_ROOT_REQUIRED');
 const canonical=path.resolve(input.canonicalRoot),realCanonical=fs.realpathSync(canonical),namespace=path.join(canonical,'.release-runtime');
 assert(path.isAbsolute(input.runtimeEvidenceRoot)&&inside(namespace,path.resolve(input.runtimeEvidenceRoot)),'CANONICAL_RUNTIME_EVIDENCE_ROOT_REQUIRED');
 assert(fs.statSync(input.runtimeEvidenceRoot).isDirectory(),'EXISTING_ROOT_CREATED_EVIDENCE_DIRECTORY_REQUIRED');
 const realNamespace=fs.realpathSync(namespace),realEvidence=fs.realpathSync(input.runtimeEvidenceRoot);
 assert(inside(realCanonical,realNamespace)&&inside(realNamespace,realEvidence),'RUNTIME_EVIDENCE_SYMLINK_ESCAPE');
 const external=new Set<string>();
 for(const p of sourcePaths){assert(path.isAbsolute(p),'ABSOLUTE_PUBLISHER_SOURCE_REQUIRED');
  if(inside(canonical,path.resolve(p)))assert(inside(realCanonical,fs.realpathSync(p)),'CANONICAL_SOURCE_SYMLINK_ESCAPE');
  else external.add(normalized(p));}
 const projected=new Map<string,string>();
 for(const row of input.files){const key=normalized(row.original.path);
  assert(external.has(key)&&!projected.has(key),'EXACT_EXTERNAL_INPUT_PROJECTION_REQUIRED');
  assert.equal(row.original.sha256,row.projected.sha256,'SOURCE_PROJECTION_SHA_BINDING');
  assert(path.isAbsolute(row.projected.path)&&inside(path.resolve(input.runtimeEvidenceRoot),path.resolve(row.projected.path)),'PROJECTED_INPUT_OUTSIDE_RUNTIME_EVIDENCE');
  assert(inside(realEvidence,fs.realpathSync(row.projected.path)),'PROJECTED_INPUT_SYMLINK_ESCAPE');
  const original=pinned(row.original),copy=pinned(row.projected);assert(original.equals(copy),'SOURCE_PROJECTION_BYTES_CHANGED');
  projected.set(key,row.projected.path);
 }
 assert.equal(projected.size,external.size,'EVERY_EXTERNAL_INPUT_REQUIRES_PROJECTION');
 const result=[...new Set(sourcePaths.map(p=>inside(canonical,path.resolve(p))?p:projected.get(normalized(p))!))];
 for(const p of result)assert(path.isAbsolute(p)&&inside(canonical,path.resolve(p))&&inside(realCanonical,fs.realpathSync(p)),'PUBLISHER_SOURCE_OUTSIDE_CANONICAL_ROOT');
 return result;
}

export type RoofParapet004ProductionTargetInputR1=Readonly<{
 preparation:Omit<Preparation,'verifyCore'|'verifyTargetPrecondition'>;capture:Five;masterBinding:RoofParapet004OperationalMasterR1;
 currentPointerPin:Pin;finiteFinalRaw:Pin;independentFiniteAudit:Pin;normalLockedOutcome:Pin;normalLockedGovernor:Pin;actualFullTypes:Pin;
 publisherSourceProjection:RoofParapet004PublisherSourceProjectionR1;record:(name:string,value:unknown)=>void;
}>;

/** Returns one ordinary existing-owner Config. It never invokes a publisher,
 * compiler or DB connection. Pending NORMAL/types cannot be replaced by a
 * future pin: their actual files and completed outcomes are mandatory here.
 */
export function prepareRoofParapet004TechnicalProductionTargetR1(input:RoofParapet004ProductionTargetInputR1){
 assert.equal(typeof input.record,'function','ACTUAL_RAW_RECORDER_REQUIRED');
 const first=pinned(input.capture.first);assert(first.equals(pinned(input.capture.second)),'TWO_GENUINE_CAPTURE_BYTES_EQUAL');
 const actual:unknown=JSON.parse(first.toString('utf8'));assert(formal(actual),'ORIGINAL_FORMAL_CAPTURE_REQUIRED');
 const semantic=read(input.capture.semanticReceipt);assert(object(semantic)&&semantic.status==='READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION'
  &&semantic.failure===null&&semantic.rollback===true&&semantic.databaseWrites===0&&semantic.actualCoreCallbacks===0&&semantic.capturedRawTwice===true);
 assert.equal(semantic.firstCaptureSha256,actual.captureSha256);assert.equal(semantic.sourceKey,input.preparation.source.sourceKey);
 assert.deepEqual(semantic.officialColumns,['12-01-004-02','12-01-004-03']);
 closed(input.capture.closedGovernorReceipt);closed(input.normalLockedGovernor);
 const captureStage=path.dirname(input.capture.closedGovernorReceipt.path);
 for(const p of [input.capture.first,input.capture.second,input.capture.semanticReceipt,input.capture.proposedInput]){
  const relative=path.relative(captureStage,p.path);assert(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));pinned(p);}
 const finite=read(input.finiteFinalRaw);assert(object(finite)&&finite.actualEntries===10&&finite.actualResults===5&&finite.actualRejects===5&&finite.legacyStrictEquality===true
  &&finite.old59===true&&finite.nativeMethods===2&&finite.nativeRowsPerMethod===15&&finite.unknownPhysical===22&&finite.DML===0&&finite.publication===0&&finite.FULL===false);
 const audit=read(input.independentFiniteAudit);assert(object(audit)&&audit.status==='PASS_INDEPENDENT_ACTUAL_PARAPET_CAPTURE_AND_FINITE10_RAW_AUDIT_NOT_ADMISSION'&&object(audit.finalCallbackRaw));
 assert.equal(audit.finalCallbackRaw.path,input.finiteFinalRaw.path);assert.equal(audit.finalCallbackRaw.sha256,input.finiteFinalRaw.sha256);
 const normal=read(input.normalLockedOutcome);assert(object(normal)&&normal.status==='PASS_ORDINARY_PARAPET004_NORMAL_LOCKED_GUARDS_NOT_PUBLISHER'
  &&normal.failure===null&&normal.normalRetainedAndScopedCompleted===true&&normal.lockedRetainedAndScopedCompleted===true&&normal.rollback===true
  &&normal.databaseWrites===0&&normal.coreCallbacks===0&&normal.publication===0&&normal.FULL===false);
 const types=read(input.actualFullTypes);assert(object(types)&&typeof types.status==='string'&&types.status.startsWith('PASS_ACTUAL_FULL_TYPES')&&types.actualDiagnostics===0);
 assert.deepEqual(types.sourceDrift,[]);assert.deepEqual(types.dependencyDrift,[]);assert.deepEqual(types.ownedRemaining,[]);
 const historicalMasterPin={path:input.preparation.host.masterPath,sha256:input.preparation.host.masterSha256};
 assert.deepEqual(input.masterBinding.historicalMasterPin,historicalMasterPin,'EXACT_HISTORICAL_MASTER_BINDING');
 const artifactPins=[...Object.values(input.capture),input.preparation.currentFullParent,input.finiteFinalRaw,input.independentFiniteAudit,
  input.normalLockedOutcome,input.normalLockedGovernor,input.actualFullTypes];
 const boundary:RoofParapet004TargetBoundaryR1={artifactPins,currentPointerPin:input.currentPointerPin,currentReleasePath:input.preparation.host.currentReleasePath,
  parentReleaseId:input.preparation.host.parentReleaseId,parentSearchReleaseId:input.preparation.host.parentSearchReleaseId,masterBinding:input.masterBinding};
 assertRoofParapet004ProductionTargetBoundaryR1(boundary);
 let preflightCalls=0,lockedCalls=0;
 const verifyTargetPrecondition:NonNullable<Preparation['verifyTargetPrecondition']>=async(_client,phase)=>{
  if(phase==='PREFLIGHT'){preflightCalls++;assert.equal(preflightCalls,1,'ONE_PREFLIGHT_PER_FRESH_CONFIG');}
  else{assert.equal(phase,'LOCKED_BEFORE');lockedCalls++;assert.equal(preflightCalls,1);assert.equal(lockedCalls,1,'ONE_LOCKED_BARRIER_PER_FRESH_CONFIG');}
  assertRoofParapet004ProductionTargetBoundaryR1(boundary);
  assertRoofParapet004PublisherSourceProjectionR1(config.sourcePaths,input.publisherSourceProjection);
  input.record('ACTUAL_TARGET_PIN_BARRIER_'+phase,{phase,currentPointerPin:input.currentPointerPin,masterBinding:input.masterBinding,
   artifactPins,preflightCalls,lockedCalls,SQL:0,liveDatabaseGuards:'EXISTING_SHARED_PUBLISHER_715_A301_UNCHANGED',tableLockAlreadyHeldClaim:false});
 };
 const operational=input.masterBinding.operationalMasterPin;
 const sourcePaths=[...new Set([...input.preparation.sourcePaths,...artifactPins.map(p=>p.path),input.currentPointerPin.path,
  historicalMasterPin.path,operational.path,input.masterBinding.precededReviewDecisionMasterPin.path,__filename])];
 const config=prepareRoofParapet004TechnicalProductionR1({...input.preparation,
  host:{...input.preparation.host,masterPath:operational.path,masterSha256:operational.sha256},sourcePaths,record:input.record,verifyTargetPrecondition},actual);
 assert.equal(config.masterPath,operational.path);assert.equal(config.masterSha256,operational.sha256);assert.equal(config.catalogAppend,undefined);
 assert.deepEqual(config.capturedScopedNormativeRegistry,actual);assert.equal(config.resourceDefinitions.length,111);
 input.record('REVIEWED_OPERATIONAL_MASTER_BINDING_BEFORE_PUBLISHER',{masterBinding:input.masterBinding,sourceOrQuantityChanges:0,
  historicalAcceptanceRewritten:false,SQLFromAdditionalTargetCallback:0,publication:0,FULL:false});
 const projectedSourcePaths=assertRoofParapet004PublisherSourceProjectionR1(config.sourcePaths,input.publisherSourceProjection);
 assert.equal(normalized(input.preparation.sourceRoot),normalized(input.publisherSourceProjection.canonicalRoot),'PUBLISHER_PREPARATION_CANONICAL_ROOT_REQUIRED');
 const publisherConfig={...config,sourcePaths:projectedSourcePaths};
 assert.equal(publisherConfig.verifyCore,config.verifyCore);assert.equal(publisherConfig.verifyTargetPrecondition,config.verifyTargetPrecondition);
 input.record('ACTUAL_CANONICAL_PUBLISHER_SOURCE_PROJECTION',{publisherSourceProjection:input.publisherSourceProjection,
  originalSourcePaths:config.sourcePaths,projectedSourcePaths,copyWritesFromFactory:0,SQL:0,
  originalCaptureAndMasterPinsRewritten:false,publisherImplementation:'EXISTING_9EC_UNCHANGED',FULL:false});
 return publisherConfig;
}
