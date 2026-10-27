import type { BffMutationPorts } from "./bffMutationPorts";
import type { BffReadPorts } from "./bffReadPorts";

export type BffShadowStatus = "match" | "acceptable_difference" | "mismatch" | "skipped";

export type BffShadowFlowKind = "read" | "mutation";

export type BffShadowResult = {
  flow: string;
  kind: BffShadowFlowKind;
  status: BffShadowStatus;
  comparedFields: string[];
  ignoredFields: string[];
  reason?: string;
  productionTouched: false;
  stagingTouched: false;
  networkUsed: false;
};

export type BffShadowHarnessPorts = {
  read: BffReadPorts;
  mutation: BffMutationPorts;
};

export type BffShadowFixturePortCall = {
  port:
    | "requestProposal"
    | "marketplaceCatalog"
    | "warehouseLedger"
    | "accountantInvoice"
    | "directorPending"
    | "proposalSubmit"
    | "warehouseReceive"
    | "accountantPayment"
    | "directorApproval"
    | "requestItemUpdate"
    | "catalogRequestMeta"
    | "catalogRequestCancel";
  flow: string;
  page?: number;
  pageSize?: number;
  queryLength?: number;
  hasPayload?: boolean;
  hasIdempotencyKey?: boolean;
};

export type BffShadowFixtureHarnessPorts = BffShadowHarnessPorts & {
  calls: BffShadowFixturePortCall[];
};
