import { parseUniversalRoleQaPeriod } from "../../src/lib/ai/universalRoleQa";

describe("S_AI_UNIVERSAL_ROLE_QA: period parser", () => {
  it("parses May 2026 deterministically", () => {
    expect(parseUniversalRoleQaPeriod("за май", "2026-05-20")).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
      labelRu: "май 2026",
      source: "question",
    });
  });
});
