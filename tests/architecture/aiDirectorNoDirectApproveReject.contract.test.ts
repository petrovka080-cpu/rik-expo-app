import { readFileSync } from "node:fs";

import { DIRECTOR_ROLE_POLICY } from "../../src/lib/ai/directorCompany";

describe("director no direct approve reject architecture", () => {
  it("keeps director approval actions draft/review only", () => {
    const pipeline = readFileSync("src/lib/ai/directorCompany/directorCompanyPipeline.ts", "utf8");
    const composer = readFileSync("src/lib/ai/directorCompany/directorAnswerComposer.ts", "utf8");

    expect(DIRECTOR_ROLE_POLICY.directApproveRejectAllowed).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.autoApprovalAllowed).toBe(false);
    expect(pipeline).not.toMatch(/executeApprove|executeReject|approveDirectly|rejectDirectly/);
    expect(composer).toContain("approvedByAi: false");
    expect(composer).toContain("rejectedByAi: false");
  });
});
