import { planBuyerProposalNoPreload } from "./useBuyerProposalCaches.plan";

describe("planBuyerProposalNoPreload", () => {
  it("normalizes proposal ids and skips fresh cached numbers", () => {
    const plan = planBuyerProposalNoPreload({
      proposalIdsRaw: [" p1 ", "p2", "", "p1", "p3"],
      existingById: {
        p1: "PR-1",
        p2: "PR-2",
      },
      timestampById: {
        p1: 9_500,
        p2: 1_000,
      },
      inflightById: {},
      now: 10_000,
      ttlMs: 1_000,
    });

    expect(plan.ids).toEqual(["p1", "p2", "p3"]);
    expect(plan.need).toEqual(["p2", "p3"]);
    expect(plan.waitIds).toEqual([]);
    expect(plan.toFetch).toEqual(["p2", "p3"]);
  });

  it("keeps inflight work out of the new fetch list", () => {
    const inflight = Promise.resolve();
    const plan = planBuyerProposalNoPreload({
      proposalIdsRaw: ["p1", "p2", "p3"],
      existingById: {},
      timestampById: {},
      inflightById: {
        p2: inflight,
      },
      now: 10_000,
      ttlMs: 1_000,
    });

    expect(plan.need).toEqual(["p1", "p2", "p3"]);
    expect(plan.waitIds).toEqual(["p2"]);
    expect(plan.toFetch).toEqual(["p1", "p3"]);
  });

  it("does not negative-cache missing proposal numbers", () => {
    const plan = planBuyerProposalNoPreload({
      proposalIdsRaw: ["p1"],
      existingById: {},
      timestampById: {
        p1: 9_900,
      },
      inflightById: {},
      now: 10_000,
      ttlMs: 1_000,
    });

    expect(plan.need).toEqual(["p1"]);
    expect(plan.toFetch).toEqual(["p1"]);
  });
});
