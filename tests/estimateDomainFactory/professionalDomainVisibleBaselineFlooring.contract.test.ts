import { expectProfessionalDomainVisibleBaselineJourney } from "./professionalDomainVisibleBaseline.shared";

describe("registered professional visible baseline — flooring", () => {
  it("builds and recalculates the exact flooring schema without unrelated dimensions or invented prices", () => {
    expectProfessionalDomainVisibleBaselineJourney({
      templateId: "flooring_interior_baseboard_glue_small_area_professional_expanded_v1",
      titleRu: "Приклеивание плинтуса на малой площади",
    });
  });
});
