export type BffReadPageInput = {
  page?: number | null;
  pageSize?: number | null;
};

export type BffReadSafeFilterValue = string | number | boolean | null;
export type BffReadSafeFilters = Record<string, BffReadSafeFilterValue>;

export type BffReadContext = {
  actorRole?: "buyer" | "contractor" | "warehouse" | "accountant" | "director" | "unknown";
  companyScope?: "present_redacted" | "missing" | "not_required";
  requestIdScope?: "present_redacted" | "missing" | "not_required";
};

export type BffReadListPortInput = {
  page: number;
  pageSize: number;
  filters?: BffReadSafeFilters;
  context?: BffReadContext;
};

export type RequestProposalListPort = {
  listRequestProposals(input: BffReadListPortInput): Promise<unknown[]>;
};

export type MarketplaceCatalogSearchPort = {
  searchCatalog(
    input: BffReadListPortInput & {
      query: string;
    },
  ): Promise<unknown[]>;
};

export type WarehouseLedgerListPort = {
  listWarehouseLedger(input: BffReadListPortInput): Promise<unknown[]>;
};

export type AccountantInvoiceListPort = {
  listAccountantInvoices(input: BffReadListPortInput): Promise<unknown[]>;
};

export type DirectorPendingListPort = {
  listDirectorPending(input: BffReadListPortInput): Promise<unknown[]>;
};

export type BffReadPorts = {
  requestProposal: RequestProposalListPort;
  marketplaceCatalog: MarketplaceCatalogSearchPort;
  warehouseLedger: WarehouseLedgerListPort;
  accountantInvoice: AccountantInvoiceListPort;
  directorPending: DirectorPendingListPort;
};
