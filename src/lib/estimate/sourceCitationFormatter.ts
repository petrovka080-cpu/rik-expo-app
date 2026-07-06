import type { EstimateSourceResolution } from "./sourceRegistryContract";

function publicQualityLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function formatEstimateSourceBadge(resolution: EstimateSourceResolution): string {
  const record = resolution.record;
  if (record.preliminary_disclosure_required) {
    return `Preliminary source: ${publicQualityLabel(record.source_quality)}`;
  }
  return `Source: ${publicQualityLabel(record.source_quality)}`;
}

export function formatEstimateSourceCitation(resolution: EstimateSourceResolution): string {
  const record = resolution.record;
  const citationRef = record.citation.url ?? record.citation.document_ref ?? record.source_id;
  const disclosure = record.preliminary_disclosure_required ? "Preliminary, estimator/design review required. " : "";
  const normTitle = resolution.normSourceTitle ? ` Row norm: ${resolution.normSourceTitle}.` : "";
  return `${disclosure}${record.citation.label}; ${citationRef}; quality=${record.source_quality}; verification=${record.verification_status}; normSourceId=${resolution.normSourceId}.${normTitle}`.trim();
}
