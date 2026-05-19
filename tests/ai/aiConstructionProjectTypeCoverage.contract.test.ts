import {
  CONSTRUCTION_PROJECT_TYPES,
  classifyConstructionProjectType,
  listConstructionProjectTypeTaxonomy,
} from "../../src/lib/ai/constructionKnowledgeCore";

describe("AI construction project type coverage", () => {
  it("supports residential, industrial, road, infrastructure, utility and energy objects", () => {
    expect(listConstructionProjectTypeTaxonomy()).toHaveLength(CONSTRUCTION_PROJECT_TYPES.length);
    expect(classifyConstructionProjectType({ title: "Жилой комплекс" }).projectType).toBe("residential");
    expect(classifyConstructionProjectType({ title: "Промышленный склад" }).projectType).toBe("industrial");
    expect(classifyConstructionProjectType({ title: "Дорога и брусчатка" }).projectType).toBe("road");
    expect(classifyConstructionProjectType({ title: "Мост линейный объект" }).projectType).toBe("infrastructure");
    expect(classifyConstructionProjectType({ title: "ГЭС гидроузел" }).projectType).toBe("hydro");
    expect(classifyConstructionProjectType({ title: "ТЭЦ котельная" }).projectType).toBe("thermal_power");
    expect(classifyConstructionProjectType({ title: "Водопровод и канализация" }).projectType).toBe("utility_network");
  });
});
