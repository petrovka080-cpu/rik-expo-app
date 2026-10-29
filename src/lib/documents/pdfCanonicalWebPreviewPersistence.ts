import { Platform } from 'react-native';
import { getSessionSafe } from '../supabaseClient';
import type { DocumentDescriptor } from './pdfDocument';
import type { DocumentAsset, DocumentSession } from './pdfDocumentSessions';
import { persistWebPdfPreviewSession, clearWebPdfPreviewCacheForSessionBoundary } from './pdfWebPreviewCache';

function identityString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
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
  const persist = () => persistWebPdfPreviewSession({ session, asset, assertCurrentPrincipal,
      namespace: 'canonical-professional-pdf',
      identity: {
        tenantId: 'canonical-estimate',
        companyId: organizationId || 'consumer:' + ownerUserId,
        userId: viewerUserId,
        // The existing auth lifecycle purges this cache on a session boundary.
        // No access/refresh token is retained or used as a cache identifier.
        sessionBoundaryId: viewerUserId,
        revisionId,
        snapshotHash: JSON.stringify([releaseId,definitionVersionId,
          checksumSha256,issuancePurpose,artifactSha256]),
        rendererVersion, locale: 'ru-KG', currency,
      },
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
