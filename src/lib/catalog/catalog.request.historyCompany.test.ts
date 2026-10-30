import { supabase } from "../supabaseClient";
import {
  loadCatalogForemanRequestRowsByCreatedBy,
  loadCatalogForemanRequestRowsByName,
} from "./catalog.request.transport";
import { mapSummaryFromRow } from "./catalog.request.mapping";

jest.mock("../supabaseClient", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../api/_core", () => ({ loadPagedRowsWithCeiling: jest.fn() }));
jest.mock("../api/integrity.guards", () => ({ filterRequestLinkedRowsByExistingRequestLinks: jest.fn() }));

const B = "22222222-2222-2222-2222-222222222222";
const mockFrom = supabase.from as unknown as jest.Mock;
const readers = [
  ["name", () => loadCatalogForemanRequestRowsByName("Foreman", 10)],
  ["creator", () => loadCatalogForemanRequestRowsByCreatedBy("actor-A", 10)],
] as const;

// A projection-aware transport stub models a server returning only selected
// columns. Real transport and real history mapper remain under test.
function historyProjection(companyId: unknown) {
  const row: Record<string, unknown> = { id: "request-B", company_id: companyId, status: "draft", display_no: "B-7" };
  let selected: string[] = [];
  const chain = {
    ilike: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    not: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(async () => ({ data: [Object.fromEntries(Object.entries(row).filter(([key]) => selected.includes(key)))], error: null })),
  };
  const select = jest.fn((columns: string) => {
    selected = columns.split(",").map(column => column.trim());
    return chain;
  });
  mockFrom.mockReturnValue({ select });
  return { chain, select };
}

beforeEach(() => mockFrom.mockReset());

it.each(readers)("preserves company B on the actual %s history transport", async (kind, read) => {
  const { chain } = historyProjection(B);
  const response = await read();
  const summaries = response.data?.map(row => mapSummaryFromRow(row));
  expect(summaries).toEqual([expect.objectContaining({ id: "request-B", company_id: B })]);
  expect(mockFrom).toHaveBeenCalledWith("requests");
  if (kind === "name") expect(chain.ilike).toHaveBeenCalledWith("foreman_name", "Foreman");
  else expect(chain.eq).toHaveBeenCalledWith("created_by", "actor-A");
  expect(chain.not).toHaveBeenCalledWith("display_no", "is", null);
  expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  expect(chain.limit).toHaveBeenCalledWith(10);
});

it.each(readers)("retains legacy null company on %s history without assigning membership", async (_kind, read) => {
  historyProjection(null);
  const response = await read();
  expect(response.data?.map(row => mapSummaryFromRow(row))).toEqual([expect.objectContaining({ company_id: null })]);
});

it.each(readers)("rejects malformed nonnull company from %s history", async (_kind, read) => {
  historyProjection("first membership");
  const response = await read();
  expect(() => response.data?.map(row => mapSummaryFromRow(row))).toThrow("REQUEST_EXPLICIT_COMPANY_REQUIRED");
});
