import { expectProfessionalDomainVisibleBaselineJourney } from "./professionalDomainVisibleBaseline.shared";

describe("registered professional visible baseline — plaster", () => {
  it("builds and recalculates the exact plaster schema without unrelated dimensions or invented prices", () => {
    expectProfessionalDomainVisibleBaselineJourney({
      templateId: "plaster_paint_interior_ceiling_plaster_prepare_technical_room_professional_expanded_v1",
      titleRu: "Подготовка штукатурки потолка технического помещения",
    });
  });
});
