import { createInMemoryAiEstimateLedgerStore } from "../../src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";
import type { AiEstimateLedgerStore } from "../../src/lib/estimate/ledger/AiEstimateLedgerStore";

export function createLedgerWithDraft(input: {
  estimateId?: string;
  ownerUserId?: string;
  revisionId?: string;
  createdAt?: string;
} = {}): AiEstimateLedgerStore {
  const store = createInMemoryAiEstimateLedgerStore();
  const estimateId = input.estimateId ?? "estimate-ledger-test-1";
  const ownerUserId = input.ownerUserId ?? "ledger-owner-1";
  const revisionId = input.revisionId ?? "revision-1";
  const createdAt = input.createdAt ?? "2026-07-09T12:00:00.000Z";
  store.upsertDraft({
    estimateId,
    ownerUserId,
    orgId: null,
    kind: "consumer_repair",
    sourceRoute: "/request",
    title: "Капитальный ремонт",
    prompt: "Квартира 98 м2",
    selectedTemplateId: "capital_repair",
    family: "repair",
    createdAt,
    updatedAt: createdAt,
    status: "draft",
    sourceDraftId: estimateId,
    currentRevisionId: revisionId,
    sourceSnapshotId: `snapshot-${revisionId}`,
    rowCount: 12,
    materialRowsCount: 7,
    workRowsCount: 5,
    artifacts: {
      snapshotId: `snapshot-${revisionId}`,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: revisionId,
    },
    actorUserId: ownerUserId,
    sourceLayer: "runtime",
    idempotencyKey: `upsert:${estimateId}:${revisionId}`,
  });
  return store;
}
