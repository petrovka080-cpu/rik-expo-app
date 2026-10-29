import { createPdfSource, type PdfSource } from "../pdfFileContract";

export type PdfDocumentType =
  | "request"
  | "proposal"
  | "payment_order"
  | "director_report"
  | "report_export"
  | "supplier_summary"
  | "warehouse_register"
  | "warehouse_materials"
  | "warehouse_document"
  | "contractor_act"
  | "attachment_pdf";

export type PdfOriginModule =
  | "foreman"
  | "buyer"
  | "accountant"
  | "director"
  | "warehouse"
  | "contractor"
  | "reports";

export type DocumentDescriptor = {
  uri: string;
  fileSource: PdfSource;
  objectUrlOwnership?: "document-session";
  fileName: string;
  title: string;
  mimeType: "application/pdf";
  documentType: PdfDocumentType;
  source: "generated" | "attachment";
  originModule: PdfOriginModule;
  createdAt?: string;
  entityId?: string;
  /** Trusted artifact length, used to reject an interrupted native cache write. */
  expectedByteSize?: number;
  contentIdentity?: {
    revisionId?: string;
    rendererVersion?: string;
    displayTitle?: string;
    documentStatus?: string;
    issuancePurpose?: 'STANDARD'|'PRELIMINARY_REVIEW';
    releaseId?:string;
    definitionVersionId?:string;
    checksumSha256?:string;
    /** Authenticated artifact owner and saved tenant for reload-safe Web cache. */
    ownerUserId?:string;
    /** Authorized viewing actor; may differ from a revision creator in a tenant. */
    viewerUserId?:string;
    /** Exact generated file bytes, independent of the saved revision hash. */
    artifactSha256?:string;
    organizationId?:string;
    currency?:string;
  };
};

/** Untrusted exact saved locator; never a URL, credential or access grant. */
export type CanonicalPdfRecoveryReference = Readonly<{
  contractVersion:'canonical-pdf-recovery/v1';
  revisionId:string;releaseId:string;definitionVersionId:string;checksumSha256:string;
  issuancePurpose:'STANDARD'|'PRELIMINARY_REVIEW';documentProfile:'professional_v1';
  organizationId?:string|null;
}>;

export function parseCanonicalPdfRecoveryReference(value:unknown):CanonicalPdfRecoveryReference|null{
  let raw=value;
  if(typeof raw==='string'){if(raw.length>2048)return null;try{raw=JSON.parse(raw);}catch{return null;}}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const record=raw as Record<string,unknown>,required=['contractVersion','revisionId','releaseId','definitionVersionId','checksumSha256','issuancePurpose','documentProfile'];
  if(required.some(key=>!Object.hasOwn(record,key))
    ||Object.keys(record).some(key=>!required.includes(key)&&key!=='organizationId'))return null;
  if(record.contractVersion!=='canonical-pdf-recovery/v1'||record.documentProfile!=='professional_v1'
    ||(record.issuancePurpose!=='STANDARD'&&record.issuancePurpose!=='PRELIMINARY_REVIEW')
    ||!['revisionId','releaseId','definitionVersionId'].every(key=>typeof record[key]==='string'&&String(record[key]).trim()===record[key]&&String(record[key]).length>0&&String(record[key]).length<=200)
    ||typeof record.checksumSha256!=='string'||!/^[a-f0-9]{64}$/iu.test(record.checksumSha256)
    ||Object.hasOwn(record,'organizationId')&&record.organizationId!==null&&(typeof record.organizationId!=='string'||!record.organizationId.trim()||record.organizationId.length>200))return null;
  return Object.freeze({contractVersion:'canonical-pdf-recovery/v1',revisionId:String(record.revisionId),releaseId:String(record.releaseId),
    definitionVersionId:String(record.definitionVersionId),checksumSha256:record.checksumSha256,
    issuancePurpose:record.issuancePurpose as CanonicalPdfRecoveryReference['issuancePurpose'],documentProfile:'professional_v1',
    ...(Object.hasOwn(record,'organizationId')?{organizationId:record.organizationId as string|null}:{})});
}

export function canonicalPdfRecoveryReferenceFromDescriptor(
  doc:Pick<DocumentDescriptor,'documentType'|'source'|'contentIdentity'>,
):CanonicalPdfRecoveryReference|null{
  const identity=doc.contentIdentity;
  if(doc.documentType!=='request'||doc.source!=='generated'||!identity)return null;
  return parseCanonicalPdfRecoveryReference({contractVersion:'canonical-pdf-recovery/v1',revisionId:identity.revisionId,releaseId:identity.releaseId,
    definitionVersionId:identity.definitionVersionId,checksumSha256:identity.checksumSha256,issuancePurpose:identity.issuancePurpose,
    documentProfile:'professional_v1',organizationId:identity.organizationId??null});
}

export function canonicalPdfRecoveryReferencesMatch(left:unknown,right:unknown):boolean{
  const a=parseCanonicalPdfRecoveryReference(left),b=parseCanonicalPdfRecoveryReference(right);
  return Boolean(a&&b&&a.revisionId===b.revisionId&&a.releaseId===b.releaseId&&a.definitionVersionId===b.definitionVersionId
    &&a.checksumSha256===b.checksumSha256&&a.issuancePurpose===b.issuancePurpose
    &&(a.organizationId??null)===(b.organizationId??null));
}

export function canonicalPdfContentIdentityMatches(
  left:DocumentDescriptor['contentIdentity'],right:DocumentDescriptor['contentIdentity'],
):boolean{
  const descriptor=(contentIdentity:DocumentDescriptor['contentIdentity'])=>({documentType:'request' as const,source:'generated' as const,contentIdentity});
  if(!canonicalPdfRecoveryReferenceFromDescriptor(descriptor(left))||!canonicalPdfRecoveryReferenceFromDescriptor(descriptor(right)))return false;
  const keys=['revisionId','releaseId','definitionVersionId','checksumSha256','issuancePurpose','rendererVersion','artifactSha256','ownerUserId','viewerUserId','currency'] as const;
  return keys.every(key=>{const a=left?.[key],b=right?.[key];return typeof a==='string'&&a.length>0&&a===b;})
    &&(left?.organizationId??null)===(right?.organizationId??null);
}

export type PdfViewerRouteParams = {
  sessionId: string;
};

type CreatePdfDocumentDescriptorArgs = {
  uri: string;
  objectUrlOwnership?: "document-session";
  title: string;
  fileName?: string | null;
  documentType: PdfDocumentType;
  source: "generated" | "attachment";
  originModule: PdfOriginModule;
  createdAt?: string;
  entityId?: string | number | null;
  expectedByteSize?: number;
  contentIdentity?: DocumentDescriptor["contentIdentity"];
};

const DOC_LABELS: Record<PdfDocumentType, string> = {
  request: "request",
  proposal: "proposal",
  payment_order: "payment_order",
  director_report: "director_report",
  report_export: "report_export",
  supplier_summary: "supplier_summary",
  warehouse_register: "warehouse_register",
  warehouse_materials: "warehouse_materials",
  warehouse_document: "warehouse_document",
  contractor_act: "contractor_act",
  attachment_pdf: "attachment",
};

export function normalizePdfFileName(input?: string | null, fallback = "document"): string {
  const base = String(input || "").trim() || fallback;
  const sanitized = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const out = sanitized || fallback;
  return out.toLowerCase().endsWith(".pdf") ? out : `${out}.pdf`;
}

export function buildPdfFileName(args: {
  documentType: PdfDocumentType;
  title?: string | null;
  entityId?: string | number | null;
  dateIso?: string | null;
}): string {
  const typeLabel = DOC_LABELS[args.documentType] || "document";
  const titlePart = String(args.title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const entityPart = String(args.entityId ?? "").trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
  const datePart = String(args.dateIso || "").trim().slice(0, 10);
  const stem = [typeLabel, titlePart, datePart, entityPart].filter(Boolean).join("_");
  return normalizePdfFileName(stem, typeLabel);
}

export function createPdfDocumentDescriptor(
  args: CreatePdfDocumentDescriptorArgs,
): DocumentDescriptor {
  const fileSource = createPdfSource(args.uri);
  const uri = fileSource.uri;

  const title = String(args.title || "").trim() || DOC_LABELS[args.documentType];
  const createdAt = args.createdAt || new Date().toISOString();
  if (args.expectedByteSize !== undefined &&
      (!Number.isSafeInteger(args.expectedByteSize) || args.expectedByteSize <= 0)) {
    throw new Error("PDF expected byte size must be a positive integer.");
  }
  const fileName =
    normalizePdfFileName(
      args.fileName,
      buildPdfFileName({
        documentType: args.documentType,
        title,
        entityId: args.entityId,
        dateIso: createdAt,
      }),
    );

  return {
    uri,
    fileSource,
    objectUrlOwnership: args.objectUrlOwnership,
    fileName,
    title,
    mimeType: "application/pdf",
    documentType: args.documentType,
    source: args.source,
    originModule: args.originModule,
    createdAt,
    entityId: args.entityId == null ? undefined : String(args.entityId),
    expectedByteSize: args.expectedByteSize,
    contentIdentity: args.contentIdentity,
  };
}
