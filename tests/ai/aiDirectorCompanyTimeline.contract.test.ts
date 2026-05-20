import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director company timeline", () => {
  it("traces object chain without invented links", () => {
    const answer = answerDirectorCompanyQuestion({
      context: { ...buildDirectorRealCompanyFixture(), screenId: "director.company.timeline" },
      questionRu: "покажи цепочку по главному риску",
    });

    expect(answer.answerKind).toBe("company_timeline");
    expect(answer.providerTrace).toContain("aiCompanyTimelineProvider");
    expect(answer.answerRu).toContain("WRK-1042");
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:request:MR-1042", "src:stock:STK-221", "src:invoice:INV-1042"]));
  });
});
