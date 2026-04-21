import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import type { BusyLike } from "../pdfRunner";
import type { PdfOpenFlowContext } from "../pdf/pdfOpenFlow";
import type { PdfActionBoundaryRun } from "../pdf/pdfActionBoundary";
import type { PdfSource } from "../pdfFileContract";
import type { DocumentDescriptor } from "./pdfDocument";
import type { PdfViewerRouterLike } from "./pdfDocumentViewerEntry";

export type PdfDocumentSupabaseLike = {
  auth?: Pick<SupabaseClient<Database>, "auth">["auth"];
};

export type PreparePdfDocumentDescriptor = Omit<DocumentDescriptor, "uri" | "fileSource"> & {
  uri?: string;
  fileSource?: PdfSource;
};

export type PreparePdfDocumentArgs = {
  busy?: BusyLike;
  supabase: PdfDocumentSupabaseLike;
  key?: string;
  label?: string;
  descriptor: PreparePdfDocumentDescriptor;
  resolveSource?: () => Promise<PdfSource> | PdfSource;
  getRemoteUrl?: () => Promise<string> | string;
};

export type PdfDocumentActionStage = "prepare" | "viewer_entry" | "visibility";

export type PreviewPdfDocumentOpts = {
  router?: PdfViewerRouterLike;
  openFlow?: PdfOpenFlowContext & {
    openToken?: string;
  };
  onBeforeNavigate?: (() => void | Promise<void>) | null;
  boundaryRun?: PdfActionBoundaryRun;
  assertCurrentRun?: (stage: PdfDocumentActionStage) => void;
};

export type PersistCriticalPdfBreadcrumbInput = {
  marker: string;
  screen: unknown;
  documentType?: unknown;
  originModule?: unknown;
  sourceKind?: unknown;
  uriKind?: unknown;
  uri?: unknown;
  fileName?: unknown;
  entityId?: unknown;
  sessionId?: unknown;
  openToken?: unknown;
  fileExists?: unknown;
  fileSizeBytes?: unknown;
  previewPath?: unknown;
  errorMessage?: unknown;
  terminalState?: unknown;
  extra?: Record<string, unknown>;
};
