import { Platform } from 'react-native';
import { getSessionSafe } from '../supabaseClient';
import type { DocumentDescriptor } from './pdfDocument';
import type { DocumentAsset, DocumentSession } from './pdfDocumentSessions';
import { persistWebPdfPreviewSession, clearWebPdfPreviewCacheForSessionBoundary } from './pdfWebPreviewCache';

/** Only an already authorized, exact canonical artifact can seed the existing
 * account-scoped reload cache. It stores immutable PDF bytes, never credentials. */
export async function persistCanonicalWebPdfPreview(input: {
  doc: DocumentDescriptor; session: DocumentSession; asset: DocumentAsset;
}): Promise<boolean> {
  const { doc, session, asset } = input, identity = doc.contentIdentity;
  if (Platform.OS !== 'web' || doc.documentType !== 'request' || doc.source !== 'generated'
    || !identity?.ownerUserId || !identity.viewerUserId || !identity.revisionId || !identity.releaseId
    || !identity.definitionVersionId || !identity.rendererVersion || !identity.currency
    || !/^[a-f0-9]{64}$/iu.test(identity.checksumSha256 ?? '')
    || !/^[a-f0-9]{64}$/iu.test(identity.artifactSha256 ?? '')
    || !['STANDARD','PRELIMINARY_REVIEW'].includes(identity.issuancePurpose ?? '')) return false;
  const assertCurrentPrincipal = async () => {
    const current = await getSessionSafe({ caller: 'canonical_pdf_web_persistence' });
    if (current.degraded || current.session?.user.id !== identity.viewerUserId) {
      throw Object.assign(new Error('PDF owner changed during preparation'), { name: 'AbortError' });
    }
  };
  await assertCurrentPrincipal();
  const persist = () => persistWebPdfPreviewSession({ session, asset, assertCurrentPrincipal,
      namespace: 'canonical-professional-pdf',
      identity: {
        tenantId: 'canonical-estimate',
        companyId: identity.organizationId || 'consumer:' + identity.ownerUserId,
        userId: identity.viewerUserId,
        // The existing auth lifecycle purges this cache on a session boundary.
        // No access/refresh token is retained or used as a cache identifier.
        sessionBoundaryId: identity.viewerUserId,
        revisionId: identity.revisionId,
        snapshotHash: JSON.stringify([identity.releaseId,identity.definitionVersionId,
          identity.checksumSha256,identity.issuancePurpose,identity.artifactSha256]),
        rendererVersion: identity.rendererVersion, locale: 'ru-KG', currency: identity.currency,
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
