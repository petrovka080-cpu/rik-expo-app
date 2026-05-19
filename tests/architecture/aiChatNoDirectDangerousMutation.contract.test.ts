import { buildAiFieldDocumentsReportsMagicMatrix } from "../../scripts/ai/aiFieldDocsMagic";

describe("chat AI dangerous mutation safety", () => {
  it("routes chat work to drafts or approval instead of direct order/payment/warehouse mutations", () => {
    const matrix = buildAiFieldDocumentsReportsMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.chat_direct_dangerous_mutations).toBe(0);
    expect(matrix.approval_required_routes_to_ledger).toBe(true);
    expect(matrix.draft_only_not_final_submit).toBe(true);
  });
});
