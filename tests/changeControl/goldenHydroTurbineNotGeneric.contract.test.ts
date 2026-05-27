import { validatePayload } from "./changeControlTestHelpers";

describe("golden change control - hydro turbine", () => {
  it("blocks hydropower turbine mapping to generic equipment", () => {
    const { run } = validatePayload("WORK_KEY_MAPPING", "hydro_turbine_100kw", {
      knownWork: true,
      operation: "hydro_turbine_installation",
      workKey: "generic_equipment",
      domain: "hydropower",
    });
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toContain("HYDRO_TURBINE_GENERIC_MAPPING");
  });
});
