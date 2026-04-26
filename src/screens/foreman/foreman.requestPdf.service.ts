import { Alert } from "react-native";

import { generateForemanRequestPdfViaBackend } from "../../lib/api/foremanRequestPdfBackend.service";
import { getPdfFlowErrorMessage } from "../../lib/documents/pdfDocumentActions";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { createGeneratedPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import { buildForemanRequestClientSourceFingerprint } from "../../lib/pdf/foremanRequestPdf.shared";
import { getUriScheme } from "../../lib/pdfFileContract";
import { prepareAndPreviewGeneratedPdfFromDescriptorFactory } from "../../lib/pdf/pdf.runner";

type ForemanHistoryRequestLike = {
  id?: unknown;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
  object_name_ru?: string | null;
};

type ForemanHistoryRequestDetailsLike = {
  foreman_name?: string | null;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  object_name_ru?: string | null;
};

type PreviewArgs = Parameters<typeof prepareAndPreviewGeneratedPdfFromDescriptorFactory>[0];

type ForemanHistoryPdfPreviewArgs = {
  requestId: string;
  authIdentityFullName?: string | null;
  historyRequests: ForemanHistoryRequestLike[];
  requestDetails?: ForemanHistoryRequestDetailsLike | null;
  closeHistory: NonNullable<PreviewArgs["onBeforeNavigate"]>;
  busy?: PreviewArgs["busy"];
  supabase: PreviewArgs["supabase"];
  router?: PreviewArgs["router"];
};

const normalizeRequestId = (value: unknown) => String(value ?? "").trim();
const shortHistoryRequestId = (value: string) => value.slice(0, 4);

export async function buildForemanRequestPdfDescriptor(args: {
  requestId: string;
  generatedBy?: string | null;
  displayNo?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  objectName?: string | null;
  title?: string | null;
}) {
  const requestId = normalizeRequestId(args.requestId);
  if (!requestId) {
    throw new Error("Foreman request PDF requestId is required");
  }

  if (__DEV__) {
    console.info("[foreman-pdf] history_descriptor_build_start", {
      requestId,
      generatedBy: args.generatedBy ?? null,
      displayNo: args.displayNo ?? null,
    });
  }

  const backend = await generateForemanRequestPdfViaBackend({
    version: "v1",
    role: "foreman",
    documentType: "request",
    requestId,
    generatedBy: args.generatedBy ?? null,
    clientSourceFingerprint: buildForemanRequestClientSourceFingerprint({
      requestId,
      displayNo: args.displayNo ?? null,
      status: args.status ?? null,
      createdAt: args.createdAt ?? null,
      updatedAt: args.updatedAt ?? null,
      objectName: args.objectName ?? null,
    }),
  });

  const displayNo = String(args.displayNo ?? "").trim();
  const title =
    String(args.title ?? "").trim() ||
    (displayNo ? `Заявка ${displayNo}` : `Заявка ${requestId}`);

  const descriptor = await createGeneratedPdfDocument({
    fileSource: backend.source,
    title,
    fileName:
      backend.fileName ||
      buildPdfFileName({
        documentType: "request",
        title: displayNo || requestId,
        entityId: requestId,
      }),
    documentType: "request",
    originModule: "foreman",
    entityId: requestId,
  });

  if (__DEV__) {
    console.info("[foreman-pdf] history_descriptor_ready", {
      requestId,
      sourceKind: descriptor.fileSource.kind,
      uriScheme: getUriScheme(descriptor.uri),
      uri: descriptor.uri,
      fileName: descriptor.fileName,
    });
  }

  return descriptor;
}

export function createForemanHistoryPdfPreviewPlan(
  args: ForemanHistoryPdfPreviewArgs,
): PreviewArgs | null {
  const requestId = normalizeRequestId(args.requestId);
  if (!requestId) return null;

  const historyRequest =
    args.historyRequests.find((entry) => normalizeRequestId(entry.id) === requestId) ?? null;
  const requestDetails = args.requestDetails ?? null;

  return {
    busy: args.busy,
    supabase: args.supabase,
    key: `pdf:history:${requestId}`,
    label: "Открываю PDF…",
    router: args.router,
    onBeforeNavigate: args.closeHistory,
    createDescriptor: async () => {
      const descriptor = await buildForemanRequestPdfDescriptor({
        requestId,
        generatedBy: requestDetails?.foreman_name ?? args.authIdentityFullName ?? null,
        displayNo:
          historyRequest?.display_no ??
          requestDetails?.display_no ??
          `#${shortHistoryRequestId(requestId)}`,
        status: historyRequest?.status ?? requestDetails?.status ?? null,
        createdAt: historyRequest?.created_at ?? requestDetails?.created_at ?? null,
        updatedAt: requestDetails?.updated_at ?? null,
        objectName: historyRequest?.object_name_ru ?? requestDetails?.object_name_ru ?? null,
        title: `Заявка ${requestId}`,
      });
      if (__DEV__) {
        console.info("[foreman-pdf] history_open_descriptor", {
          requestId,
          sourceKind: descriptor.fileSource.kind,
          uri: descriptor.uri,
        });
      }
      return descriptor;
    },
  };
}

export async function previewForemanHistoryPdf(args: ForemanHistoryPdfPreviewArgs) {
  const requestId = normalizeRequestId(args.requestId);
  const plan = createForemanHistoryPdfPreviewPlan(args);
  if (!plan || !requestId) return;

  try {
    await prepareAndPreviewGeneratedPdfFromDescriptorFactory(plan);
  } catch (error) {
    recordCatchDiscipline({
      screen: "foreman",
      surface: "foreman_pdf_open",
      event: "foreman_history_pdf_open_failed",
      kind: "critical_fail",
      error,
      category: "ui",
      sourceKind: "pdf:request",
      errorStage: "open_view",
      extra: {
        requestId,
        action: "openHistoryPdf",
      },
    });
    Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
  }
}
