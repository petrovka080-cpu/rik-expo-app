import { validatePayload, validBoqPayload } from "./changeControlTestHelpers";

describe("change control - BOQ depth validation", () => {
  it("blocks infrastructure recipes below depth policy", () => {
    const { run } = validatePayload("PROFESSIONAL_BOQ_RECIPE", "hydro_turbine_100kw", validBoqPayload({
      complexityClass: "infrastructure",
      meaningfulRows: 12,
    }));
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toContain("BOQ_RECIPE_BELOW_DEPTH_POLICY");
  });
});
