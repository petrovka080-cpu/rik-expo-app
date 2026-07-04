import fs from "node:fs";
import path from "node:path";

import { buildRequestEstimateTopProofText } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";
import { RequestEstimateSummaryCard } from "../../src/features/consumerRepair/RequestEstimateSummaryCard";

describe("estimate level and trust badges", () => {
  it("wires visible test IDs and top proof labels for commercial trust", () => {
    const summarySource = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/RequestEstimateSummaryCard.tsx"),
      "utf8",
    );
    const chromeSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx"),
      "utf8",
    );
    const proof = buildRequestEstimateTopProofText({
      title: "Estimate",
      summary: "Summary",
      totalLabel: "not final",
      priceStatusLabel: "0/1",
      sourceConfidenceLabel: "medium",
      sourceLabels: [],
      taxLabel: "tax",
      trustLevelLabel: "\u0414\u043e\u0432\u0435\u0440\u0438\u0435: QUANTITY_ONLY_PRICE_MISSING",
      commercialEstimateLevelLabel: "\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0441\u043c\u0435\u0442\u044b: QUANTITY_ONLY",
      sourceQualityLabel: "source",
      expertReviewStatusLabel: "review",
      fullTotalStatusLabel: "not final",
      visibleLines: [],
      assumptionRows: [],
      sections: [],
      professionalPreview: true,
      previewSections: [],
      calculationPreviewLines: [],
      normSourcePreviewLines: [],
      rawItemCount: 0,
      manualCatalogItems: [],
    });

    expect(RequestEstimateSummaryCard).toBeDefined();
    expect(summarySource).toContain("request-estimate-trust-level");
    expect(summarySource).toContain("request-estimate-commercial-level");
    expect(chromeSource).toContain("trustLevelLabel");
    expect(chromeSource).toContain("commercialEstimateLevelLabel");
    expect(proof).toContain("\u0414\u043e\u0432\u0435\u0440\u0438\u0435");
    expect(proof).toContain("\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0441\u043c\u0435\u0442\u044b");
  });
});
