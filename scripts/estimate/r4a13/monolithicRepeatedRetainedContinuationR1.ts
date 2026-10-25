import {createHash} from 'node:crypto';
import registration from '../../../data/estimate-benchmarks/fixtures/monolithic-repeat-retained-continuation-registration-r1.json';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import type {MasterRetainedParentCaptureR1,MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
type J=Record<string,any>;
const valueSha=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(JSON.parse(JSON.stringify(v))))).digest('hex');
export const MONOLITHIC_REPEAT_CONTINUATION_KEY_R1='retainedParentBindingContinuationV2' as const;
/** This finite bridge covers only two independently captured current parents.
 * The caller has already validated the complete capture hash and its ordinary
 * normal/locked DB preimage. It grants no general ancestry or price transfer. */
export function isMonolithicRepeatedContinuationCandidateR1(c:MasterRetainedParentCaptureR1):boolean{
 return registration.anchors.some(a=>a.catalogId===c.definition.catalog_id&&a.definitionId===c.definition.id);
}
export function assertMonolithicRepeatedContinuationR1(input:{capture:MasterRetainedParentCaptureR1;opt:MasterRetainParentBindingsR1;stopCode:string}):void{
 const c=input.capture,m=c.definition.source_metadata as J,v=input.opt.successorProvenanceContinuation;
 const fail=(reason:string):never=>{throw Error('STOP_'+input.stopCode+'_RETAIN_MONOLITHIC_REPEAT_'+reason);};
 const check=(value:unknown,reason:string):void=>{if(!value)fail(reason);};
 const a=registration.anchors.find(a=>a.catalogId===c.definition.catalog_id&&a.definitionId===c.definition.id);check(a,'EXACT_CURRENT_PARENT_REQUIRED');const exact=a!;
 check(c.definition.definition_version===exact.definitionVersion&&c.definition.definition_sha256===exact.definitionSha256&&c.baseline.id===exact.baselineId,'HEADER_OR_BASELINE_DRIFT');
 check(input.opt.capturedParentSha256===exact.capturedParentSha256,'FULL_CAPTURE_NOT_REVIEWED');
 check(m!=null&&typeof m==='object'&&!Array.isArray(m)&&!Object.hasOwn(m,MONOLITHIC_REPEAT_CONTINUATION_KEY_R1),'HISTORY_SLOT_COLLISION');
 check(valueSha(m)===exact.capturedSourceMetadataSha256,'CAPTURED_SOURCE_PREFIX_DRIFT');
 const previous=m.retainedParentBindingContinuationV1 as J;check(previous?.contract==='master-retained-binding-continuation/r1'&&valueSha(previous)===exact.previousContinuationSha256,'PREVIOUS_CONTINUATION_DRIFT');
 check(valueSha(m.retainedParentBindingSuccessorV1)===exact.originalSuccessorSha256,'ORIGINAL_SUCCESSOR_DRIFT');
 check(previous.successor?.catalogId===exact.catalogId&&previous.successor.parentDefinitionId===exact.previousDefinitionId&&previous.successor.parentBaselineId===exact.previousBaselineId&&valueSha(previous.successor)===exact.latestPreviousSuccessorSha256,'PREVIOUS_SUCCESSOR_DRIFT');
 check(c.baseline.source_definition_version_id===exact.previousDefinitionId&&c.baseline.supersedes_baseline_id===exact.previousBaselineId,'CURRENT_BASELINE_PREDECESSOR_DRIFT');
 check(valueSha(previous.previousSourceMetadata)===previous.previousSourceMetadataSha256&&valueSha(previous.previousSourceMetadata.retainedParentBindingSuccessorV1)===previous.previousSuccessorSha256&&valueSha(previous.previousSourceMetadata.retainedParentBindingSuccessorV1)===exact.originalSuccessorSha256,'OLDER_PREFIX_DRIFT');
 check(v?.contract==='master-retained-binding-continuation/r1'&&v.capturedSourceMetadataSha256===exact.capturedSourceMetadataSha256&&valueSha(v.capturedSourceMetadata)===exact.capturedSourceMetadataSha256&&v.capturedPreviousSuccessorSha256===exact.latestPreviousSuccessorSha256,'OPT_IN_ANCHOR_DRIFT');
}
