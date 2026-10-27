import type { BffMutationPortInput, BffMutationPorts } from "./bffMutationPorts";
import type { BffReadListPortInput, BffReadPorts } from "./bffReadPorts";
import type { BffShadowFixtureHarnessPorts, BffShadowFixturePortCall } from "./bffShadowPorts";

const fixtureReadRows = {
  requestProposal: [
    { id: "test-proposal-001", requestId: "test-request-001", status: "submitted" },
  ],
  marketplaceCatalog: [
    { id: "test-catalog-001", title: "test catalog item", company: "test-company-redacted" },
  ],
  warehouseLedger: [
    { id: "test-warehouse-ledger-001", movement: "receive", quantityState: "redacted" },
  ],
  accountantInvoice: [
    { id: "test-invoice-001", status: "pending", amountState: "redacted" },
  ],
  directorPending: [
    { id: "test-director-pending-001", status: "pending", approvalState: "redacted" },
  ],
} as const;

const recordReadCall = (
  calls: BffShadowFixturePortCall[],
  port: BffShadowFixturePortCall["port"],
  flow: string,
  input: BffReadListPortInput,
  query?: string,
): void => {
  calls.push({
    port,
    flow,
    page: input.page,
    pageSize: input.pageSize,
    queryLength: query?.length,
  });
};

const recordMutationCall = (
  calls: BffShadowFixturePortCall[],
  port: BffShadowFixturePortCall["port"],
  flow: string,
  input: BffMutationPortInput,
): void => {
  calls.push({
    port,
    flow,
    hasPayload: input.payload !== null && input.payload !== undefined,
    hasIdempotencyKey: input.idempotencyKey.length > 0,
  });
};

export const BFF_SHADOW_SAFE_FIXTURE_VALUES = Object.freeze({
  requestId: "test-request-001",
  proposalId: "test-proposal-001",
  companyScope: "test-company-redacted",
  invoiceId: "test-invoice-001",
  warehouseLedgerId: "test-warehouse-ledger-001",
  email: "user@example.test",
  phone: "+10000000000",
});

export const BFF_SHADOW_MUTATION_PAYLOAD = Object.freeze({
  kind: "catalog.request.item.qty.update",
  requestId: "test-request-001",
  requestIdHint: "test-request-001",
  requestItemId: "test-request-item-001",
  proposalId: "test-proposal-001",
  invoiceId: "test-invoice-001",
  companyScope: "test-company-redacted",
  qty: 1,
  note: "fixture-only",
});

export const BFF_SHADOW_CATALOG_REQUEST_META_PAYLOAD = Object.freeze({
  kind: "catalog.request.meta.update",
  requestId: "test-request-001",
  patch: {
    comment: "fixture-only",
    need_by: null,
  },
});

export const BFF_SHADOW_CATALOG_REQUEST_CANCEL_PAYLOAD = Object.freeze({
  kind: "catalog.request.item.cancel",
  requestItemId: "test-request-item-001",
});

export function createBffShadowFixturePorts(): BffShadowFixtureHarnessPorts {
  const calls: BffShadowFixturePortCall[] = [];

  const read: BffReadPorts = {
    requestProposal: {
      async listRequestProposals(input) {
        recordReadCall(calls, "requestProposal", "request.proposal.list", input);
        return [...fixtureReadRows.requestProposal];
      },
    },
    marketplaceCatalog: {
      async searchCatalog(input) {
        recordReadCall(calls, "marketplaceCatalog", "marketplace.catalog.search", input, input.query);
        return [...fixtureReadRows.marketplaceCatalog];
      },
    },
    warehouseLedger: {
      async listWarehouseLedger(input) {
        recordReadCall(calls, "warehouseLedger", "warehouse.ledger.list", input);
        return [...fixtureReadRows.warehouseLedger];
      },
    },
    accountantInvoice: {
      async listAccountantInvoices(input) {
        recordReadCall(calls, "accountantInvoice", "accountant.invoice.list", input);
        return [...fixtureReadRows.accountantInvoice];
      },
    },
    directorPending: {
      async listDirectorPending(input) {
        recordReadCall(calls, "directorPending", "director.pending.list", input);
        return [...fixtureReadRows.directorPending];
      },
    },
  };

  const mutation: BffMutationPorts = {
    proposalSubmit: {
      async submitProposal(input) {
        recordMutationCall(calls, "proposalSubmit", "proposal.submit", input);
        return { id: "test-proposal-001", result: "accepted" };
      },
    },
    warehouseReceive: {
      async applyReceive(input) {
        recordMutationCall(calls, "warehouseReceive", "warehouse.receive.apply", input);
        return { id: "test-warehouse-receive-001", result: "accepted" };
      },
    },
    accountantPayment: {
      async applyPayment(input) {
        recordMutationCall(calls, "accountantPayment", "accountant.payment.apply", input);
        return { id: "test-invoice-001", result: "accepted" };
      },
    },
    directorApproval: {
      async approve(input) {
        recordMutationCall(calls, "directorApproval", "director.approval.apply", input);
        return { id: "test-director-approval-001", result: "accepted" };
      },
    },
    requestItemUpdate: {
      async updateRequestItem(input) {
        recordMutationCall(calls, "requestItemUpdate", "request.item.update", input);
        return { id: "test-request-item-001", result: "accepted" };
      },
    },
    catalogRequest: {
      async updateRequestMeta(input) {
        recordMutationCall(calls, "catalogRequestMeta", "catalog.request.meta.update", input);
        return { id: "test-request-001", result: "accepted" };
      },
      async cancelRequestItem(input) {
        recordMutationCall(calls, "catalogRequestCancel", "catalog.request.item.cancel", input);
        return { id: "test-request-item-001", result: "accepted" };
      },
    },
  };

  return { read, mutation, calls };
}
