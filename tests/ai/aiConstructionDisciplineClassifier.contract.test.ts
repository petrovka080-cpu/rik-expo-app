import {
  classifyConstructionDiscipline,
} from "../../src/lib/ai/constructionKnowledgeCore";

describe("AI construction discipline classifier", () => {
  it("covers core engineering disciplines from document text", () => {
    expect(classifyConstructionDiscipline({ text: "ОВ вентиляция и воздуховоды" }).discipline).toBe("hvac");
    expect(classifyConstructionDiscipline({ text: "ЭОМ кабельные трассы и щиты" }).discipline).toBe("electrical");
    expect(classifyConstructionDiscipline({ text: "АПС пожарная сигнализация" }).discipline).toBe("fire_safety");
    expect(classifyConstructionDiscipline({ text: "Дорога, асфальт, брусчатка" }).discipline).toBe("road");
    expect(classifyConstructionDiscipline({ text: "ГЭС гидротехническое сооружение" }).discipline).toBe("hydraulic");
  });
});
