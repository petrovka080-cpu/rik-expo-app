export type PdfViewerOpenSignalAsset = {
  sourceKind?: string | null;
  documentType?: string | null;
  originModule?: string | null;
  fileName?: string | null;
};

export type PdfViewerOpenSignalPlan =
  | {
      action: "skip";
      reason: "missing_open_token" | "already_settled";
    }
  | {
      action: "emit_visible";
      openToken: string;
      sourceKind: string | undefined;
      extra: Record<string, unknown>;
    }
  | {
      action: "emit_failed";
      openToken: string;
      message: string;
      sourceKind: string | undefined;
      extra: Record<string, unknown>;
    };

const buildOpenSignalExtra = (args: {
  sessionId: string;
  asset?: PdfViewerOpenSignalAsset | null;
  extra?: Record<string, unknown>;
}) => ({
  sessionId: args.sessionId,
  documentType: args.asset?.documentType ?? null,
  originModule: args.asset?.originModule ?? null,
  fileName: args.asset?.fileName ?? null,
  ...(args.extra ?? {}),
});

const resolveSkipReason = (args: {
  openToken?: string | null;
  alreadySettled: boolean;
}): PdfViewerOpenSignalPlan | null => {
  if (!args.openToken) {
    return {
      action: "skip",
      reason: "missing_open_token",
    };
  }
  if (args.alreadySettled) {
    return {
      action: "skip",
      reason: "already_settled",
    };
  }
  return null;
};

export function resolvePdfViewerOpenVisibleSignalPlan(args: {
  openToken?: string | null;
  alreadySettled: boolean;
  sessionId: string;
  asset?: PdfViewerOpenSignalAsset | null;
  extra?: Record<string, unknown>;
}): PdfViewerOpenSignalPlan {
  const skip = resolveSkipReason(args);
  if (skip) return skip;

  return {
    action: "emit_visible",
    openToken: args.openToken as string,
    sourceKind: args.asset?.sourceKind ?? undefined,
    extra: buildOpenSignalExtra(args),
  };
}

export function resolvePdfViewerOpenFailedSignalPlan(args: {
  openToken?: string | null;
  alreadySettled: boolean;
  sessionId: string;
  message: string;
  asset?: PdfViewerOpenSignalAsset | null;
  extra?: Record<string, unknown>;
}): PdfViewerOpenSignalPlan {
  const skip = resolveSkipReason(args);
  if (skip) return skip;

  return {
    action: "emit_failed",
    openToken: args.openToken as string,
    message: args.message,
    sourceKind: args.asset?.sourceKind ?? undefined,
    extra: buildOpenSignalExtra(args),
  };
}
