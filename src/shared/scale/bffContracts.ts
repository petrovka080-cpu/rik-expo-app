export type BffFlow =
  | "request.list"
  | "proposal.list"
  | "proposal.detail"
  | "proposal.submit"
  | "buyer.request.list"
  | "warehouse.ledger"
  | "warehouse.receive"
  | "accountant.invoice.list"
  | "accountant.payment.apply"
  | "director.dashboard"
  | "catalog.marketplace.list"
  | "pdf.report.request"
  | "realtime.channel.lifecycle";

export type BffPageInput = {
  page?: number | null;
  pageSize?: number | null;
};

export type BffPage = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
};

export type BffServerTiming = {
  totalMs?: number;
  dbMs?: number;
  cacheHit?: boolean;
};

export type BffResponseEnvelope<T> =
  | {
      ok: true;
      data: T;
      page?: BffPage;
      serverTiming?: BffServerTiming;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export type BffRuntimeEnvironment = "staging" | "production" | "development" | "test" | "unknown";

export type BffClientConfig = {
  enabled: boolean;
  baseUrl?: string | null;
  readOnly?: boolean;
  runtimeEnvironment?: BffRuntimeEnvironment;
  trafficPercent?: number | null;
  shadowOnly?: boolean;
  mutationRoutesEnabled?: boolean;
  productionGuard?: boolean;
};

export type BffRateLimitCategory =
  | "read_heavy"
  | "mutation_sensitive"
  | "report_heavy"
  | "realtime_lifecycle";

export type BffFlowContract = {
  flow: BffFlow;
  endpoint: string;
  method: "GET" | "POST";
  requiresPagination: boolean;
  maxPageSize: 100;
  responseEnvelope: "BffResponseEnvelope";
  rateLimitCategory: BffRateLimitCategory;
  cacheCandidate: boolean;
  backgroundJobCandidate: boolean;
};

export const BFF_MAX_PAGE_SIZE = 100;
export const BFF_DEFAULT_PAGE_SIZE = 50;

export const BFF_FLOW_CONTRACTS: readonly BffFlowContract[] = [
  {
    flow: "request.list",
    endpoint: "GET /api/v1/requests",
    method: "GET",
    requiresPagination: true,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "read_heavy",
    cacheCandidate: true,
    backgroundJobCandidate: false,
  },
  {
    flow: "proposal.list",
    endpoint: "GET /api/v1/proposals",
    method: "GET",
    requiresPagination: true,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "read_heavy",
    cacheCandidate: true,
    backgroundJobCandidate: false,
  },
  {
    flow: "proposal.detail",
    endpoint: "GET /api/v1/proposals/:proposalId",
    method: "GET",
    requiresPagination: false,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "read_heavy",
    cacheCandidate: true,
    backgroundJobCandidate: false,
  },
  {
    flow: "proposal.submit",
    endpoint: "POST /api/v1/proposals",
    method: "POST",
    requiresPagination: false,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "mutation_sensitive",
    cacheCandidate: false,
    backgroundJobCandidate: true,
  },
  {
    flow: "buyer.request.list",
    endpoint: "GET /api/v1/buyer/requests",
    method: "GET",
    requiresPagination: true,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "read_heavy",
    cacheCandidate: true,
    backgroundJobCandidate: false,
  },
  {
    flow: "warehouse.ledger",
    endpoint: "GET /api/v1/warehouse/ledger",
    method: "GET",
    requiresPagination: true,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "read_heavy",
    cacheCandidate: true,
    backgroundJobCandidate: false,
  },
  {
    flow: "warehouse.receive",
    endpoint: "POST /api/v1/warehouse/receive",
    method: "POST",
    requiresPagination: false,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "mutation_sensitive",
    cacheCandidate: false,
    backgroundJobCandidate: true,
  },
  {
    flow: "accountant.invoice.list",
    endpoint: "GET /api/v1/accountant/invoices",
    method: "GET",
    requiresPagination: true,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "read_heavy",
    cacheCandidate: true,
    backgroundJobCandidate: false,
  },
  {
    flow: "accountant.payment.apply",
    endpoint: "POST /api/v1/accountant/payments",
    method: "POST",
    requiresPagination: false,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "mutation_sensitive",
    cacheCandidate: false,
    backgroundJobCandidate: true,
  },
  {
    flow: "director.dashboard",
    endpoint: "GET /api/v1/director/dashboard",
    method: "GET",
    requiresPagination: true,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "read_heavy",
    cacheCandidate: true,
    backgroundJobCandidate: false,
  },
  {
    flow: "catalog.marketplace.list",
    endpoint: "GET /api/v1/marketplace/listings",
    method: "GET",
    requiresPagination: true,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "read_heavy",
    cacheCandidate: true,
    backgroundJobCandidate: false,
  },
  {
    flow: "pdf.report.request",
    endpoint: "POST /api/v1/reports/pdf",
    method: "POST",
    requiresPagination: false,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "report_heavy",
    cacheCandidate: false,
    backgroundJobCandidate: true,
  },
  {
    flow: "realtime.channel.lifecycle",
    endpoint: "POST /api/v1/realtime/channel-lifecycle",
    method: "POST",
    requiresPagination: false,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    responseEnvelope: "BffResponseEnvelope",
    rateLimitCategory: "realtime_lifecycle",
    cacheCandidate: false,
    backgroundJobCandidate: false,
  },
] as const;
