import { validatePayload } from "./changeControlTestHelpers";

describe("golden change control - roof waterproofing", () => {
  it("blocks roof waterproofing mapping to bathroom scope", () => {
    const { run } = validatePayload("WORK_KEY_MAPPING", "roof_waterproofing_mapping", {
      knownWork: true,
      workKey: "roof_waterproofing",
      domain: "roofing",
      object: "bathroom",
    });
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toContain("ROOF_WATERPROOFING_MAPPED_TO_BATHROOM");
  });
});
