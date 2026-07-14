import fs from "node:fs";

describe("pilot launch known limitations", () => {
  it("discloses preliminary complex estimates and excludes adjacent product areas", () => {
    const file = JSON.parse(fs.readFileSync("data/estimate-pilot/pilot-known-limitations.json", "utf8"));
    const text = JSON.stringify(file).toLowerCase();

    expect(file.acceptance.known_limitations_created).toBe(true);
    expect(file.acceptance.complex_preliminary_limitation_disclosed).toBe(true);
    expect(text).toContain("preliminary");
    expect(text).toContain("marketplace");
    expect(text).toContain("rfq");
    expect(text).toContain("warehouse");
    expect(text).toContain("payment");
    expect(text).toContain("owner");
  });
});
