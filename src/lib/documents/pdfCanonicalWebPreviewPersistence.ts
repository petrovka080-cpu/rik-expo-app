import { Platform } from 'react-native';
import { getSessionSafe } from '../supabaseClient';
import {createPdfDocumentDescriptor,parseCanonicalPdfRecoveryReference,canonicalPdfRecoveryReferenceFromDescriptor,canonicalPdfRecoveryReferencesMatch,type DocumentDescriptor} from './pdfDocument';
import {createDocumentPreviewSession,restoreInMemoryDocumentPreviewSession,discardDocumentSession,getDocumentSessionSnapshot,type DocumentAsset,type DocumentSession} from './pdfDocumentSessions';
import { persistWebPdfPreviewSession, clearWebPdfPreviewCacheForSessionBoundary,restoreWebPdfPreviewSessionDetailed } from './pdfWebPreviewCache';
import type {WebPdfPreviewCacheIdentity} from './pdfWebPreviewIdentity';

function identityString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** One cache identity law for persistence and fresh authorized restoration. */
export function canonicalPdfPreviewCacheIdentity(identity:DocumentDescriptor['contentIdentity']):WebPdfPreviewCacheIdentity|null{
  if(!identity)return null;
  const {ownerUserId,viewerUserId,organizationId,revisionId,releaseId,definitionVersionId,rendererVersion,currency,checksumSha256,artifactSha256,issuancePurpose}=identity;
  if(![ownerUserId,viewerUserId,revisionId,releaseId,definitionVersionId,rendererVersion,currency].every(identityString)
    ||!/^[a-f0-9]{64}$/iu.test(checksumSha256??'')||!/^[a-f0-9]{64}$/iu.test(artifactSha256??'')
    ||(issuancePurpose!=='STANDARD'&&issuancePurpose!=='PRELIMINARY_REVIEW'))return null;
  return {tenantId:'canonical-estimate',companyId:organizationId||'consumer:'+ownerUserId,userId:viewerUserId!,
    sessionBoundaryId:viewerUserId!,revisionId:revisionId!,snapshotHash:JSON.stringify([releaseId,definitionVersionId,checksumSha256,issuancePurpose,artifactSha256]),
    rendererVersion:rendererVersion!,locale:'ru-KG',currency:currency!};
}

/** Only an already authorized, exact canonical artifact can seed the existing
 * account-scoped reload cache. It stores immutable PDF bytes, never credentials. */
export async function persistCanonicalWebPdfPreview(input: {
  doc: DocumentDescriptor; session: DocumentSession; asset: DocumentAsset;
}): Promise<boolean> {
  const { doc, session, asset } = input, identity = doc.contentIdentity;
  if (Platform.OS !== 'web' || doc.documentType !== 'request' || doc.source !== 'generated' || !identity) return false;
  // Snapshot validated primitives before any asynchronous auth/cache work.
  // Mutable descriptor properties cannot retarget the principal or saved file.
  const { ownerUserId, viewerUserId, organizationId, revisionId, releaseId,
    definitionVersionId, rendererVersion, currency, checksumSha256,
    artifactSha256, issuancePurpose } = identity;
  if (!ownerUserId || !viewerUserId || !revisionId || !releaseId
    || !definitionVersionId || !rendererVersion || !currency
    || !/^[a-f0-9]{64}$/iu.test(checksumSha256 ?? '')
    || !/^[a-f0-9]{64}$/iu.test(artifactSha256 ?? '')
    || (issuancePurpose !== 'STANDARD' && issuancePurpose !== 'PRELIMINARY_REVIEW')) return false;
  if (!identityString(ownerUserId) || !identityString(viewerUserId)
    || !identityString(revisionId) || !identityString(releaseId)
    || !identityString(definitionVersionId) || !identityString(rendererVersion)
    || !identityString(currency) || !identityString(checksumSha256) || !identityString(artifactSha256)) {
    throw Object.assign(new Error('PDF identity fields must be strings'), { name: 'AbortError' });
  }
  const assertCurrentPrincipal = async () => {
    const current = await getSessionSafe({ caller: 'canonical_pdf_web_persistence' });
    if (current.degraded || current.session?.user.id !== viewerUserId) {
      throw Object.assign(new Error('PDF owner changed during preparation'), { name: 'AbortError' });
    }
  };
  await assertCurrentPrincipal();
  const persist = () => persistWebPdfPreviewSession({ session, asset:{...asset,contentIdentity:{ownerUserId,viewerUserId,organizationId,revisionId,releaseId,
        definitionVersionId,rendererVersion,currency,checksumSha256,artifactSha256,issuancePurpose}}, assertCurrentPrincipal,
      namespace: 'canonical-professional-pdf',
      identity: canonicalPdfPreviewCacheIdentity({ownerUserId,viewerUserId,organizationId,revisionId,releaseId,
        definitionVersionId,rendererVersion,currency,checksumSha256,artifactSha256,issuancePurpose})!,
    });
  try {
    return await persist();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof Error && error.message === 'PDF preview cache principal boundary changed without lifecycle reset.') {
      // Earlier generated previews used a different namespace/principal. Purge
      // only their disposable PDF cache, then activate the verified owner once.
      await assertCurrentPrincipal();
      await clearWebPdfPreviewCacheForSessionBoundary();
      await assertCurrentPrincipal();
      try { return await persist(); }
      catch (retryError) {
        if (retryError instanceof Error && retryError.name === 'AbortError') throw retryError;
        return false;
      }
    }
    // Restricted browser storage must not prevent opening an authorized PDF.
    return false;
  }
}

export type CanonicalPdfRecoveryResult=
  |{recovered:true;via:'AUTHORIZED_CACHE'|'FRESH_SAVED_ARTIFACT'}
  |{recovered:false;reason:'INVALID_REFERENCE'|'AUTHORIZATION_UNAVAILABLE'|'AUTHORIZATION_CHANGED'|'IDENTITY_MISMATCH'|'ACCESS_DENIED'|'REPRESENTATION_UNAVAILABLE'|'RECOVERY_FAILED'};

/** Re-authorize one saved locator. No draft/current/neighbor revision is read. */
export async function recoverCanonicalPdfViewerSession(input:{
  sessionId:string;reference:unknown;assertCurrent?:()=>void;
}):Promise<CanonicalPdfRecoveryResult>{
  const reference=parseCanonicalPdfRecoveryReference(input.reference);
  if(!reference||!input.sessionId.trim())return {recovered:false,reason:'INVALID_REFERENCE'};
  const existing=getDocumentSessionSnapshot(input.sessionId);
  const existingReference=existing.asset?canonicalPdfRecoveryReferenceFromDescriptor(existing.asset):null;
  if(existing.asset&&(!existingReference||!canonicalPdfRecoveryReferencesMatch(existingReference,reference)))return {recovered:false,reason:'IDENTITY_MISMATCH'};
  let preparedSessionId:string|undefined,preparedAssetId:string|undefined,committedAssetId:string|undefined;
  try{
    input.assertCurrent?.();
    const initial=await getSessionSafe({caller:'canonical_pdf_recovery'});
    input.assertCurrent?.();
    if(initial.degraded||!initial.session?.user.id)return {recovered:false,reason:'AUTHORIZATION_UNAVAILABLE'};
    const viewerUserId=initial.session.user.id;
    const assertCurrentPrincipal=async()=>{
      input.assertCurrent?.();
      const current=await getSessionSafe({caller:'canonical_pdf_recovery'});
      input.assertCurrent?.();
      if(current.degraded||current.session?.user.id!==viewerUserId)
        throw Object.assign(new Error('PDF recovery authorization changed'),{name:'AbortError'});
    };
    const [client,contracts,renderer,artifactContract,eligibility]=await Promise.all([
      import('../estimate/backendPlatform/canonicalEstimateClient'),
      import('../estimate/backendPlatform/contracts'),
      import('../estimate/backendPlatform/canonicalProfessionalPdf'),
      import('../estimate/backendPlatform/canonicalEstimateArtifactContract'),
      import('../consumerRequests/consumerEstimateProfessionalPdfReview'),
    ]);
    await assertCurrentPrincipal();
    const report=reference.issuancePurpose==='PRELIMINARY_REVIEW';
    const revision=await client.getCanonicalEstimateRevision(reference.revisionId,report?{issuancePurpose:'PRELIMINARY_REVIEW'}:undefined);
    await assertCurrentPrincipal();
    if(revision.revisionId!==reference.revisionId||revision.releaseId!==reference.releaseId
      ||revision.definitionVersionId!==reference.definitionVersionId||revision.checksumSha256!==reference.checksumSha256
      ||Object.hasOwn(reference,'organizationId')&&(revision.organizationId??null)!==reference.organizationId
      ||report&&!eligibility.consumerEstimateProfessionalPdfReviewEligible(revision))
      return {recovered:false,reason:'IDENTITY_MISMATCH'};
    const target={revisionId:reference.revisionId,kind:'pdf' as const,documentProfile:'professional_v1' as const,issuancePurpose:reference.issuancePurpose};
    const artifactRequest=()=>report?({...target,issuancePurpose:'PRELIMINARY_REVIEW' as const,
      reviewRequest:{revisionId:reference.revisionId,releaseId:reference.releaseId,definitionVersionId:reference.definitionVersionId,
        checksumSha256:reference.checksumSha256,acknowledgedPreliminaryReview:true as const},
      idempotencyKey:'consumer-report-'+renderer.CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION+'-'+revision.revisionId+'-'+revision.professionalPdfReviewEligibilityV1!.auditSha256}):({...target,
      idempotencyKey:'viewer-pdf-'+renderer.CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION+'-'+revision.revisionId+'-'+revision.checksumSha256});
    let artifact;
    try{artifact=await client.getCanonicalEstimateArtifact(target);}
    catch(error){
      if(!(error instanceof contracts.CanonicalEstimateApiError)||!['NOT_FOUND','ARTIFACT_PRESENTATION_REFRESH_REQUIRED'].includes(error.code))throw error;
      await assertCurrentPrincipal();
      artifact=await client.buildCanonicalEstimateArtifact(artifactRequest());
    }
    await assertCurrentPrincipal();
    if(artifact.status==='queued'||artifact.status==='building'){
      if(artifact.revisionId!==reference.revisionId||artifact.releaseId!==reference.releaseId||artifact.kind!=='pdf')
        return {recovered:false,reason:'REPRESENTATION_UNAVAILABLE'};
      artifact=await client.buildCanonicalEstimateArtifact(artifactRequest());
      await assertCurrentPrincipal();
    }
    client.assertCanonicalEstimateArtifactIdentity({artifact,revision,expectedKind:'pdf',expectedDocumentProfile:'professional_v1',
      expectedIssuancePurpose:reference.issuancePurpose,expectedCatalogId:revision.catalogId,expectedRowCount:revision.rowCount});
    const rawAck=artifact.metadata.reviewAcknowledgmentV1;
    const reviewAck=rawAck&&typeof rawAck==='object'&&!Array.isArray(rawAck)?rawAck as Record<string,unknown>:null;
    if((artifact.metadata.sourceOrganizationId??null)!==(revision.organizationId??null)
      ||report&&reviewAck?.auditSha256!==revision.professionalPdfReviewEligibilityV1!.auditSha256)
      return {recovered:false,reason:'REPRESENTATION_UNAVAILABLE'};
    if(artifact.metadata?.generatorVersion!==renderer.CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION
      ||artifact.metadata?.templateVersion!==artifactContract.CANONICAL_PROFESSIONAL_PDF_TEMPLATE_VERSION
      ||typeof artifact.sha256!=='string'||!/^[a-f0-9]{64}$/iu.test(artifact.sha256)
      ||!artifact.signedUrl)return {recovered:false,reason:'REPRESENTATION_UNAVAILABLE'};
    const doc=createPdfDocumentDescriptor({uri:artifact.signedUrl,title:'Отчёт сохранённой версии сметы',
      documentType:'request',source:'generated',originModule:'reports',entityId:reference.revisionId,
      expectedByteSize:artifact.byteSize??undefined,
      contentIdentity:{revisionId:revision.revisionId,releaseId:revision.releaseId,definitionVersionId:revision.definitionVersionId!,
        checksumSha256:revision.checksumSha256,issuancePurpose:reference.issuancePurpose,artifactSha256:artifact.sha256,
        rendererVersion:renderer.CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,ownerUserId:String(artifact.metadata.sourceOwnerUserId),
        viewerUserId,organizationId:revision.organizationId??undefined,currency:revision.currencyCode}});
    const cacheIdentity=canonicalPdfPreviewCacheIdentity(doc.contentIdentity);
    if(!cacheIdentity)return {recovered:false,reason:'IDENTITY_MISMATCH'};
    await assertCurrentPrincipal();
    const cached=Platform.OS==='web'?await restoreWebPdfPreviewSessionDetailed(input.sessionId,{identity:cacheIdentity,contentIdentity:doc.contentIdentity!,assertCurrentPrincipal})
      :{restored:false as const,reason:'MISSING_ASSET' as const};
    if(cached.restored)committedAssetId=getDocumentSessionSnapshot(input.sessionId).asset?.assetId;
    await assertCurrentPrincipal();
    if(cached.restored)return {recovered:true,via:'AUTHORIZED_CACHE'};
    if(cached.reason==='AUTHORIZATION_CHANGED')return {recovered:false,reason:'AUTHORIZATION_CHANGED'};
    if(cached.reason==='REFERENCE_MISMATCH')return {recovered:false,reason:'IDENTITY_MISMATCH'};
    // A cache miss is not a missing saved document. Re-materialize only the
    // freshly authorized artifact of this exact reference, using existing code.
    const prepared=await createDocumentPreviewSession(doc);preparedSessionId=prepared.session.sessionId;preparedAssetId=prepared.asset.assetId;
    await assertCurrentPrincipal();
    // Persist under the requested ID before exposing it as ready. The temporary
    // preparation session is never navigated to and is discarded on cancellation.
    await persistCanonicalWebPdfPreview({doc,session:{...prepared.session,sessionId:input.sessionId},asset:prepared.asset});
    await assertCurrentPrincipal();
    const restored=restoreInMemoryDocumentPreviewSession({sessionId:input.sessionId,replaceExisting:true,
      doc:{...doc,uri:prepared.asset.uri,fileSource:prepared.asset.fileSource,objectUrlOwnership:prepared.asset.objectUrlOwnership}});
    committedAssetId=restored.asset.assetId;
    if(preparedSessionId!==input.sessionId&&getDocumentSessionSnapshot(preparedSessionId).asset?.assetId===preparedAssetId)discardDocumentSession(preparedSessionId);
    preparedSessionId=undefined;
    return {recovered:true,via:'FRESH_SAVED_ARTIFACT'};
  }catch(error){
    if(preparedSessionId&&getDocumentSessionSnapshot(preparedSessionId).asset?.assetId===preparedAssetId)discardDocumentSession(preparedSessionId);
    if(committedAssetId&&getDocumentSessionSnapshot(input.sessionId).asset?.assetId===committedAssetId)discardDocumentSession(input.sessionId);
    if(error instanceof Error&&error.name==='AbortError')return {recovered:false,reason:'AUTHORIZATION_CHANGED'};
    const code=error!=null&&typeof error==='object'&&'code'in error?String(error.code):'';
    return {recovered:false,reason:['FORBIDDEN','UNAUTHORIZED'].includes(code)?'ACCESS_DENIED':
      ['ARTIFACT_REVISION_IDENTITY_MISMATCH','ARTIFACT_PURPOSE_CONFLICT'].includes(code)?'IDENTITY_MISMATCH':
      ['NOT_FOUND','ARTIFACT_PRESENTATION_REFRESH_REQUIRED'].includes(code)?'REPRESENTATION_UNAVAILABLE':'RECOVERY_FAILED'};
  }
}
