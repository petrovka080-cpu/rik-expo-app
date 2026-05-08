import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_AUDIT_BATTLE_101_AI_REPORTS_TRANSPORT_BOUNDARY", () => {
  it("keeps AI report normalization in service while routing Supabase access through transport", () => {
    const service = read("src/lib/ai_reports.ts");
    const transport = read("src/lib/ai_reports.transport.ts");

    expect(service).toContain("normalizeProposalHistoryRows");
    expect(service).toContain("analyzePriceHistory");
    expect(service).toContain("loadAiConfigRow");
    expect(service).toContain("upsertAiReport");
    expect(service).toContain("loadProposalHistoryRowsTransport");
    expect(service).not.toContain("./supabaseClient");
    expect(service).not.toMatch(/\bsupabase\s*\./);

    expect(transport).toMatch(/supabase\s*\.\s*from\("ai_configs" as never\)/);
    expect(transport).toContain('supabase.from("ai_reports" as never).upsert');
    expect(transport).toContain('supabase');
    expect(transport).toContain('from("proposal_items")');
  });
});
