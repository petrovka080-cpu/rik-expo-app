import {
  bindEstimateRevisionToPdfExport,
  applyEstimateRevisionQuantityEdit,
} from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("PDF revision binding", () => {
  it("keeps PDF bound to the exact export revision after later edits", () => {
    const initial = estimateRevisionState();
    const exportedRevision = currentRevision(initial);
    const bound = bindEstimateRevisionToPdfExport({
      state: initial,
      pdf_id: "pdf_1",
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const edited = applyEstimateRevisionQuantityEdit(bound.state, {
      row_key: "row_1",
      quantity: 12,
      created_at: "2026-06-15T02:00:00.000Z",
    });

    expect(bound.binding.pdf_export_revision_id).toBe(exportedRevision.revision_id);
    expect(bound.binding.pdf_rows_hash).toBe(exportedRevision.rows_hash);
    expect(edited.pdf_exports[0].pdf_export_revision_id).toBe(exportedRevision.revision_id);
    expect(currentRevision(edited).revision_id).not.toBe(exportedRevision.revision_id);
  });
});
