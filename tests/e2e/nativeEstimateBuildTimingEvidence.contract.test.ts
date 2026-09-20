import fs from "node:fs";
import path from "node:path";

import { parseNativeEstimateBuildTimingEvidence } from "../../scripts/e2e/nativeEstimateBuildTimingEvidence";

describe("native estimate build timing evidence", () => {
  it("admits one production build inside both budgets", () => {
    expect(parseNativeEstimateBuildTimingEvidence([
      `I/ReactNativeJS: '[RikEstimateBuild]', '{"stage":"RUNTIME_DRAFT_READY","elapsedMs":12368}'`,
      `I/ReactNativeJS: '[RikEstimateBuild]', '{"stage":"MEANINGFUL_UI_PUBLISHED","elapsedMs":12402}'`,
      `I/ReactNativeJS: '[RikEstimateBuild]', '{"stage":"BUNDLE_PERSISTED","elapsedMs":12438}'`,
    ].join("\n"))).toMatchObject({
      runtime_draft_ready_ms: 12_368,
      meaningful_ui_published_ms: 12_402,
      first_persist_ms: 12_438,
      runtime_build_count: 1,
      meaningful_ui_publish_count: 1,
      persist_count: 1,
      duplicate_build_count: 0,
      performance_budget_green: true,
      failures: [],
    });
  });

  it("rejects a slow or duplicate build instead of selecting its fastest marker", () => {
    const evidence = parseNativeEstimateBuildTimingEvidence([
      `I/ReactNativeJS: '{"stage":"RUNTIME_DRAFT_READY","elapsedMs":12000}'`,
      `I/ReactNativeJS: '{"stage":"MEANINGFUL_UI_PUBLISHED","elapsedMs":12050}'`,
      `I/ReactNativeJS: '{"stage":"BUNDLE_PERSISTED","elapsedMs":12100}'`,
      `I/ReactNativeJS: '{"stage":"RUNTIME_DRAFT_READY","elapsedMs":49034}'`,
      `I/ReactNativeJS: '{"stage":"MEANINGFUL_UI_PUBLISHED","elapsedMs":49100}'`,
      `I/ReactNativeJS: '{"stage":"BUNDLE_PERSISTED","elapsedMs":49454}'`,
    ].join("\n"));

    expect(evidence.runtime_draft_ready_ms).toBe(49_034);
    expect(evidence.meaningful_ui_published_ms).toBe(49_100);
    expect(evidence.first_persist_ms).toBe(12_100);
    expect(evidence.duplicate_build_count).toBe(1);
    expect(evidence.failures).toEqual(expect.arrayContaining([
      "runtime_draft_ready_budget_exceeded:49034",
      "meaningful_ui_published_budget_exceeded:49100",
      "duplicate_build_count:1",
    ]));
  });

  it("fails closed when production markers are absent", () => {
    expect(parseNativeEstimateBuildTimingEvidence("unrelated log line")).toMatchObject({
      performance_budget_green: false,
      failures: [
        "runtime_draft_ready_marker_missing",
        "meaningful_ui_published_marker_missing",
        "first_persist_marker_missing",
      ],
    });
  });

  it("publishes useful rows before secondary durability work and confirms persistence separately", () => {
    const source = fs.readFileSync(path.resolve(
      process.cwd(),
      "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx",
    ), "utf8");
    const compile = source.indexOf("await compileConsumerCanonicalBaseline");
    const ready = source.indexOf('stage: "RUNTIME_DRAFT_READY"', compile);
    const persistOwner = source.indexOf("const persistCanonicalDraft");
    const earlyUiProjection = source.indexOf(
      "setCanonicalEstimatePreview({",
      persistOwner,
    );
    const previewRender = source.indexOf(
      "<CanonicalEstimateMeaningfulPreviewCard",
      earlyUiProjection,
    );
    const meaningfulUi = source.indexOf(
      'stage: "MEANINGFUL_UI_PUBLISHED"',
      earlyUiProjection,
    );
    const localProjection = source.indexOf(
      'stage: "BUNDLE_LOCAL_PROJECTION_READY"',
      meaningfulUi,
    );
    const durableCommit = source.indexOf(
      "await awaitConsumerRepairBundleDurableCommit",
      meaningfulUi,
    );
    const persisted = source.indexOf('stage: "BUNDLE_PERSISTED"', durableCommit);
    const savedUiProjection = source.indexOf(
      "? { ...current, saved: true }",
      persisted,
    );
    const voluntaryFullProjection = source.indexOf(
      "consumer-estimate-open-full-estimate",
    );

    expect(compile).toBeGreaterThan(-1);
    expect(ready).toBeGreaterThan(compile);
    expect(earlyUiProjection).toBeGreaterThan(persistOwner);
    expect(previewRender).toBeGreaterThan(earlyUiProjection);
    expect(meaningfulUi).toBeGreaterThan(earlyUiProjection);
    expect(localProjection).toBeGreaterThan(meaningfulUi);
    expect(durableCommit).toBeGreaterThan(persistOwner);
    expect(persisted).toBeGreaterThan(durableCommit);
    expect(savedUiProjection).toBeGreaterThan(persisted);
    expect(voluntaryFullProjection).toBeGreaterThan(-1);
    expect(source.match(/stage: "MEANINGFUL_UI_PUBLISHED"/g)).toHaveLength(1);
    expect(source.match(/stage: "BUNDLE_PERSISTED"/g)).toHaveLength(1);
  });
});
