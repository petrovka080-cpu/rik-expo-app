import fs from "node:fs";
import path from "node:path";

import {
  BFF_MUTATION_HANDLER_OPERATIONS,
  getBffMutationHandlerMetadata,
  handleAccountantPaymentApply,
  handleDirectorApprovalApply,
  handleProposalSubmit,
  handleRequestItemUpdate,
  handleWarehouseReceiveApply,
  normalizeBffMutationIdempotencyKey,
  sanitizeBffMutationOutput,
} from "../../src/shared/scale/bffMutationHandlers";
import type { BffMutationPorts } from "../../src/shared/scale/bffMutationPorts";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const createPorts = (): BffMutationPorts => ({
  proposalSubmit: {
    submitProposal: jest.fn(async () => ({ result: "proposal-submitted" })),
  },
  warehouseReceive: {
    applyReceive: jest.fn(async () => ({ result: "warehouse-received" })),
  },
  accountantPayment: {
    applyPayment: jest.fn(async () => ({ result: "accountant-paid" })),
  },
  directorApproval: {
    approve: jest.fn(async () => ({ result: "director-approved" })),
  },
  requestItemUpdate: {
    updateRequestItem: jest.fn(async () => ({ result: "request-item-updated" })),
  },
});

const validInput = {
  idempotencyKey: "opaque-key-v1",
  payload: {
    payloadMarker: "raw proposal payload should not be returned",
    email: "person@example.test",
  },
  context: {
    actorRole: "buyer" as const,
    companyScope: "present_redacted" as const,
    idempotencyKeyStatus: "present_redacted" as const,
    requestScope: "present_redacted" as const,
  },
};

describe("S-50K-BFF-WRITE-1 mutation BFF handlers", () => {
  it("defines five disabled mutation handler operations with safety metadata", () => {
    expect(BFF_MUTATION_HANDLER_OPERATIONS).toEqual([
      "proposal.submit",
      "warehouse.receive.apply",
      "accountant.payment.apply",
      "director.approval.apply",
      "request.item.update",
    ]);

    for (const operation of BFF_MUTATION_HANDLER_OPERATIONS) {
      expect(getBffMutationHandlerMetadata(operation)).toEqual(
        expect.objectContaining({
          operation,
          mutation: true,
          writeOperation: true,
          requiresIdempotency: true,
          serverOnlyFutureBoundary: true,
          enabledInAppRuntime: false,
          wiredToAppRuntime: false,
          callsSupabaseDirectly: false,
          realMutationExecutedInTests: false,
          deadLetterPolicy: expect.objectContaining({
            attached: true,
            rawPayloadStored: false,
            piiStored: false,
          }),
        }),
      );

      const metadata = getBffMutationHandlerMetadata(operation);
      expect(metadata.idempotencyContract).toEqual(
        expect.objectContaining({
          operation,
          storesRawPayload: false,
          piiAllowedInKey: false,
        }),
      );
      expect(metadata.rateLimitPolicy).toEqual(
        expect.objectContaining({
          operation,
          enforcement: "disabled_scaffold",
        }),
      );
      expect(metadata.retryPolicy.deadLetterOnExhaustion).toBe(true);
    }
  });

  it("requires idempotency key for all target handlers", async () => {
    const ports = createPorts();
    const handlers = [
      handleProposalSubmit,
      handleWarehouseReceiveApply,
      handleAccountantPaymentApply,
      handleDirectorApprovalApply,
      handleRequestItemUpdate,
    ];

    for (const handler of handlers) {
      const result = await handler(ports, { payload: { any: "shape" } });
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: {
            code: "IDEMPOTENCY_KEY_REQUIRED",
            message: "Request cannot be processed safely",
          },
        }),
      );
    }

    expect(ports.proposalSubmit.submitProposal).not.toHaveBeenCalled();
    expect(ports.warehouseReceive.applyReceive).not.toHaveBeenCalled();
    expect(ports.accountantPayment.applyPayment).not.toHaveBeenCalled();
    expect(ports.directorApproval.approve).not.toHaveBeenCalled();
    expect(ports.requestItemUpdate.updateRequestItem).not.toHaveBeenCalled();
  });

  it("rejects missing payload without calling ports", async () => {
    const ports = createPorts();
    const result = await handleProposalSubmit(ports, { idempotencyKey: "opaque-key-v1" });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: {
          code: "BFF_MUTATION_PAYLOAD_REQUIRED",
          message: "Request cannot be processed safely",
        },
      }),
    );
    expect(ports.proposalSubmit.submitProposal).not.toHaveBeenCalled();
  });

  it("successful port calls return safe envelopes and keep raw payload out of output", async () => {
    const ports = createPorts();
    const result = await handleProposalSubmit(ports, validInput);

    expect(ports.proposalSubmit.submitProposal).toHaveBeenCalledWith({
      idempotencyKey: "opaque-key-v1",
      payload: validInput.payload,
      context: validInput.context,
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: { result: "proposal-submitted" },
        metadata: expect.objectContaining({
          operation: "proposal.submit",
          mutation: true,
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("raw proposal payload");
    expect(JSON.stringify(result)).not.toContain("person@example.test");
  });

  it("warehouse, accountant, director, and request item handlers call only injected ports", async () => {
    const ports = createPorts();

    await expect(handleWarehouseReceiveApply(ports, validInput)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(handleAccountantPaymentApply(ports, validInput)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(handleDirectorApprovalApply(ports, validInput)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(handleRequestItemUpdate(ports, validInput)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );

    expect(ports.warehouseReceive.applyReceive).toHaveBeenCalledTimes(1);
    expect(ports.accountantPayment.applyPayment).toHaveBeenCalledTimes(1);
    expect(ports.directorApproval.approve).toHaveBeenCalledTimes(1);
    expect(ports.requestItemUpdate.updateRequestItem).toHaveBeenCalledTimes(1);
  });

  it("port failures return generic safe errors without PII or raw error details", async () => {
    const ports = createPorts();
    (ports.accountantPayment.applyPayment as jest.Mock).mockRejectedValueOnce(
      new Error("person@example.test paid 100000 token=secretvalue https://files.example/a.pdf?token=signed"),
    );

    const result = await handleAccountantPaymentApply(ports, validInput);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "BFF_ACCOUNTANT_PAYMENT_APPLY_ERROR",
        message: "Unable to update accountant state",
      },
      metadata: expect.objectContaining({
        operation: "accountant.payment.apply",
        mutation: true,
      }),
    });
    expect(JSON.stringify(result)).not.toContain("person@example.test");
    expect(JSON.stringify(result)).not.toContain("secretvalue");
    expect(JSON.stringify(result)).not.toContain("signed");
    expect(JSON.stringify(result)).not.toContain("100000");
  });

  it("sanitizes success output recursively without exposing signed URLs or tokens", async () => {
    const ports = createPorts();
    (ports.directorApproval.approve as jest.Mock).mockResolvedValueOnce({
      ok: true,
      url: "https://files.example/a.pdf?token=signed-secret",
      nested: {
        auth: "Bearer abcdefghijklmnop",
        email: "person@example.test",
      },
    });

    const result = await handleDirectorApprovalApply(ports, validInput);
    const serialized = JSON.stringify(result);

    expect(result.ok).toBe(true);
    expect(serialized).not.toContain("signed-secret");
    expect(serialized).not.toContain("abcdefghijklmnop");
    expect(serialized).not.toContain("person@example.test");
    expect(serialized).toContain("[redacted]");
  });

  it("normalizes only safe opaque idempotency keys", () => {
    expect(normalizeBffMutationIdempotencyKey(" opaque-key-v1 ")).toBe("opaque-key-v1");
    expect(normalizeBffMutationIdempotencyKey("")).toBeNull();
    expect(normalizeBffMutationIdempotencyKey("person@example.test")).toBeNull();
    expect(normalizeBffMutationIdempotencyKey({ raw: true })).toBeNull();
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
      await handleProposalSubmit(ports, validInput);
      await handleWarehouseReceiveApply(ports, validInput);
      await handleAccountantPaymentApply(ports, validInput);
      await handleDirectorApprovalApply(ports, validInput);
      await handleRequestItemUpdate(ports, validInput);
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

    const source = readProjectFile("src/shared/scale/bffMutationHandlers.ts");
    expect(source).not.toContain(".from(");
    expect(source).not.toContain(".rpc(");
    expect(source).not.toContain(".insert(");
    expect(source).not.toContain(".update(");
    expect(source).not.toContain(".upsert(");
    expect(source).not.toContain(".delete(");
    expect(source).not.toContain("supabase");
  });

  it("does not import mutation handlers from active app runtime", () => {
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
        if (source.includes("shared/scale/bffMutationHandlers") || source.includes("shared/scale/bffMutationPorts")) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
  });

  it("keeps new files and artifacts free of server admin credential markers", () => {
    const markerA = ["service", "role"].join("_");
    const markerB = ["SERVICE", "ROLE"].join("_");
    const files = [
      "src/shared/scale/bffMutationHandlers.ts",
      "src/shared/scale/bffMutationPorts.ts",
      "tests/scale/bffMutationHandlers.test.ts",
      "docs/architecture/50k_bff_mutation_handlers.md",
      "artifacts/S_50K_BFF_WRITE_1_handlers_matrix.json",
      "artifacts/S_50K_BFF_WRITE_1_handlers_proof.md",
    ];

    for (const file of files) {
      const source = readProjectFile(file);
      expect(source).not.toContain(markerA);
      expect(source).not.toContain(markerB);
    }
  });

  it("sanitizes standalone mutation output", () => {
    const sanitized = sanitizeBffMutationOutput({
      url: "https://files.example/doc.pdf?token=signed-secret",
      auth: "Bearer abcdefghijklmnop",
      email: "person@example.test",
    });

    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain("signed-secret");
    expect(serialized).not.toContain("abcdefghijklmnop");
    expect(serialized).not.toContain("person@example.test");
    expect(serialized).toContain("[redacted]");
  });
});
