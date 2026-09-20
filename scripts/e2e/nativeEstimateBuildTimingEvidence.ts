export type NativeEstimateBuildTimingEvidence = {
  runtime_draft_ready_ms: number | null;
  meaningful_ui_published_ms: number | null;
  first_persist_ms: number | null;
  runtime_build_count: number;
  meaningful_ui_publish_count: number;
  persist_count: number;
  duplicate_build_count: number;
  performance_budget_green: boolean;
  failures: string[];
};

export function parseNativeEstimateBuildTimingEvidence(
  logText: string,
): NativeEstimateBuildTimingEvidence {
  const records = [...logText.matchAll(/\{"stage":"([^"]+)","elapsedMs":(\d+)\}/g)]
    .map((match) => ({ stage: match[1], elapsedMs: Number(match[2]) }));
  const runtimeReady = records
    .filter((record) => record.stage === "RUNTIME_DRAFT_READY")
    .map((record) => record.elapsedMs);
  const persisted = records
    .filter((record) => record.stage === "BUNDLE_PERSISTED")
    .map((record) => record.elapsedMs);
  const meaningfulUiPublished = records
    .filter((record) => record.stage === "MEANINGFUL_UI_PUBLISHED")
    .map((record) => record.elapsedMs);
  const runtimeDraftReadyMs = runtimeReady.length > 0 ? Math.max(...runtimeReady) : null;
  const meaningfulUiPublishedMs = meaningfulUiPublished.length > 0
    ? Math.max(...meaningfulUiPublished)
    : null;
  const firstPersistMs = persisted[0] ?? null;
  const duplicateBuildCount = Math.max(
    0,
    Math.max(runtimeReady.length, meaningfulUiPublished.length, persisted.length) - 1,
  );
  const failures: string[] = [];
  if (runtimeDraftReadyMs == null) failures.push("runtime_draft_ready_marker_missing");
  else if (runtimeDraftReadyMs > 30_000) failures.push(`runtime_draft_ready_budget_exceeded:${runtimeDraftReadyMs}`);
  if (meaningfulUiPublishedMs == null) failures.push("meaningful_ui_published_marker_missing");
  else if (meaningfulUiPublishedMs > 30_000) {
    failures.push(`meaningful_ui_published_budget_exceeded:${meaningfulUiPublishedMs}`);
  }
  if (firstPersistMs == null) failures.push("first_persist_marker_missing");
  else if (firstPersistMs > 45_000) failures.push(`first_persist_budget_exceeded:${firstPersistMs}`);
  if (duplicateBuildCount > 0) failures.push(`duplicate_build_count:${duplicateBuildCount}`);
  return {
    runtime_draft_ready_ms: runtimeDraftReadyMs,
    meaningful_ui_published_ms: meaningfulUiPublishedMs,
    first_persist_ms: firstPersistMs,
    runtime_build_count: runtimeReady.length,
    meaningful_ui_publish_count: meaningfulUiPublished.length,
    persist_count: persisted.length,
    duplicate_build_count: duplicateBuildCount,
    performance_budget_green: failures.length === 0,
    failures,
  };
}
