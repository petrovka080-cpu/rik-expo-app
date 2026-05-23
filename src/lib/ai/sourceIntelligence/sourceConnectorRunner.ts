import { listEnabledGlobalExternalSourceConnectors, runGlobalExternalSourceFetch } from "../globalEstimate";

export function planBuiltInAiSourceConnectorRun(connectorIds?: string[]) {
  const ids = connectorIds ?? listEnabledGlobalExternalSourceConnectors().map((connector) => connector.id);
  return ids.map((connectorId) => runGlobalExternalSourceFetch(connectorId));
}
