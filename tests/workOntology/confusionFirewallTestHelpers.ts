import {
  runConfusionFirewall1500Audit,
  runConfusionPairHardAudit,
} from "../../scripts/e2e/confusionFirewall1500RealWorkCases";
import { evaluateOperationObjectDisambiguationAudit } from "../../src/lib/ai/workOntology/operationObjectDisambiguation";

let firewall1500Cache: Record<string, unknown> | null = null;
let pairHardCache: Record<string, unknown> | null = null;

export function operationObjectAudit() {
  return evaluateOperationObjectDisambiguationAudit();
}

export function confusionFirewall1500Audit() {
  firewall1500Cache ??= runConfusionFirewall1500Audit({ writeArtifacts: false });
  return firewall1500Cache;
}

export function confusionPairHardAudit() {
  pairHardCache ??= runConfusionPairHardAudit({ writeArtifacts: false });
  return pairHardCache;
}
