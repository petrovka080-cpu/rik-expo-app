import type { CanonicalEstimateRevisionRowView } from './contracts';
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from '../v4/domainFactory/professionalPhysicalNormApplicabilityV1';
function record(value:unknown):Record<string,unknown>|null { return value!=null && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : null; }
export function publicNormativeTraceV1(row: CanonicalEstimateRevisionRowView): Record<string, unknown>[] {
  return row.normativeTrace.flatMap((value) => {
    const trace = record(value);
    if (!trace) return [];
    const documentCode = String(trace.document_code ?? trace.sourceId ?? trace.source_id ?? "").trim();
    const exactLocator = String(trace.exact_locator ?? trace.exactLocator ?? "").trim();
    return [{
      ...trace,
      document_code: documentCode,
      exact_locator: exactLocator,
    }];
  });
}

/** The existing presentation identity selection; no source is admitted here. */
export function canonicalProjectedNormIdentityV1(row:CanonicalEstimateRevisionRowView,resolution:ProfessionalPhysicalNormApplicabilityResolutionV1|null) {
  const traces=publicNormativeTraceV1(row);
  const primary=resolution?.status==='APPLIED'
    ? traces.find(trace=>String(trace.source_id ?? trace.sourceId ?? trace.document_code ?? '')===resolution.source_id) ?? traces[0]
    : traces[0];
  return {
    normId:String(primary?.norm_id ?? primary?.normId ?? '').trim() || null,
    normSourceId:String(primary?.document_code ?? '').trim() || null,
    normSourceTitle:String(primary?.source_title ?? primary?.document_code ?? '').trim() || null,
    normVersion:String(primary?.source_document_version ?? primary?.normVersion ?? '').trim() || null,
  };
}
