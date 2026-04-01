import { reportAndSwallow } from "../../lib/observability/catchDiscipline";

type DirectorBoundaryParams = {
  surface: string;
  scope: string;
  event: string;
  error: unknown;
  kind?: Parameters<typeof reportAndSwallow>[0]["kind"];
  category?: Parameters<typeof reportAndSwallow>[0]["category"];
  sourceKind?: string;
  errorStage?: string;
  trigger?: string;
  extra?: Record<string, unknown>;
};

export function reportDirectorBoundary(params: DirectorBoundaryParams) {
  return reportAndSwallow({
    screen: "director",
    surface: params.surface,
    event: params.event,
    error: params.error,
    kind: params.kind,
    category: params.category,
    sourceKind: params.sourceKind ?? `director:${params.surface}`,
    errorStage: params.errorStage ?? params.event,
    trigger: params.trigger,
    scope: params.scope,
    extra: params.extra,
  });
}
