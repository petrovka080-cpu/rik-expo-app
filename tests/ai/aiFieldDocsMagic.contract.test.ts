import {
  AI_FIELD_DOCUMENTS_REPORTS_MAGIC_EXPECTED_BUTTONS,
  AI_FIELD_DOCUMENTS_REPORTS_MAGIC_GREEN_STATUS,
  AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCREENS,
  buildAiFieldDocumentsReportsMagicButtonManifest,
  buildAiFieldDocumentsReportsMagicMatrix,
  listAiFieldDocumentsReportsMagicPackEntries,
} from "../../scripts/ai/aiFieldDocsMagic";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

describe("AI field documents reports magic screens", () => {
  it("covers field, contractor, documents, reports and chat screens with required actions", () => {
    const entries = listAiFieldDocumentsReportsMagicPackEntries();

    expect(entries.map((entry) => entry.logicalScreenId)).toEqual([...AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCREENS]);
    for (const { logicalScreenId, pack } of entries) {
      const expectedButtons = AI_FIELD_DOCUMENTS_REPORTS_MAGIC_EXPECTED_BUTTONS[logicalScreenId];

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
        const matchingButton = pack.buttons.find((button) =>
          normalizeLabel(button.label) === normalizeLabel(expected.label) &&
          button.actionKind === expected.actionKind,
        );

        expect(matchingButton).toMatchObject({
          actionKind: expected.actionKind,
          canExecuteDirectly: false,
        });
      }
      const answer = answerAiScreenMagicQuestion({ pack, question: pack.qa[0]?.question ?? "" });
      expect(answer).toMatchObject({
        answeredFromScreenContext: true,
        providerCallAllowed: false,
      });
    }
  });

  it("keeps every required button visible, non-mutating and final-submit safe", () => {
    for (const { pack } of listAiFieldDocumentsReportsMagicPackEntries()) {
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

  it("proves the wave matrix green without fake evidence or unsafe submissions", () => {
    const matrix = buildAiFieldDocumentsReportsMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });
    const manifest = buildAiFieldDocumentsReportsMagicButtonManifest();

    expect(matrix.final_status).toBe(AI_FIELD_DOCUMENTS_REPORTS_MAGIC_GREEN_STATUS);
    expect(matrix).toMatchObject({
      screens_covered: 8,
      foreman_main_ready: true,
      foreman_quick_modal_ready: true,
      foreman_subcontract_ready: true,
      contractor_main_ready: true,
      documents_main_ready: true,
      documents_knowledge_ready: true,
      reports_modal_ready: true,
      chat_main_ready: true,
      field_context_hydrated: true,
      documents_context_hydrated: true,
      reports_context_hydrated: true,
      chat_context_hydrated: true,
      qa_from_screen_context: true,
      safe_read_results_visible: true,
      draft_only_results_visible: true,
      approval_required_routes_to_ledger: true,
      safe_read_no_mutation: true,
      draft_only_not_final_submit: true,
      direct_signing_paths_found: 0,
      direct_final_submit_paths_found: 0,
      fake_evidence_created: false,
      fake_construction_norms_created: false,
      fake_document_content_created: false,
      fake_report_content_created: false,
      chat_direct_dangerous_mutations: 0,
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
