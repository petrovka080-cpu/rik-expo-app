import { classifyWorld } from "../worldConstruction/worldConstructionTestHelpers";

describe("professional BOQ no exact prompt lookup", () => {
  it("resolves paraphrases through primitives rather than an exact prompt table", () => {
    const first = classifyWorld("смета на гидроизоляцию крыши 100 кв м").primitive;
    const second = classifyWorld("нужна локальная смета: выполнить кровельную гидроизоляцию площадью 100 м2").primitive;

    expect(first.workKey).toBe("roof_waterproofing");
    expect(second.workKey).toBe("roof_waterproofing");
  });
});
