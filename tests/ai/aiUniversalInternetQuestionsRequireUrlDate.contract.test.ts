import { readProjectFile } from "./aiUniversalSmokeTestHelpers";

describe("universal internet questions require URL and date", () => {
  it("fails internet answers when a public web source lacks URL or checkedAt", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");

    expect(source).toContain("publicWebFactsWithUrlAndDate");
    expect(source).toContain("public web source missing url/date");
    expect(source).toContain("public_web_sources_have_url");
    expect(source).toContain("public_web_sources_have_checkedAt");
  });
});
