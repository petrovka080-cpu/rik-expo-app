import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

const PROMPT =
  "\u0412\u043e\u0434\u043e\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435 \u0441\u0451\u043b \u0438 \u043d\u0430\u0440\u0443\u0436\u043d\u044b\u0435 \u0441\u0435\u0442\u0438 \u0432\u043e\u0434\u044b: \u0432\u043e\u0434\u0430 \u0431\u0430\u0448\u043d\u044f";

describe("commercial trust request UI", () => {
  it("renders trust and commercial estimate level without restoring quick prompt chip noise", () => {
    const formSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairMediaButtons.tsx"),
      "utf8",
    );
    __resetConsumerRepairRequestStoreForTests();
    const aiDraft = buildConsumerRepairAiDraft(PROMPT, { currency: "KGS", city: "Bishkek" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "commercial-trust-ui",
      problemText: PROMPT,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "Bishkek, test",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const viewModel = buildRequestEstimateViewModel(bundle);

    if (!viewModel) throw new Error("view model missing");
    expect(formSource).not.toContain("REQUEST_WORK_CATEGORIES");
    expect(formSource).not.toContain("REQUEST_WORK_EXAMPLES");
    expect(viewModel.trustLevelLabel).toContain("\u0414\u043e\u0432\u0435\u0440\u0438\u0435");
    expect(viewModel.commercialEstimateLevelLabel).toContain("\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0441\u043c\u0435\u0442\u044b");
    expect(viewModel.sourceQualityLabel).toContain("\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e");
    expect(viewModel.expertReviewStatusLabel).toContain("\u042d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u0430\u044f");
    expect(viewModel.fullTotalStatusLabel).toContain("\u043d\u0435 \u0444\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0439");
  });
});
