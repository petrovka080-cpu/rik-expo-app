import {
  ProposalRequestItemIntegrityDegradedError,
  getProposalIntegritySummaryLabel,
  getProposalItemIntegrityLabel,
  isProposalItemIntegrityDegraded,
  toProposalRequestItemIntegrityDegradedError,
} from "./proposalIntegrity";

describe("proposalIntegrity helpers", () => {
  it("detects degraded proposal rows and labels them", () => {
    expect(
      isProposalItemIntegrityDegraded({
        request_item_integrity_state: "source_cancelled",
      }),
    ).toBe(true);
    expect(
      getProposalItemIntegrityLabel({
        request_item_integrity_state: "source_cancelled",
      }),
    ).toBeTruthy();
    expect(
      getProposalIntegritySummaryLabel([
        { request_item_integrity_state: "active" },
        { request_item_integrity_state: "source_missing" },
      ]),
    ).toBeTruthy();
  });

  it("parses rpc degraded errors into explicit recoverable error", () => {
    const error = toProposalRequestItemIntegrityDegradedError({
      message: "proposal_request_item_integrity_degraded",
      details: JSON.stringify({
        proposal_id: "proposal-1",
        total_items: 3,
        degraded_items: 1,
        cancelled_items: 1,
        missing_items: 0,
        request_item_ids: ["ri-1"],
      }),
    });

    expect(error).toBeInstanceOf(ProposalRequestItemIntegrityDegradedError);
    expect(error).toMatchObject({
      code: "proposal_request_item_integrity_degraded",
      summary: {
        proposalId: "proposal-1",
        totalItems: 3,
        degradedItems: 1,
        cancelledItems: 1,
        missingItems: 0,
        requestItemIds: ["ri-1"],
      },
    });
  });
});
