import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("contractor profile auth transport boundary", () => {
  it("keeps contractor profile auth reads behind the transport boundary", () => {
    const serviceSource = read("src/screens/contractor/contractor.profileService.ts");
    const transportSource = read("src/screens/contractor/contractor.profileService.auth.transport.ts");

    expect(serviceSource).toContain('from "./contractor.profileService.auth.transport"');
    expect(serviceSource).not.toContain("auth.getUser");
    expect(transportSource).toContain("auth.getUser");
    expect(transportSource).toContain("resolveCurrentContractorUserId");
  });
});
