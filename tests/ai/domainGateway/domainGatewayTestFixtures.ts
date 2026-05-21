import {
  createDomainGatewayProofRequest,
  executeAiDomainGatewayRequest,
  getDefaultAiDomainProviders,
  type AiDomainName,
  type AiDomainQuery,
  type AiDomainQueryKind,
} from "../../../src/lib/ai/domainDataGateway";

export const DOMAIN_GATEWAY_TEST_REQUEST = createDomainGatewayProofRequest({
  requestId: "domain-gateway-contract-test",
});

export async function getDomainGatewayTestBundle() {
  return executeAiDomainGatewayRequest(DOMAIN_GATEWAY_TEST_REQUEST);
}

export function getDomainGatewayProvider(domain: AiDomainName) {
  const provider = getDefaultAiDomainProviders().find((item) => item.domain === domain);
  if (!provider) throw new Error(`Missing provider ${domain}`);
  return provider;
}

export function createDomainGatewayTestQuery(domain: AiDomainName, kind: AiDomainQueryKind = "trace"): AiDomainQuery {
  return {
    id: `test:${domain}:${kind}`,
    domain,
    kind,
    role: "director",
    userId: "user_director",
    orgId: "org_golden",
    projectId: "project_golden",
    screenId: "domain-gateway-contract-test",
    entity: "procurement_request",
    filters: {
      requestId: "req_124",
      paymentId: "payment_77",
      documentId: "pdf_invoice_45",
      workId: "work_31",
      materialNameRu: "ГКЛ 12.5 мм",
    },
    bounds: {
      limit: 20,
      requireCountQuery: kind === "count",
      requireRoleScope: true,
      requireOrgScope: true,
    },
    reasonRu: "Contract test query.",
  };
}
