import {
  AI_FINANCE_APPROVAL_MAGIC_EXPECTED_BUTTONS,
  AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS,
  AI_FINANCE_APPROVAL_MAGIC_SCREENS,
  buildAiFinanceApprovalMagicButtonManifest,
  buildAiFinanceApprovalMagicMatrix,
  listAiFinanceApprovalMagicPacks,
} from "../../scripts/ai/aiFinanceApprovalMagic";

describe("S_AI_MAGIC_FINANCE_APPROVAL_POINT_OF_NO_RETURN", () => {
  it("covers finance and approval screens with real button results", () => {
    const matrix = buildAiFinanceApprovalMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.final_status).toBe(AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS);
    expect(matrix.screens_covered).toBe(5);
    expect(matrix.finance_context_hydrated).toBe(true);
    expect(matrix.approval_context_hydrated).toBe(true);
    expect(matrix.qa_from_screen_context).toBe(true);
    expect(matrix.expected_buttons_found).toBe(true);
    expect(matrix.safe_read_no_mutation).toBe(true);
    expect(matrix.draft_only_not_final_submit).toBe(true);
    expect(matrix.approval_required_routes_to_ledger).toBe(true);
    expect(matrix.direct_payment_paths_found).toBe(0);
    expect(matrix.ai_auto_approval).toBe(false);
    expect(matrix.fake_payments_created).toBe(false);
    expect(matrix.fake_documents_created).toBe(false);
    expect(matrix.debug_copy_visible).toBe(false);
    expect(matrix.new_hooks_added).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
  });

  it("keeps the required user-facing finance actions wired by label and kind", () => {
    const manifest = buildAiFinanceApprovalMagicButtonManifest();

    for (const screenId of AI_FINANCE_APPROVAL_MAGIC_SCREENS) {
      const expectedButtons = AI_FINANCE_APPROVAL_MAGIC_EXPECTED_BUTTONS[screenId];
      for (const expected of expectedButtons) {
        expect(manifest).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              screenId,
              label: expected.label,
              actionKind: expected.actionKind,
              found: true,
              resultVisible: true,
              canExecuteDirectly: false,
              providerCallAllowed: false,
              dbWriteUsed: false,
              directMutationUsed: false,
            }),
          ]),
        );
      }
    }
  });

  it("does not fall back to generic chat-only finance packs", () => {
    const packs = listAiFinanceApprovalMagicPacks();

    expect(packs.map((pack) => pack.screenId)).toEqual([...AI_FINANCE_APPROVAL_MAGIC_SCREENS]);
    expect(packs.every((pack) => pack.aiPreparedWork.length >= 4)).toBe(true);
    expect(packs.every((pack) => pack.visibleDomainData.length > 0)).toBe(true);
    expect(packs.every((pack) => pack.buttons.length >= 4)).toBe(true);
  });
});
