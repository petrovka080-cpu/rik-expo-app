import { getAiExecutionServiceDefinition } from "../aiExecutionServiceRegistry";

export const paymentApprovedExecutor = getAiExecutionServiceDefinition("payment_prepare_or_post");
