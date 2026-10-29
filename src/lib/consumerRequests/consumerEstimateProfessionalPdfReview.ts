import type {CanonicalEstimateRevisionView} from '../estimate/backendPlatform/contracts';
import type {ConsumerRepairDraftBundle} from './consumerRequestTypes';
import {consumerEstimateSavedProjectionParityForPdfReview} from './consumerEstimateManualQuantityApproval';

export type ConsumerEstimateProfessionalPdfReviewIdentity=Readonly<{
 revisionId:string;releaseId:string;definitionVersionId:string;checksumSha256:string;
 unknownQuantityCount:number;auditSha256:string;
}>;
/** Transient result of an authorized fresh saved-revision read. It grants no
 * acknowledgment, FULL, source admission, payment or procurement authority. */
export function consumerEstimateProfessionalPdfReviewEligible(revision:CanonicalEstimateRevisionView|null|undefined):boolean{
 const e=revision?.professionalPdfReviewEligibilityV1;
 return Boolean(revision&&e?.contractVersion==='canonical-professional-pdf-review-eligibility/v1'
  &&e.eligible===true&&e.status==='ELIGIBLE'&&e.revisionId===revision.revisionId&&e.releaseId===revision.releaseId
  &&e.definitionVersionId===revision.definitionVersionId&&e.checksumSha256===revision.checksumSha256
  &&typeof revision.definitionVersionId==='string'&&revision.definitionVersionId.length>0
  &&/^[a-f0-9]{64}$/iu.test(revision.checksumSha256)
  &&Number.isSafeInteger(e.unknownQuantityCount)&&e.unknownQuantityCount>=0&&/^[a-f0-9]{64}$/iu.test(e.auditSha256));
}
/** A supplied professional DTO owns its physical unknown count. Missing DTOs
 * retain the existing strict path; a blocked composition never silently falls
 * back from an explicit review request to ordinary issuance. */
export function consumerEstimateProfessionalPdfReviewRequired(revision:CanonicalEstimateRevisionView|null|undefined):boolean{
 if(!revision)return false;
 const e=revision.professionalPdfReviewEligibilityV1;
 return e?.contractVersion==='canonical-professional-pdf-review-eligibility/v1'
  ? revision.operationResourceAcceptanceV1?.pdfAllowed!==true
  : revision.operationResourceAcceptanceV1?.pdfAllowed===false;
}
/** Retained strict projection utility. It is not a saved-report read gate. Eligibility
 * for an exceptional preview never becomes authority for the strict path. */
export function consumerEstimateProfessionalPdfSavedProjectionMatches(
 bundle:ConsumerRepairDraftBundle|null|undefined,revision:CanonicalEstimateRevisionView|null|undefined,
):boolean{
 if(!bundle||!revision||!consumerEstimateSavedProjectionParityForPdfReview(bundle,revision))return false;
 const backend=bundle.structuredEstimatePayload?.canonicalBackend??bundle.canonicalBackendApprovalEvidence,
  state=bundle.estimateDraftRevisionState,current=state?.revisions.find(r=>r.revisionId===state.currentRevisionId),
  session=bundle.canonicalParameterSession;
 return Boolean(backend&&backend.compilerOwner==='backend'&&current&&current.revisionId===backend.revisionId
  &&current.resolvedIdentity?.canonicalModelVersion===backend.releaseId
  &&current.resolvedIdentity.sourceBindingVersions.some(s=>s.sourceId===backend.releaseId&&s.version===backend.checksumSha256)
  &&revision.revisionId===backend.revisionId&&revision.releaseId===backend.releaseId&&revision.catalogId===backend.catalogId
  &&revision.checksumSha256===backend.checksumSha256&&!backend.contentWithdrawalReasonRu&&!revision.contentWithdrawalReasonRu
  &&(!session||(session.draftId===bundle.draft.id&&session.revisionId===backend.revisionId&&!session.contentWithdrawalReasonRu)));
}
/** Only saved identity, never local row parity or admission, selects a report. */
export type ConsumerEstimateSavedReportBinding=Readonly<{
 revisionId:string;releaseId:string;checksumSha256?:string;catalogId?:string;definitionVersionId?:string;
}>;
export function consumerEstimateSavedReportBinding(bundle:ConsumerRepairDraftBundle|null|undefined):ConsumerEstimateSavedReportBinding|null{
 if(!bundle)return null;
 const text=(value:unknown)=>typeof value==='string'?value.trim():'',
  from=(value:unknown):ConsumerEstimateSavedReportBinding|null=>{
   if(!value||typeof value!=='object'||Array.isArray(value))return null;
   const record=value as Record<string,unknown>,revisionId=text(record.revisionId),releaseId=text(record.releaseId);
   if(!revisionId||!releaseId)return null;
   return{revisionId,releaseId,...(text(record.checksumSha256)?{checksumSha256:text(record.checksumSha256)}:{}),
    ...(text(record.catalogId)?{catalogId:text(record.catalogId)}:{}),
    ...(text(record.definitionVersionId)?{definitionVersionId:text(record.definitionVersionId)}:{})};
  };
 const backend=from(bundle.structuredEstimatePayload?.canonicalBackend)??from(bundle.canonicalBackendApprovalEvidence);
 if(backend)return backend;
 // The calculation/editor projection is not automatically backend authority.
 // Durable compaction intentionally drops payload/evidence; its row source tuple
 // remains readable even when a local calculation has its own revision/model.
 const state=bundle.estimateDraftRevisionState,
  current=Array.isArray(state?.revisions)?state.revisions.find(row=>row!=null&&typeof row==='object'&&row.revisionId===state.currentRevisionId):undefined,
  identity=current?.resolvedIdentity,
  canonical=identity?.canonicalModelId==='canonical-estimate-backend'
   &&identity.calculationStrategyId==='canonical-backend-formula-graph',
  releaseId=canonical?text(identity.canonicalModelVersion):'',
  sourceBindings=Array.isArray(identity?.sourceBindingVersions)?identity.sourceBindingVersions:[],
  checksum=sourceBindings.find(source=>source&&typeof source==='object'&&source.sourceId===releaseId
   &&typeof source.version==='string'&&/^[a-f0-9]{64}$/iu.test(source.version))?.version,
  projected:ConsumerEstimateSavedReportBinding|null=canonical&&current&&releaseId
   ?{revisionId:current.revisionId,releaseId,...(checksum?{checksumSha256:checksum}:{})}:null;
 const bindings=(bundle.items??[]).map(item=>({revisionId:text(item.sourceParameters?.canonicalBackendRevisionId),
  releaseId:text(item.sourceParameters?.canonicalBackendReleaseId)})).filter(binding=>binding.revisionId&&binding.releaseId),
  distinct=new Map(bindings.map(binding=>[binding.revisionId+'|'+binding.releaseId,binding]));
 if(distinct.size>1)return null;
 const history=bundle.durableHistorySummary,
  saved=distinct.size===1?[...distinct.values()][0]!:history?.sourceRevisionId&&history.sourceReleaseId
   ?{revisionId:history.sourceRevisionId,releaseId:history.sourceReleaseId}:null;
 if(saved){
  // Explicit canonical identities must agree. A generic local model is not an
  // opposing saved backend revision, and local row parity is not a read gate.
  if(projected&&(projected.revisionId!==saved.revisionId||projected.releaseId!==saved.releaseId))return null;
  return{...saved,...(projected?.checksumSha256?{checksumSha256:projected.checksumSha256}:{})};
 }
 return projected;
}
export function consumerEstimateProfessionalPdfReviewCandidate(
 bundle:ConsumerRepairDraftBundle|null|undefined,revision:CanonicalEstimateRevisionView|null|undefined,
):ConsumerEstimateProfessionalPdfReviewIdentity|null{
 if(!revision||!consumerEstimateProfessionalPdfReviewEligible(revision))return null;
 const binding=consumerEstimateSavedReportBinding(bundle);
 if(!binding||binding.revisionId!==revision.revisionId||binding.releaseId!==revision.releaseId
  ||binding.checksumSha256&&binding.checksumSha256!==revision.checksumSha256
  ||binding.catalogId&&binding.catalogId!==revision.catalogId
  ||binding.definitionVersionId&&binding.definitionVersionId!==revision.definitionVersionId)return null;
 const e=revision.professionalPdfReviewEligibilityV1!;
 return{revisionId:revision.revisionId,releaseId:revision.releaseId,definitionVersionId:revision.definitionVersionId!,
  checksumSha256:revision.checksumSha256,unknownQuantityCount:e.unknownQuantityCount,auditSha256:e.auditSha256};
}