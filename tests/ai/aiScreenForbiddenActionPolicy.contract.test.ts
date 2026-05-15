import {
  listAiScreenButtonRoleActionEntries,
} from "../../src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry";
import {
  AI_SCREEN_FORBIDDEN_ACTION_POLICY,
  evaluateAiScreenForbiddenActionPolicy,
  isAiScreenActionDirectExecutionAllowed,
} from "../../src/features/ai/screenAudit/aiScreenForbiddenActionPolicy";

describe("AI screen forbidden action policy", () => {
  const entries = listAiScreenButtonRoleActionEntries();

  it("declares the production forbidden action families", () => {
    expect(AI_SCREEN_FORBIDDEN_ACTION_POLICY.forbiddenDirectActions).toEqual(
      expect.arrayContaining([
        "direct final submit",
        "direct payment",
        "direct warehouse mutation",
        "direct supplier confirmation",
        "direct contract signing",
        "direct finance posting",
        "direct role/permission changes",
        "direct deletion",
        "direct DB write from UI",
        "direct Supabase mutation from UI",
        "LLM-only decision without evidence",
        "external supplier creation without citation/evidence",
      ]),
    );
    expect(AI_SCREEN_FORBIDDEN_ACTION_POLICY.directExecutionAllowed).toBe(false);
    expect(AI_SCREEN_FORBIDDEN_ACTION_POLICY.directDbWriteAllowed).toBe(false);
  });

  it("requires forbidden reasons and never allows direct execution", () => {
    const forbiddenEntries = entries.filter((entry) => entry.actionKind === "forbidden");

    expect(forbiddenEntries.length).toBeGreaterThan(0);
    for (const entry of forbiddenEntries) {
      expect(evaluateAiScreenForbiddenActionPolicy(entry)).toMatchObject({
        forbidden: true,
        directExecutionAllowed: false,
      });
      expect(entry.forbiddenReason).toBeTruthy();
      expect(isAiScreenActionDirectExecutionAllowed(entry)).toBe(false);
    }
  });

  it("detects direct mutation phrasing even outside a forbidden entry", () => {
    const safeRead = entries.find((entry) => entry.actionKind === "safe_read")!;
    const suspicious = {
      ...safeRead,
      label: "Apply payment directly",
      onPressHandlers: ["applyPayment"],
    };

    expect(evaluateAiScreenForbiddenActionPolicy(suspicious)).toMatchObject({
      forbidden: true,
      directExecutionAllowed: false,
    });
  });
});
