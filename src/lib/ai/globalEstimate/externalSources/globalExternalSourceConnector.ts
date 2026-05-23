import { getGlobalExternalSourceConnector } from "./globalExternalSourceRegistry";
import type { GlobalExternalSourceConnector } from "./globalExternalSourceTypes";

export function assertGlobalExternalSourceConnectorReady(id: string): GlobalExternalSourceConnector {
  const connector = getGlobalExternalSourceConnector(id);
  if (!connector || !connector.enabled) {
    throw new Error(`GLOBAL_ESTIMATE_SOURCE_CONNECTOR_NOT_ENABLED:${id}`);
  }
  if (connector.blocksEstimateRuntime !== false) {
    throw new Error(`GLOBAL_ESTIMATE_SOURCE_CONNECTOR_MUST_NOT_BLOCK_RUNTIME:${id}`);
  }
  return connector;
}

export function connectorCanPublishApprovedRates(connector: GlobalExternalSourceConnector): boolean {
  return connector.enabled && connector.approvalRequired && connector.blocksEstimateRuntime === false;
}
