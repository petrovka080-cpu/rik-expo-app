import {
  planAiScreenRuntimeAction,
  previewAiScreenRuntimeIntent,
} from "../../src/features/ai/screenRuntime/aiScreenRuntimeActionPolicy";
import { getAiScreenRuntimeEntry } from "../../src/features/ai/screenRuntime/aiScreenRuntimeRegistry";

const buyerRole = "buyer" as const;
const directorRole = "director" as const;

describe("AI screen runtime action safety", () => {
  it("allows draft/approval previews but never final mutation", () => {
    const entry = getAiScreenRuntimeEntry("buyer.main");

    expect(
      previewAiScreenRuntimeIntent({
        role: buyerRole,
        entry,
        input: {
          screenId: "buyer.main",
          intent: "draft",
          evidenceRefs: ["screen_runtime:buyer:registry"],
        },
      }),
    ).toMatchObject({
      allowed: true,
      nextAction: "create_draft",
      mutationCount: 0,
      finalMutationAllowed: false,
    });

    expect(
      planAiScreenRuntimeAction({
        role: buyerRole,
        entry,
        input: {
          screenId: "buyer.main",
          action: "submit_for_approval",
          evidenceRefs: ["screen_runtime:buyer:registry"],
        },
      }),
    ).toMatchObject({
      status: "planned",
      planMode: "approval_boundary",
      requiresApproval: true,
      mutationCount: 0,
      finalMutationAllowed: false,
      executed: false,
    });
  });

  it("blocks execute_approved and direct submit semantics from runtime previews", () => {
    const entry = getAiScreenRuntimeEntry("director.dashboard");

    expect(
      previewAiScreenRuntimeIntent({
        role: directorRole,
        entry,
        input: { screenId: "director.dashboard", intent: "execute_approved" },
      }),
    ).toMatchObject({
      status: "blocked",
      allowed: false,
      nextAction: "blocked",
      finalMutationAllowed: false,
    });
  });
});
