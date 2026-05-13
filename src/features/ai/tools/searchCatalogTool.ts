import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  readSearchCatalogTransport,
  type SearchCatalogTransportRequest,
} from "./transport/searchCatalog.transport";
import type { AiCatalogSearchTransportItem } from "./transport/aiToolTransportTypes";
import { planAiToolUse } from "./aiToolPlanPolicy";

export const SEARCH_CATALOG_TOOL_NAME = "search_catalog" as const;
export const SEARCH_CATALOG_ROUTE_SCOPE = "marketplace.catalog.search" as const;
export const SEARCH_CATALOG_MAX_LIMIT = 20;
export const SEARCH_CATALOG_DEFAULT_LIMIT = 10;

export const SEARCH_CATALOG_CACHE_RATE_SCOPE = Object.freeze({
  route: SEARCH_CATALOG_ROUTE_SCOPE,
  cachePermanentGreenStatus: "GREEN_CACHE_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED",
  ratePermanentGreenStatus: "GREEN_RATE_LIMIT_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED",
  routeCount: 1,
  retained: true,
} as const);

export type SearchCatalogCategory = "all" | "material" | "work" | "service";

export type SearchCatalogToolInput = {
  query: string;
  category?: SearchCatalogCategory;
  location?: string;
  limit?: number;
  cursor?: string;
};

export type SearchCatalogToolItem = {
  catalog_item_id: string;
  name: string;
  unit: string;
  category: string | null;
  evidence_ref: string;
};

export type SearchCatalogToolStatus = {
  scope: typeof SEARCH_CATALOG_ROUTE_SCOPE;
  retained: true;
  route_count: 1;
};

export type SearchCatalogToolOutput = {
  items: SearchCatalogToolItem[];
  summary: string;
  next_cursor: string | null;
  evidence_refs: string[];
  cacheStatus?: SearchCatalogToolStatus;
  rateLimitStatus?: SearchCatalogToolStatus;
  bounded: true;
  route: typeof SEARCH_CATALOG_ROUTE_SCOPE;
  mutation_count: 0;
};

export type SearchCatalogToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type SearchCatalogItemsReader = (
  query: string,
  limit: number,
  apps?: string[],
) => Promise<readonly AiCatalogSearchTransportItem[]>;

export type SearchCatalogToolRequest = {
  auth: SearchCatalogToolAuthContext | null;
  input: unknown;
  searchCatalogItems?: SearchCatalogItemsReader;
};

export type SearchCatalogToolErrorCode =
  | "SEARCH_CATALOG_AUTH_REQUIRED"
  | "SEARCH_CATALOG_ROLE_NOT_ALLOWED"
  | "SEARCH_CATALOG_INVALID_INPUT"
  | "SEARCH_CATALOG_READ_FAILED";

export type SearchCatalogToolEnvelope =
  | {
      ok: true;
      data: SearchCatalogToolOutput;
    }
  | {
      ok: false;
      error: {
        code: SearchCatalogToolErrorCode;
        message: string;
      };
    };

type NormalizedSearchCatalogInput = {
  query: string;
  category: SearchCatalogCategory;
  location: string | null;
  limit: number;
  cursor: string | null;
};

type InputValidationResult =
  | { ok: true; value: NormalizedSearchCatalogInput }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeQuery(value: unknown): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return SEARCH_CATALOG_DEFAULT_LIMIT;
  return Math.max(1, Math.min(SEARCH_CATALOG_MAX_LIMIT, Math.floor(value)));
}

function isSearchCatalogCategory(value: unknown): value is SearchCatalogCategory {
  return value === "all" || value === "material" || value === "work" || value === "service";
}

function normalizeCategory(value: unknown): SearchCatalogCategory {
  return isSearchCatalogCategory(value) ? value : "all";
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "search_catalog input must be an object" };
  }

  const query = normalizeQuery(input.query);
  if (!query) {
    return { ok: false, message: "search_catalog query is required" };
  }

  return {
    ok: true,
    value: {
      query,
      category: normalizeCategory(input.category),
      location: normalizeOptionalText(input.location),
      limit: normalizeLimit(input.limit),
      cursor: normalizeOptionalText(input.cursor),
    },
  };
}

function toCatalogSearchApps(category: SearchCatalogCategory): string[] | undefined {
  if (category === "all") return undefined;
  return [category];
}

function normalizeCatalogItemText(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeOptionalText(value);
  return normalized ?? fallback;
}

function buildEvidenceRef(index: number): string {
  return `catalog:${SEARCH_CATALOG_ROUTE_SCOPE}:item:${index + 1}`;
}

function toToolItem(item: AiCatalogSearchTransportItem, index: number): SearchCatalogToolItem {
  const evidenceRef = buildEvidenceRef(index);
  const catalogItemId = normalizeCatalogItemText(item.code, `catalog-item-${index + 1}`);
  return {
    catalog_item_id: catalogItemId,
    name: normalizeCatalogItemText(item.name, catalogItemId),
    unit: normalizeCatalogItemText(item.uom, "unknown"),
    category: normalizeOptionalText(item.kind),
    evidence_ref: evidenceRef,
  };
}

async function defaultSearchCatalogItems(
  query: string,
  limit: number,
  apps?: string[],
): Promise<readonly AiCatalogSearchTransportItem[]> {
  const request: SearchCatalogTransportRequest = { query, limit, apps };
  return readSearchCatalogTransport(request);
}

function buildStatus(): SearchCatalogToolStatus {
  return {
    scope: SEARCH_CATALOG_ROUTE_SCOPE,
    retained: true,
    route_count: 1,
  };
}

function buildSummary(params: {
  itemCount: number;
  category: SearchCatalogCategory;
  location: string | null;
}): string {
  const categoryText = params.category === "all" ? "all categories" : params.category;
  const locationText = params.location ? " with location context" : "";
  return `Found ${params.itemCount} catalog item(s) in ${categoryText}${locationText}.`;
}

function isAuthenticated(auth: SearchCatalogToolAuthContext | null): auth is SearchCatalogToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

export async function runSearchCatalogToolSafeRead(
  request: SearchCatalogToolRequest,
): Promise<SearchCatalogToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "SEARCH_CATALOG_AUTH_REQUIRED",
        message: "search_catalog requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: SEARCH_CATALOG_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "read_contract_plan") {
    return {
      ok: false,
      error: {
        code: "SEARCH_CATALOG_ROLE_NOT_ALLOWED",
        message: "search_catalog is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "SEARCH_CATALOG_INVALID_INPUT",
        message: input.message,
      },
    };
  }

  try {
    const readCatalog = request.searchCatalogItems ?? defaultSearchCatalogItems;
    const rows = await readCatalog(
      input.value.query,
      input.value.limit,
      toCatalogSearchApps(input.value.category),
    );
    const items = rows.slice(0, input.value.limit).map(toToolItem);
    const evidenceRefs = items.map((item) => item.evidence_ref);
    const status = buildStatus();

    return {
      ok: true,
      data: {
        items,
        summary: buildSummary({
          itemCount: items.length,
          category: input.value.category,
          location: input.value.location,
        }),
        next_cursor: null,
        evidence_refs: evidenceRefs,
        cacheStatus: status,
        rateLimitStatus: status,
        bounded: true,
        route: SEARCH_CATALOG_ROUTE_SCOPE,
        mutation_count: 0,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "SEARCH_CATALOG_READ_FAILED",
        message: error instanceof Error ? error.message : "search_catalog read failed",
      },
    };
  }
}
