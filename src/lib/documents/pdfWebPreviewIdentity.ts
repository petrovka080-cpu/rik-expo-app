import { hashString32 } from "../pdfFileContract";

export const WEB_PDF_PREVIEW_CACHE_SCHEMA_VERSION = "web-pdf-preview-cache-v2" as const;

export type WebPdfPreviewCacheIdentity = {
  tenantId: string;
  companyId: string;
  userId: string;
  sessionBoundaryId: string;
  revisionId: string;
  snapshotHash: string;
  rendererVersion: string;
  locale: string;
  currency: string;
};

function requiredIdentityPart(name: keyof WebPdfPreviewCacheIdentity, value: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`PDF preview cache identity is missing ${name}.`);
  return normalized;
}

export function normalizeWebPdfPreviewCacheIdentity(
  input: WebPdfPreviewCacheIdentity,
): WebPdfPreviewCacheIdentity {
  return {
    tenantId: requiredIdentityPart("tenantId", input.tenantId),
    companyId: requiredIdentityPart("companyId", input.companyId),
    userId: requiredIdentityPart("userId", input.userId),
    sessionBoundaryId: requiredIdentityPart("sessionBoundaryId", input.sessionBoundaryId),
    revisionId: requiredIdentityPart("revisionId", input.revisionId),
    snapshotHash: requiredIdentityPart("snapshotHash", input.snapshotHash),
    rendererVersion: requiredIdentityPart("rendererVersion", input.rendererVersion),
    locale: requiredIdentityPart("locale", input.locale),
    currency: requiredIdentityPart("currency", input.currency).toUpperCase(),
  };
}

export function canonicalWebPdfPreviewCacheIdentity(
  input: WebPdfPreviewCacheIdentity,
): string {
  const identity = normalizeWebPdfPreviewCacheIdentity(input);
  return JSON.stringify([
    WEB_PDF_PREVIEW_CACHE_SCHEMA_VERSION,
    identity.tenantId,
    identity.companyId,
    identity.userId,
    identity.sessionBoundaryId,
    identity.revisionId,
    identity.snapshotHash,
    identity.rendererVersion,
    identity.locale,
    identity.currency,
  ]);
}

export function buildWebPdfPreviewPrincipalKey(
  input: Pick<
    WebPdfPreviewCacheIdentity,
    "tenantId" | "companyId" | "userId" | "sessionBoundaryId"
  >,
): string {
  const canonical = JSON.stringify([
    WEB_PDF_PREVIEW_CACHE_SCHEMA_VERSION,
    input.tenantId,
    input.companyId,
    input.userId,
    input.sessionBoundaryId,
  ]);
  return `principal:${hashString32(canonical)}:${canonical.length}`;
}

export function buildWebPdfPreviewCacheKey(input: {
  namespace: string;
  identity: WebPdfPreviewCacheIdentity;
}): string {
  const namespace = String(input.namespace ?? "").trim();
  if (!namespace) throw new Error("PDF preview cache namespace is empty.");
  const canonical = canonicalWebPdfPreviewCacheIdentity(input.identity);
  return [
    WEB_PDF_PREVIEW_CACHE_SCHEMA_VERSION,
    encodeURIComponent(namespace),
    `tenant=${hashString32(input.identity.tenantId)}`,
    `company=${hashString32(input.identity.companyId)}`,
    `user_session=${hashString32(`${input.identity.userId}:${input.identity.sessionBoundaryId}`)}`,
    `revision=${hashString32(input.identity.revisionId)}`,
    `snapshot=${hashString32(input.identity.snapshotHash)}`,
    `renderer=${hashString32(input.identity.rendererVersion)}`,
    `locale_currency=${hashString32(`${input.identity.locale}:${input.identity.currency}`)}`,
    `identity=${hashString32(canonical)}:${canonical.length}`,
  ].join(":");
}
