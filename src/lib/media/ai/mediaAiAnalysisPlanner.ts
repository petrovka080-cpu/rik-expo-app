import type { MediaAsset } from "../mediaTypes";
import type { MediaAiAnalysisPlan } from "./mediaAiAnalysisTypes";

export function planMediaAiAnalysis(asset: Pick<MediaAsset, "id" | "purpose">): MediaAiAnalysisPlan {
  const analysisKind: MediaAiAnalysisPlan["analysisKind"] =
    asset.purpose === "product_photo" || asset.purpose === "product_video"
      ? "marketplace_product"
      : asset.purpose === "warehouse_incoming" ||
          asset.purpose === "warehouse_issue" ||
          asset.purpose === "warehouse_discrepancy"
        ? "warehouse_event"
        : asset.purpose === "document_scan"
          ? "document_scan"
          : asset.purpose === "remark" || asset.purpose === "defect"
            ? "defect_or_remark"
            : asset.purpose === "client_progress"
              ? "client_progress"
              : asset.purpose === "work_evidence" ||
                  asset.purpose === "before_photo" ||
                  asset.purpose === "after_photo" ||
                  asset.purpose === "progress_video"
                ? "construction_evidence"
                : "unknown";

  return {
    mediaAssetId: asset.id,
    purpose: asset.purpose,
    analysisKind,
    requiresExternalKnowledge: analysisKind === "construction_evidence" || analysisKind === "marketplace_product",
    requiresHumanReview: true,
    finalFact: false,
  };
}
