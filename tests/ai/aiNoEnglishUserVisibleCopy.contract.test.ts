import { buildAiRealUserLocalizationAudit } from "../../scripts/ai/aiRealUserButtonProof";

describe("AI Russian user-visible copy", () => {
  it("keeps visible AI labels and results in Russian for normal users", () => {
    const audit = buildAiRealUserLocalizationAudit();

    expect(audit.final_status).toBe("GREEN_AI_RUSSIAN_UI_COPY_READY");
    expect(audit.english_user_visible_ai_labels_found).toBe(0);
    expect(audit.issues.filter((issue) => /English/i.test(issue.exactReason))).toEqual([]);
  });
});
