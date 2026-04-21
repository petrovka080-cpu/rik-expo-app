import type {
  DocumentAsset,
  DocumentSession,
} from "../documents/pdfDocumentSessions";
import {
  resolvePdfViewerDirectSnapshot,
  type PdfViewerDirectSourceParams,
} from "./pdfViewerContract";

export type PdfViewerRouteParams = {
  sessionId?: string | string[];
  openToken?: string | string[];
  uri?: string | string[];
  fileName?: string | string[];
  title?: string | string[];
  sourceKind?: string | string[];
  documentType?: string | string[];
  originModule?: string | string[];
  source?: string | string[];
  entityId?: string | string[];
};

export type PdfViewerRouteValidation =
  | {
      isValid: true;
      reason: "ok";
      errorMessage: null;
      canResolveDirectSnapshot: boolean;
    }
  | {
      isValid: false;
      reason: "missing_uri_and_session";
      errorMessage: "Missing PDF viewer route source.";
      canResolveDirectSnapshot: false;
    };

export type PdfViewerRouteModel = {
  sessionId: string;
  openToken: string;
  hasUri: boolean;
  receivedSessionId: string | null;
  uri: string | null;
  fileName: string | null;
  title: string | null;
  sourceKind: string | null;
  documentType: string | null;
  originModule: string | null;
  source: string | null;
  entityId: string | null;
  validation: PdfViewerRouteValidation;
  directSnapshotParams: PdfViewerDirectSourceParams;
};

export type PdfViewerSnapshot = {
  session: DocumentSession | null;
  asset: DocumentAsset | null;
};

function takeParam(value?: string | string[]) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function toNullable(value: string) {
  return value ? value : null;
}

export function resolvePdfViewerRouteModel(
  params: PdfViewerRouteParams,
): PdfViewerRouteModel {
  const sessionId = takeParam(params.sessionId);
  const openToken = takeParam(params.openToken);
  const uri = takeParam(params.uri);
  const fileName = takeParam(params.fileName);
  const title = takeParam(params.title);
  const sourceKind = takeParam(params.sourceKind);
  const documentType = takeParam(params.documentType);
  const originModule = takeParam(params.originModule);
  const source = takeParam(params.source);
  const entityId = takeParam(params.entityId);
  const hasUri = uri.length > 0;
  const validation: PdfViewerRouteValidation =
    sessionId || hasUri
      ? {
          isValid: true,
          reason: "ok",
          errorMessage: null,
          canResolveDirectSnapshot: hasUri,
        }
      : {
          isValid: false,
          reason: "missing_uri_and_session",
          errorMessage: "Missing PDF viewer route source.",
          canResolveDirectSnapshot: false,
        };

  return {
    sessionId,
    openToken,
    hasUri,
    receivedSessionId: toNullable(sessionId),
    uri: toNullable(uri),
    fileName: toNullable(fileName),
    title: toNullable(title),
    sourceKind: toNullable(sourceKind),
    documentType: toNullable(documentType),
    originModule: toNullable(originModule),
    source: toNullable(source),
    entityId: toNullable(entityId),
    validation,
    directSnapshotParams: {
      uri: uri || undefined,
      fileName: fileName || undefined,
      title: title || undefined,
      sourceKind: sourceKind || undefined,
      documentType: documentType || undefined,
      originModule: originModule || undefined,
      source: source || undefined,
      entityId: entityId || undefined,
    },
  };
}

export function resolvePdfViewerSnapshot(args: {
  route: Pick<PdfViewerRouteModel, "directSnapshotParams">;
  registrySnapshot: PdfViewerSnapshot;
}): PdfViewerSnapshot {
  const { route, registrySnapshot } = args;
  if (registrySnapshot.session) return registrySnapshot;
  return (
    resolvePdfViewerDirectSnapshot(route.directSnapshotParams) ?? {
      session: null,
      asset: null,
    }
  );
}
