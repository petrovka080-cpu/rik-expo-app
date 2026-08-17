import { expectProfessionalDomainVisibleBaselineJourney } from "./professionalDomainVisibleBaseline.shared";

describe("registered professional visible baseline — complex templates", () => {
  it.each([
    ["district_heating_pipeline_preliminary_boq_expanded_complex_v1", "Предварительная смета тепловой сети"],
    ["heat_chamber_as_built_estimate_expanded_complex_v1", "Исполнительная смета тепловой камеры"],
    ["overhead_power_line_110kv_detailed_boq_from_drawings_expanded_complex_v1", "ВЛ 110 кВ по рабочим чертежам"],
  ])("builds and recalculates %s through its exact schema without invented prices", (templateId, titleRu) => {
    expectProfessionalDomainVisibleBaselineJourney({ templateId, titleRu });
  });
});
