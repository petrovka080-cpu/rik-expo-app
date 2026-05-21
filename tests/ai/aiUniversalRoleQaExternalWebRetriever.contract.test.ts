import { retrieveUniversalExternalWeb } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture, universalExternalWebResults } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: external web retriever", () => {
  it("uses web only when source planner allows it and provider is connected", () => {
    const construction = answerUniversalRoleQaFixture("дай смету на асфальт 100 м2", "director", "director", { web: true });
    const web = retrieveUniversalExternalWeb({
      sourcePlan: construction.sourcePlan,
      connected: true,
      providedResults: universalExternalWebResults,
      countryCode: "KG",
    });
    expect(web.used).toBe(true);
    expect(web.results.every((result) => result.url && result.checkedAt)).toBe(true);

    const internal = answerUniversalRoleQaFixture("сколько заявок за май", "director", "director", { web: true });
    expect(retrieveUniversalExternalWeb({ sourcePlan: internal.sourcePlan, connected: true, providedResults: universalExternalWebResults }).notAllowed).toBe(true);
  });
});
