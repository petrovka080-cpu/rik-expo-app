import { executeAiDomainGatewayRequest } from "../aiDomainDataGateway";
import type { AiDomainContextBundle } from "../aiDomainContextBundle";
import type { AiDomainGatewayRequest } from "../aiDomainQueryTypes";

export async function retrieveRoleWorkflowDomainContext(
  request: AiDomainGatewayRequest,
): Promise<AiDomainContextBundle> {
  return executeAiDomainGatewayRequest({
    ...request,
    requireSourceRefs: true,
    requireOpenLinks: true,
    requireNumericFactsWhenAvailable: true,
  });
}
