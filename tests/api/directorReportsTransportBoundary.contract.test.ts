import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S_AUDIT_BATTLE_104_DIRECTOR_REPORTS_TRANSPORT_BOUNDARY", () => {
  it("keeps director reports scope validation in service while routing RPC through transport", () => {
    const service = read("src/lib/api/directorReportsTransport.service.ts");
    const transport = read("src/lib/api/directorReportsTransport.transport.ts");

    expect(service).toContain('from "./directorReportsTransport.transport"');
    expect(service).toContain("callDirectorReportTransportScopeRpc(request, args.signal)");
    expect(service).toContain("validateScopeEnvelopeV1");
    expect(service).toContain("adaptCanonicalOptionsPayload");
    expect(service).not.toContain("../supabaseClient");
    expect(service).not.toMatch(/\bsupabase\s*\./);

    expect(transport).toContain('from "../supabaseClient"');
    expect(transport).toContain("supabase.rpc(");
    expect(transport).toContain("toDirectorReportsAggregationRpcParams(request)");
    expect(transport).toContain("applySupabaseAbortSignal");
  });
});
