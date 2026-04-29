import fs from "node:fs";
import path from "node:path";

import {
  BFF_READ_HANDLER_OPERATIONS,
  getBffReadHandlerMetadata,
  handleAccountantInvoiceList,
  handleDirectorPendingList,
  handleMarketplaceCatalogSearch,
  handleRequestProposalList,
  handleWarehouseLedgerList,
  normalizeBffReadFilters,
  sanitizeBffSearchQuery,
} from "../../src/shared/scale/bffReadHandlers";
import type { BffReadPorts } from "../../src/shared/scale/bffReadPorts";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const createPorts = (): BffReadPorts => ({
  requestProposal: {
    listRequestProposals: jest.fn(async () => [{ row: "request-proposal" }]),
  },
  marketplaceCatalog: {
    searchCatalog: jest.fn(async () => [{ row: "catalog" }]),
  },
  warehouseLedger: {
    listWarehouseLedger: jest.fn(async () => [{ row: "warehouse" }]),
  },
  accountantInvoice: {
    listAccountantInvoices: jest.fn(async () => [{ row: "accountant" }]),
  },
  directorPending: {
    listDirectorPending: jest.fn(async () => [{ row: "director" }]),
  },
});

describe("S-50K-BFF-READ-1 read-only BFF handlers", () => {
  it("defines five disabled read-only handler operations", () => {
    expect(BFF_READ_HANDLER_OPERATIONS).toEqual([
      "request.proposal.list",
      "marketplace.catalog.search",
      "warehouse.ledger.list",
      "accountant.invoice.list",
      "director.pending.list",
    ]);

    for (const operation of BFF_READ_HANDLER_OPERATIONS) {
      expect(getBffReadHandlerMetadata(operation)).toEqual(
        expect.objectContaining({
          operation,
          readOnly: true,
          requiresPagination: true,
          maxPageSize: 100,
          rateLimitBucket: "read_heavy",
          enabledInAppRuntime: false,
          wiredToAppRuntime: false,
          callsSupabaseDirectly: false,
        }),
      );
    }
  });

  it("request/proposal handler clamps pagination and returns a safe success envelope", async () => {
    const ports = createPorts();
    const result = await handleRequestProposalList(ports, {
      page: -10,
      pageSize: 500,
      filters: {
        status: "pending",
        unsafe: "ignored",
      },
    });

    expect(ports.requestProposal.listRequestProposals).toHaveBeenCalledWith({
      page: 0,
      pageSize: 100,
      filters: { status: "pending" },
      context: undefined,
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: [{ row: "request-proposal" }],
        page: { page: 0, pageSize: 100, from: 0, to: 99 },
        serverTiming: { cacheHit: false },
      }),
    );
    expect(result.ok && result.metadata.cacheCandidate).toBe(true);
  });

  it("marketplace/catalog search truncates and redacts raw search input", async () => {
    const ports = createPorts();
    const raw = `  email@example.test token=secretvalue ${"cement ".repeat(40)}\n`;
    const result = await handleMarketplaceCatalogSearch(ports, {
      query: raw,
      page: 2,
      pageSize: 25,
      filters: {
        category: "materials",
        nested: { rejected: true },
      },
    });

    expect(ports.marketplaceCatalog.searchCatalog).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      query: expect.any(String),
      filters: { category: "materials" },
      context: undefined,
    });
    const call = (ports.marketplaceCatalog.searchCatalog as jest.Mock).mock.calls[0][0];
    expect(call.query.length).toBeLessThanOrEqual(80);
    expect(call.query).not.toContain("email@example.test");
    expect(call.query).not.toContain("secretvalue");
    expect(result.ok).toBe(true);
  });

  it("warehouse, accountant, and director handlers are read-only port calls", async () => {
    const ports = createPorts();

    await expect(handleWarehouseLedgerList(ports, { pageSize: 10 })).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(handleAccountantInvoiceList(ports, { pageSize: 10 })).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(handleDirectorPendingList(ports, { pageSize: 10 })).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );

    expect(ports.warehouseLedger.listWarehouseLedger).toHaveBeenCalledWith({
      page: 0,
      pageSize: 10,
      filters: undefined,
      context: undefined,
    });
    expect(ports.accountantInvoice.listAccountantInvoices).toHaveBeenCalledWith({
      page: 0,
      pageSize: 10,
      filters: undefined,
      context: undefined,
    });
    expect(ports.directorPending.listDirectorPending).toHaveBeenCalledWith({
      page: 0,
      pageSize: 10,
      filters: undefined,
      context: undefined,
    });
  });

  it("returns generic safe envelopes on port failure without PII or raw errors", async () => {
    const ports = createPorts();
    (ports.accountantInvoice.listAccountantInvoices as jest.Mock).mockRejectedValueOnce(
      new Error("person@example.test paid 100000 token=secretvalue https://files.example/a.pdf?token=signed"),
    );

    const result = await handleAccountantInvoiceList(ports, { pageSize: 100 });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "BFF_ACCOUNTANT_INVOICE_LIST_ERROR",
        message: "Unable to load accountant invoices",
      },
      metadata: expect.objectContaining({
        operation: "accountant.invoice.list",
        readOnly: true,
      }),
    });
    expect(JSON.stringify(result)).not.toContain("person@example.test");
    expect(JSON.stringify(result)).not.toContain("secretvalue");
    expect(JSON.stringify(result)).not.toContain("signed");
  });

  it("filters are passed only through safe allowlisted shapes", () => {
    expect(
      normalizeBffReadFilters(
        {
          status: "open",
          from: "jan-start",
          token: "secretvalue",
          unsafeObject: { raw: true },
          email: "person@example.test",
          page: 5,
          active: true,
          empty: "",
        },
        ["status", "from", "page", "active", "empty"],
      ),
    ).toEqual({
      status: "open",
      from: "jan-start",
      page: 5,
      active: true,
    });
  });

  it("does not call network or live Supabase from handler tests", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      const ports = createPorts();
      await handleRequestProposalList(ports);
      await handleMarketplaceCatalogSearch(ports);
      await handleWarehouseLedgerList(ports);
      await handleAccountantInvoiceList(ports);
      await handleDirectorPendingList(ports);
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

    const source = readProjectFile("src/shared/scale/bffReadHandlers.ts");
    expect(source).not.toContain(".from(");
    expect(source).not.toContain(".rpc(");
    expect(source).not.toContain("supabase");
  });

  it("does not import read handlers from active app runtime", () => {
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
        if (source.includes("shared/scale/bffReadHandlers") || source.includes("shared/scale/bffReadPorts")) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
  });

  it("keeps new files free of server admin credential markers", () => {
    const markerA = ["service", "role"].join("_");
    const markerB = ["SERVICE", "ROLE"].join("_");
    const files = [
      "src/shared/scale/bffReadHandlers.ts",
      "src/shared/scale/bffReadPorts.ts",
      "tests/scale/bffReadHandlers.test.ts",
      "docs/architecture/50k_bff_read_handlers.md",
      "artifacts/S_50K_BFF_READ_1_handlers_matrix.json",
      "artifacts/S_50K_BFF_READ_1_handlers_proof.md",
    ];

    for (const file of files) {
      const source = readProjectFile(file);
      expect(source).not.toContain(markerA);
      expect(source).not.toContain(markerB);
    }
  });

  it("sanitizes standalone search strings", () => {
    const sanitized = sanitizeBffSearchQuery(
      "needle person@example.test Bearer abcdefghijklmnop https://files.example/a.pdf?token=signed",
    );

    expect(sanitized.length).toBeLessThanOrEqual(80);
    expect(sanitized).toContain("needle");
    expect(sanitized).not.toContain("person@example.test");
    expect(sanitized).not.toContain("abcdefghijklmnop");
    expect(sanitized).not.toContain("signed");
  });
});
