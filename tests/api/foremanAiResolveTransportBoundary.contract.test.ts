import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_AUDIT_BATTLE_102_FOREMAN_AI_RESOLVE_TRANSPORT_BOUNDARY", () => {
  it("keeps foreman AI parsing in service while routing Supabase calls through transport", () => {
    const service = read("src/lib/api/foremanAiResolve.service.ts");
    const transport = read("src/lib/api/foremanAiResolve.transport.ts");

    expect(service).toContain("parseServerResolveResult");
    expect(service).toContain("callResolveCatalogSynonymRpc");
    expect(service).toContain("callResolveCatalogPackagingRpc");
    expect(service).toContain("invokeForemanAiResolveFunction");
    expect(service).not.toContain("../supabaseClient");
    expect(service).not.toMatch(/\bsupabase\s*\./);

    expect(transport).toContain('supabase.rpc("resolve_catalog_synonym_v1" as never');
    expect(transport).toContain('supabase.rpc("resolve_packaging_v1" as never');
    expect(transport).toContain('supabase.functions.invoke("foreman-ai-resolve"');
    expect(transport).toContain('Accept: "application/json"');
  });
});
