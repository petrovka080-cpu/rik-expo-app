import fs from "node:fs";
import path from "node:path";

import { buildBffRequestPlan } from "../../src/shared/scale/bffClient";
import type { BffReadPorts } from "../../src/shared/scale/bffReadPorts";
import type { BffReadOperation } from "../../src/shared/scale/bffReadHandlers";
import { createBffShadowFixturePorts } from "../../src/shared/scale/bffShadowFixtures";
import {
  BFF_STAGING_READ_ROUTES,
  handleBffStagingServerRequest,
} from "../../scripts/server/stagingBffServerBoundary";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

type ParityCheck = "status" | "rows" | "meta" | "ordering" | "error_envelope";

type ClientReadPath = {
  operation: BffReadOperation;
  clientPath: string;
  clientFunction: string;
  sourceKind: string;
  sourceMarker: string;
  expectedOrdering: string;
  sampleFilters: Record<string, unknown>;
};

const PARITY_CHECKS: readonly ParityCheck[] = [
  "status",
  "rows",
  "meta",
  "ordering",
  "error_envelope",
];

const CURRENT_CLIENT_READ_PATHS: readonly ClientReadPath[] = [
  {
    operation: "request.proposal.list",
    clientPath: "src/lib/api/proposals.ts",
    clientFunction: "listDirectorProposalsPending",
    sourceKind: "table:proposals",
    sourceMarker: ".from(\"proposals\")",
    expectedOrdering: "submitted_at desc, id desc",
    sampleFilters: { status: "submitted", scope: "present_redacted" },
  },
  {
    operation: "marketplace.catalog.search",
    clientPath: "src/features/market/market.repository.ts",
    clientFunction: "loadMarketHomePage",
    sourceKind: "rpc:marketplace_items_scope_page_v1",
    sourceMarker: "marketplace_items_scope_page_v1",
    expectedOrdering: "backend marketplace scope ordering",
    sampleFilters: { side: "offer", kind: "material", scope: "present_redacted" },
  },
  {
    operation: "warehouse.ledger.list",
    clientPath: "src/screens/warehouse/warehouse.api.repo.ts",
    clientFunction: "fetchWarehouseIncomingLedgerRows",
    sourceKind: "bff-aware-table:wh_ledger",
    sourceMarker: "warehouse.api.ledger.incoming",
    expectedOrdering: "moved_at asc, code asc",
    sampleFilters: { kind: "incoming", scope: "present_redacted" },
  },
  {
    operation: "accountant.invoice.list",
    clientPath: "src/lib/api/accountant.ts",
    clientFunction: "listAccountantInbox",
    sourceKind: "rpc:list_accountant_inbox_fact",
    sourceMarker: "list_accountant_inbox_fact",
    expectedOrdering: "backend accountant inbox fact ordering",
    sampleFilters: { status: "payable", tab: "payable", scope: "present_redacted" },
  },
  {
    operation: "director.pending.list",
    clientPath: "src/lib/api/director.ts",
    clientFunction: "listPending",
    sourceKind: "rpc:list_pending_foreman_items",
    sourceMarker: "list_pending_foreman_items",
    expectedOrdering: "backend/director fallback id ordering",
    sampleFilters: { status: "pending", tab: "pending", scope: "present_redacted" },
  },
];

const EXPECTED_ERROR_CODES: Record<BffReadOperation, string> = {
  "request.proposal.list": "BFF_REQUEST_PROPOSAL_LIST_ERROR",
  "marketplace.catalog.search": "BFF_MARKETPLACE_CATALOG_SEARCH_ERROR",
  "warehouse.ledger.list": "BFF_WAREHOUSE_LEDGER_LIST_ERROR",
  "accountant.invoice.list": "BFF_ACCOUNTANT_INVOICE_LIST_ERROR",
  "director.pending.list": "BFF_DIRECTOR_PENDING_LIST_ERROR",
};

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const routeByOperation = (operation: BffReadOperation) =>
  BFF_STAGING_READ_ROUTES.find((route) => route.operation === operation);

const createFailingReadPorts = (): BffReadPorts => ({
  requestProposal: {
    async listRequestProposals() {
      throw new Error("client parity failure token=unsafe-value user@example.test");
    },
  },
  marketplaceCatalog: {
    async searchCatalog() {
      throw new Error("client parity failure token=unsafe-value user@example.test");
    },
  },
  warehouseLedger: {
    async listWarehouseLedger() {
      throw new Error("client parity failure token=unsafe-value user@example.test");
    },
  },
  accountantInvoice: {
    async listAccountantInvoices() {
      throw new Error("client parity failure token=unsafe-value user@example.test");
    },
  },
  directorPending: {
    async listDirectorPending() {
      throw new Error("client parity failure token=unsafe-value user@example.test");
    },
  },
});

describe("S-BFF-SHADOW-PARITY-PREFLIGHT-1", () => {
  it("maps current client read paths to matching BFF shadow endpoints and parity checks", () => {
    expect(CURRENT_CLIENT_READ_PATHS).toHaveLength(5);
    expect(new Set(CURRENT_CLIENT_READ_PATHS.map((entry) => entry.operation)).size).toBe(5);

    for (const mapping of CURRENT_CLIENT_READ_PATHS) {
      const source = readProjectFile(mapping.clientPath);
      const route = routeByOperation(mapping.operation);

      expect(source).toContain(mapping.clientFunction);
      expect(source).toContain(mapping.sourceMarker);
      expect(route).toEqual(
        expect.objectContaining({
          kind: "read",
          method: "POST",
          enabledByDefault: true,
        }),
      );
      expect(route?.path).toMatch(/^\/api\/staging-bff\/read\//);
      expect(PARITY_CHECKS).toEqual([
        "status",
        "rows",
        "meta",
        "ordering",
        "error_envelope",
      ]);
      expect(mapping.expectedOrdering).toBeTruthy();
    }
  });

  it("runs fixture-only BFF read shadow requests without live URL, fetch, or routing", async () => {
    const fixturePorts = createBffShadowFixturePorts();
    const originalFetch = globalThis.fetch;
    const fetchSpy = jest.fn(() => {
      throw new Error("network is forbidden in BFF shadow parity preflight");
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchSpy;

    try {
      for (const mapping of CURRENT_CLIENT_READ_PATHS) {
        const route = routeByOperation(mapping.operation);
        expect(route).toBeDefined();

        const response = await handleBffStagingServerRequest(
          {
            method: "POST",
            path: route?.path ?? "",
            body: {
              input: {
                page: -1,
                pageSize: 250,
                query: "fixture query token=unsafe-value user@example.test",
                filters: mapping.sampleFilters,
                context: {
                  actorRole: "unknown",
                  companyScope: "present_redacted",
                  requestIdScope: "present_redacted",
                },
              },
            },
          },
          { readPorts: fixturePorts.read },
        );

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        if (response.body.ok) {
          const body = response.body as unknown as {
            data: unknown;
            page: { page: number; pageSize: number; from: number; to: number };
            metadata: {
              operation: BffReadOperation;
              readOnly: true;
              requiresPagination: true;
              maxPageSize: 100;
              enabledInAppRuntime: false;
              wiredToAppRuntime: false;
              callsSupabaseDirectly: false;
            };
          };
          expect(Array.isArray(body.data)).toBe(true);
          expect(body.page).toEqual({ page: 0, pageSize: 100, from: 0, to: 99 });
          expect(body.metadata).toEqual(
            expect.objectContaining({
              operation: mapping.operation,
              readOnly: true,
              requiresPagination: true,
              maxPageSize: 100,
              enabledInAppRuntime: false,
              wiredToAppRuntime: false,
              callsSupabaseDirectly: false,
            }),
          );
        }

        const output = JSON.stringify(response);
        expect(output).not.toContain("unsafe-value");
        expect(output).not.toContain("user@example.test");
      }

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(fixturePorts.calls.map((call) => call.flow)).toEqual(
        CURRENT_CLIENT_READ_PATHS.map((entry) => entry.operation),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("defines read-route error envelope parity without raw error leakage", async () => {
    const failingPorts = createFailingReadPorts();

    for (const mapping of CURRENT_CLIENT_READ_PATHS) {
      const route = routeByOperation(mapping.operation);
      expect(route).toBeDefined();

      const response = await handleBffStagingServerRequest(
        {
          method: "POST",
          path: route?.path ?? "",
          body: { input: { page: 0, pageSize: 25, filters: mapping.sampleFilters } },
        },
        { readPorts: failingPorts },
      );

      expect(response.status).toBe(500);
      expect(response.body.ok).toBe(false);
      if (!response.body.ok) {
        expect(response.body.error).toEqual({
          code: EXPECTED_ERROR_CODES[mapping.operation],
          message: expect.any(String),
        });
      }

      const output = JSON.stringify(response);
      expect(output).not.toContain("unsafe-value");
      expect(output).not.toContain("user@example.test");
    }
  });

  it("keeps BFF client plan contract-only and not routed to live traffic", () => {
    expect(buildBffRequestPlan({ enabled: false }, "proposal.list")).toEqual(
      expect.objectContaining({
        enabled: false,
        baseUrlConfigured: false,
        networkExecutionAllowed: false,
      }),
    );
    expect(buildBffRequestPlan({ enabled: true, baseUrl: "https://bff.example.invalid" }, "proposal.list")).toEqual(
      expect.objectContaining({
        enabled: true,
        baseUrlConfigured: true,
        networkExecutionAllowed: false,
      }),
    );
  });
});
