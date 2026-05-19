import {
  AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS,
  AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_GREEN_STATUS,
  AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCREENS,
  buildAiDirectorCommandOfficeSecurityMagicButtonManifest,
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

describe("AI director command office security magic screens", () => {
  it("covers director, command center, office, security and runtime with required actions", () => {
    const entries = listAiDirectorCommandOfficeSecurityMagicPackEntries();

    expect(entries.map((entry) => entry.logicalScreenId)).toEqual([
      ...AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCREENS,
    ]);
    for (const { logicalScreenId, pack } of entries) {
      const expectedButtons = AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS[logicalScreenId];

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

  it("keeps every required button visible, non-mutating and approval-ledger safe", () => {
    for (const { pack } of listAiDirectorCommandOfficeSecurityMagicPackEntries()) {
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

  it("proves the wave matrix green without auto approval, permission mutation or runtime leaks", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });
    const manifest = buildAiDirectorCommandOfficeSecurityMagicButtonManifest();

    expect(matrix.final_status).toBe(AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_GREEN_STATUS);
    expect(matrix).toMatchObject({
      screens_covered: 6,
      director_decision_context_hydrated: true,
      command_center_next_actions_ready: true,
      office_context_hydrated: true,
      security_context_hydrated: true,
      runtime_screen_admin_only_ready: true,
      runtime_context_hydrated_for_admin: true,
      qa_from_screen_context: true,
      safe_read_results_visible: true,
      draft_only_results_visible: true,
      approval_required_routes_to_ledger: true,
      ai_auto_approval: false,
      ai_decision_on_behalf_of_director: false,
      approval_bypass_found: 0,
      policy_disable_paths_found: 0,
      direct_role_permission_mutation_paths_found: 0,
      service_role_green_path_found: false,
      runtime_debug_visible_to_normal_users: false,
      fake_security_findings_created: false,
      fake_runtime_blockers_created: false,
      fake_report_content_created: false,
      new_hooks_added: false,
      db_writes_used: false,
      migrations_used: false,
      fake_green_claimed: false,
    });
    expect(manifest.every((button) => button.found && button.resultVisible)).toBe(true);
  });
});
