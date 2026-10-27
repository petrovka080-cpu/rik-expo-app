import { getAiExecutionServiceDefinition } from "../aiExecutionServiceRegistry";

export const warehouseApprovedExecutor = getAiExecutionServiceDefinition("warehouse_discrepancy_confirm");
