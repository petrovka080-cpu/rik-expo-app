import { buildRequestLineageAudit } from "../../src/features/office/requestLineageSnapshot";
import { createSnapshot, createStages } from "./lineageTestHelpers";

describe("office request context propagation lineage", () => {
  it("fails when director-visible context no longer matches foreman context", () => {
    const snapshot = createSnapshot("ai_estimate");
    const { audit } = buildRequestLineageAudit({
      snapshots: [snapshot],
      stagesByKind: {
        ai_estimate: createStages({
          director_detail: {
            context: { objectName: "Wrong object" },
            contextVerified: false,
          },
        }),
      },
    });

    expect(audit.context_never_lost).toBe(false);
    expect(audit.failureReasons).toContain("context_never_lost");
  });
});
