import { resolveConstructionWorkOntologyIntent } from "./workOntologyTestHelpers";

describe("work ontology ambiguous input policy", () => {
  it("asks for disambiguation instead of guessing broad waterproofing, tile, and electrical requests", () => {
    expect(resolveConstructionWorkOntologyIntent("\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f 100 \u043c2").ambiguity_status).toBe("AMBIGUOUS_WORK_INPUT");
    expect(resolveConstructionWorkOntologyIntent("\u043f\u043b\u0438\u0442\u043a\u0430 50 \u043c2").ambiguity_status).toBe("AMBIGUOUS_WORK_INPUT");
    expect(resolveConstructionWorkOntologyIntent("\u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430").ambiguity_status).toBe("AMBIGUOUS_WORK_INPUT");
  });
});
