import { professionalBoqFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("parametric BOQ compiler row groups", () => {
  it("builds material, labor, equipment, and logistics groups when the primitive policy requires them", () => {
    const boq = professionalBoqFor("estimate canopy metal canopy 647 sq_m");
    const groups = new Set(boq.sections.map((section) => section.type));
    expect(groups.has("materials")).toBe(true);
    expect(groups.has("labor")).toBe(true);
    expect(groups.has("equipment")).toBe(true);
    expect(groups.has("delivery")).toBe(true);
  });
});
