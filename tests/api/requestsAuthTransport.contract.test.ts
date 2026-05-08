import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("requests auth transport boundary", () => {
  it("keeps request draft owner auth reads behind the transport boundary", () => {
    const serviceSource = read("src/lib/api/requests.ts");
    const transportSource = read("src/lib/api/requests.auth.transport.ts");

    expect(serviceSource).toContain('from "./requests.auth.transport"');
    expect(serviceSource).not.toContain("supabase.auth.getSession");
    expect(transportSource).toContain("supabase.auth.getSession");
    expect(transportSource).toContain("resolveCurrentRequestUserId");
  });
});
