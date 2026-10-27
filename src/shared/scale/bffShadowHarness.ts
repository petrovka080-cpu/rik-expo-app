import {
  handleAccountantInvoiceList,
  handleDirectorPendingList,
  handleMarketplaceCatalogSearch,
  handleRequestProposalList,
  handleWarehouseLedgerList,
  type BffReadInput,
  type BffReadOperation,
  type BffReadResponseEnvelope,
} from "./bffReadHandlers";
import {
  handleAccountantPaymentApply,
  handleCatalogRequestItemCancel,
  handleCatalogRequestMetaUpdate,
  handleDirectorApprovalApply,
  handleProposalSubmit,
  handleRequestItemUpdate,
  handleWarehouseReceiveApply,
  type BffMutationInput,
  type BffMutationOperation,
  type BffMutationResponseEnvelope,
} from "./bffMutationHandlers";
import { redactBffText } from "./bffSafety";
import {
  BFF_SHADOW_CATALOG_REQUEST_CANCEL_PAYLOAD,
  BFF_SHADOW_CATALOG_REQUEST_META_PAYLOAD,
  BFF_SHADOW_MUTATION_PAYLOAD,
  createBffShadowFixturePorts,
} from "./bffShadowFixtures";
import type {
  BffShadowFixtureHarnessPorts,
  BffShadowFlowKind,
  BffShadowHarnessPorts,
  BffShadowResult,
} from "./bffShadowPorts";

type ReadFlowDefinition = {
  flow: BffReadOperation;
  kind: "read";
  handler: (
    ports: BffShadowHarnessPorts["read"],
    input: BffReadInput,
  ) => Promise<BffReadResponseEnvelope<unknown[]>>;
};

type MutationFlowDefinition = {
  flow: BffMutationOperation;
  kind: "mutation";
  payload: unknown;
  handler: (
    ports: BffShadowHarnessPorts["mutation"],
    input: BffMutationInput,
  ) => Promise<BffMutationResponseEnvelope<unknown>>;
};

type ShadowFlowDefinition = ReadFlowDefinition | MutationFlowDefinition;

export type BffShadowRunOptions = {
  ports?: BffShadowHarnessPorts;
  expectedReadPageSize?: number;
  mutationIdempotencyKey?: unknown;
};

export type BffShadowRunSummary = {
  status: "GREEN_LOCAL_SHADOW" | "PARTIAL" | "BLOCKED";
  results: BffShadowResult[];
  coveredFlows: number;
  readFlowsCovered: number;
  mutationFlowsCovered: number;
  productionTouched: false;
  stagingTouched: false;
  networkUsed: false;
};

const READ_COMPARED_FIELDS = ["envelope", "pagination", "dataShape", "metadata"];
const READ_IGNORED_FIELDS = ["serverTiming", "cacheHit", "traceIds", "redactedMetadata"];
const MUTATION_COMPARED_FIELDS = ["envelope", "idempotency", "metadata", "retryDeadLetter"];
const MUTATION_IGNORED_FIELDS = ["rawPayload", "privateIds", "timestamps", "traceIds"];

const READ_FLOWS: readonly ReadFlowDefinition[] = [
  { flow: "request.proposal.list", kind: "read", handler: handleRequestProposalList },
  { flow: "marketplace.catalog.search", kind: "read", handler: handleMarketplaceCatalogSearch },
  { flow: "warehouse.ledger.list", kind: "read", handler: handleWarehouseLedgerList },
  { flow: "accountant.invoice.list", kind: "read", handler: handleAccountantInvoiceList },
  { flow: "director.pending.list", kind: "read", handler: handleDirectorPendingList },
];

const MUTATION_FLOWS: readonly MutationFlowDefinition[] = [
  { flow: "proposal.submit", kind: "mutation", payload: BFF_SHADOW_MUTATION_PAYLOAD, handler: handleProposalSubmit },
  { flow: "warehouse.receive.apply", kind: "mutation", payload: BFF_SHADOW_MUTATION_PAYLOAD, handler: handleWarehouseReceiveApply },
  { flow: "accountant.payment.apply", kind: "mutation", payload: BFF_SHADOW_MUTATION_PAYLOAD, handler: handleAccountantPaymentApply },
  { flow: "director.approval.apply", kind: "mutation", payload: BFF_SHADOW_MUTATION_PAYLOAD, handler: handleDirectorApprovalApply },
  { flow: "request.item.update", kind: "mutation", payload: BFF_SHADOW_MUTATION_PAYLOAD, handler: handleRequestItemUpdate },
  {
    flow: "catalog.request.meta.update",
    kind: "mutation",
    payload: BFF_SHADOW_CATALOG_REQUEST_META_PAYLOAD,
    handler: handleCatalogRequestMetaUpdate,
  },
  {
    flow: "catalog.request.item.cancel",
    kind: "mutation",
    payload: BFF_SHADOW_CATALOG_REQUEST_CANCEL_PAYLOAD,
    handler: handleCatalogRequestItemCancel,
  },
];

export const BFF_SHADOW_FLOW_DEFINITIONS: readonly ShadowFlowDefinition[] = Object.freeze([
  ...READ_FLOWS,
  ...MUTATION_FLOWS,
]);

const buildResult = (
  flow: string,
  kind: BffShadowFlowKind,
  status: BffShadowResult["status"],
  comparedFields: string[],
  ignoredFields: string[],
  reason?: string,
): BffShadowResult => ({
  flow,
  kind,
  status,
  comparedFields,
  ignoredFields,
  reason: reason ? redactBffText(reason).slice(0, 240) : undefined,
  productionTouched: false,
  stagingTouched: false,
  networkUsed: false,
});

const compareReadEnvelope = (
  definition: ReadFlowDefinition,
  envelope: BffReadResponseEnvelope<unknown[]>,
  expectedPageSize: number,
): BffShadowResult => {
  if (!envelope.ok) {
    return buildResult(
      definition.flow,
      definition.kind,
      "mismatch",
      READ_COMPARED_FIELDS,
      READ_IGNORED_FIELDS,
      `expected safe success envelope but received ${envelope.error.code}`,
    );
  }

  const metadata = envelope.metadata;
  const page = envelope.page;
  const matches =
    Array.isArray(envelope.data) &&
    page.page === 0 &&
    page.pageSize === expectedPageSize &&
    page.from === 0 &&
    page.to === expectedPageSize - 1 &&
    metadata.readOnly === true &&
    metadata.requiresPagination === true &&
    metadata.maxPageSize === 100 &&
    metadata.rateLimitBucket === "read_heavy" &&
    metadata.callsSupabaseDirectly === false &&
    metadata.wiredToAppRuntime === false;

  return buildResult(
    definition.flow,
    definition.kind,
    matches ? "match" : "mismatch",
    READ_COMPARED_FIELDS,
    READ_IGNORED_FIELDS,
    matches ? undefined : "read envelope, pagination, or metadata did not match local fixture expectation",
  );
};

const compareMutationEnvelope = (
  definition: MutationFlowDefinition,
  envelope: BffMutationResponseEnvelope<unknown>,
): BffShadowResult => {
  if (!envelope.ok) {
    return buildResult(
      definition.flow,
      definition.kind,
      "mismatch",
      MUTATION_COMPARED_FIELDS,
      MUTATION_IGNORED_FIELDS,
      `expected safe success envelope but received ${envelope.error.code}`,
    );
  }

  const metadata = envelope.metadata;
  const matches =
    metadata.mutation === true &&
    metadata.requiresIdempotency === true &&
    metadata.rateLimitPolicy?.enforcement === "disabled_scaffold" &&
    metadata.retryPolicy.deadLetterOnExhaustion === true &&
    metadata.deadLetterPolicy.attached === true &&
    metadata.deadLetterPolicy.rawPayloadStored === false &&
    metadata.deadLetterPolicy.piiStored === false &&
    metadata.callsSupabaseDirectly === false &&
    metadata.wiredToAppRuntime === false &&
    metadata.realMutationExecutedInTests === false;

  return buildResult(
    definition.flow,
    definition.kind,
    matches ? "match" : "mismatch",
    MUTATION_COMPARED_FIELDS,
    MUTATION_IGNORED_FIELDS,
    matches ? undefined : "mutation envelope or metadata did not match local fixture expectation",
  );
};

export async function runLocalBffShadowParity(
  options: BffShadowRunOptions = {},
): Promise<BffShadowRunSummary> {
  const fixturePorts: BffShadowFixtureHarnessPorts = createBffShadowFixturePorts();
  const ports: BffShadowHarnessPorts = options.ports ?? fixturePorts;
  const expectedReadPageSize = options.expectedReadPageSize ?? 100;
  const mutationIdempotencyKey =
    Object.prototype.hasOwnProperty.call(options, "mutationIdempotencyKey")
      ? options.mutationIdempotencyKey
      : "opaque-key-v1";

  const readInput: BffReadInput = {
    page: -1,
    pageSize: 250,
    query:
      "catalog fixture query user@example.test +10000000000 token=fixture-token-value-that-will-be-redacted",
    filters: {
      status: "pending",
      scope: "test-company-redacted",
      unsafePayload: "ignored",
    },
    context: {
      actorRole: "unknown",
      companyScope: "present_redacted",
      requestIdScope: "present_redacted",
    },
  };

  const mutationInputBase: Omit<BffMutationInput, "payload"> = {
    idempotencyKey: mutationIdempotencyKey,
    context: {
      actorRole: "unknown",
      companyScope: "present_redacted",
      idempotencyKeyStatus: mutationIdempotencyKey ? "present_redacted" : "missing",
      requestScope: "present_redacted",
    },
  };

  const results: BffShadowResult[] = [];

  for (const definition of READ_FLOWS) {
    const envelope = await definition.handler(ports.read, readInput);
    results.push(compareReadEnvelope(definition, envelope, expectedReadPageSize));
  }

  for (const definition of MUTATION_FLOWS) {
    const envelope = await definition.handler(ports.mutation, {
      ...mutationInputBase,
      payload: definition.payload,
    });
    results.push(compareMutationEnvelope(definition, envelope));
  }

  const covered = results.filter((result) => result.status === "match" || result.status === "acceptable_difference");

  return {
    status: covered.length >= 10 ? "GREEN_LOCAL_SHADOW" : "PARTIAL",
    results,
    coveredFlows: covered.length,
    readFlowsCovered: covered.filter((result) => result.kind === "read").length,
    mutationFlowsCovered: covered.filter((result) => result.kind === "mutation").length,
    productionTouched: false,
    stagingTouched: false,
    networkUsed: false,
  };
}
