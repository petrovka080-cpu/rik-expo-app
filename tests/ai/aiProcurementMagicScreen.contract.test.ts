import {
  AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS,
  AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS,
  AI_PROCUREMENT_SUPPLIERS_MAGIC_SCREENS,
  buildAiProcurementSuppliersMagicButtonManifest,
  buildAiProcurementSuppliersMagicMatrix,
  listAiProcurementSuppliersMagicPacks,
} from "../../scripts/ai/aiProcurementSuppliersMagic";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

describe("AI procurement supplier magic screens", () => {
  it("covers buyer, procurement, market and supplier screens with required role-native actions", () => {
    const packs = listAiProcurementSuppliersMagicPacks();
    expect(packs.map((pack) => pack.screenId)).toEqual([...AI_PROCUREMENT_SUPPLIERS_MAGIC_SCREENS]);

    for (const pack of packs) {
      const expectedButtons =
        AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS[
          pack.screenId as keyof typeof AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS
        ];
      expect(pack.domain).toMatch(/procurement|market|marketplace/);
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

  it("keeps every procurement button visible, non-mutating and approval-ledger safe", () => {
    const packs = listAiProcurementSuppliersMagicPacks();

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

  it("proves approved requests have evidence-backed supplier options or an exact no-evidence next action", () => {
    const matrix = buildAiProcurementSuppliersMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });
    const manifest = buildAiProcurementSuppliersMagicButtonManifest();

    expect(matrix.final_status).toBe(AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS);
    expect(matrix).toMatchObject({
      screens_covered: 6,
      approved_requests_not_empty: true,
      supplier_options_show_evidence_or_exact_no_evidence: true,
      internal_first_recommendation: true,
      qa_from_screen_context: true,
      safe_read_no_mutation: true,
      draft_only_not_final_submit: true,
      approval_required_routes_to_ledger: true,
      direct_order_paths_found: 0,
      warehouse_mutation_paths_found: 0,
      fake_suppliers_created: false,
      fake_prices_created: false,
      fake_availability_created: false,
      new_hooks_added: false,
      fake_green_claimed: false,
    });
    expect(manifest.every((button) => button.found && button.resultVisible)).toBe(true);
  });
});
