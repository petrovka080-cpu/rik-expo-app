import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import links from '../../../data/estimate-benchmarks/source-packs/roof-single539-real-r224-source-inputs-r24.json';
import scope from '../../../data/estimate-benchmarks/source-packs/roof-single539-exact-registry-scope31-r24.json';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1,
 type MasterScopedNormativeRegistryInputR1} from './masterScopedNormativeRegistryPreimageR1';
import type {Roof539ConfigInputsR24} from './prepareRoofSingle539WholeLayersR24';
type Pinned=Readonly<{path:string;sha256:string}>;
// Only already ROOT-emitted, exact-hash inputs cross this JSON boundary.
// The existing registry resolver validates their shape/closure/caps/hash.
function readPinned<T>(p:Pinned):T{const b=readFileSync(p.path);
 assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256,'R224_PINNED_INPUT_DRIFT:'+p.path);
 return JSON.parse(b.toString('utf8'));}
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
type Outcome=Readonly<{status:string;failure:unknown;rollback:boolean;databaseWrites:number;
 sourceKey:string;capturedRawTwice:boolean;exactSubjectAbsenceObserved:boolean;globalAbsenceProved:boolean;
 actor:Readonly<{isolation:string;read_only:string;timezone:string}>}>;
type Generated=Readonly<{status:string;candidate:MasterScopedNormativeRegistryInputR1;
 factoryCalled:boolean;publisherCalled:boolean;actualAbsenceProved:boolean}>;
type Prepared=Readonly<{sourceKey:string;exactColumns:readonly string[];
 sourceMetadata:Roof539ConfigInputsR24['source']['sourceMetadata'];locator:Roof539ConfigInputsR24['source']['locator']}>;
type PerRow=Readonly<{perRow:Roof539ConfigInputsR24['source']['perRow']}>;
export function loadRoofSingle539RealR224InputsR24():Pick<Roof539ConfigInputsR24,'layers'|'source'|'evidencePaths'>{
 const outcome=readPinned<Outcome>(links.actual.outcome),capture=readPinned<MasterCapturedScopedNormativeRegistryR1>(links.actual.capture);
 const generated=readPinned<Generated>(links.actual.candidate),prepared=readPinned<Prepared>(links.subjectInput);
 const rowMap=readPinned<PerRow>(links.rowSourceMap234);
 assert(outcome.status==='READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION'&&outcome.failure===null&&outcome.rollback&&outcome.databaseWrites===0,'REAL_R224_READONLY_OUTCOME_REQUIRED');
 assert(outcome.capturedRawTwice&&outcome.exactSubjectAbsenceObserved&&!outcome.globalAbsenceProved,'R224_SCOPED_ABSENCE_ONLY');
 assert(outcome.actor.isolation==='repeatable read'&&outcome.actor.read_only==='on'&&outcome.actor.timezone==='UTC','R224_TRANSACTION_IDENTITY');
 assert(generated.status==='GENERATED_CANDIDATE_NOT_DB_ID'&&!generated.factoryCalled&&!generated.publisherCalled,'CANDIDATE_NOT_DB_ID_REQUIRED');
 assert.equal(capture.captureSha256,links.captureSha256);assert.equal(capture.scope.sourceKey,scope.sourceKey);
 assert.equal(prepared.sourceKey,scope.sourceKey);assert.equal(outcome.sourceKey,scope.sourceKey);
 assert.equal(capture.scope.artifactSha256,scope.artifactSha256);assert.equal(capture.scope.normId,scope.exactRegistryColumns.join('/'));
 assert.deepEqual(prepared.exactColumns,scope.exactRegistryColumns);
 const request:MasterScopedNormativeRegistryInputR1={...generated.candidate,
  config:{...generated.candidate.config,capturedScopedNormativeRegistry:capture}};
 const resolved=resolveMasterScopedNormativeRegistryOptInR1(request);assert(resolved,'EXISTING_SCOPED_REGISTRY_OWNER_REQUIRED');
 assert.equal(capture.sourceRows.length,15);assert.equal(capture.locatorRows.length,20);
 assert(capture.sourceRows.every(r=>r.sourceKey!==scope.sourceKey&&r.id!==capture.scope.generatedSourceId),'ACTUAL_SUBJECT_SOURCE_COLLISION');
 assert(capture.locatorRows.every(r=>!capture.scope.generatedLocatorIds.includes(r.id)&&!capture.scope.generatedLocatorKeys.includes(r.locatorKey)),'ACTUAL_SUBJECT_LOCATOR_COLLISION');
 const absent=generated.candidate.config.binding?.retainParentBindings?.capturedSourcePreimage;
 assert(object(absent)&&Object.keys(absent).sort().join(',')==='expected,sourceKey'
  &&typeof absent.sourceKey==='string'&&absent.sourceKey===scope.sourceKey&&absent.expected===null,'REAL_CAPTURE_REQUEST_ABSENCE_PROJECTION_REQUIRED');
 // Projection from the actual request AFTER matching its real raw absence;
 // normal/LOCKED/REGISTERED still reread the source through PRIMARY_R70.
 const capturedSourcePreimage={sourceKey:absent.sourceKey,expected:absent.expected};
 assert.equal(Object.keys(rowMap.perRow).length,234);
 return{layers:{sourceKey:scope.sourceKey,exactBundleColumns:scope.newColumns,
  physicalBindings:[{role:'tower-8t',owner:null},{role:'truck-10t',owner:null},{role:'forklift-5t',owner:null},{role:'flatbed-5t',owner:null}]},
  source:{sourceId:scope.sourceKey,sourceMetadata:prepared.sourceMetadata,locator:prepared.locator,
   capturedSourcePreimage,capturedScopedNormativeRegistry:capture,perRow:rowMap.perRow,readEvidence:links.actual.outcome},
  evidencePaths:[links.actual.outcome.path,links.actual.capture.path,links.actual.candidate.path,links.subjectInput.path,links.rowSourceMap234.path,
   'data/estimate-benchmarks/source-packs/roof-single539-real-r224-source-inputs-r24.json',
   'scripts/estimate/r4a13/roofSingle539RealR224InputsR24.ts']};
}
