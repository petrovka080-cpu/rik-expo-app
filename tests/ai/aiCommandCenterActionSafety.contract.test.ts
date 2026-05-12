import {
  buildAiCommandCenterViewModel,
  resolveAiCommandCenterActionBoundary,
} from "../../src/features/ai/commandCenter/buildAiCommandCenterViewModel";
import {
  AI_COMMAND_CENTER_FORBIDDEN_DIRECT_ACTIONS,
} from "../../src/features/ai/commandCenter/AiCommandCenterTypes";
import { aiCommandCenterTaskCards } from "./aiCommandCenter.fixture";

const directorAuth = { userId: "director-user", role: "director" } as const;

describe("AI Command Center action safety", () => {
  const vm = buildAiCommandCenterViewModel({
    auth: directorAuth,
    sourceCards: aiCommandCenterTaskCards,
  });

  it("keeps ask_why, open_source, and safe previews non-mutating", () => {
    const supplier = vm.cards.find((card) => card.id === "supplier-compare-1");
    if (!supplier) throw new Error("supplier card missing");

    for (const action of ["ask_why", "open_source", "preview_tool"] as const) {
      const boundary = resolveAiCommandCenterActionBoundary({ card: supplier, action });
      expect(boundary).toMatchObject({
        enabled: true,
        mutationCount: 0,
        executed: false,
        finalMutation: false,
      });
    }
    expect(resolveAiCommandCenterActionBoundary({ card: supplier, action: "preview_tool" })).toMatchObject({
      boundary: "safe_tool_preview",
      toolName: "compare_suppliers",
    });
  });

  it("keeps draft actions draft-only and never final-submit", () => {
    const draft = vm.cards.find((card) => card.id === "draft-request-1");
    if (!draft) throw new Error("draft card missing");

    expect(resolveAiCommandCenterActionBoundary({ card: draft, action: "create_draft" })).toMatchObject({
      enabled: true,
      boundary: "draft_only",
      toolName: "draft_request",
      mutationCount: 0,
      executed: false,
      finalMutation: false,
    });
    expect(draft.allowedActions).toContain("create_draft");
    expect(draft.allowedActions).not.toContain("submit_for_approval");
  });

  it("routes approval actions to submit_for_approval only", () => {
    const submit = vm.cards.find((card) => card.id === "submit-request-1");
    if (!submit) throw new Error("submit card missing");

    expect(resolveAiCommandCenterActionBoundary({ card: submit, action: "submit_for_approval" })).toMatchObject({
      enabled: true,
      boundary: "approval_gate",
      toolName: "submit_for_approval",
      mutationCount: 0,
      executed: false,
      finalMutation: false,
    });
    expect(submit.requiresApproval).toBe(true);
  });

  it("never exposes forbidden direct mutation actions", () => {
    const serialized = JSON.stringify(vm);
    for (const forbidden of AI_COMMAND_CENTER_FORBIDDEN_DIRECT_ACTIONS) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(vm.directMutationAllowed).toBe(false);
  });
});
