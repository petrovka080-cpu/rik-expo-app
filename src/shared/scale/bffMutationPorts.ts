export type BffMutationContext = {
  actorRole?: "buyer" | "contractor" | "warehouse" | "accountant" | "director" | "unknown";
  companyScope?: "present_redacted" | "missing" | "not_required";
  idempotencyKeyStatus: "present_redacted" | "missing";
  requestScope?: "present_redacted" | "missing" | "not_required";
};

export type BffMutationPortInput = {
  idempotencyKey: string;
  payload: unknown;
  context?: BffMutationContext;
};

export type BffTypedMutationPortInput<TPayload> = Omit<BffMutationPortInput, "payload"> & {
  payload: TPayload;
};

export type CatalogRequestMetaTextKey =
  | "need_by"
  | "comment"
  | "object_type_code"
  | "level_code"
  | "system_code"
  | "zone_code"
  | "foreman_name"
  | "contractor_job_id"
  | "subcontract_id"
  | "contractor_org"
  | "subcontractor_org"
  | "contractor_phone"
  | "subcontractor_phone"
  | "object_name"
  | "level_name"
  | "system_name"
  | "zone_name";

export type CatalogRequestMetaNumberKey =
  | "planned_volume"
  | "qty_plan"
  | "volume";

export type CatalogRequestMetaPatch =
  Partial<Record<CatalogRequestMetaTextKey, string | null>> &
  Partial<Record<CatalogRequestMetaNumberKey, number | null>>;

export type CatalogRequestMetaUpdatePayload = {
  kind: "catalog.request.meta.update";
  requestId: string;
  patch: CatalogRequestMetaPatch;
};

export type CatalogRequestItemQtyUpdatePayload = {
  kind: "catalog.request.item.qty.update";
  requestItemId: string;
  qty: number;
  requestIdHint?: string | null;
};

export type CatalogRequestItemCancelPayload = {
  kind: "catalog.request.item.cancel";
  requestItemId: string;
};

export type ProposalSubmitPort = {
  submitProposal(input: BffMutationPortInput): Promise<unknown>;
};

export type WarehouseReceivePort = {
  applyReceive(input: BffMutationPortInput): Promise<unknown>;
};

export type AccountantPaymentPort = {
  applyPayment(input: BffMutationPortInput): Promise<unknown>;
};

export type DirectorApprovalPort = {
  approve(input: BffMutationPortInput): Promise<unknown>;
};

export type RequestItemUpdatePort = {
  updateRequestItem(input: BffTypedMutationPortInput<CatalogRequestItemQtyUpdatePayload>): Promise<unknown>;
};

export type CatalogRequestMutationPort = {
  updateRequestMeta(input: BffTypedMutationPortInput<CatalogRequestMetaUpdatePayload>): Promise<unknown>;
  cancelRequestItem(input: BffTypedMutationPortInput<CatalogRequestItemCancelPayload>): Promise<unknown>;
};

export type BffMutationPorts = {
  proposalSubmit: ProposalSubmitPort;
  warehouseReceive: WarehouseReceivePort;
  accountantPayment: AccountantPaymentPort;
  directorApproval: DirectorApprovalPort;
  requestItemUpdate: RequestItemUpdatePort;
  catalogRequest: CatalogRequestMutationPort;
};
