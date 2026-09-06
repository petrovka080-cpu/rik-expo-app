import {
  buildProfessionalWorkPassportV2,
  buildProfessionalWorkPassportV2AcceptanceCases,
} from "../../src/lib/estimate/buildProfessionalWorkPassportV2";

describe("ProfessionalWorkPassportV2 progressive question window", () => {
  test.each([
    "pumping_station_preliminary_boq_expanded_complex_v1",
    "booster_pumping_station_preliminary_boq_expanded_complex_v1",
  ])("keeps the complete pump schema while presenting at most five questions for %s", (templateId) => {
    const passport = buildProfessionalWorkPassportV2(templateId);

    expect(passport).not.toBeNull();
    expect(passport?.parameter_graph.p0_required.length).toBeGreaterThan(5);
    expect(passport?.parameter_graph.visible_question_limit).toBe(5);
    expect(passport?.presentation.max_questions_shown).toBe(5);
    expect(passport?.quantity_formulas).toHaveLength(31);
    expect(passport?.validation).toMatchObject({
      status: "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW",
      blockers: [],
    });
    expect(
      passport ? buildProfessionalWorkPassportV2AcceptanceCases(passport) : [],
    ).toEqual(expect.arrayContaining([
      expect.objectContaining({ case_kind: "A_MINIMAL_REQUEST", status: "ready" }),
      expect.objectContaining({ case_kind: "B_FULL_REQUEST", status: "ready" }),
    ]));
  });

  test("keeps a real equipment owner in each technological-pipeline passport", () => {
    const passport = buildProfessionalWorkPassportV2(
      "technological_pipeline_preliminary_boq_expanded_complex_v1",
    );

    expect(passport?.equipment).toEqual(expect.arrayContaining([
      expect.objectContaining({
        equipment_code: "pipe_welding_equipment_shifts",
        unit: "shift",
      }),
    ]));
    expect(passport?.validation.blockers).toEqual([]);
  });
});
