export type ConsumerRepairEditableHistorySummary = {
  revisions: number;
  diffs: number;
  labelRu: string;
};

export function buildConsumerRepairEditableHistorySummary(
  state: { revisions: readonly unknown[]; diffs: readonly unknown[] } | null | undefined,
): ConsumerRepairEditableHistorySummary | null {
  const revisions = state?.revisions.length ?? 0;
  const diffs = state?.diffs.length ?? 0;
  if (revisions <= 1 && diffs === 0) return null;
  return {
    revisions,
    diffs,
    labelRu: `Версий сметы: ${revisions} · изменений: ${diffs}`,
  };
}
