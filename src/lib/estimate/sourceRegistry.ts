import sourcesJson from "../../../data/estimate/source-registry/sources.json";
import type {
  EstimateSourceIdMappingRule,
  EstimateSourceRegistryFile,
  EstimateSourceRegistryRecord,
  EstimateSourceResolution,
} from "./sourceRegistryContract";

const registryFile = sourcesJson as EstimateSourceRegistryFile;

const fallbackUnknownSource: EstimateSourceRegistryRecord = {
  source_id: "unknown_untrusted_source",
  title: "Unknown untrusted source",
  source_type: "unknown",
  issuer: "Unknown",
  document_title: "Unknown untrusted source",
  document_number: "UNKNOWN-SOURCE",
  edition: "unknown",
  effective_date: "unknown",
  jurisdiction: "UNKNOWN",
  applicability: "No verified source was resolved; estimator review is required.",
  official_url: null,
  accessed_at: "unknown",
  content_hash: "SOURCE_NOT_VERIFIED",
  page_or_table: null,
  license_state: "UNKNOWN",
  supersedes: [],
  superseded_by: null,
  source_quality: "unknown_untrusted",
  verification_status: "SOURCE_NOT_VERIFIED",
  trust_level: "untrusted",
  trusted_for_production_norms: false,
  preliminary_disclosure_required: true,
  citation: {
    label: "Unknown source, estimator review required",
    document_ref: "UNKNOWN-SOURCE",
  },
  allowed_domains: [],
  online_verification_required: false,
  raw_copyrighted_norm_book_committed: false,
};

let recordsByIdCache: Map<string, EstimateSourceRegistryRecord> | null = null;
let compiledRulesCache: (EstimateSourceIdMappingRule & { regex: RegExp })[] | null = null;

export function loadEstimateSourceRegistry(): EstimateSourceRegistryFile {
  return registryFile;
}

export function loadEstimateSourceRegistryRecords(): EstimateSourceRegistryRecord[] {
  return loadEstimateSourceRegistry().sources;
}

function recordsById(): Map<string, EstimateSourceRegistryRecord> {
  if (recordsByIdCache) return recordsByIdCache;
  recordsByIdCache = new Map(loadEstimateSourceRegistry().sources.map((record) => [record.source_id, record]));
  return recordsByIdCache;
}

function compiledRules(): (EstimateSourceIdMappingRule & { regex: RegExp })[] {
  if (compiledRulesCache) return compiledRulesCache;
  compiledRulesCache = loadEstimateSourceRegistry().source_id_mapping_rules.map((rule) => ({
    ...rule,
    regex: new RegExp(rule.norm_source_id_pattern),
  }));
  return compiledRulesCache;
}

export function getEstimateSourceRecord(sourceId: string): EstimateSourceRegistryRecord | null {
  return recordsById().get(sourceId) ?? null;
}

export function resolveEstimateSourceForNormSourceId(input: {
  normSourceId: string | null | undefined;
  normSourceTitle?: string | null;
}): EstimateSourceResolution {
  const normSourceId = String(input.normSourceId ?? "").trim();
  const normSourceTitle = input.normSourceTitle?.trim() || null;
  const exact = normSourceId ? recordsById().get(normSourceId) : null;
  if (exact) {
    return {
      normSourceId,
      normSourceTitle,
      registrySourceId: exact.source_id,
      record: exact,
      matchedBy: "exact",
      mappingRuleId: null,
    };
  }

  const matchedRule = normSourceId ? compiledRules().find((rule) => rule.regex.test(normSourceId)) : null;
  const mappedRecord = matchedRule ? recordsById().get(matchedRule.source_id) : null;
  if (mappedRecord && matchedRule) {
    return {
      normSourceId,
      normSourceTitle,
      registrySourceId: mappedRecord.source_id,
      record: mappedRecord,
      matchedBy: "mapping_rule",
      mappingRuleId: matchedRule.rule_id,
    };
  }

  return {
    normSourceId,
    normSourceTitle,
    registrySourceId: fallbackUnknownSource.source_id,
    record: fallbackUnknownSource,
    matchedBy: "fallback",
    mappingRuleId: null,
  };
}
