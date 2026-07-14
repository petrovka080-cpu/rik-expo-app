import { buildRequestLineageAudit } from "../../src/features/office/requestLineageSnapshot";
import { createSnapshot, createStages } from "./lineageTestHelpers";

describe("director PDF request lineage", () => {
  it("fails when director PDF drops request items from the director detail", () => {
    const snapshot = createSnapshot("ai_estimate");
    const { audit } = buildRequestLineageAudit({
      snapshots: [snapshot],
      stagesByKind: {
        ai_estimate: createStages({
          director_pdf: {
            items: snapshot.items.slice(0, 1),
            itemsVerified: false,
          },
        }),
      },
    });

    expect(audit.pdf_data_matches_ui_data).toBe(false);
    expect(audit.items_count_never_truncated).toBe(false);
    expect(audit.failureReasons).toEqual(
      expect.arrayContaining(["pdf_data_matches_ui_data", "items_count_never_truncated"]),
    );
  });
});
