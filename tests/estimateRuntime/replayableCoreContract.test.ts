import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { buildEstimateReplayRecord } from "../../src/lib/estimate/buildEstimateReplayRecord";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import {
  LEGACY_REPLAY_MIGRATION,
  replayEstimateFromRecord,
} from "../../src/lib/estimate/replayEstimateFromRecord";
import {
  AI_ESTIMATE_LEGACY_REPLAYABLE_CORE_SCHEMA,
  type LegacyEstimateReplayRecord,
} from "../../src/lib/estimate/replayableEstimateCoreContract";
import { validateEstimateReplayRecord } from "../../src/lib/estimate/validateEstimateReplayRecord";

describe("replayable estimate core contract", () => {
  it("builds a replay record with lineage and replays it without drift", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "replay-contract",
      rawInput: "ventilated facade 900 square meters with insulation and anchors",
      selectedTemplateId: "ventilated_facade",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const snapshot = createSnapshotFromDraftRevision(revision);
    const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const record = buildEstimateReplayRecord({
      caseId: "replay_contract_case",
      revision: buyer.revision,
      snapshot: buyer.snapshot,
      pdf: pdf.pdf,
      buyerHandoff: buyer.buyerHandoff,
      sourceSha: "test-source-sha",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const validation = validateEstimateReplayRecord(record);
    const replay = replayEstimateFromRecord(record);

    expect(validation.valid).toBe(true);
    expect(validation.all_replay_records_have_snapshot).toBe(true);
    expect(validation.all_replay_records_have_version_lineage).toBe(true);
    expect(replay.comparison.status).toBe("passed");
    expect(replay.comparison.drift_detected).toBe(false);
    expect(replay.replayMode).toBe("CANONICAL_RESOLVED_IDENTITY");
    expect(replay.newRevisionPromptFallbackUsed).toBe(false);
    expect(record.resolved_identity).toMatchObject({
      calculationStrategyId: "ventilated_facade",
      canonicalModelId: revision.selectedTemplateId,
      originalPrompt: revision.rawInput,
      checksum: expect.any(String),
    });
  });

  it.each([
    {
      caseId: "legacy-profile-sheet-fence-selector",
      rawInput: "profile sheet fence 120 linear meters with posts, concrete footings, gate, delivery and labor",
      selectedTemplateId: "profile_sheet_fence",
    },
    {
      caseId: "legacy-hydraulic-dam-selector",
      rawInput: "hydraulic dam repair 420 cubic meters concrete with formwork, reinforcement and waterproofing",
      selectedTemplateId: "hydraulic_concrete_dam",
    },
  ])("reconstructs exact hashes for $caseId when the canonical output id is not an inverse selector", ({
    caseId,
    rawInput,
    selectedTemplateId,
  }) => {
    const createdAt = "2026-07-09T00:00:00.000Z";
    const revision = createEstimateDraftRevision({
      estimateDraftId: caseId,
      rawInput,
      selectedTemplateId,
      createdAt,
    });
    const snapshot = createSnapshotFromDraftRevision(revision);
    const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const record = buildEstimateReplayRecord({
      caseId,
      revision: buyer.revision,
      snapshot: buyer.snapshot,
      pdf: pdf.pdf,
      buyerHandoff: buyer.buyerHandoff,
      sourceSha: "test-source-sha",
      createdAt,
    });

    const replay = replayEstimateFromRecord(record);

    expect(replay.comparison.status).toBe("passed");
    expect(replay.comparison.mismatch_count).toBe(0);
    expect(replay.actual.hashes).toEqual(record.hashes);
    expect(replay.replayMode).toBe("CANONICAL_RESOLVED_IDENTITY");
    expect(replay.newRevisionPromptFallbackUsed).toBe(false);
  });

  it("isolates v1 prompt fallback inside versioned LEGACY_REPLAY_MIGRATION evidence", () => {
    const createdAt = "2026-07-09T00:00:00.000Z";
    const revision = createEstimateDraftRevision({
      estimateDraftId: "legacy-migration-contract",
      rawInput: "profile sheet fence 120 linear meters with posts, concrete footings, gate, delivery and labor",
      selectedTemplateId: "profile_sheet_fence",
      createdAt,
    });
    const snapshot = createSnapshotFromDraftRevision(revision);
    const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const record = buildEstimateReplayRecord({
      caseId: "legacy-migration-contract",
      revision: buyer.revision,
      snapshot: buyer.snapshot,
      pdf: pdf.pdf,
      buyerHandoff: buyer.buyerHandoff,
      sourceSha: "test-source-sha",
      createdAt,
    });
    const {
      schema: _schema,
      resolved_identity: _resolvedIdentity,
      all_new_replay_records_have_resolved_identity: _identityFlag,
      new_revision_prompt_fallback_used: _promptFallbackFlag,
      ...legacyFields
    } = record;
    const legacyRecord: LegacyEstimateReplayRecord = {
      ...legacyFields,
      schema: AI_ESTIMATE_LEGACY_REPLAYABLE_CORE_SCHEMA,
    };
    const historicalBefore = JSON.stringify(legacyRecord);
    const usageBefore = LEGACY_REPLAY_MIGRATION.getUsageCount();

    const replay = replayEstimateFromRecord(legacyRecord);

    expect(replay.comparison.status).toBe("passed");
    expect(replay.replayMode).toBe("LEGACY_REPLAY_MIGRATION");
    expect(replay.newRevisionPromptFallbackUsed).toBe(false);
    expect(replay.legacyMigrationEvidence).toMatchObject({
      mode: "LEGACY_REPLAY_MIGRATION",
      registryVersion: "legacy-replay-compatibility-registry-v1",
      historicalRecordMutated: false,
      hashesVerified: true,
      structuralCountersVerified: true,
      canonicalRevisionCreated: true,
      status: "MIGRATED",
      failureCode: null,
    });
    expect(JSON.stringify(legacyRecord)).toBe(historicalBefore);
    expect(LEGACY_REPLAY_MIGRATION.getUsageCount()).toBe(usageBefore + 1);
  });
});
