import {
  askAiScreenLocalAssistant,
  planAiScreenLocalAssistantAction,
  previewAiScreenLocalAssistantDraft,
  previewAiScreenLocalAssistantSubmitForApproval,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalAssistantOrchestrator";
import {
  AI_SCREEN_LOCAL_ASSISTANT_CONTRACT,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalAssistantTypes";
import {
  AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS,
  listAiScreenLocalAssistantProfiles,
  resolveAiScreenLocalAssistantContext,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalContextResolver";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const directorAuth = { userId: "director-user", role: "director" } as const;

describe("AI screen-local assistant orchestrator", () => {
  it("registers required screen-local assistant profiles", () => {
    const ids = listAiScreenLocalAssistantProfiles().map((profile) => profile.screenId);

    expect(AI_SCREEN_LOCAL_ASSISTANT_CONTRACT).toMatchObject({
      sameScreenOnly: true,
      roleScoped: true,
      evidenceRequired: true,
      internalFirst: true,
      mutationCount: 0,
      providerCalled: false,
      externalLiveFetch: false,
    });
    expect(ids).toEqual(expect.arrayContaining([...AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS]));
    expect(ids).toEqual(expect.arrayContaining(["foreman.subcontract", "procurement.copilot"]));
  });

  it("resolves buyer requests context as screen-local, role-scoped, and evidence-backed", () => {
    expect(
      resolveAiScreenLocalAssistantContext({
        auth: buyerAuth,
        screenId: "buyer.requests",
      }),
    ).toMatchObject({
      status: "ready",
      screenId: "buyer.requests",
      role: "buyer",
      domain: "procurement",
      sameScreenOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      internalFirst: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      finalExecution: 0,
      directMutationAllowed: false,
      providerCalled: false,
      externalLiveFetch: false,
      fakeAiAnswer: false,
      hardcodedAiResponse: false,
    });
  });

  it("answers with policy output, not provider text or hardcoded AI response", () => {
    const output = askAiScreenLocalAssistant({
      auth: buyerAuth,
      screenId: "buyer.requests",
      message: "what can I do here?",
    });

    expect(output).toMatchObject({
      status: "answered",
      answerMode: "screen_local_context",
      sameScreenOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      readOnly: true,
      mutationCount: 0,
      providerCalled: false,
      externalLiveFetch: false,
      fakeAiAnswer: false,
      hardcodedAiResponse: false,
    });
    expect(output.evidenceRefs.length).toBeGreaterThan(0);
    expect(output.safeNextActionIds.length).toBeGreaterThan(0);
  });

  it("plans draft and approval previews without persisting or executing", () => {
    expect(
      planAiScreenLocalAssistantAction({
        auth: buyerAuth,
        screenId: "buyer.requests",
        actionId: "buyer.requests.submit_request",
      }),
    ).toMatchObject({
      status: "planned",
      planMode: "approval_required",
      requiresApproval: true,
      executable: false,
      mutationCount: 0,
      finalExecution: 0,
    });

    expect(
      previewAiScreenLocalAssistantDraft({
        auth: buyerAuth,
        screenId: "buyer.requests",
        actionId: "buyer.requests.draft_request",
      }),
    ).toMatchObject({
      status: "draft_preview",
      previewAvailable: true,
      persisted: false,
      submitted: false,
      mutationCount: 0,
      providerCalled: false,
    });

    expect(
      previewAiScreenLocalAssistantSubmitForApproval({
        auth: buyerAuth,
        screenId: "buyer.requests",
        actionId: "buyer.requests.submit_request",
      }),
    ).toMatchObject({
      status: "submit_for_approval_preview",
      approvalRequired: true,
      idempotencyRequired: true,
      auditRequired: true,
      redactedPayloadOnly: true,
      persisted: false,
      submitted: false,
      executed: false,
      mutationCount: 0,
      providerCalled: false,
    });
  });

  it("enforces cross-screen policy for buyer and director/control", () => {
    expect(
      askAiScreenLocalAssistant({
        auth: buyerAuth,
        screenId: "buyer.requests",
        targetScreenId: "accountant.main",
      }),
    ).toMatchObject({
      status: "blocked",
      boundary: { decision: "FORBIDDEN_CROSS_SCREEN_ACTION" },
      handoffPlan: null,
      mutationCount: 0,
    });

    expect(
      askAiScreenLocalAssistant({
        auth: directorAuth,
        screenId: "director.dashboard",
        targetScreenId: "warehouse.main",
      }),
    ).toMatchObject({
      status: "handoff_plan_only",
      boundary: { decision: "HANDOFF_PLAN_ONLY" },
      handoffPlan: {
        fromScreenId: "director.dashboard",
        targetScreenId: "warehouse.main",
        directExecutionAllowed: false,
        mutationCount: 0,
      },
    });
  });
});
