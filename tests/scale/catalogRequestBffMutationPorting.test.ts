import fs from "fs";
import path from "path";

import {
  CATALOG_REQUEST_SERVER_MUTATION_PORTING_CONTRACT,
  createBffCatalogRequestMutationPorts,
  createBffCatalogRequestMutationPortsFromEnv,
} from "../../scripts/server/stagingBffCatalogRequestMutationPorts";
import { handleBffStagingServerRequest } from "../../scripts/server/stagingBffServerBoundary";
import {
  handleCatalogRequestItemCancel,
  handleCatalogRequestMetaUpdate,
  handleRequestItemUpdate,
} from "../../src/shared/scale/bffMutationHandlers";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const catalogContext = {
  actorRole: "buyer" as const,
  companyScope: "present_redacted" as const,
  idempotencyKeyStatus: "present_redacted" as const,
  requestScope: "present_redacted" as const,
};

const metaInput = {
  idempotencyKey: "opaque-key-v1",
  payload: {
    kind: "catalog.request.meta.update",
    requestId: "request-001",
    patch: { comment: "safe fixture" },
  },
  context: catalogContext,
};

const qtyInput = {
  idempotencyKey: "opaque-key-v1",
  payload: {
    kind: "catalog.request.item.qty.update",
    requestItemId: "request-item-001",
    requestIdHint: "request-001",
    qty: 3,
  },
  context: catalogContext,
};

const cancelInput = {
  idempotencyKey: "opaque-key-v1",
  payload: {
    kind: "catalog.request.item.cancel",
    requestItemId: "request-item-001",
  },
  context: catalogContext,
};

describe("S-DIRECT-SUPABASE-BYPASS-ELIMINATION-4 catalog request server mutation porting", () => {
  it("adds permanent server mutation contracts without enabling production mutation traffic", () => {
    expect(CATALOG_REQUEST_SERVER_MUTATION_PORTING_CONTRACT).toEqual(
      expect.objectContaining({
        mutationRoutesEnabledByDefault: false,
        productionTrafficEnabled: false,
        payloadLogging: "payload_keys_only",
        dbRowsLogged: false,
        envValuesLogged: false,
        rawSqlLogged: false,
      }),
    );
    expect(createBffCatalogRequestMutationPortsFromEnv({})).toBeUndefined();
  });

  it("runs concrete handlers through fake server adapters without network or production DB writes", async () => {
    const executor = {
      updateRequestMeta: jest.fn(async () => ({
        status: "updated",
        payloadKeys: ["comment"],
        rawRowsReturned: false,
      })),
      updateRequestItemQty: jest.fn(async () => ({
        status: "updated",
        fallbackUsed: false,
        rawRowsReturned: false,
      })),
      cancelRequestItem: jest.fn(async () => ({
        status: "cancelled",
        rawRowsReturned: false,
      })),
    };
    const ports = createBffCatalogRequestMutationPorts(executor);

    await expect(handleCatalogRequestMetaUpdate(ports, metaInput)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(handleRequestItemUpdate(ports, qtyInput)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(handleCatalogRequestItemCancel(ports, cancelInput)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );

    expect(executor.updateRequestMeta).toHaveBeenCalledWith(metaInput.payload);
    expect(executor.updateRequestItemQty).toHaveBeenCalledWith(qtyInput.payload);
    expect(executor.cancelRequestItem).toHaveBeenCalledWith(cancelInput.payload);
  });

  it("keeps mutation routes globally disabled while server handlers are wired into the boundary", async () => {
    const ports = createBffCatalogRequestMutationPorts({
      updateRequestMeta: jest.fn(async () => ({ status: "updated" })),
      updateRequestItemQty: jest.fn(async () => ({ status: "updated" })),
      cancelRequestItem: jest.fn(async () => ({ status: "cancelled" })),
    });

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: "/api/staging-bff/mutation/catalog-request-meta-update",
        body: {
          input: metaInput,
          metadata: {
            idempotencyKeyStatus: "present_redacted",
            rateLimitKeyStatus: "present_redacted",
          },
        },
      },
      {
        mutationPorts: ports,
        config: {
          mutationRoutesEnabled: false,
          idempotencyMetadataRequired: true,
          rateLimitMetadataRequired: true,
        },
      },
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "BFF_MUTATION_ROUTES_DISABLED" }),
      }),
    );
  });

  it("keeps catalog request service direct Supabase bypass at zero and server handlers free of raw client usage", () => {
    const serviceSource = readProjectFile("src/lib/catalog/catalog.request.service.ts");
    const handlerSource = readProjectFile("src/shared/scale/bffMutationHandlers.ts");
    const adapterSource = readProjectFile("scripts/server/stagingBffCatalogRequestMutationPorts.ts");

    expect(serviceSource).not.toContain("supabase.from(");
    expect(serviceSource).not.toContain("supabase.rpc(");
    expect(handlerSource).not.toContain(".from(");
    expect(handlerSource).not.toContain(".rpc(");
    expect(handlerSource).not.toContain("supabase");
    expect(adapterSource).not.toContain("supabase");
    expect(adapterSource).not.toContain("console.");
  });
});
