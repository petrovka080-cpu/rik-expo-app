import { withBuyerBucketCanonicalCount } from "./buyer.fetchers.data";
import { selectBuyerTabCounts } from "./buyer.screen.selectors";

describe("buyer screen selectors canonical counts", () => {
  it("uses server-owned inbox and bucket counts instead of visible row lengths", () => {
    const pending = withBuyerBucketCanonicalCount(
      [
        {
          id: "pending-visible-1",
          status: "pending",
          submitted_at: "2026-04-12T00:00:00.000Z",
        },
      ],
      7,
    );
    const approved = withBuyerBucketCanonicalCount([], 3);
    const rejected = withBuyerBucketCanonicalCount(
      [
        {
          id: "rejected-visible-1",
          status: "rejected",
          submitted_at: "2026-04-12T00:00:00.000Z",
        },
        {
          id: "rejected-visible-2",
          status: "rejected",
          submitted_at: "2026-04-12T00:00:00.000Z",
        },
      ],
      11,
    );

    expect(
      selectBuyerTabCounts({
        groups: [{ request_id: "visible-inbox-only" }] as never,
        pending,
        approved,
        rejected,
        inboxTotalCount: 19,
      }),
    ).toEqual({
      inboxCount: 19,
      pendingCount: 7,
      approvedCount: 3,
      rejectedCount: 11,
      subcontractCount: 0,
    });
  });
});
