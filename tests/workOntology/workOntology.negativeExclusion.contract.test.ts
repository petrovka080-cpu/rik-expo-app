import { resolveConstructionWorkOntologyIntent } from "./workOntologyTestHelpers";

describe("work ontology negative exclusion", () => {
  it("does not cross-map dangerous confusion pairs", () => {
    const roof = resolveConstructionWorkOntologyIntent("\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438 120 \u043c2");
    expect(roof.selected_work_key).toBe("roof_waterproofing");
    expect(roof.selected_work_key).not.toBe("bathroom_waterproofing");

    const bathroomTile = resolveConstructionWorkOntologyIntent("\u043f\u043b\u0438\u0442\u043a\u0430 \u0432 \u0432\u0430\u043d\u043d\u043e\u0439 28 \u043c2");
    expect(bathroomTile.selected_work_key).toBe("bathroom_tile_full");
    expect(bathroomTile.selected_work_key).not.toBe("bathroom_waterproofing");
  });
});
