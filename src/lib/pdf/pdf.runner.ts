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
  prepareAndPreviewPdfDocument,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  previewPdfDocument,
  sharePdfDocument,
  type PdfViewerRouterLike,
} from "../documents/pdfDocumentActions";
import { beginPdfLifecycleObservation } from "./pdfLifecycle";
import { normalizeRuTextForHtml } from "../text/encoding";
import type { BusyLike } from "../pdfRunner";

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

function ensureGeneratedPdfUri(value: unknown, label: string): string {
  const uri = typeof value === "string" ? value.trim() : "";
  if (!uri) {
    throw new Error(`${label} is empty`);
  }
  return uri;
}

function ensureGeneratedPdfSource(source: unknown, label: string): PdfSource {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`${label} is invalid`);
  }

  const sourceRecord = source as { uri?: unknown };
  return createPdfSource(ensureGeneratedPdfUri(sourceRecord.uri, `${label}.uri`));
}

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
  const resolvedSource = args.fileSource
    ? ensureGeneratedPdfSource(args.fileSource, "Generated PDF source")
    : createPdfSource(ensureGeneratedPdfUri(args.uri, "Generated PDF URI"));
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
    ? ensureGeneratedPdfSource(await args.getSource(), "Generated PDF source")
    : createPdfSource(ensureGeneratedPdfUri(await args.getUri?.(), "Generated PDF URI"));
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
  router?: PdfViewerRouterLike;
  /** Called before router.push — use to dismiss native Modals that sit above the navigation Stack. */
  onBeforeNavigate?: (() => void | Promise<void>) | null;
}): Promise<DocumentDescriptor> {
  return await prepareAndPreviewPdfDocument({
    busy: args.busy,
    supabase: args.supabase,
    key: args.key,
    label: args.label,
    descriptor: args.descriptor,
    router: args.router,
    onBeforeNavigate: args.onBeforeNavigate,
  });
}

export async function prepareAndShareGeneratedPdf(
  args: PrepareGeneratedPdfArgs,
): Promise<DocumentDescriptor> {
  const document = await prepareGeneratedPdf(args);
  await sharePdfDocument(document);
  return document;
}

/**
 * Creates a PDF opener that is pre-wired with a modal dismiss function.
 *
 * This is the SINGLE OWNER BOUNDARY for the "dismiss modal → open PDF" flow.
 * Each hook/scope that opens PDFs from inside a native Modal creates ONE
 * opener via this factory, binding its dismiss function. All PDF opens within
 * that scope go through the returned `prepareAndPreview` method — no manual
 * `onBeforeNavigate` wiring needed at each call site.
 *
 * @example
 * ```ts
 * const pdfOpener = createModalAwarePdfOpener(closeSheet);
 * // Later, inside any PDF handler:
 * await pdfOpener.prepareAndPreview({ busy, supabase, key, label, descriptor, router });
 * ```
 */
export function createModalAwarePdfOpener(
  dismiss: (() => void | Promise<void>) | null | undefined,
) {
  return {
    /**
     * Prepare and preview a generated PDF. If a dismiss callback was provided,
     * it will be invoked automatically before navigation to ensure the native
     * Modal is closed before the PDF viewer route is pushed.
     */
    prepareAndPreview: (
      args: PrepareGeneratedPdfArgs & { router?: PdfViewerRouterLike },
    ): Promise<DocumentDescriptor> =>
      prepareAndPreviewGeneratedPdf({
        ...args,
        onBeforeNavigate: dismiss,
      }),
  };
}
