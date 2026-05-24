import fs from "node:fs";

export const REQUEST_ESTIMATE_RUNTIME_FILES = [
  "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
  "src/features/consumerRepair/consumerRepairAiAdapter.ts",
  "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx",
  "src/features/consumerRepair/ConsumerRepairItemRow.tsx",
  "src/features/consumerRepair/requestEstimateViewModel.ts",
  "src/features/catalog/CatalogItemPicker.tsx",
  "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts",
  "src/lib/consumerRequests/consumerRequestPdfService.ts",
  "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
  "src/lib/ai/globalEstimate/globalEstimateSeedData.ts",
  "src/lib/ai/globalEstimate/stripFoundationDimensions.ts",
  "src/lib/catalog/catalogItemsService.ts",
];

export function readFile(path: string): string {
  return fs.readFileSync(path, "utf8");
}

export function readRequestEstimateRuntimeSource(): string {
  return REQUEST_ESTIMATE_RUNTIME_FILES.map((file) => `\n/* ${file} */\n${readFile(file)}`).join("\n");
}

export function listFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = `${dir}/${entry.name}`;
    return entry.isDirectory() ? listFilesRecursively(full) : [full];
  });
}
