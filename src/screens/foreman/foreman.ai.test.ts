import {
  FOREMAN_AI_CATALOG_RESOLVE_ITEM_LIMIT,
  parseForemanAiResponse,
  resolveForemanParsedItemsForTesting,
  resolveForemanQuickLocalAssist,
  scoreCatalogCandidate,
  type ForemanAiQuickItem,
  type ParsedForemanAiItem,
  type RikCatalogItem,
} from "./foreman.ai";
import {
  resolveCatalogPackagingViaRpc,
  resolveCatalogSynonymMatchViaRpc,
} from "../../lib/api/foremanAiResolve.service";
import { rikQuickSearch } from "../../lib/catalog_api";

const mockRecordPlatformObservability = jest.fn();

jest.mock("../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

jest.mock("../../lib/ai/aiRepository", () => ({
  isAiBackendAvailable: jest.fn(() => true),
  requestAiGeneratedText: jest.fn(),
}));

jest.mock("../../lib/api/foremanAiResolve.service", () => ({
  resolveCatalogPackagingViaRpc: jest.fn(),
  resolveCatalogSynonymMatchViaRpc: jest.fn(),
}));

jest.mock("../../lib/catalog_api", () => ({
  rikQuickSearch: jest.fn(),
}));

const mockResolveCatalogPackagingViaRpc = resolveCatalogPackagingViaRpc as jest.Mock;
const mockResolveCatalogSynonymMatchViaRpc = resolveCatalogSynonymMatchViaRpc as jest.Mock;
const mockRikQuickSearch = rikQuickSearch as jest.Mock;

const makeParsedItem = (overrides?: Partial<ParsedForemanAiItem>): ParsedForemanAiItem => ({
  name: "Cement M500",
  qty: 2,
  unit: "\u043a\u0433",
  kind: "material",
  specs: "25kg",
  ...overrides,
});

const makeCatalogItem = (overrides?: Partial<RikCatalogItem>): RikCatalogItem => ({
  rik_code: "MAT-1",
  name_human: "Cement M500 25kg",
  uom_code: "\u043a\u0433",
  kind: "material",
  ...overrides,
} as RikCatalogItem);

describe("foreman.ai contract hardening", () => {
  beforeEach(() => {
    mockRecordPlatformObservability.mockReset();
    mockResolveCatalogPackagingViaRpc.mockReset().mockResolvedValue(null);
    mockResolveCatalogSynonymMatchViaRpc.mockReset().mockResolvedValue(null);
    mockRikQuickSearch.mockReset();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});
  });

  it("parses valid JSON even when noisy text surrounds the payload", () => {
    const parsed = parseForemanAiResponse(
      'noise {"action":"create_request","items":[{"name":"cement m500","qty":2,"unit":"kg","kind":"material","specs":"25kg"}],"message":"done"} trailing',
    );

    expect(parsed.action).toBe("create_request");
    expect(parsed.items).toEqual([
      expect.objectContaining({
        name: "Cement m500",
        qty: 2,
        unit: "\u043a\u0433",
        kind: "material",
        specs: "25kg",
      }),
    ]);
  });

  it("degrades to clarify without throwing when payload items are missing required fields", () => {
    const parsed = parseForemanAiResponse(
      '{"action":"create_request","items":[{"name":"cement only","qty":0,"unit":"kg","kind":"material"}],"message":""}',
    );

    expect(parsed.action).toBe("clarify");
    expect(parsed.items).toEqual([]);
    expect(parsed.message).toBeTruthy();
  });

  it("throws on malformed JSON and records observability once", () => {
    expect(() => parseForemanAiResponse("not-json-at-all")).toThrow();
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "ai",
        surface: "foreman_quick_request",
        event: "ai_response_json_parse_failed",
        result: "error",
      }),
    );
  });

  it("keeps exact catalog matches ranked above fuzzy matches", () => {
    const input = makeParsedItem({ name: "Cement M500" });
    const exact = makeCatalogItem({ rik_code: "MAT-EXACT", name_human: "Cement M500" });
    const weak = makeCatalogItem({ rik_code: "MAT-WEAK", name_human: "Cement" });

    expect(scoreCatalogCandidate(input, exact)).toBeGreaterThan(scoreCatalogCandidate(input, weak));
  });

  it("applies deterministic penalties for incompatible kind and incompatible units", () => {
    const input = makeParsedItem({ unit: "\u043c", kind: "material" });
    const wrongKind = makeCatalogItem({ kind: "service", uom_code: "\u043c" });
    const wrongUnit = makeCatalogItem({ kind: "material", uom_code: "\u043a\u0433" });

    expect(scoreCatalogCandidate(input, wrongKind)).toBe(-1000);
    expect(scoreCatalogCandidate(input, wrongUnit)).toBe(-100);
  });

  it("keeps packaging-like requests in the scoring path instead of hard unit rejection", () => {
    const input = makeParsedItem({ unit: "\u043a\u043e\u0440\u043e\u0431\u043a\u0430" });
    const candidate = makeCatalogItem({ uom_code: "\u0448\u0442" });

    expect(scoreCatalogCandidate(input, candidate)).toBeGreaterThan(-100);
  });

  it("returns stable offline degraded output without remote assist", () => {
    const result = resolveForemanQuickLocalAssist({
      prompt: "cement m500",
      networkOnline: false,
      lastResolvedItems: [],
    });

    expect(result).toEqual({
      type: "ai_unavailable",
      reason: "offline_degraded_mode",
      message: expect.any(String),
    });
  });

  it("reuses the last resolved item for reference-repeat prompts", () => {
    const lastResolvedItems: ForemanAiQuickItem[] = [
      {
        rik_code: "MAT-42",
        name: "Cement M500",
        qty: 2,
        unit: "\u043a\u0433",
        kind: "material",
        specs: null,
      },
    ];

    const result = resolveForemanQuickLocalAssist({
      prompt: "\u0435\u0449\u0435 5 \u0442\u0430\u043a\u0438\u0445 \u0436\u0435",
      lastResolvedItems,
      networkOnline: true,
    });

    expect(result).toEqual({
      type: "resolved_items",
      items: [
        expect.objectContaining({
          rik_code: "MAT-42",
          qty: 5,
        }),
      ],
      message: expect.any(String),
    });
  });

  it("returns clarify output instead of undefined when reference context is missing", () => {
    const result = resolveForemanQuickLocalAssist({
      prompt: "\u0435\u0449\u0435 \u0442\u0430\u043a\u0438\u0445 \u0436\u0435",
      lastResolvedItems: [],
      networkOnline: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        type: "clarify_required",
        questions: expect.any(Array),
        message: expect.any(String),
      }),
    );
  });

  it("dedupes repeated parsed items before catalog resolution while preserving output count", async () => {
    mockRikQuickSearch.mockResolvedValue([
      makeCatalogItem({
        rik_code: "MAT-CEMENT",
        name_human: "Cement M500",
      }),
    ]);

    const result = await resolveForemanParsedItemsForTesting({
      items: Array.from({ length: 8 }, () =>
        makeParsedItem({
          name: "Cement M500",
          specs: null,
        }),
      ),
    });

    expect(result.type).toBe("resolved_items");
    if (result.type === "resolved_items") {
      expect(result.items).toHaveLength(8);
      expect(result.items.every((item) => item.rik_code === "MAT-CEMENT")).toBe(true);
    }
    expect(mockResolveCatalogSynonymMatchViaRpc).toHaveBeenCalledTimes(1);
    expect(mockRikQuickSearch).toHaveBeenCalledTimes(1);
  });

  it("caps unique catalog resolution work for oversized AI item batches", async () => {
    mockRikQuickSearch.mockImplementation(async (query: unknown) => [
      makeCatalogItem({
        rik_code: `MAT-${String(query).replace(/\s+/g, "-")}`,
        name_human: String(query),
      }),
    ]);

    const result = await resolveForemanParsedItemsForTesting({
      items: Array.from({ length: FOREMAN_AI_CATALOG_RESOLVE_ITEM_LIMIT + 3 }, (_, index) =>
        makeParsedItem({
          name: `Unique material ${index + 1}`,
          specs: null,
        }),
      ),
    });

    expect(mockResolveCatalogSynonymMatchViaRpc).toHaveBeenCalledTimes(FOREMAN_AI_CATALOG_RESOLVE_ITEM_LIMIT);
    expect(mockRikQuickSearch).toHaveBeenCalledTimes(FOREMAN_AI_CATALOG_RESOLVE_ITEM_LIMIT);
    expect(result).toEqual(
      expect.objectContaining({
        type: "clarify_required",
        partialFailure: true,
      }),
    );
    if ("resolvedItems" in result) {
      expect(result.resolvedItems).toHaveLength(FOREMAN_AI_CATALOG_RESOLVE_ITEM_LIMIT);
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
