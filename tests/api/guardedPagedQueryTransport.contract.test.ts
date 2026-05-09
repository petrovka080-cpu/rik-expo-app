import {
  loadPagedRowsWithCeiling,
} from "../../src/lib/api/_core";
import {
  createGuardedPagedQuery,
  isBuyerProposalItemViewRow,
  type PagedQueryProvider,
} from "../../src/screens/buyer/buyer.repo.read.transport";

type GuardedRow = {
  id: string;
  qty?: number | null;
};

const isGuardedRow = (value: unknown): value is GuardedRow =>
  isTestRecord(value) &&
  typeof value.id === "string" &&
  (value.qty == null || typeof value.qty === "number");

const isTestRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildProvider = (
  results: { data?: unknown; error?: unknown }[],
): { provider: PagedQueryProvider; ranges: [number, number][] } => {
  const ranges: [number, number][] = [];
  const provider: PagedQueryProvider = {
    range: async (from: number, to: number) => {
      ranges.push([from, to]);
      return results[Math.min(ranges.length - 1, results.length - 1)] ?? {};
    },
  };

  return { provider, ranges };
};

const loadGuardedRows = (provider: PagedQueryProvider) =>
  loadPagedRowsWithCeiling(
    () =>
      createGuardedPagedQuery(
        provider,
        isGuardedRow,
        "tests/api/guardedPagedQueryTransport",
      ),
    {
      pageSize: 100,
      maxPageSize: 100,
      maxRows: 5000,
    },
  );

describe("guarded paged-query transport adapter", () => {
  it("parses successful payload rows through a runtime DTO guard", async () => {
    const harness = buildProvider([
      {
        data: [
          { id: "row-1", qty: 1 },
          { id: "row-2", qty: null },
        ],
      },
    ]);

    const result = await loadGuardedRows(harness.provider);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      { id: "row-1", qty: 1 },
      { id: "row-2", qty: null },
    ]);
    expect(harness.ranges).toEqual([[0, 99]]);
  });

  it("rejects malformed payload rows safely without throwing from the adapter", async () => {
    const harness = buildProvider([
      {
        data: [{ id: "row-1" }, { id: 42 }],
      },
    ]);

    const result = await loadGuardedRows(harness.provider);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(String(result.error)).toContain("row 1 failed DTO guard");
  });

  it("preserves provider errors for existing caller error semantics", async () => {
    const providerError = new Error("provider unavailable");
    const harness = buildProvider([{ data: [{ id: "ignored" }], error: providerError }]);

    const result = await loadGuardedRows(harness.provider);

    expect(result.data).toBeNull();
    expect(result.error).toBe(providerError);
  });

  it("keeps null and undefined provider payloads as empty-list reads", async () => {
    const nullPayload = await loadGuardedRows(buildProvider([{ data: null }]).provider);
    const undefinedPayload = await loadGuardedRows(buildProvider([{}]).provider);

    expect(nullPayload).toEqual({ data: [], error: null });
    expect(undefinedPayload).toEqual({ data: [], error: null });
  });

  it("rejects malformed buyer read transport rows before repository mapping", async () => {
    const provider: PagedQueryProvider = {
      range: jest.fn(async () => ({
        data: [{ request_item_id: "ok" }, { request_item_id: 42 }],
        error: null,
      })),
    };

    const query = createGuardedPagedQuery(
      provider,
      isBuyerProposalItemViewRow,
      "createBuyerProposalItemsForViewQuery",
    );
    const result = await query.range(0, 99);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(String(result.error)).toContain("row 1 failed DTO guard");
  });
});
