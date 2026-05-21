import type { ConsumerRepairContext } from "./consumerRequestTypes";

export const CONSUMER_REPAIR_CONTEXT: ConsumerRepairContext = {
  role: "consumer",
  context: "consumer_repair_request",
  dataScope: "consumer_only",
  companyDataAccess: false,
  officeAccess: false,
  marketplaceAccess: true,
  ownPdfAccess: true,
};

export function assertConsumerRepairScope(context: ConsumerRepairContext = CONSUMER_REPAIR_CONTEXT): void {
  if (
    context.role !== "consumer"
    || context.context !== "consumer_repair_request"
    || context.dataScope !== "consumer_only"
    || context.companyDataAccess !== false
    || context.officeAccess !== false
  ) {
    throw new Error("Consumer repair requests must stay in consumer-only scope.");
  }
}

export const CONSUMER_REPAIR_FORBIDDEN_OFFICE_ROUTES = [
  "/office",
  "/office/foreman",
  "/office/buyer",
  "/office/accountant",
  "/office/warehouse",
  "/office/director",
  "/office/security",
] as const;
