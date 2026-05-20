import { readFileSync } from "node:fs";

import { DIRECTOR_ROLE_POLICY } from "../../src/lib/ai/directorCompany";
import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "../ai/aiDirectorRealCompany.fixture";

describe("director no runtime secrets leak architecture", () => {
  it("redacts raw runtime, provider payload and secrets from director answer", () => {
    const sanitizer = readFileSync("src/lib/ai/directorCompany/directorSourceSanitizer.ts", "utf8");
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "security summary",
    });

    expect(DIRECTOR_ROLE_POLICY.canSeeRawRuntime).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.canSeeRawSecrets).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.canSeeServiceRoleKeys).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.canSeeProviderPayloads).toBe(false);
    expect(sanitizer).toContain("raw_runtime");
    expect(answer.hiddenTechnicalData.length).toBeGreaterThan(0);
    expect(answer.answerRu).not.toMatch(/service_role|provider payload|runtime dump|env_secret/i);
  });
});
