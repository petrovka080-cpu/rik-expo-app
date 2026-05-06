import fs from "node:fs";
import path from "node:path";

import {
  BFF_FLOW_CONTRACTS,
  BFF_MAX_PAGE_SIZE,
  type BffResponseEnvelope,
} from "../../src/shared/scale/bffContracts";
import { buildBffRequestPlan, callBffContractOnly, callBffDisabled } from "../../src/shared/scale/bffClient";
import { buildBffError, isBffEnabled, normalizeBffPage, redactBffText } from "../../src/shared/scale/bffSafety";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const APPROVED_ACTIVE_BFF_IMPORTS = [
  "src/screens/director/director.finance.bff.client.ts",
  "src/screens/director/director.finance.bff.handler.ts",
  "src/screens/warehouse/warehouse.api.bff.client.ts",
  "src/screens/warehouse/warehouse.api.bff.handler.ts",
  "src/lib/catalog/catalog.bff.client.ts",
  "src/lib/catalog/catalog.bff.handler.ts",
];

describe("S-50K BFF boundary scaffold", () => {
  it("keeps BFF disabled by default and requires explicit config", () => {
    expect(isBffEnabled({ enabled: false })).toBe(false);
    expect(isBffEnabled({ enabled: true })).toBe(false);
    expect(isBffEnabled({ enabled: true, baseUrl: "" })).toBe(false);
    expect(isBffEnabled({ enabled: true, baseUrl: "https://bff.example.invalid" })).toBe(true);
  });

  it("builds a contract-only request plan without allowing network execution", () => {
    expect(buildBffRequestPlan({ enabled: false }, "request.list")).toEqual({
      flow: "request.list",
      enabled: false,
      baseUrlConfigured: false,
      networkExecutionAllowed: false,
    });
    expect(
      buildBffRequestPlan(
        { enabled: true, baseUrl: "https://bff.example.invalid" },
        "request.list",
      ),
    ).toEqual({
      flow: "request.list",
      enabled: true,
      baseUrlConfigured: true,
      networkExecutionAllowed: false,
    });
  });

  it("disabled and contract-only adapters do not call network", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      await expect(callBffDisabled()).resolves.toEqual({
        ok: false,
        error: {
          code: "BFF_DISABLED",
          message: "Server API boundary is disabled",
        },
      });
      await expect(
        callBffContractOnly({ enabled: true, baseUrl: "https://bff.example.invalid" }, "proposal.list"),
      ).resolves.toEqual({
        ok: false,
        error: {
          code: "BFF_CONTRACT_ONLY",
          message: "Server API boundary contract exists but traffic migration is disabled",
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

  it("requires pagination for list/read-heavy fan-out contracts", () => {
    const paginatedFlows = [
      "request.list",
      "proposal.list",
      "buyer.request.list",
      "warehouse.ledger",
      "accountant.invoice.list",
      "director.dashboard",
      "catalog.marketplace.list",
    ];

    for (const flow of paginatedFlows) {
      const contract = BFF_FLOW_CONTRACTS.find((entry) => entry.flow === flow);
      expect(contract).toEqual(
        expect.objectContaining({
          requiresPagination: true,
          maxPageSize: BFF_MAX_PAGE_SIZE,
          responseEnvelope: "BffResponseEnvelope",
        }),
      );
    }
  });

  it("clamps BFF page boundaries", () => {
    expect(normalizeBffPage(undefined)).toEqual({ page: 0, pageSize: 50, from: 0, to: 49 });
    expect(normalizeBffPage({ page: 2, pageSize: 500 })).toEqual({
      page: 2,
      pageSize: 100,
      from: 200,
      to: 299,
    });
    expect(normalizeBffPage({ page: -10, pageSize: -5 })).toEqual({
      page: 0,
      pageSize: 1,
      from: 0,
      to: 0,
    });
  });

  it("uses safe response envelope shapes", () => {
    const success: BffResponseEnvelope<{ rows: string[] }> = {
      ok: true,
      data: { rows: [] },
      page: normalizeBffPage({ pageSize: 25 }),
      serverTiming: { totalMs: 10, dbMs: 4, cacheHit: true },
    };
    const error: BffResponseEnvelope<never> = {
      ok: false,
      error: buildBffError("bff disabled", "payload token=secretvalue user@example.test"),
    };

    expect(success.ok).toBe(true);
    expect(success.page?.pageSize).toBe(25);
    expect(error).toEqual({
      ok: false,
      error: {
        code: "BFF_DISABLED",
        message: "payload [redacted] [redacted]",
      },
    });
  });

  it("redacts sensitive text from errors and logs", () => {
    const input = [
      "token=super_secret_token",
      "Bearer abcdefghijklmnop",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature",
      "https://files.example.invalid/doc.pdf?token=signed-secret",
      "person@example.test",
      "+996 555 123 456",
      "123 Main Street",
      "server_admin_database_key=abc123456789",
    ].join(" ");
    const redacted = redactBffText(input);

    expect(redacted).not.toContain("super_secret_token");
    expect(redacted).not.toContain("abcdefghijklmnop");
    expect(redacted).not.toContain("eyJhbGci");
    expect(redacted).not.toContain("signed-secret");
    expect(redacted).not.toContain("person@example.test");
    expect(redacted).not.toContain("+996 555 123 456");
    expect(redacted).not.toContain("123 Main Street");
    expect(redacted).not.toContain("abc123456789");
  });

  it("documents server-only env without reading it from client scaffold", () => {
    const safetySource = readProjectFile("src/shared/scale/bffSafety.ts");
    const clientSource = readProjectFile("src/shared/scale/bffClient.ts");
    const contractsSource = readProjectFile("src/shared/scale/bffContracts.ts");
    const docsSource = readProjectFile("docs/architecture/50k_server_api_boundary.md");

    expect(`${safetySource}\n${contractsSource}`).not.toContain("process.env");
    expect(clientSource).toContain("EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED");
    expect(clientSource).not.toContain("BFF_DATABASE_READONLY_URL");
    expect(clientSource).not.toContain("BFF_SERVER_AUTH_SECRET");
    expect(docsSource).toContain("BFF_SUPABASE_ADMIN_KEY");
    expect(docsSource).toContain("server-only");
  });

  it("does not place admin database credentials in the client scaffold", () => {
    const newSources = [
      "src/shared/scale/bffContracts.ts",
      "src/shared/scale/bffSafety.ts",
      "src/shared/scale/bffClient.ts",
    ].map(readProjectFile).join("\n");
    const legacyAdminKeyName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
    const legacyAdminKeyMarker = ["service", "role"].join("_");

    expect(newSources).not.toContain(legacyAdminKeyName);
    expect(newSources).not.toContain(legacyAdminKeyMarker);
  });

  it("does not import the BFF adapter from unapproved active app flows", () => {
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
        if (
          source.includes("shared/scale/bffClient") ||
          source.includes("shared/scale/bffContracts")
        ) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports.sort()).toEqual([...APPROVED_ACTIVE_BFF_IMPORTS].sort());

    const directorFinanceContractSource = readProjectFile(
      "src/screens/director/director.finance.bff.contract.ts",
    );
    const directorFinanceClientSource = readProjectFile(
      "src/screens/director/director.finance.bff.client.ts",
    );
    const directorFinanceHandlerSource = readProjectFile(
      "src/screens/director/director.finance.bff.handler.ts",
    );
    const warehouseApiContractSource = readProjectFile(
      "src/screens/warehouse/warehouse.api.bff.contract.ts",
    );
    const warehouseApiClientSource = readProjectFile(
      "src/screens/warehouse/warehouse.api.bff.client.ts",
    );
    const warehouseApiHandlerSource = readProjectFile(
      "src/screens/warehouse/warehouse.api.bff.handler.ts",
    );
    const catalogTransportContractSource = readProjectFile(
      "src/lib/catalog/catalog.bff.contract.ts",
    );
    const catalogTransportClientSource = readProjectFile(
      "src/lib/catalog/catalog.bff.client.ts",
    );
    const catalogTransportHandlerSource = readProjectFile(
      "src/lib/catalog/catalog.bff.handler.ts",
    );

    expect(directorFinanceContractSource).toContain("trafficEnabledByDefault: false");
    expect(directorFinanceContractSource).toContain("productionTrafficEnabled: false");
    expect(directorFinanceClientSource).toContain("resolveBffReadonlyRuntimeConfig");
    expect(directorFinanceClientSource).toContain("callBffReadonlyMobile");
    expect(warehouseApiContractSource).toContain("trafficEnabledByDefault: false");
    expect(warehouseApiContractSource).toContain("productionTrafficEnabled: false");
    expect(warehouseApiClientSource).toContain("resolveBffReadonlyRuntimeConfig");
    expect(warehouseApiClientSource).toContain("callBffReadonlyMobile");
    expect(catalogTransportContractSource).toContain("trafficEnabledByDefault: false");
    expect(catalogTransportContractSource).toContain("productionTrafficEnabled: false");
    expect(catalogTransportClientSource).toContain("resolveBffReadonlyRuntimeConfig");
    expect(catalogTransportClientSource).toContain("callBffReadonlyMobile");
    expect(
      [
        directorFinanceClientSource,
        directorFinanceHandlerSource,
        warehouseApiClientSource,
        warehouseApiHandlerSource,
        catalogTransportClientSource,
        catalogTransportHandlerSource,
      ].join("\n"),
    ).not.toContain(".rpc(");
    expect(
      [
        directorFinanceClientSource,
        directorFinanceHandlerSource,
        warehouseApiClientSource,
        warehouseApiHandlerSource,
        catalogTransportClientSource,
        catalogTransportHandlerSource,
      ].join("\n"),
    ).not.toContain(".from(");
  });
});
