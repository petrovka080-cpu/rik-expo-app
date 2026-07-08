import fs from "node:fs";
import path from "node:path";

import { approveConsumerRepairRequestDraft } from "../../src/lib/consumerRequests";
import { buildApprovedConsumerRepairWorkspaceClearedState } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildConsumerRepairRequestRenderModel } from "../../src/features/consumerRepair/ConsumerRepairRequestScreenRenderModel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("capital renovation 98 PDF button state", () => {
  it("clears the active workspace after approval and keeps PDF/market actions in history", () => {
    const chromeSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx"),
      "utf8",
    );
    const historySource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairHistory.tsx"),
      "utf8",
    );
    const draft = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: draft.draft.id,
      userId: draft.draft.consumerUserId,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    const approvedHistoryPage = { items: [approved], totalApprovedCount: 1, nextCursorCreatedAt: null, pageSize: 20 };
    const cleared = buildApprovedConsumerRepairWorkspaceClearedState({
      history: [approved],
      approvedHistoryPage,
      selectedHistoryId: approved.draft.id,
      statusMessage: "Заявка утверждена.",
    });
    const renderModel = buildConsumerRepairRequestRenderModel({
      problemText: "",
      repairType: approved.draft.repairType,
      city: approved.draft.city ?? "",
      addressText: approved.draft.addressText ?? "",
      preferredTimeText: approved.draft.preferredTimeText ?? "",
      contactPhone: approved.draft.contactPhone ?? "",
      ...cleared,
    });

    expect(renderModel.approved).toBe(false);
    expect(renderModel.bundle).toBeNull();
    expect(cleared.selectedHistoryId).toBe(approved.draft.id);
    expect(approved.pdfs.some((pdf) => pdf.revisionId)).toBe(true);
    expect(chromeSource).toContain("consumer-repair-open-pdf");
    expect(chromeSource).not.toContain("consumer-repair-send-market");
    expect(historySource).toContain("consumer-repair-history-send-market");
  });
});
