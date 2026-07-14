import {
  buildProfessionalEstimate5000ReplayCheckpoint,
  evaluateProfessionalEstimate5000ReplayCase,
  readProfessionalEstimate5000ReplayPrompts,
} from "../../scripts/estimate/runProfessionalEstimate5000ActualReplay";
import {
  PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH,
  PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE,
} from "../../src/lib/estimate/professionalEstimate5000CorpusContract";
import {
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_BLOCKED_STATUS,
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD,
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA,
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARDS_TOTAL,
  getProfessionalEstimate5000ReplayShardPrompts,
  planProfessionalEstimate5000ReplayShards,
} from "../../src/lib/estimate/professionalEstimate5000ReplayContract";

jest.setTimeout(120_000);

describe("Professional estimate 5000 actual replay", () => {
  const prompts = readProfessionalEstimate5000ReplayPrompts();

  it("plans the fixed corpus as 50 replay shards of 100 real cases", () => {
    const plan = planProfessionalEstimate5000ReplayShards(prompts);

    expect(plan.schema).toBe(PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA);
    expect(plan.corpus_manifest_hash).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH);
    expect(plan.total_cases).toBe(PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.total_cases);
    expect(plan.total_shards).toBe(PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARDS_TOTAL);
    expect(plan.cases_per_shard).toBe(PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD);
    expect(plan.shards).toHaveLength(50);
    expect(plan.duplicate_case_ids_count).toBe(0);
    expect(plan.missing_case_ids_count).toBe(0);
    expect(plan.fake_green_claimed).toBe(false);

    for (const shard of plan.shards) {
      expect(shard.cases_total).toBe(100);
      expect(shard.case_ids).toHaveLength(100);
      expect(shard.fake_green_claimed).toBe(false);
    }
    expect(plan.shards[0]?.first_case_id).toBe("W111-01-01");
    expect(plan.shards[49]?.last_case_id).toBe("W210-10-05");
    expect(new Set(plan.shards.flatMap((shard) => shard.case_ids)).size).toBe(5000);
    expect(getProfessionalEstimate5000ReplayShardPrompts(prompts, 0)).toHaveLength(100);
  });

  it("captures a real engine replay case with checkpoint-safe failures", () => {
    const shard = planProfessionalEstimate5000ReplayShards(prompts).shards[0];
    expect(shard).toBeDefined();

    const result = evaluateProfessionalEstimate5000ReplayCase({
      prompt: prompts[0],
      shardId: 0,
      caseIndex: 0,
      globalIndex: 0,
    });
    const checkpoint = buildProfessionalEstimate5000ReplayCheckpoint({
      runId: "test-run",
      shard: shard!,
      caseResults: [result],
    });

    expect(result.schema).toBe(PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA);
    expect(result.case_id).toBe("W111-01-01");
    expect(result.route).toBe("/request");
    expect(result.extracted_facts.prompt_hash).toMatch(/^eh_/);
    expect(result.selected_work.work_key ?? "").not.toBe("");
    expect(result.failure_codes).toEqual(result.risk_findings.map((finding) => finding.code));
    expect(result.passed).toBe(result.failure_codes.length === 0);
    expect(checkpoint.final_status).toBe(PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_BLOCKED_STATUS);
    expect(checkpoint.cases_completed).toBe(1);
    expect(checkpoint.case_results).toHaveLength(1);
    expect(checkpoint.checkpoint_hash).toMatch(/^eh_/);
    expect(checkpoint.full_5000_green_claimed).toBe(false);
    expect(checkpoint.fake_green_claimed).toBe(false);
  });

  it("keeps repaired unit-semantics root causes green in real replay", () => {
    const repairedCases = [
      { id: "W123-03-01", expectedWorkKey: "concrete_pedestal_pour" },
      { id: "W133-10-01", expectedWorkKey: "dynamic_fencing_estimate" },
      { id: "W137-01-01", expectedWorkKey: "canopy_installation" },
      { id: "W159-04-01", expectedWorkKey: "dynamic_foundation_estimate" },
    ];

    for (const repaired of repairedCases) {
      const promptIndex = prompts.findIndex((prompt) => prompt.id === repaired.id);
      expect(promptIndex).toBeGreaterThanOrEqual(0);
      const result = evaluateProfessionalEstimate5000ReplayCase({
        prompt: prompts[promptIndex],
        shardId: Math.floor(promptIndex / PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD),
        caseIndex: promptIndex % PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD,
        globalIndex: promptIndex,
      });

      expect(result.selected_work.work_key).toBe(repaired.expectedWorkKey);
      expect(result.failure_codes).toEqual([]);
      expect(result.passed).toBe(true);
      expect(result.runtime_payload_hash).toMatch(/^eh_/);
      expect(result.revision_hash).toBeTruthy();
      expect(result.pdf_payload_hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
