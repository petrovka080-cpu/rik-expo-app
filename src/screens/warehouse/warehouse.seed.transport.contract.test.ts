import { readFileSync } from "fs";
import { join } from "path";

import {
  evaluateDirectSupabaseExceptionGuardrail,
  loadDirectSupabaseExceptionRegistry,
  scanDirectSupabaseBypasses,
} from "../../../scripts/architecture_anti_regression_suite";

const root = join(__dirname, "..", "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("warehouse seed runtime transport boundary", () => {
  it("classifies warehouse seed as runtime reachable and keeps runtime service provider-free", () => {
    const service = read("src/screens/warehouse/warehouse.seed.ts");
    const flow = read("src/screens/warehouse/hooks/useWarehouseReceiveFlow.ts");

    expect(flow).toContain('import { seedEnsureIncomingItems } from "../warehouse.seed"');
    expect(flow).toContain("await seedEnsureIncomingItems({ supabase, incomingId })");
    expect(service).toContain("export async function seedEnsureIncomingItems");
    expect(service).not.toMatch(/\bsupabase\s*(?:\r?\n\s*)?\.\s*(from|rpc)\s*\(/);
    expect(service).toContain("selectWarehouseSeedIncomingItemProbe(supabase, incomingId)");
    expect(service).toContain("callWarehouseSeedEnsureRpc(supabase, fn, incomingId)");
    expect(service).toContain("insertWarehouseSeedPurchaseItems(supabase, piToInsert)");
    expect(service).toContain("upsertWarehouseSeedIncomingItems(supabase, rows)");
  });

  it("keeps seed provider table, RPC, and mutation options in transport", () => {
    const service = read("src/screens/warehouse/warehouse.seed.ts");
    const transport = read("src/screens/warehouse/warehouse.seed.transport.ts");

    expect(service).toContain('const tryFns: WarehouseSeedEnsureRpcName[] = [');
    expect(service).toContain('"wh_incoming_ensure_items"');
    expect(service).toContain('"ensure_incoming_items"');
    expect(service).toContain('"wh_incoming_seed_from_purchase"');
    expect(service).toContain("mergeIncomingSeedRows(rows)");

    expect(transport).toContain('.from("wh_incoming")');
    expect(transport).toContain('.from("purchase_items")');
    expect(transport).toContain('.from("purchases")');
    expect(transport).toContain('.from("proposal_snapshot_items")');
    expect(transport).toContain('.from("request_items")');
    expect(transport).toContain('.from("wh_incoming_items")');
    expect(transport).toContain('return supabase.from("purchase_items").insert(rows);');
    expect(transport).toContain('return supabase.from("wh_incoming_items").upsert(rows, {');
    expect(transport).toContain('onConflict: "incoming_id,purchase_item_id"');
    expect(transport).toContain("ignoreDuplicates: false");
    expect(transport).toContain("return supabase.rpc(fn, { p_incoming_id: incomingId });");
  });

  it("moves warehouse seed scanner findings to transport and keeps exception registry clean", () => {
    const findings = scanDirectSupabaseBypasses(root);
    const serviceFindings = findings.filter(
      (finding) => finding.file === "src/screens/warehouse/warehouse.seed.ts",
    );
    const transportFindings = findings.filter(
      (finding) => finding.file === "src/screens/warehouse/warehouse.seed.transport.ts",
    );
    const registry = loadDirectSupabaseExceptionRegistry({ projectRoot: root });
    const exceptionGuard = evaluateDirectSupabaseExceptionGuardrail({
      findings,
      registry,
    });

    expect(serviceFindings).toEqual([]);
    expect(transportFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "transport_controlled",
          operation: "write",
          callTarget: "table:purchase_items",
        }),
        expect.objectContaining({
          classification: "transport_controlled",
          operation: "write",
          callTarget: "table:wh_incoming_items",
        }),
        expect.objectContaining({
          classification: "transport_controlled",
          operation: "rpc",
          callTarget: "rpc:dynamic",
        }),
      ]),
    );
    expect(transportFindings.every((finding) => finding.classification === "transport_controlled")).toBe(true);
    expect(exceptionGuard.check.status).toBe("pass");
    expect(exceptionGuard.summary.unclassifiedCurrentFindings).toBe(0);
  });
});
