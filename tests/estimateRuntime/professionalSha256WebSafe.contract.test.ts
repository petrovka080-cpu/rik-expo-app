import { readFileSync } from "node:fs";
import path from "node:path";

import { professionalSha256 } from "../../src/lib/ai/professionalEstimateTemplates/professionalEstimateSnapshot";

describe("professional estimate snapshot hashing", () => {
  it("uses a browser-safe SHA-256 implementation", () => {
    expect(professionalSha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(professionalSha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(professionalSha256({ b: 2, a: 1 })).toHaveLength(64);

    const source = readFileSync(
      path.join(process.cwd(), "src", "lib", "ai", "professionalEstimateTemplates", "professionalEstimateSnapshot.ts"),
      "utf8",
    );
    expect(source).not.toContain("node:crypto");
    expect(source).not.toContain("createHash");
  });
});
