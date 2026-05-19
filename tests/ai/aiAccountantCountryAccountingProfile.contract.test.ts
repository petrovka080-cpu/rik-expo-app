import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantMissingSourceFixture, buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant country accounting profile", () => {
  it("requires country/accounting sources for country claims", () => {
    const sourced = answerAccountantFinanceQuestion({
      context: buildAccountantRealFinanceFixture(),
      questionRu: "country accounting profile",
    });
    const missing = answerAccountantFinanceQuestion({
      context: buildAccountantMissingSourceFixture(),
      questionRu: "country accounting profile",
    });

    expect(sourced.countryAccountingClaimHasSource).toBe(true);
    expect(missing.countryAccountingClaimHasSource).toBe(true);
    expect(missing.missingData.join(" ")).toContain("country/tax profile");
  });
});
