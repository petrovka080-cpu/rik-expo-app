import { expectResolved, resolveConstructionWorkOntologyIntent } from "./workOntologyTestHelpers";

describe("work ontology exact synonym recognition", () => {
  it("resolves common real user phrases to the intended canonical work", () => {
    expectResolved(resolveConstructionWorkOntologyIntent("\u0437\u0430\u043b\u0438\u0442\u044c \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 30 \u043c3"), "foundation_concrete");
    expectResolved(resolveConstructionWorkOntologyIntent("\u043f\u043b\u0438\u0442\u043a\u0430 \u0432 \u0432\u0430\u043d\u043d\u043e\u0439 28 \u043c2"), "bathroom_tile_full");
    expectResolved(resolveConstructionWorkOntologyIntent("\u0440\u043e\u0437\u0435\u0442\u043a\u0438 12 \u0448\u0442"), "socket_installation");
  });
});
