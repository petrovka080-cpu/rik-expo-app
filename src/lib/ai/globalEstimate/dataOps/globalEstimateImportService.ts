import {
  buildGlobalEstimateDataOpsImportPreview,
  type GlobalEstimateDataOpsActor,
  type GlobalEstimateDataOpsImportPreview,
  type GlobalEstimateDataOpsImportRow,
} from "../globalEstimateDataOpsAdmin";

export type GlobalEstimateImportFormat = "csv" | "xlsx" | "json" | "internal_marketplace_export" | "manual_admin_entry";

export type GlobalEstimateImportRequest = {
  format: GlobalEstimateImportFormat;
  rows: GlobalEstimateDataOpsImportRow[];
  actor: GlobalEstimateDataOpsActor;
};

export function detectSuspiciousGlobalEstimateImportPrices(preview: GlobalEstimateDataOpsImportPreview): string[] {
  return preview.validations.flatMap((validation) =>
    validation.blockers.filter((blocker) =>
      /PRICE|CURRENCY|UNIT|SOURCE|DUPLICATE/i.test(blocker),
    ),
  );
}

export function previewGlobalEstimateDataImport(request: GlobalEstimateImportRequest): GlobalEstimateDataOpsImportPreview & {
  format: GlobalEstimateImportFormat;
  suspiciousPriceFindings: string[];
} {
  const preview = buildGlobalEstimateDataOpsImportPreview({
    actor: request.actor,
    rows: request.rows,
  });
  return {
    ...preview,
    format: request.format,
    suspiciousPriceFindings: detectSuspiciousGlobalEstimateImportPrices(preview),
  };
}
