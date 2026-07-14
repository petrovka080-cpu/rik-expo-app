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
      trustLevelLabel: "\u0414\u043e\u0432\u0435\u0440\u0438\u0435: \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u044b \u043e\u0431\u044a\u0435\u043c\u044b, \u0446\u0435\u043d\u044b \u043d\u0443\u0436\u043d\u043e \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u044c",
      commercialEstimateLevelLabel: "\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0441\u043c\u0435\u0442\u044b: \u0442\u043e\u043b\u044c\u043a\u043e \u043e\u0431\u044a\u0435\u043c\u044b",
      sourceQualityLabel: "source",
      expertReviewStatusLabel: "review",
      fullTotalStatusLabel: "not final",
      visibleLines: [{ id: "raw-line", text: "raw item params=internal_debug_source_parameters" }],
      assumptionRows: [],
      sections: [],
      professionalPreview: false,
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
    expect(proof).not.toContain("params=");
    expect(proof).not.toContain("source_parameters");
  });
});
