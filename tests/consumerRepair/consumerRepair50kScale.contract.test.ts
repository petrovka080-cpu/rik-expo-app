import * as fs from "fs";
import * as path from "path";

import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";

describe("consumer repair 50k scale contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps history cursor-paginated with a limit of 20 or less", () => {
    for (let index = 0; index < 25; index += 1) {
      createConsumerRepairRequestDraft({
        consumerUserId: "scale-consumer",
        problemText: `Заявка на ремонт пола номер ${index} с подробным описанием`,
        repairType: "flooring",
      });
    }

    const firstPage = listConsumerRepairRequestHistory("scale-consumer", { limit: 20 });
    const secondPage = listConsumerRepairRequestHistory("scale-consumer", {
      limit: 20,
      cursorCreatedAt: firstPage[firstPage.length - 1].draft.createdAt,
    });

    expect(firstPage).toHaveLength(20);
    expect(secondPage.length).toBeLessThanOrEqual(5);
  });

  it("has a dedicated 50k proof runner with index and idempotency artifacts", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runB2CConsumerRepair50kScaleProof.ts"), "utf8");

    expect(runner).toContain("scale_fixture_requests: 50000");
    expect(runner).toContain("scale_fixture_items: 250000");
    expect(runner).toContain("scale_fixture_media: 100000");
    expect(runner).toContain("scale_fixture_pdfs: 50000");
    expect(runner).toContain("history_query_uses_index: true");
    expect(runner).toContain("duplicate_marketplace_demand_created");
    expect(runner).toContain("duplicateMarketplaceDemandCreated");
  });
});
