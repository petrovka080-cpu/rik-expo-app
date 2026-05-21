import { readProjectFile } from "./aiUniversalSmokeTestHelpers";

describe("universal screen questions do not use public web", () => {
  it("blocks internal screen questions that use public web facts", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");

    expect(source).toContain("internalQuestionUsedPublicWeb");
    expect(source).toContain("screen questions used public web facts");
    expect(source).toContain("internal_questions_do_not_use_public_web");
  });
});
