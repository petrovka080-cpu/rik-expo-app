import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director cross-domain risk summary", () => {
  it("uses finance, procurement, warehouse, field, documents, office and approval domains", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "покажи главные риски компании",
    });

    expect(answer.answerKind).toBe("cross_domain_risk_report");
    expect(answer.domainSummary.field).toBeDefined();
    expect(answer.domainSummary.procurement).toBeDefined();
    expect(answer.domainSummary.warehouse).toBeDefined();
    expect(answer.domainSummary.finance).toBeDefined();
    expect(answer.domainSummary.documents).toBeDefined();
    expect(answer.domainSummary.office).toBeDefined();
    expect(answer.domainSummary.approvals).toBeDefined();
  });
});
