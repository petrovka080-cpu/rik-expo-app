import {
  classifyConstructionWorkType,
  extractUniversalRoleQaEntity,
} from "../../src/lib/ai/universalRoleQa";

describe("S_AI_UNIVERSAL_ROLE_QA: entity extractor", () => {
  it("extracts entities and keeps construction regressions stable", () => {
    expect(extractUniversalRoleQaEntity("сколько заявок за май")).toBe("procurement_request");
    expect(extractUniversalRoleQaEntity("какие платежи без документов")).toBe("payment");
    expect(extractUniversalRoleQaEntity("дай смету на асфальт 100 м2")).toBe("construction_work_type");
    expect(classifyConstructionWorkType("ламинат 100 м2")).toBe("flooring");
    expect(classifyConstructionWorkType("металлоконструкции навеса")).toBe("metal_structures");
    expect(classifyConstructionWorkType("гидроизоляция фундамента")).toBe("waterproofing");
    expect(classifyConstructionWorkType("асфальт")).toBe("asphalt_paving");
  });
});
