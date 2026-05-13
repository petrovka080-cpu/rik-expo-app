import fs from "fs";
import path from "path";

import {
  SEARCH_CATALOG_CACHE_RATE_SCOPE,
  SEARCH_CATALOG_MAX_LIMIT,
  SEARCH_CATALOG_ROUTE_SCOPE,
  runSearchCatalogToolSafeRead,
} from "../../src/features/ai/tools/searchCatalogTool";
import { searchCatalogInputSchema, searchCatalogOutputSchema } from "../../src/features/ai/schemas/aiToolSchemas";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/searchCatalogTool.ts");

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const contractorAuth = { userId: "contractor-user", role: "contractor" } as const;

function readJson(relativePath: string): Record<string, unknown> {
  const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Expected object JSON at ${relativePath}`);
  }
  return parsed;
}

describe("search_catalog safe-read tool", () => {
  it("keeps the permanent tool schema on query/category/location/limit/cursor and redacted evidence output", () => {
    expect(searchCatalogInputSchema).toMatchObject({
      required: ["query"],
      additionalProperties: false,
      properties: {
        query: expect.objectContaining({ type: "string", minLength: 1 }),
        category: expect.objectContaining({ enum: ["all", "material", "work", "service"] }),
        location: expect.objectContaining({ type: "string", minLength: 1 }),
        limit: expect.objectContaining({ type: "number", maximum: SEARCH_CATALOG_MAX_LIMIT }),
        cursor: expect.objectContaining({ type: "string", minLength: 1 }),
      },
    });
    expect(searchCatalogOutputSchema).toMatchObject({
      required: ["items", "summary", "next_cursor", "evidence_refs"],
      additionalProperties: false,
      properties: {
        items: expect.objectContaining({ type: "array" }),
        summary: expect.objectContaining({ type: "string", minLength: 1 }),
        next_cursor: expect.objectContaining({ type: "string" }),
        evidence_refs: expect.objectContaining({ type: "array" }),
        cacheStatus: expect.objectContaining({ type: "object" }),
        rateLimitStatus: expect.objectContaining({ type: "object" }),
      },
    });
  });

  it("runs only as a buyer-visible SAFE_READ with bounded marketplace catalog transport input", async () => {
    const calls: { query: string; limit: number; apps?: string[] }[] = [];
    const result = await runSearchCatalogToolSafeRead({
      auth: buyerAuth,
      input: {
        query: "  цемент   м500 ",
        category: "material",
        location: "Бишкек",
        limit: 99,
        cursor: "page-2",
      },
      searchCatalogItems: async (query, limit, apps) => {
        calls.push({ query, limit, apps });
        return [
          { code: "CEM-500", name: "Цемент М500", uom: "меш", kind: "material" },
          { code: "CEM-400", name: "Цемент М400", uom: "меш", kind: "material" },
        ];
      },
    });

    expect(calls).toEqual([
      {
        query: "цемент м500",
        limit: SEARCH_CATALOG_MAX_LIMIT,
        apps: ["material"],
      },
    ]);
    expect(result).toMatchObject({
      ok: true,
      data: {
        bounded: true,
        route: SEARCH_CATALOG_ROUTE_SCOPE,
        mutation_count: 0,
        summary: "Found 2 catalog item(s) in material with location context.",
        next_cursor: null,
        evidence_refs: [
          "catalog:marketplace.catalog.search:item:1",
          "catalog:marketplace.catalog.search:item:2",
        ],
        cacheStatus: {
          scope: SEARCH_CATALOG_ROUTE_SCOPE,
          retained: true,
          route_count: 1,
        },
        rateLimitStatus: {
          scope: SEARCH_CATALOG_ROUTE_SCOPE,
          retained: true,
          route_count: 1,
        },
      },
    });
    if (!result.ok) throw new Error("expected search_catalog success");
    expect(result.data.items).toEqual([
      {
        catalog_item_id: "CEM-500",
        name: "Цемент М500",
        unit: "меш",
        category: "material",
        evidence_ref: "catalog:marketplace.catalog.search:item:1",
      },
      {
        catalog_item_id: "CEM-400",
        name: "Цемент М400",
        unit: "меш",
        category: "material",
        evidence_ref: "catalog:marketplace.catalog.search:item:2",
      },
    ]);
  });

  it("requires auth, role visibility, and valid query before any read", async () => {
    const reads: string[] = [];
    const searchCatalogItems = async () => {
      reads.push("read");
      return [];
    };

    await expect(
      runSearchCatalogToolSafeRead({
        auth: null,
        input: { query: "бетон" },
        searchCatalogItems,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "SEARCH_CATALOG_AUTH_REQUIRED" },
    });
    await expect(
      runSearchCatalogToolSafeRead({
        auth: contractorAuth,
        input: { query: "бетон" },
        searchCatalogItems,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "SEARCH_CATALOG_ROLE_NOT_ALLOWED" },
    });
    await expect(
      runSearchCatalogToolSafeRead({
        auth: buyerAuth,
        input: { query: " " },
        searchCatalogItems,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "SEARCH_CATALOG_INVALID_INPUT" },
    });
    expect(reads).toEqual([]);
  });

  it("uses the AI catalog transport boundary and has no direct database or mutation surface", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain('transport/searchCatalog.transport"');
    expect(source).not.toContain('catalog.search.service"');
    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/create_order|confirm_supplier|change_warehouse_status|change_payment_status/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });

  it("keeps W03/W04 one-route cache and rate proofs attached to marketplace.catalog.search", () => {
    const cacheMatrix = readJson("artifacts/S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_matrix.json");
    const rateMatrix = readJson("artifacts/S_RATE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_matrix.json");

    expect(SEARCH_CATALOG_CACHE_RATE_SCOPE).toEqual({
      route: SEARCH_CATALOG_ROUTE_SCOPE,
      cachePermanentGreenStatus: "GREEN_CACHE_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED",
      ratePermanentGreenStatus: "GREEN_RATE_LIMIT_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED",
      routeCount: 1,
      retained: true,
    });
    expect(cacheMatrix.final_status).toBe(SEARCH_CATALOG_CACHE_RATE_SCOPE.cachePermanentGreenStatus);
    expect(cacheMatrix.route_count).toBe(1);
    expect(cacheMatrix.retained).toBe(true);
    expect(rateMatrix.final_status).toBe(SEARCH_CATALOG_CACHE_RATE_SCOPE.ratePermanentGreenStatus);
    expect(rateMatrix.route_count).toBe(1);
    expect(rateMatrix.retained).toBe(true);
  });
});
