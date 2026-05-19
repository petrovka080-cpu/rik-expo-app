import {
  AI_WAREHOUSE_LOGISTICS_MAGIC_EXPECTED_BUTTONS,
  AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS,
  AI_WAREHOUSE_LOGISTICS_MAGIC_SCREENS,
  buildAiWarehouseLogisticsMagicButtonManifest,
  buildAiWarehouseLogisticsMagicMatrix,
  listAiWarehouseLogisticsMagicPacks,
} from "../../scripts/ai/aiWarehouseLogisticsMagic";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

describe("AI warehouse logistics magic screens", () => {
  it("covers warehouse and logistics screens with required role-native actions", () => {
    const packs = listAiWarehouseLogisticsMagicPacks();

    expect(packs.map((pack) => pack.screenId)).toEqual([...AI_WAREHOUSE_LOGISTICS_MAGIC_SCREENS]);
    for (const pack of packs) {
      const expectedButtons =
        AI_WAREHOUSE_LOGISTICS_MAGIC_EXPECTED_BUTTONS[
          pack.screenId as keyof typeof AI_WAREHOUSE_LOGISTICS_MAGIC_EXPECTED_BUTTONS
        ];

      expect(["warehouse", "logistics"]).toContain(pack.domain);
      expect(pack.aiPreparedWork.length).toBeGreaterThanOrEqual(4);
      expect(pack.visibleDomainData.length).toBeGreaterThan(0);
      expect(pack.riskSummary.length).toBeGreaterThan(0);
      expect(pack.missingDataSummary.length).toBeGreaterThan(0);
      expect(pack.safety).toMatchObject({
        fakeDataUsed: false,
        directDangerousMutationAllowed: false,
        approvalBypassAllowed: false,
        providerRequired: false,
        dbWriteUsed: false,
      });
      for (const expected of expectedButtons) {
        expect(pack.buttons).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              label: expected.label,
              actionKind: expected.actionKind,
              canExecuteDirectly: false,
            }),
          ]),
        );
      }
      const answer = answerAiScreenMagicQuestion({ pack, question: pack.qa[0]?.question ?? "" });
      expect(answer).toMatchObject({
        answeredFromScreenContext: true,
        providerCallAllowed: false,
      });
    }
  });

  it("keeps every required button visible, non-mutating and approval-ledger safe", () => {
    const packs = listAiWarehouseLogisticsMagicPacks();

    for (const pack of packs) {
      for (const button of pack.buttons) {
        const result = buildAiScreenMagicButtonResultCopy({ pack, buttonIdOrLabel: button.id });
        expect(result).toMatchObject({
          providerCallAllowed: false,
          dbWriteUsed: false,
          directMutationUsed: false,
        });
        expect(button.canExecuteDirectly).toBe(false);
        if (button.actionKind === "approval_required") {
          expect(button.approvalRoute).toBeTruthy();
        }
        if (button.actionKind === "forbidden") {
          expect(button.forbiddenReason).toBeTruthy();
        }
      }
    }
  });

  it("proves warehouse/logistics AI does not mutate stock or invent logistics facts", () => {
    const matrix = buildAiWarehouseLogisticsMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });
    const manifest = buildAiWarehouseLogisticsMagicButtonManifest();

    expect(matrix.final_status).toBe(AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS);
    expect(matrix).toMatchObject({
      screens_covered: 4,
      warehouse_main_ready: true,
      warehouse_incoming_ready: true,
      warehouse_issue_ready: true,
      map_logistics_ready: true,
      warehouse_context_hydrated: true,
      logistics_context_hydrated: true,
      qa_from_screen_context: true,
      safe_read_results_visible: true,
      draft_only_results_visible: true,
      approval_required_routes_to_ledger: true,
      safe_read_no_mutation: true,
      draft_only_not_final_submit: true,
      direct_stock_mutation_paths_found: 0,
      direct_receive_paths_found: 0,
      direct_issue_paths_found: 0,
      direct_writeoff_paths_found: 0,
      fake_stock_created: false,
      fake_incoming_created: false,
      fake_distance_created: false,
      fake_eta_created: false,
      fake_supplier_created: false,
      debug_copy_visible_to_normal_user: false,
      provider_unavailable_copy_visible: false,
      generic_fallback_used: false,
      db_writes_used: false,
      migrations_used: false,
      new_hooks_added: false,
      fake_green_claimed: false,
    });
    expect(manifest.every((button) => button.found && button.resultVisible)).toBe(true);
  });
});
