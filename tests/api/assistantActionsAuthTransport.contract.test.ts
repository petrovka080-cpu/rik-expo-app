import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_AUDIT_BATTLE_100_ASSISTANT_ACTIONS_AUTH_TRANSPORT_BOUNDARY", () => {
  it("keeps assistant action behavior in service while routing auth through transport", () => {
    const service = read("src/features/ai/assistantActions.ts");
    const transport = read("src/features/ai/assistantActions.transport.ts");

    expect(service).toContain("loadAssistantCurrentAuthUser");
    expect(service).toContain("resolveForemanQuickRequest");
    expect(service).toContain("tryRunAssistantAction");
    expect(service).not.toContain("../../lib/supabaseClient");
    expect(service).not.toContain("supabase.auth.getUser");

    expect(transport).toContain("export async function loadAssistantCurrentAuthUser");
    expect(transport).toContain("supabase.auth.getUser");
  });
});
