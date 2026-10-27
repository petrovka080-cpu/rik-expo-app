import { getDefaultAiDomainProviders } from "../aiDomainDataGateway";
import { buildAiGoldenCrossDomainLinks } from "../aiDomainLinkResolver";
import { AI_DOMAIN_DATA_GATEWAY_WAVE } from "../aiDomainQueryTypes";

export function buildDomainGatewayProofInventory() {
  const providers = getDefaultAiDomainProviders();
  return {
    wave: AI_DOMAIN_DATA_GATEWAY_WAVE,
    providers: providers.map((provider) => ({
      domain: provider.domain,
      capabilities: provider.capabilities,
    })),
    providerCount: providers.length,
    crossDomainLinks: buildAiGoldenCrossDomainLinks(),
    rules: {
      internalDataGatewayOnly: true,
      returnsRawRows: false,
      providerPayloadVisibleToUi: false,
      queriesBounded: true,
      queriesRoleOrgScoped: true,
      sourceRefsRequired: true,
      openLinksRequired: true,
    },
  };
}
