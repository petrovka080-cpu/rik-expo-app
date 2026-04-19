export type PdfDocumentPreviewSessionPlan =
  | {
      action: "use_in_memory_remote_session";
      reason: "mobile_remote_viewer_supported";
    }
  | {
      action: "use_materialized_session";
      reason: "missing_router" | "non_remote_source" | "platform_requires_materialization";
    };

const trimText = (value: unknown) => String(value ?? "").trim();

export function resolvePdfDocumentPreviewSessionPlan(args: {
  platform: string;
  sourceKind?: string | null;
  hasRouter: boolean;
}): PdfDocumentPreviewSessionPlan {
  if (!args.hasRouter) {
    return {
      action: "use_materialized_session",
      reason: "missing_router",
    };
  }

  if (trimText(args.sourceKind) !== "remote-url") {
    return {
      action: "use_materialized_session",
      reason: "non_remote_source",
    };
  }

  const platform = trimText(args.platform).toLowerCase();
  if (platform === "android" || platform === "ios") {
    return {
      action: "use_in_memory_remote_session",
      reason: "mobile_remote_viewer_supported",
    };
  }

  return {
    action: "use_materialized_session",
    reason: "platform_requires_materialization",
  };
}
