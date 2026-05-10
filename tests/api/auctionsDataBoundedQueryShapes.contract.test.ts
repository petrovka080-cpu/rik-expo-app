import fs from "node:fs";
import path from "node:path";

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

const sliceBetween = (source: string, startNeedle: string, endNeedle: string): string => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe("auctions.data bounded query shapes", () => {
  const sourcePath = "src/features/auctions/auctions.data.ts";

  it("classifies every select call into bounded list, detail, and tender-item shapes", () => {
    const source = readSource(sourcePath);
    const selectCalls = source.match(/\.select\(/g) ?? [];

    expect(selectCalls).toHaveLength(6);
    expect(source).not.toContain('.select("*")');
    expect(source).not.toContain(".select('*')");
    expect(source).toContain("const TENDER_ROW_SELECT");
    expect(source).toContain("const TENDER_ITEM_ROW_SELECT");
    expect(source).toContain("const AUCTION_ROW_SELECT");
  });

  it("keeps list reads limited with stable ordering", () => {
    const source = readSource(sourcePath);
    const listScope = sliceBetween(
      source,
      "export async function loadAuctionSummaries",
      "export async function loadAuctionDetail",
    );

    expect(listScope).toContain(".from(\"tenders\")");
    expect(listScope).toContain(".select(TENDER_ROW_SELECT)");
    expect(listScope).toContain(".order(\"created_at\", { ascending: false })");
    expect(listScope).toContain(".order(\"id\", { ascending: false })");
    expect(listScope).toContain(".limit(AUCTION_LIST_PAGE_SIZE)");
    expect(listScope).toContain(".from(\"auctions\")");
    expect(listScope).toContain(".select(AUCTION_ROW_SELECT)");
  });

  it("keeps tender item reads tender-scoped behind explicit ceilings", () => {
    const source = readSource(sourcePath);

    expect(source).toContain("AUCTION_CHILD_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }");
    expect(source).toContain("AUCTION_TENDER_ITEM_TENDER_ID_MAX = AUCTION_LIST_PAGE_SIZE");
    expect(source).toContain("normalizeAuctionTenderIds(tenders.map((row) => row.id))");
    expect(source).toContain("loadPagedRowsWithCeiling(queryFactory, AUCTION_CHILD_LIST_PAGE_DEFAULTS)");
    expect(source).toContain(".in(\"tender_id\", tenderIds)");
    expect(source).toContain(".eq(\"tender_id\", id)");
    expect(source).toContain(".order(\"tender_id\", { ascending: true })");
    expect(source).toContain(".order(\"created_at\", { ascending: true })");
    expect(source).toContain(".order(\"id\", { ascending: true })");
  });

  it("keeps detail reads single-scope", () => {
    const source = readSource(sourcePath);
    const detailScope = sliceBetween(
      source,
      "export async function loadAuctionDetail",
      "export function buildAuctionAssistantPrompt",
    );

    expect(detailScope).toContain(".from(\"tenders\")");
    expect(detailScope).toContain(".select(TENDER_ROW_SELECT)");
    expect(detailScope).toContain(".eq(\"id\", id)");
    expect(detailScope).toContain(".maybeSingle()");
    expect(detailScope).toContain(".from(\"auctions\")");
    expect(detailScope).toContain(".select(AUCTION_ROW_SELECT)");
  });
});
