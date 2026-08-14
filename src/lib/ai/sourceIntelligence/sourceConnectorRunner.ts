import { runGlobalExternalSourceFetch } from "../globalEstimate/externalSources/globalExternalSourceFetchService";
import { listEnabledGlobalExternalSourceConnectors } from "../globalEstimate/externalSources/globalExternalSourceRegistry";

export function planBuiltInAiSourceConnectorRun(connectorIds?: string[]) {
  const ids = connectorIds ?? listEnabledGlobalExternalSourceConnectors().map((connector) => connector.id);
  return ids.map((connectorId) => runGlobalExternalSourceFetch(connectorId));
}
