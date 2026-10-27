import type { EvidenceRef, ProcurementEvidenceSource } from "./procurementContextTypes";
import { hashOpaqueId, normalizeProcurementText, uniqueProcurementRefs } from "./procurementRedaction";

export function buildProcurementEvidenceRef(params: {
  source: ProcurementEvidenceSource;
  scope: string;
  value: unknown;
  label: string;
}): EvidenceRef {
  return {
    id: `${params.source}:${hashOpaqueId(params.scope, params.value)}`,
    source: params.source,
    label: normalizeProcurementText(params.label) || params.source,
    redacted: true,
    payloadStored: false,
    rowDataExposed: false,
    promptStored: false,
  };
}

export function evidenceRefIds(refs: readonly EvidenceRef[]): string[] {
  return uniqueProcurementRefs(refs.map((ref) => ref.id));
}

export function mergeEvidenceRefIds(...groups: readonly string[][]): string[] {
  return uniqueProcurementRefs(groups.flat());
}
