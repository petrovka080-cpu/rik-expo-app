import {
  REQUIRED_SUPERSESSIONS,
  buildSupersessionMap,
} from "../../scripts/audit/greenClaimArtifactReconciliation.shared";

describe("green claim supersession map", () => {
  it("covers every audited inconsistent historical matrix with a replay-verified successor", () => {
    const map = buildSupersessionMap();

    expect(map.supersessions).toHaveLength(REQUIRED_SUPERSESSIONS.length);
    for (const expected of REQUIRED_SUPERSESSIONS) {
      expect(map.supersessions).toContainEqual({
        old_artifact: expected.oldArtifact,
        problem: expected.problem,
        superseded_by: expected.supersededBy,
        status: "SUPERSEDED_BY_REPLAY_AUDIT",
      });
    }
  });
});
