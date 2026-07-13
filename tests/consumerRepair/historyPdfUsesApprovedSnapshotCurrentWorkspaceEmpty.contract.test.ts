import {
  __resetConsumerRepairRequestStoreForTests,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { buildApprovedConsumerRepairWorkspaceClearedState } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("history PDF uses approved snapshot while current workspace is empty", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("opens the approved laminate PDF from history without remounting laminate as active workspace", () => {
    const approved = createApprovedConsumerRepairRequest();
    const history = listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID);
    const historyBundle = history.find((bundle) => bundle.draft.id === approved.draft.id);
    const pdf = getConsumerRepairRequestPdf({ requestDraftId: approved.draft.id });
    const state = buildApprovedConsumerRepairWorkspaceClearedState({
      history,
      statusMessage: "approved",
    });

    expect(historyBundle?.pdfs[0]?.revisionId).toBeTruthy();
    expect(historyBundle?.pdfs[0]?.revisionId).toBe(approved.pdfs[0]?.revisionId);
    expect(pdf.requestId).toBe(approved.draft.id);
    expect(pdf.contentType).toBe("application/pdf");
    expect(state.bundle).toBeNull();
    expect(state.bundle?.items ?? []).toHaveLength(0);
  });
});
