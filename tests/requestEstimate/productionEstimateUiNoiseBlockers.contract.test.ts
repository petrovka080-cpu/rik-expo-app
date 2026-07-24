import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

function source(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("production estimate UI noise blockers", () => {
  it("keeps stale previews, debug drawers, raw traces, and false confidence out of production DOM", () => {
    const prompt = source("src/features/requests/components/WorkEstimatePromptField.tsx");
    const summary = source("src/features/consumerRepair/RequestEstimateSummaryCard.tsx");
    const panel = source("src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx");
    const row = source("src/features/consumerRepair/ConsumerRepairItemRow.tsx");
    const chrome = source("src/features/consumerRepair/ConsumerRepairRequestChrome.tsx");
    const visibleSources = [prompt, summary, panel, row, chrome].join("\n");

    expect(prompt).not.toContain("<ProfessionalEstimateDraftPreview");
    expect(prompt).not.toContain("<MissingInputsPanel");
    expect(prompt).not.toMatch(/точность\s*\$\{confidenceLabel\}/u);
    expect(prompt).toContain("Работа определена");

    expect(summary).not.toContain("request-estimate-details-toggle");
    expect(panel).not.toContain("request-estimate-runtime-details-toggle");
    expect(row).not.toContain("consumer-repair-item-calculation-toggle");
    expect(row).not.toContain("consumer-repair-item-price-trace");
    expect(chrome).not.toContain('testID="request-estimate-top-proof"');
    expect(chrome).not.toContain('testID="estimate-pilot-badge"');

    expect(visibleSources).not.toMatch(
      /\b(?:PRICE_MISSING|formula_id|template_version|source_parameters|snapshot_hash|rowCode)\b/u,
    );
  });
});
