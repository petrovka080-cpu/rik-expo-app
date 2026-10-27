import { getAiExecutionServiceDefinition } from "../aiExecutionServiceRegistry";

export const procurementApprovedExecutor = getAiExecutionServiceDefinition("purchase_order_create");
