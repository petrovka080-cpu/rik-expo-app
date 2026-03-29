import {
  beginPlatformObservability,
  type PlatformObservabilityEvent,
} from "../observability/platformObservability";
import {
  recordCatchDiscipline,
  type CatchDisciplineKind,
} from "../observability/catchDiscipline";

type PdfLifecycleScreen = "reports" | "director" | "accountant" | "warehouse";
type PdfLifecycleCategory = "fetch" | "ui" | "reload";

export type PdfLifecycleStage =
  | "source_load"
  | "data_shaping"
  | "template"
  | "render"
  | "output_prepare"
  | "open_view";

export type PdfFailureType =
  | "source_load_fail"
  | "shape_fail"
  | "template_fail"
  | "render_fail"
  | "output_fail"
  | "open_fail";

export type PdfLifecycleContext = {
  documentFamily: string;
  documentType?: string | null;
  originModule?: string | null;
  entityId?: string | number | null;
  source?: string | null;
  sourceBranch?: string | null;
  fileName?: string | null;
  fallbackUsed?: boolean;
};

type PdfLifecycleObservationParams = {
  screen: PdfLifecycleScreen;
  surface: string;
  event: string;
  stage: PdfLifecycleStage;
  category?: PdfLifecycleCategory;
  sourceKind?: string;
  catchKind?: CatchDisciplineKind;
  context: PdfLifecycleContext;
  extra?: Record<string, unknown>;
};

type PdfLifecycleSuccessFields = Partial<
  Pick<PlatformObservabilityEvent, "rowCount" | "sourceKind" | "fallbackUsed">
> & {
  extra?: Record<string, unknown>;
};

type PdfLifecycleErrorFields = Partial<
  Pick<PlatformObservabilityEvent, "sourceKind" | "fallbackUsed" | "errorStage">
> & {
  fallbackMessage?: string;
  extra?: Record<string, unknown>;
};

const PDF_FAILURE_BY_STAGE: Record<PdfLifecycleStage, PdfFailureType> = {
  source_load: "source_load_fail",
  data_shaping: "shape_fail",
  template: "template_fail",
  render: "render_fail",
  output_prepare: "output_fail",
  open_view: "open_fail",
};

const trimText = (value: unknown) => String(value ?? "").trim();

const getPdfLifecycleCategory = (stage: PdfLifecycleStage): PdfLifecycleCategory =>
  stage === "open_view" ? "ui" : "fetch";

const getPdfLifecycleErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    const message = trimText(error.message);
    if (message) return message;
  }
  const message = trimText(error);
  return message || fallback;
};

const buildLifecycleExtra = (
  params: PdfLifecycleObservationParams,
  extra?: Record<string, unknown>,
) => ({
  pdfStage: params.stage,
  pdfFailureType: PDF_FAILURE_BY_STAGE[params.stage],
  documentFamily: params.context.documentFamily,
  documentType: params.context.documentType ?? null,
  originModule: params.context.originModule ?? null,
  entityId: params.context.entityId ?? null,
  source: params.context.source ?? null,
  sourceBranch: params.context.sourceBranch ?? null,
  fileName: params.context.fileName ?? null,
  ...params.extra,
  ...extra,
});

export class PdfLifecycleError extends Error {
  stage: PdfLifecycleStage;
  failureType: PdfFailureType;
  documentFamily: string;
  causeValue: unknown;

  constructor(args: {
    message: string;
    stage: PdfLifecycleStage;
    context: PdfLifecycleContext;
    cause: unknown;
  }) {
    super(args.message);
    this.name = "PdfLifecycleError";
    this.stage = args.stage;
    this.failureType = PDF_FAILURE_BY_STAGE[args.stage];
    this.documentFamily = args.context.documentFamily;
    this.causeValue = args.cause;
  }
}

export function wrapPdfLifecycleError(args: {
  error: unknown;
  stage: PdfLifecycleStage;
  context: PdfLifecycleContext;
  fallbackMessage: string;
}) {
  if (args.error instanceof PdfLifecycleError) return args.error;
  return new PdfLifecycleError({
    message: getPdfLifecycleErrorMessage(args.error, args.fallbackMessage),
    stage: args.stage,
    context: args.context,
    cause: args.error,
  });
}

export function beginPdfLifecycleObservation(params: PdfLifecycleObservationParams) {
  const observation = beginPlatformObservability({
    screen: params.screen,
    surface: params.surface,
    category: params.category ?? getPdfLifecycleCategory(params.stage),
    event: params.event,
    sourceKind: params.sourceKind,
  });

  return {
    success(fields?: PdfLifecycleSuccessFields) {
      return observation.success({
        rowCount: fields?.rowCount,
        sourceKind: fields?.sourceKind ?? params.sourceKind,
        fallbackUsed: fields?.fallbackUsed ?? params.context.fallbackUsed,
        extra: buildLifecycleExtra(params, fields?.extra),
      });
    },
    error(error: unknown, fields?: PdfLifecycleErrorFields) {
      const lifecycleError = wrapPdfLifecycleError({
        error,
        stage: params.stage,
        context: params.context,
        fallbackMessage:
          fields?.fallbackMessage ??
          `${params.context.documentFamily} ${params.stage} failed`,
      });
      const errorStage = fields?.errorStage ?? params.stage;
      const sourceKind = fields?.sourceKind ?? params.sourceKind;
      const extra = buildLifecycleExtra(params, fields?.extra);
      recordCatchDiscipline({
        screen: params.screen,
        surface: params.surface,
        event: params.event,
        kind: params.catchKind ?? "critical_fail",
        error: lifecycleError,
        category: params.category ?? getPdfLifecycleCategory(params.stage),
        sourceKind,
        errorStage,
        extra,
      });
      observation.error(lifecycleError, {
        sourceKind,
        fallbackUsed: fields?.fallbackUsed ?? params.context.fallbackUsed,
        errorStage,
        extra,
      });
      return lifecycleError;
    },
  };
}
