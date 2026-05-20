import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director uses all business domains", () => {
  it("collects traces from approvals, finance, procurement, warehouse, field, documents, office and security summary", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "что мне решить сегодня",
    });

    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "aiApprovalQueueProvider",
      "aiDirectorFinanceProvider",
      "aiDirectorProcurementProvider",
      "aiDirectorWarehouseProvider",
      "aiDirectorFieldProvider",
      "aiDirectorDocumentsProvider",
      "aiDirectorOfficeProvider",
      "aiDirectorSecuritySummaryProvider",
    ]));
  });
});
