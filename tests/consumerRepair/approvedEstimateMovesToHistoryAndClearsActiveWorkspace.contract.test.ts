import fs from "node:fs";
import path from "node:path";

import { listConsumerRepairRequestHistory, __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildApprovedConsumerRepairWorkspaceClearedState } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("approved estimate lifecycle clears active workspace", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("moves approved laminate to history and clears active editable estimate state", () => {
    const approved = createApprovedConsumerRepairRequest();
    const history = listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID);
    const state = buildApprovedConsumerRepairWorkspaceClearedState({
      history,
      statusMessage: "approved",
    });

    expect(history.map((bundle) => bundle.draft.id)).toContain(approved.draft.id);
    expect(history.find((bundle) => bundle.draft.id === approved.draft.id)?.draft.status).toBe("consumer_approved");
    expect(history.find((bundle) => bundle.draft.id === approved.draft.id)?.pdfs[0]?.revisionId).toBeTruthy();

    expect(state.bundle).toBeNull();
    expect(state.aiAnswerRu).toBeNull();
    expect(state.selectedWork).toBeNull();
    expect(state.selectedHistoryId).toBeNull();
    expect(buildRequestEstimateViewModel(state.bundle)).toBeNull();
    expect(state.bundle?.items ?? []).toHaveLength(0);
    expect(state.bundle?.estimateRevisionState?.current_revision_id ?? null).toBeNull();
  });

  it("does not auto-select the approved history card after approve clears the workspace", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("buildApprovedConsumerRepairWorkspaceClearedState");
    expect(source).not.toContain("selectedHistoryId: bundle.draft.id");
  });
});
