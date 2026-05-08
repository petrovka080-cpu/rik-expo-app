import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("request repository auth transport boundary", () => {
  it("keeps request repository auth session lookup out of the service module", () => {
    const serviceSource = read("src/lib/api/request.repository.ts");
    const transportSource = read("src/lib/api/request.repository.auth.transport.ts");

    expect(serviceSource).toContain('from "./request.repository.auth.transport"');
    expect(serviceSource).not.toContain("supabase.auth.getSession");
    expect(transportSource).toContain("supabase.auth.getSession");
    expect(transportSource).toContain("Promise<string | null>");
  });

  it("keeps realtime broadcast and cleanup behavior in the existing repository path", () => {
    const serviceSource = read("src/lib/api/request.repository.ts");

    expect(serviceSource).toContain("DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME");
    expect(serviceSource).toContain("supabase.removeChannel(channel)");
    expect(serviceSource).toContain('supabase.from("notifications").insert(payload)');
  });
});
