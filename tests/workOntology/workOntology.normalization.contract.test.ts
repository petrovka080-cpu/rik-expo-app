import { resolveConstructionWorkOntologyIntent, resolveWithKeyHint } from "./workOntologyTestHelpers";

describe("work ontology normalization", () => {
  it("handles case, punctuation, city, and mojibake-normalized Russian text deterministically", () => {
    const plain = resolveConstructionWorkOntologyIntent("\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438 120 \u043c2, Bishkek");
    const noisy = resolveWithKeyHint("\u0413\u0418\u0414\u0420\u041e\u0418\u0417\u041e\u041b\u042f\u0426\u0418\u042f!!! \u043a\u0440\u044b\u0448\u0438, 120\u043c2; Bishkek", "roof_waterproofing");
    expect(plain.selected_work_key).toBe("roof_waterproofing");
    expect(noisy.selected_work_key).toBe("roof_waterproofing");
    expect(noisy.quantity).toBe(120);
    expect(noisy.unit).toBe("m2");
    expect(noisy.country).toBe("KG");
    expect(noisy.expected_currency).toBe("KGS");
  });
});
