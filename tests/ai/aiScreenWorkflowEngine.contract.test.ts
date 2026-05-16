import {
  getAiScreenWorkflowPack,
  listAiScreenWorkflowPacks,
} from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";
import { validateAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowPolicy";

describe("AI screen workflow engine", () => {
  it("builds screen-native workflow packs with prepared work, actions and safety", () => {
    const pack = getAiScreenWorkflowPack({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.main",
      searchParams: { paymentEvidence: "payment:1|document:2" },
    });

    expect(pack.screenId).toBe("accountant.main");
    expect(pack.readyBlocks.length).toBeGreaterThan(0);
    expect(pack.readyOptions.length).toBeGreaterThan(0);
    expect(pack.actions.map((action) => action.actionKind)).toEqual(expect.arrayContaining([
      "safe_read",
      "draft_only",
      "approval_required",
      "forbidden",
    ]));
    expect(pack.safety.fakeDataUsed).toBe(false);
    expect(validateAiScreenWorkflowPack(pack).ok).toBe(true);
  });

  it("builds valid packs for all audited screens", () => {
    const packs = listAiScreenWorkflowPacks();

    expect(packs).toHaveLength(28);
    expect(packs.every((pack) => validateAiScreenWorkflowPack(pack).ok)).toBe(true);
  });
});
