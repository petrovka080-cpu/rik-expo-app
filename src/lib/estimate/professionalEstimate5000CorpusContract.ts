import { estimateDeterministicHash } from "./estimateDeterministicHash";
import { RISK_AUDIT_11610_BASELINE_SHA } from "./professionalEstimateRiskAuditContract";

export const PROFESSIONAL_ESTIMATE_5000_CORPUS_SCHEMA =
  "professional-estimate-5000-real-corpus-manifest-v1" as const;

export const PROFESSIONAL_ESTIMATE_5000_CORPUS_RUNTIME_STATUS =
  "MANIFEST_ONLY_NOT_REPLAYED" as const;

export type ProfessionalEstimate5000CorpusSource = {
  readonly fixture_file_name: string;
  readonly source_file_name: string;
  readonly fixture_sha256: string;
  readonly raw_attachment_sha256: string;
  readonly total_cases: number;
  readonly unique_ids: number;
  readonly unique_prompts: number;
  readonly duplicate_prompt_count: number;
  readonly domains_total: number;
  readonly cases_per_domain: number;
  readonly first_id: string;
  readonly last_id: string;
};

export type ProfessionalEstimate5000CorpusManifestSummary = {
  readonly schema: typeof PROFESSIONAL_ESTIMATE_5000_CORPUS_SCHEMA;
  readonly baseline_sha: string;
  readonly fixture_file_name: string;
  readonly source_file_name: string;
  readonly fixture_sha256: string;
  readonly raw_attachment_sha256: string;
  readonly total_cases: number;
  readonly unique_ids: number;
  readonly unique_prompts: number;
  readonly duplicate_prompt_count: number;
  readonly domains_total: number;
  readonly cases_per_domain: number;
  readonly first_id: string;
  readonly last_id: string;
  readonly manifest_hash: string;
  readonly runtime_status: typeof PROFESSIONAL_ESTIMATE_5000_CORPUS_RUNTIME_STATUS;
  readonly web_replay_passed: false;
  readonly android_replay_passed: false;
  readonly pdf_replay_passed: false;
  readonly release_started: false;
  readonly deploy_started: false;
  readonly eas_started: false;
  readonly native_build_started: false;
  readonly production_db_touched: false;
  readonly main_changed: false;
  readonly pr44_changed: false;
  readonly fake_green_claimed: false;
};

export const PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE: ProfessionalEstimate5000CorpusSource =
  Object.freeze({
    fixture_file_name: "ai_5000_next_real_work_prompts.json",
    source_file_name: "ai_5000_next_real_work_prompts.source.json",
    fixture_sha256: "ff41b0f49a4773f8c9a4e51447538d50ad348ebef18ee43f6b29ec0149b50fa1",
    raw_attachment_sha256: "7e3a5b20df8ae93bb5801800a0e6b58c45c2c3b7c6070de5429d5ecfbe63a306",
    total_cases: 5000,
    unique_ids: 5000,
    unique_prompts: 5000,
    duplicate_prompt_count: 0,
    domains_total: 100,
    cases_per_domain: 50,
    first_id: "W111-01-01",
    last_id: "W210-10-05",
  });

export function professionalEstimate5000CorpusManifestHash(
  source: ProfessionalEstimate5000CorpusSource = PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE,
): string {
  return estimateDeterministicHash({
    schema: PROFESSIONAL_ESTIMATE_5000_CORPUS_SCHEMA,
    baseline_sha: RISK_AUDIT_11610_BASELINE_SHA,
    fixture_file_name: source.fixture_file_name,
    source_file_name: source.source_file_name,
    fixture_sha256: source.fixture_sha256,
    raw_attachment_sha256: source.raw_attachment_sha256,
    total_cases: source.total_cases,
    unique_ids: source.unique_ids,
    unique_prompts: source.unique_prompts,
    duplicate_prompt_count: source.duplicate_prompt_count,
    domains_total: source.domains_total,
    cases_per_domain: source.cases_per_domain,
    first_id: source.first_id,
    last_id: source.last_id,
  });
}

export function buildProfessionalEstimate5000CorpusManifestSummary(
  source: ProfessionalEstimate5000CorpusSource = PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE,
): ProfessionalEstimate5000CorpusManifestSummary {
  return Object.freeze({
    schema: PROFESSIONAL_ESTIMATE_5000_CORPUS_SCHEMA,
    baseline_sha: RISK_AUDIT_11610_BASELINE_SHA,
    fixture_file_name: source.fixture_file_name,
    source_file_name: source.source_file_name,
    fixture_sha256: source.fixture_sha256,
    raw_attachment_sha256: source.raw_attachment_sha256,
    total_cases: source.total_cases,
    unique_ids: source.unique_ids,
    unique_prompts: source.unique_prompts,
    duplicate_prompt_count: source.duplicate_prompt_count,
    domains_total: source.domains_total,
    cases_per_domain: source.cases_per_domain,
    first_id: source.first_id,
    last_id: source.last_id,
    manifest_hash: professionalEstimate5000CorpusManifestHash(source),
    runtime_status: PROFESSIONAL_ESTIMATE_5000_CORPUS_RUNTIME_STATUS,
    web_replay_passed: false,
    android_replay_passed: false,
    pdf_replay_passed: false,
    release_started: false,
    deploy_started: false,
    eas_started: false,
    native_build_started: false,
    production_db_touched: false,
    main_changed: false,
    pr44_changed: false,
    fake_green_claimed: false,
  });
}

export const PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH =
  buildProfessionalEstimate5000CorpusManifestSummary().manifest_hash;
