import { loadPilotDefectBurndown, validatePilotDefectBurndown } from "../../scripts/estimate/buildPilotDefectBurndown";

describe("pilot launch defect burndown", () => {
  it("defines required defect fields and starts with no P0/P1 blockers", () => {
    const burndown = loadPilotDefectBurndown();
    const validation = validatePilotDefectBurndown({ burndown });

    expect(burndown.acceptance.pilot_defect_burndown_created).toBe(true);
    expect(burndown.required_fields).toEqual(expect.arrayContaining([
      "defect_id",
      "severity",
      "status",
      "source",
      "scenario_id",
      "work_family_id",
      "role_id",
      "platform",
      "description",
      "reproduction_steps",
      "expected",
      "actual",
      "evidence_path",
      "owner_acceptance_required",
      "fixed_by_commit",
      "verified_by",
      "verified_at",
    ]));
    expect(validation.defect_burndown_validation_passed).toBe(true);
    expect(validation.p0_defects_count).toBe(0);
    expect(validation.p1_defects_count).toBe(0);
  });
});
