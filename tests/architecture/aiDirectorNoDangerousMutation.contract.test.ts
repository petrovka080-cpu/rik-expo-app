import { readFileSync } from "node:fs";

import { DIRECTOR_ROLE_POLICY } from "../../src/lib/ai/directorCompany";

describe("director no dangerous mutation architecture", () => {
  it("blocks payment order stock work signing mutations from AI answer", () => {
    const pipeline = readFileSync("src/lib/ai/directorCompany/directorCompanyPipeline.ts", "utf8");
    const providers = readFileSync("src/lib/ai/directorCompany/directorDataProviders.ts", "utf8");

    expect(DIRECTOR_ROLE_POLICY.directPaymentAllowed).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.directOrderAllowed).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.directStockMutationAllowed).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.directWorkCloseAllowed).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.directSigningAllowed).toBe(false);
    expect(pipeline).not.toMatch(/insert\(|update\(|delete\(|upsert\(/);
    expect(providers).not.toMatch(/insert\(|update\(|delete\(|upsert\(/);
  });
});
