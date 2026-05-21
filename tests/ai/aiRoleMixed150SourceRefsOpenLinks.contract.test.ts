import { runAiRoleMixed150Evaluation } from "../../src/lib/ai/evaluation/goldenBusinessDataset";

describe("S_AI_ROLE_MIXED_150: source refs and open links", () => {
  it("requires source refs and open links for internal positive facts", () => {
    const { questions, answers, matrix } = runAiRoleMixed150Evaluation();

    expect(matrix.source_refs_required).toBe(true);
    expect(matrix.open_links_required_for_internal_objects).toBe(true);
    expect(matrix.missing_source_refs_found).toBe(0);
    expect(matrix.missing_open_links_found).toBe(0);

    for (const [index, question] of questions.entries()) {
      if (question.answerMode !== "positive_data_required") continue;
      expect(answers[index].sourceRefs.length).toBeGreaterThan(0);
      for (const linkType of question.expectedOpenLinkTypes) {
        expect(answers[index].openLinks.some((link) => link.entityType === linkType)).toBe(true);
      }
    }
  });
});
