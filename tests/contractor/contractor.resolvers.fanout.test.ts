import { readFileSync } from "fs";
import { join } from "path";

import {
  resolveContractorJobIdForRow,
  resolveRequestIdForRow,
} from "../../src/screens/contractor/contractor.resolvers";

const root = join(__dirname, "..", "..");
const source = () => readFileSync(join(root, "src/screens/contractor/contractor.resolvers.ts"), "utf8");

const uuid = (tail: string) => `11111111-1111-4111-8111-${tail.padStart(12, "0")}`;

function makeSupabaseMock(
  rows: Record<string, Array<{ data?: unknown; error?: unknown }>>,
) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const state = new Map<string, number>();

  const nextResult = (table: string) => {
    const index = state.get(table) ?? 0;
    state.set(table, index + 1);
    return rows[table]?.[index] ?? { data: null, error: null };
  };

  const makeBuilder = (table: string) => {
    const builder = {
      select: (...args: unknown[]) => {
        calls.push({ method: "select", args });
        return builder;
      },
      eq: (...args: unknown[]) => {
        calls.push({ method: "eq", args });
        return builder;
      },
      maybeSingle: async () => {
        calls.push({ method: "maybeSingle", args: [] });
        return nextResult(table);
      },
      limit: () => {
        throw new Error("contractor resolver should not use list limit");
      },
      range: () => {
        throw new Error("contractor resolver should not use list range");
      },
      order: () => {
        throw new Error("contractor resolver should not use list ordering");
      },
    };
    return builder;
  };

  return {
    client: {
      from: (table: string) => {
        calls.push({ method: "from", args: [table] });
        return makeBuilder(table);
      },
    },
    calls,
  };
}

describe("S-PAG-11 contractor resolver fan-out inventory", () => {
  it("keeps contractor resolvers on point-lookups instead of list fan-out reads", () => {
    const text = source();

    expect(text).toContain(".maybeSingle()");
    expect(text).not.toContain("loadPagedContractorRows");
    expect(text).not.toContain("normalizePage(");
    expect(text).not.toContain(".range(");
    expect(text).not.toContain(".order(");
  });

  it("resolves request id through single-row purchase and request item lookups", async () => {
    const purchaseItemId = uuid("1");
    const requestItemId = uuid("2");
    const requestId = uuid("3");
    const supabase = makeSupabaseMock({
      purchase_items: [{ data: { request_item_id: requestItemId }, error: null }],
      request_items: [{ data: { request_id: requestId }, error: null }],
    });

    await expect(
      resolveRequestIdForRow(supabase.client, { purchase_item_id: purchaseItemId }),
    ).resolves.toBe(requestId);

    expect(supabase.calls.filter((call) => call.method === "from").map((call) => call.args[0])).toEqual([
      "purchase_items",
      "request_items",
    ]);
    expect(supabase.calls.filter((call) => call.method === "maybeSingle")).toHaveLength(2);
    expect(supabase.calls.some((call) => call.method === "range" || call.method === "limit")).toBe(false);
  });

  it("preserves contractor job fallback semantics with maybeSingle request and progress lookups", async () => {
    const requestId = uuid("4");
    const progressId = uuid("5");
    const contractorJobId = uuid("6");
    const supabase = makeSupabaseMock({
      requests: [{ data: null, error: { code: "42703" } }],
      work_progress: [{ data: { contractor_job_id: contractorJobId }, error: null }],
    });

    await expect(
      resolveContractorJobIdForRow(
        supabase.client,
        { progress_id: progressId },
        async () => requestId,
      ),
    ).resolves.toBe(contractorJobId);

    expect(supabase.calls.filter((call) => call.method === "from").map((call) => call.args[0])).toEqual([
      "requests",
      "requests",
      "work_progress",
    ]);
    expect(supabase.calls.filter((call) => call.method === "maybeSingle")).toHaveLength(3);
    expect(supabase.calls.some((call) => call.method === "range" || call.method === "limit")).toBe(false);
  });
});
