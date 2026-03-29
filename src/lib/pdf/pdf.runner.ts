import { openHtmlAsPdfUniversal } from "../api/pdf";
import {
  createPdfDocumentDescriptor,
  type DocumentDescriptor,
  type PdfDocumentType,
  type PdfOriginModule,
} from "../documents/pdfDocument";
import { createPdfSource, type PdfSource } from "../pdfFileContract";
import {
  preparePdfDocument,
  previewPdfDocument,
  sharePdfDocument,
} from "../documents/pdfDocumentActions";
import { beginPdfLifecycleObservation } from "./pdfLifecycle";
import { normalizeRuTextForHtml } from "../text/encoding";
import type { BusyLike } from "../pdfRunner";

type PdfRouterLike = {
  push: (href: { pathname: string; params: Record<string, string> }) => void;
};

type BuildGeneratedPdfDescriptorArgs = {
  getSource?: () => Promise<PdfSource>;
  getUri?: () => Promise<string>;
  title: string;
  fileName?: string | null;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  entityId?: string | number | null;
};

type PrepareGeneratedPdfArgs = {
  busy?: BusyLike;
  supabase: unknown;
  key: string;
  label: string;
  descriptor: DocumentDescriptor;
};

export async function renderPdfHtmlToUri(args: {
  html: string;
  documentType: string;
  source: string;
  maxLength?: number;
  share?: boolean;
}): Promise<string> {
  return (await renderPdfHtmlToSource(args)).uri;
}

export async function renderPdfHtmlToSource(args: {
  html: string;
  documentType: string;
  source: string;
  maxLength?: number;
  share?: boolean;
}): Promise<PdfSource> {
  const templateObservation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_template",
    event: "pdf_template_prepare",
    stage: "template",
    sourceKind: `pdf:${args.documentType}`,
    context: {
      documentFamily: args.documentType,
      documentType: args.documentType,
      source: args.source,
    },
  });
  let normalizedHtml = "";
  try {
    normalizedHtml = normalizeRuTextForHtml(args.html, {
      documentType: args.documentType,
      source: args.source,
      maxLength: args.maxLength ?? 500_000,
    });
    templateObservation.success({
      extra: {
        htmlLength: normalizedHtml.length,
      },
    });
  } catch (error) {
    throw templateObservation.error(error, {
      fallbackMessage: `${args.documentType} template preparation failed`,
      extra: {
        htmlLength: String(args.html ?? "").length,
      },
    });
  }

  const renderObservation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_render",
    event: "pdf_render_execute",
    stage: "render",
    sourceKind: `pdf:${args.documentType}`,
    context: {
      documentFamily: args.documentType,
      documentType: args.documentType,
      source: args.source,
    },
  });
  try {
    const source = createPdfSource(
      await openHtmlAsPdfUniversal(normalizedHtml, { share: args.share === true }),
    );
    renderObservation.success({
      sourceKind: source.kind,
      extra: {
        uriScheme: source.uri.match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() ?? "",
      },
    });
    return source;
  } catch (error) {
    throw renderObservation.error(error, {
      fallbackMessage: `${args.documentType} PDF render failed`,
      extra: {
        htmlLength: normalizedHtml.length,
      },
    });
  }
}

export function createGeneratedPdfDescriptor(args: {
  uri?: string;
  fileSource?: PdfSource;
  title: string;
  fileName?: string | null;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  entityId?: string | number | null;
}): DocumentDescriptor {
  const resolvedSource = args.fileSource ?? createPdfSource(args.uri);
  return createPdfDocumentDescriptor({
    uri: resolvedSource.uri,
    title: args.title,
    fileName: args.fileName,
    documentType: args.documentType,
    source: "generated",
    originModule: args.originModule,
    entityId: args.entityId,
  });
}

export async function buildGeneratedPdfDescriptor(
  args: BuildGeneratedPdfDescriptorArgs,
): Promise<DocumentDescriptor> {
  const source = args.getSource
    ? await args.getSource()
    : createPdfSource(await args.getUri?.());
  return createGeneratedPdfDescriptor({
    fileSource: source,
    title: args.title,
    fileName: args.fileName,
    documentType: args.documentType,
    originModule: args.originModule,
    entityId: args.entityId,
  });
}

export async function prepareGeneratedPdf(
  args: PrepareGeneratedPdfArgs,
): Promise<DocumentDescriptor> {
  return preparePdfDocument({
    busy: args.busy,
    supabase: args.supabase,
    key: args.key,
    label: args.label,
    descriptor: args.descriptor,
  });
}

export async function prepareAndPreviewGeneratedPdf(args: PrepareGeneratedPdfArgs & {
  router?: PdfRouterLike;
}): Promise<DocumentDescriptor> {
  const document = await prepareGeneratedPdf(args);
  await previewPdfDocument(document, { router: args.router });
  return document;
}

export async function prepareAndShareGeneratedPdf(
  args: PrepareGeneratedPdfArgs,
): Promise<DocumentDescriptor> {
  const document = await prepareGeneratedPdf(args);
  await sharePdfDocument(document);
  return document;
}
