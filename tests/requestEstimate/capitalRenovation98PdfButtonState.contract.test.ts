import fs from "node:fs";
import path from "node:path";

import { approveConsumerRepairRequestDraft } from "../../src/lib/consumerRequests";
import { buildConsumerRepairRequestRenderModel } from "../../src/features/consumerRepair/ConsumerRepairRequestScreenRenderModel";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("capital renovation 98 PDF button state", () => {
  it("keeps the approved bundle active so the open-PDF action can render from snapshot", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx"),
      "utf8",
    );
    const draft = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: draft.draft.id,
      userId: draft.draft.consumerUserId,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    const renderModel = buildConsumerRepairRequestRenderModel({
      problemText: "",
      repairType: approved.draft.repairType,
      city: approved.draft.city ?? "",
      addressText: approved.draft.addressText ?? "",
      preferredTimeText: approved.draft.preferredTimeText ?? "",
      contactPhone: approved.draft.contactPhone ?? "",
      selectedWork: null,
      bundle: approved,
      history: [approved],
      approvedHistoryPage: { items: [approved], totalApprovedCount: 1, nextCursorCreatedAt: null, pageSize: 20 },
      selectedHistoryId: null,
      aiAnswerRu: null,
      statusMessage: null,
      validationErrors: [],
      catalogPickerVisible: false,
      catalogPickerTargetItemId: null,
      catalogPickerInitialQuery: undefined,
      lastRemovedItem: null,
    });

    expect(renderModel.approved).toBe(true);
    expect(renderModel.bundle?.pdfs.some((pdf) => pdf.revisionId)).toBe(true);
    expect(source).toContain("consumer-repair-open-pdf");
    expect(source).toContain("sent || approved ? onOpenPdf : onMakePdf");
  });
});
