import { validatePayload, validDangerousPayload } from "./changeControlTestHelpers";

describe("change control - dangerous safety rule validation", () => {
  it("blocks removal of licensed specialist and no-DIY protections", () => {
    const { run } = validatePayload("DANGEROUS_WORK_SAFETY_RULE", "high_voltage", validDangerousPayload({
      requiresLicensedSpecialist: false,
      noDiyInstructions: false,
    }));
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "DANGEROUS_LICENSE_WARNING_REQUIRED",
      "DANGEROUS_DIY_FORBIDDEN",
    ]));
  });
});
