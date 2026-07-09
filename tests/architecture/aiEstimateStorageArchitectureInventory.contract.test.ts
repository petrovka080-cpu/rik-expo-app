import { readFileSync } from "node:fs";

import { validateAiEstimateSourceOfTruthPolicy } from "../../src/lib/estimate/ledger/validateAiEstimateSourceOfTruthPolicy";

describe("AI estimate storage architecture inventory", () => {
  it("routes approved history through the durable estimate ledger instead of browser cache truth", () => {
    const repositorySource = readFileSync("src/lib/consumerRequests/consumerRequestRepository.ts", "utf8");
    const serviceSource = readFileSync("src/lib/consumerRequests/consumerRequestService.ts", "utf8");
    const bridgeSource = readFileSync("src/lib/consumerRequests/consumerRequestLedgerBridge.ts", "utf8");
    const policy = validateAiEstimateSourceOfTruthPolicy();

    expect(policy.ok).toBe(true);
    expect(repositorySource).toContain("syncConsumerRepairBundleToAiEstimateLedger");
    expect(serviceSource).toContain("listConsumerRepairApprovedHistoryRecordsFromLedger");
    expect(bridgeSource).toContain("createInMemoryAiEstimateLedgerStore");
    expect(bridgeSource).toContain("listApprovedHistory");
  });
});
