import fs from "node:fs";
import path from "node:path";

import {
  CACHE_READ_MODEL_CONTRACTS,
  CACHE_READ_MODEL_MAX_TTL_SECONDS,
  buildCacheReadModelError,
  callCacheReadModelDisabled,
  clampCacheTtlSeconds,
  isCacheReadModelEnabled,
} from "../../src/shared/scale/cacheReadModels";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S-50K cache read model scaffold", () => {
  it("keeps cache read models disabled unless explicit shadow config is present", () => {
    expect(isCacheReadModelEnabled({ enabled: false })).toBe(false);
    expect(isCacheReadModelEnabled({ enabled: true })).toBe(false);
    expect(isCacheReadModelEnabled({ enabled: true, shadowMode: false, baseUrl: "https://bff.example.invalid" })).toBe(false);
    expect(isCacheReadModelEnabled({ enabled: true, shadowMode: true, baseUrl: "" })).toBe(false);
    expect(isCacheReadModelEnabled({ enabled: true, shadowMode: true, baseUrl: "https://bff.example.invalid" })).toBe(true);
  });

  it("maps the top fan-out flows to contract-only read models", () => {
    const requiredModels = [
      "request.list",
      "proposal.list",
      "buyer.request.list",
      "proposal.detail",
      "director.dashboard",
      "warehouse.ledger",
      "accountant.invoice.list",
      "catalog.marketplace.list",
      "pdf.report.request",
    ];

    for (const flow of requiredModels) {
      expect(CACHE_READ_MODEL_CONTRACTS).toContainEqual(
        expect.objectContaining({
          flow,
          status: "contract_only",
          piiAllowedInCacheKey: false,
          maxPageSize: 100,
        }),
      );
    }
  });

  it("keeps list-oriented read model TTLs conservative and bounded", () => {
    expect(clampCacheTtlSeconds(undefined)).toBe(60);
    expect(clampCacheTtlSeconds(-50)).toBe(1);
    expect(clampCacheTtlSeconds(9999)).toBe(CACHE_READ_MODEL_MAX_TTL_SECONDS);

    for (const contract of CACHE_READ_MODEL_CONTRACTS) {
      expect(contract.ttlSeconds).toBeGreaterThan(0);
      expect(contract.ttlSeconds).toBeLessThanOrEqual(CACHE_READ_MODEL_MAX_TTL_SECONDS);
      expect(contract.invalidationEvents.length).toBeGreaterThan(0);
    }
  });

  it("returns a disabled envelope without network execution", () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      expect(callCacheReadModelDisabled()).toEqual({
        ok: false,
        error: {
          code: "CACHE_READ_MODEL_DISABLED",
          message: "Cache read model boundary is disabled",
        },
      });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", {
          configurable: true,
          writable: true,
          value: originalFetch,
        });
      } else {
        delete (globalThis as { fetch?: typeof fetch }).fetch;
      }
    }
  });

  it("redacts cache read model errors", () => {
    const error = buildCacheReadModelError(
      "cache leak",
      "token=secretvalue user@example.test https://files.example.invalid/a.pdf?token=signed-secret",
    );

    expect(error).toEqual({
      ok: false,
      error: {
        code: "CACHE_LEAK",
        message: "[redacted] [redacted] https://files.example.invalid/a.pdf?token=[redacted]",
      },
    });
  });

  it("does not import cache read models from active app flows", () => {
    const roots = ["app", "src"];
    const activeImports: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(PROJECT_ROOT, dir), { withFileTypes: true })) {
        const relativePath = path.join(dir, entry.name);
        if (relativePath.replace(/\\/g, "/").startsWith("src/shared/scale")) continue;
        if (entry.isDirectory()) {
          walk(relativePath);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (source.includes("shared/scale/cacheReadModels")) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
  });

  it("documents cache read models without server deployment claims", () => {
    const docs = readProjectFile("docs/architecture/50k_cache_read_models.md");

    expect(docs).toContain("Production traffic migrated: NO");
    expect(docs).toContain("Server deployed: NO");
    expect(docs).toContain("Cache read models enabled by default: NO");
    expect(docs).toContain("50K readiness claimed: NO");
  });
});
