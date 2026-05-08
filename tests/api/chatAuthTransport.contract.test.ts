import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("chat auth transport boundary", () => {
  it("keeps chat auth reads behind the transport boundary", () => {
    const serviceSource = read("src/lib/chat_api.ts");
    const transportSource = read("src/lib/chat.auth.transport.ts");

    expect(serviceSource).toContain('from "./chat.auth.transport"');
    expect(serviceSource).not.toContain("supabase.auth.getUser");
    expect(transportSource).toContain("supabase.auth.getUser");
    expect(transportSource).toContain("getCurrentChatAuthUser");
  });
});
