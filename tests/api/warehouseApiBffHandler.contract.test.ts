import {
  callWarehouseApiBffRead,
} from "../../src/screens/warehouse/warehouse.api.bff.client";
import {
  handleWarehouseApiBffReadScope,
  type WarehouseApiBffReadPort,
} from "../../src/screens/warehouse/warehouse.api.bff.handler";
import type { WarehouseApiBffPayloadDto } from "../../src/screens/warehouse/warehouse.api.bff.contract";

const createPort = (): WarehouseApiBffReadPort => ({
  runWarehouseApiRead: jest.fn(async (input): Promise<WarehouseApiBffPayloadDto> => {
    if (input.operation === "warehouse.api.reports.bundle") {
      return {
        kind: "reports_bundle",
        result: {
          stock: { data: [{ row: "stock" }], error: null },
          movement: { data: [{ row: "movement" }], error: null },
          issues: { data: [{ row: "issues" }], error: null },
        },
      };
    }

    return {
      kind: "single",
      result: { data: [{ row: input.operation }], error: null },
    };
  }),
});

describe("warehouse API BFF handler contract", () => {
  it("returns typed read envelopes for report bundle and single read operations", async () => {
    const port = createPort();

    const bundle = await handleWarehouseApiBffReadScope(port, {
      operation: "warehouse.api.reports.bundle",
      args: { p_from: "2026-01-01", p_to: "2026-01-31" },
    });
    const lines = await handleWarehouseApiBffReadScope(port, {
      operation: "warehouse.api.ledger.incoming_lines",
      args: { incomingId: "00000000-0000-0000-0000-000000000001" },
      page: { page: 0, pageSize: 100 },
    });

    expect(bundle.ok).toBe(true);
    expect(lines.ok).toBe(true);
    if (bundle.ok) {
      expect(bundle.data).toEqual(
        expect.objectContaining({
          contractId: "warehouse_api_read_scope_v1",
          operation: "warehouse.api.reports.bundle",
          payload: expect.objectContaining({ kind: "reports_bundle" }),
        }),
      );
    }
    if (lines.ok) {
      expect(lines.data.payload).toEqual(
        expect.objectContaining({
          kind: "single",
          result: { data: [{ row: "warehouse.api.ledger.incoming_lines" }], error: null },
        }),
      );
    }
  });

  it("redacts invalid and upstream failures without raw error leakage", async () => {
    const invalid = await handleWarehouseApiBffReadScope(createPort(), {
      operation: "warehouse.api.unknown",
      args: {},
    });
    expect(invalid).toEqual({
      ok: false,
      error: {
        code: "WAREHOUSE_API_BFF_INVALID_OPERATION",
        message: "Invalid warehouse API read operation",
      },
    });

    const failingPort: WarehouseApiBffReadPort = {
      async runWarehouseApiRead() {
        throw new Error("token=secretvalue user@example.test raw-row");
      },
    };
    const failed = await handleWarehouseApiBffReadScope(failingPort, {
      operation: "warehouse.api.report.incoming_v2",
      args: { p_from: null, p_to: null },
    });
    expect(failed).toEqual({
      ok: false,
      error: {
        code: "WAREHOUSE_API_BFF_UPSTREAM_ERROR",
        message: "Warehouse API read upstream failed",
      },
    });
    expect(JSON.stringify(failed)).not.toContain("secretvalue");
    expect(JSON.stringify(failed)).not.toContain("user@example.test");
  });

  it("keeps mobile traffic contract-only when readonly traffic percent is zero", async () => {
    const fetchImpl = jest.fn();
    const getAccessToken = jest.fn(async () => "mobile-session-token");

    await expect(
      callWarehouseApiBffRead(
        {
          operation: "warehouse.api.report.incoming_v2",
          args: { p_from: null, p_to: null },
        },
        {
          config: {
            enabled: true,
            baseUrl: "https://gox-build-staging-bff.onrender.com",
            readOnly: true,
            runtimeEnvironment: "staging",
            trafficPercent: 0,
            mutationRoutesEnabled: false,
            productionGuard: true,
          },
          getAccessToken,
          fetchImpl,
        },
      ),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "BFF_CONTRACT_ONLY",
    });

    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the approved readonly route for staging calls", async () => {
    const fetchImpl = jest.fn(async () => ({
      json: async () => ({
        ok: true,
        data: {
          contractId: "warehouse_api_read_scope_v1",
          documentType: "warehouse_api_read_scope",
          operation: "warehouse.api.report.issue_lines",
          source: "bff:warehouse_api_read_scope_v1",
          payload: {
            kind: "single",
            result: { data: [{ row: "redacted" }], error: null },
          },
        },
      }),
    })) as unknown as jest.MockedFunction<typeof fetch>;

    await expect(
      callWarehouseApiBffRead(
        {
          operation: "warehouse.api.report.issue_lines",
          args: { p_issue_id: 1 },
        },
        {
          config: {
            enabled: true,
            baseUrl: "https://gox-build-staging-bff.onrender.com/ignored",
            readOnly: true,
            runtimeEnvironment: "staging",
            trafficPercent: 1,
            mutationRoutesEnabled: false,
            productionGuard: true,
          },
          getAccessToken: async () => "mobile-session-token",
          fetchImpl,
        },
      ),
    ).resolves.toEqual({
      status: "ok",
      response: expect.objectContaining({
        operation: "warehouse.api.report.issue_lines",
      }),
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://gox-build-staging-bff.onrender.com/api/staging-bff/read/warehouse-api-read-scope",
    );
  });
});
