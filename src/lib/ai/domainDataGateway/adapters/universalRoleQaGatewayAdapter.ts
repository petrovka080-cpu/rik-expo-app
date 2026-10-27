import { executeAiDomainGatewayRequest } from "../aiDomainDataGateway";
import type { AiDomainContextBundle } from "../aiDomainContextBundle";
import type { AiDomainGatewayRequest } from "../aiDomainQueryTypes";

export async function retrieveUniversalRoleQaDomainContext(
  request: AiDomainGatewayRequest,
): Promise<AiDomainContextBundle> {
  return executeAiDomainGatewayRequest(request);
}
