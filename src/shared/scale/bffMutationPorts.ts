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
  updateRequestItem(input: BffMutationPortInput): Promise<unknown>;
};

export type BffMutationPorts = {
  proposalSubmit: ProposalSubmitPort;
  warehouseReceive: WarehouseReceivePort;
  accountantPayment: AccountantPaymentPort;
  directorApproval: DirectorApprovalPort;
  requestItemUpdate: RequestItemUpdatePort;
};
