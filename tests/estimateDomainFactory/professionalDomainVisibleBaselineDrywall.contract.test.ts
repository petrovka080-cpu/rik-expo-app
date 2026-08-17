import { expectProfessionalDomainVisibleBaselineJourney } from "./professionalDomainVisibleBaseline.shared";

describe("registered professional visible baseline — drywall", () => {
  it("builds and recalculates the exact drywall schema without unrelated dimensions or invented prices", () => {
    expectProfessionalDomainVisibleBaselineJourney({
      templateId: "drywall_ceiling_interior_bulkhead_prepare_small_area_professional_expanded_v1",
      titleRu: "Подготовка короба из гипсокартона",
    });
  });
});
