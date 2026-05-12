import { DisabledExternalIntelProvider } from "./DisabledExternalIntelProvider";
import type { ExternalIntelProvider } from "./externalIntelTypes";

export type { ExternalIntelProvider } from "./externalIntelTypes";

export function createDefaultExternalIntelProvider(): ExternalIntelProvider {
  return new DisabledExternalIntelProvider();
}
