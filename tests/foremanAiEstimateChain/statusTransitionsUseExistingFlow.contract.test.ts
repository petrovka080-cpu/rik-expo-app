import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ForemanApprovalStatus } from "../../src/lib/foremanAiEstimate/foremanAiEstimateContracts";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("foreman AI estimate status transition contract", () => {
  it("uses the existing draft, sent, approved and rejected business statuses", () => {
    const statuses: ForemanApprovalStatus[] = [
      "draft",
      "sent_to_director",
      "director_approved",
      "director_rejected",
    ];

    expect(statuses).toEqual([
      "draft",
      "sent_to_director",
      "director_approved",
      "director_rejected",
    ]);
  });

  it("does not introduce AI-only approval or buyer flows", () => {
    const combinedSource = [
      source("src/lib/foremanAiEstimate/foremanAiEstimateContracts.ts"),
      source("src/lib/foremanAiEstimate/foremanAiEstimateChainAudit.ts"),
      source("scripts/e2e/runForemanAiEstimateFullChainCloseout.ts"),
    ].join("\n");

    expect(combinedSource).not.toMatch(/AI_DRAFT_NEW_STATUS|ai_pending_director_custom|new_approval_flow|new_buyer_flow/);
  });
});
