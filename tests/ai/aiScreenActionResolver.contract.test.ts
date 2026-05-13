import {
  planAiScreenAction,
  previewAiScreenActionIntent,
  resolveAiScreenActions,
} from "../../src/features/ai/screenActions/aiScreenActionResolver";

const directorAuth = { userId: "director-control", role: "director" } as const;
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const contractorAuth = { userId: "contractor-user", role: "contractor" } as const;

describe("AI screen action resolver", () => {
  it("returns role-scoped safe read, draft, approval, and forbidden buckets", () => {
    const result = resolveAiScreenActions({
      auth: buyerAuth,
      screenId: "buyer.requests",
    });

    expect(result).toMatchObject({
      status: "ready",
      screenId: "buyer.requests",
      role: "buyer",
      domain: "procurement",
      roleScoped: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      finalExecution: 0,
    });
    expect(result.safeReadActions.length).toBeGreaterThan(0);
    expect(result.draftActions.length).toBeGreaterThan(0);
    expect(result.approvalRequiredActions.length).toBeGreaterThan(0);
    expect(result.forbiddenActions.length).toBeGreaterThan(0);
    expect(result.availableTools).toEqual(
      expect.arrayContaining(["search_catalog", "compare_suppliers", "draft_request", "submit_for_approval"]),
    );
  });

  it("gives director/control full map access without claiming role-isolation E2E", () => {
    const result = resolveAiScreenActions({
      auth: directorAuth,
      screenId: "contractor.main",
    });

    expect(result.status).toBe("ready");
    expect(result.developerControlFullAccess).toBe(true);
    expect(result.roleIsolationE2eClaimed).toBe(false);
    expect(result.roleIsolationContractProof).toBe(true);
  });

  it("blocks non-scoped roles and forbidden actions deterministically", () => {
    const blocked = resolveAiScreenActions({
      auth: contractorAuth,
      screenId: "accountant.main",
    });
    expect(blocked).toMatchObject({
      status: "blocked",
      mutationCount: 0,
      fakeAiAnswer: false,
    });

    const forbiddenPlan = planAiScreenAction({
      auth: buyerAuth,
      input: {
        screenId: "buyer.requests",
        actionId: "buyer.requests.create_order_forbidden",
      },
    });
    expect(forbiddenPlan).toMatchObject({
      status: "blocked",
      planMode: "forbidden",
      executable: false,
      finalExecution: 0,
      mutationCount: 0,
    });
  });

  it("previews intents and plans without mutations or provider calls", () => {
    expect(
      previewAiScreenActionIntent({
        auth: buyerAuth,
        input: { screenId: "buyer.requests", intent: "draft" },
      }),
    ).toMatchObject({
      status: "preview",
      deterministic: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      finalExecution: 0,
    });

    expect(
      planAiScreenAction({
        auth: buyerAuth,
        input: {
          screenId: "buyer.requests",
          actionId: "buyer.requests.submit_request",
        },
      }),
    ).toMatchObject({
      status: "planned",
      planMode: "approval_required",
      requiresApproval: true,
      executable: false,
      mutationCount: 0,
      dbWrites: 0,
    });
  });
});
