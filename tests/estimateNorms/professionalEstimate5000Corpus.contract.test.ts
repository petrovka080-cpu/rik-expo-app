import {
  buildProfessionalEstimate5000CorpusManifest,
} from "../../scripts/estimate/buildProfessionalEstimate5000CorpusManifest";
import {
  PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH,
  PROFESSIONAL_ESTIMATE_5000_CORPUS_RUNTIME_STATUS,
  PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE,
  buildProfessionalEstimate5000CorpusManifestSummary,
} from "../../src/lib/estimate/professionalEstimate5000CorpusContract";

describe("Professional estimate deterministic 5000 corpus manifest", () => {
  it("freezes the exact 5000 real-work prompt corpus without claiming replay green", () => {
    const manifest = buildProfessionalEstimate5000CorpusManifest();

    expect(manifest.valid).toBe(true);
    expect(manifest.failures).toEqual([]);
    expect(manifest.manifest_hash).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH);
    expect(manifest.expected_manifest_hash).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH);
    expect(manifest.fixture_sha256_matches_source).toBe(true);
    expect(manifest.source_matches_contract).toBe(true);
    expect(manifest.total_cases).toBe(5000);
    expect(manifest.domains_total).toBe(100);
    expect(manifest.cases_per_domain_min).toBe(50);
    expect(manifest.cases_per_domain_max).toBe(50);
    expect(manifest.duplicate_id_count).toBe(0);
    expect(manifest.duplicate_prompt_count).toBe(0);
    expect(manifest.first_id).toBe("W111-01-01");
    expect(manifest.last_id).toBe("W210-10-05");
    expect(manifest.domain_distribution).toHaveLength(100);
    expect(manifest.domain_distribution.every((entry) => entry.count === 50)).toBe(true);
    expect(manifest.route_distribution).toEqual({
      request: 1667,
      ai_foreman: 1667,
      ai_request: 1666,
    });
    expect(manifest.case_samples.length).toBe(7);
    expect(manifest.summary.runtime_status).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_RUNTIME_STATUS);
    expect(manifest.summary.web_replay_passed).toBe(false);
    expect(manifest.summary.android_replay_passed).toBe(false);
    expect(manifest.summary.pdf_replay_passed).toBe(false);
    expect(manifest.summary.release_started).toBe(false);
    expect(manifest.summary.deploy_started).toBe(false);
    expect(manifest.summary.eas_started).toBe(false);
    expect(manifest.summary.native_build_started).toBe(false);
    expect(manifest.summary.production_db_touched).toBe(false);
    expect(manifest.summary.main_changed).toBe(false);
    expect(manifest.summary.pr44_changed).toBe(false);
    expect(manifest.summary.fake_green_claimed).toBe(false);
  });

  it("keeps the compact contract hash stable and source-backed", () => {
    const summary = buildProfessionalEstimate5000CorpusManifestSummary();

    expect(summary.manifest_hash).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH);
    expect(summary.fixture_sha256).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.fixture_sha256);
    expect(summary.raw_attachment_sha256).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.raw_attachment_sha256);
    expect(summary.total_cases).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.total_cases);
    expect(summary.unique_ids).toBe(5000);
    expect(summary.unique_prompts).toBe(5000);
    expect(summary.duplicate_prompt_count).toBe(0);
    expect(summary.domains_total).toBe(100);
    expect(summary.cases_per_domain).toBe(50);
    expect(summary.runtime_status).toBe("MANIFEST_ONLY_NOT_REPLAYED");
    expect(summary.fake_green_claimed).toBe(false);
  });
});
