import fs from "node:fs";
import path from "node:path";

const readRunner = (): string => fs.readFileSync(
  path.resolve(process.cwd(), "scripts/e2e/runAsphalt35NativeAndroidApi34Matrix.ts"),
  "utf8",
);
const read = (relativePath: string): string => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("Asphalt native case isolation contract", () => {
  it("closes only the known PDF/history surfaces and proves a neutral route around every case", () => {
    const source = readRunner();
    const isolation = source.slice(
      source.indexOf("function pdfProjectionVisibleIn"),
      source.indexOf("async function tapById"),
    );

    expect(isolation).toContain('"native-pdf-webview"');
    expect(isolation).toContain('"native-pdf-handoff-shell"');
    expect(isolation).toContain('"pdf-viewer-back"');
    expect(isolation).toContain('"consumer-repair-history-modal"');
    expect(isolation).toContain('"consumer-repair-history-close"');
    expect(isolation).toContain('"consumer-repair-screen"');
    expect(isolation).toContain("blocking_modal_present: blockingModalPresent");
    expect(isolation).toContain("data_wipes: 0");
    expect(isolation).not.toContain('"pm", "clear"');
    expect(isolation).not.toContain("uninstall");

    expect(source).toContain('restoreNativeCaseIsolation("before_case")');
    expect(source).toContain('restoreNativeCaseIsolation("after_pdf", pdfProbe.mode)');
    expect(source.indexOf('restoreNativeCaseIsolation("before_case")')).toBeLessThan(
      source.indexOf("launchUri(requestUri(registration.professionalNameRu, true))"),
    );

    expect(read("src/lib/pdf/PdfViewerNativeShell.tsx")).toContain('testID="native-pdf-handoff-shell"');
    expect(read("src/lib/pdf/PdfViewerScreenContent.tsx")).toContain('testID="pdf-viewer-back"');
  });

  it("keeps the final 35x3 denominator while exposing only a bounded three-case isolation diagnostic", () => {
    const source = readRunner();

    expect(source).toContain('value("--diagnostic-work-count=")');
    expect(source).toContain('value("--diagnostic-start-index=")');
    expect(source).toContain("diagnostic_work_count_expected_2_to_5");
    expect(source).toContain("(options.diagnosticStartIndex + offset) % RoadworksWaveAProductionRegistry.length");
    expect(source).toContain("{ length: options.diagnosticWorkCount }");
    expect(source).toContain("const fullAcceptance = selected.length === 35");
    expect(source).toContain('total: "105/105"');
    expect(source).toContain('"asphalt-35-native-api34-105-result.json"');
  });

  it("durably flushes every terminal case and captures failures that occur before the normal case directory exists", () => {
    const source = readRunner();
    const persistence = source.slice(
      source.indexOf("function persistTerminalCaseEvidence"),
      source.indexOf("async function main"),
    );

    expect(persistence).toContain('"asphalt-native-terminal-case-result/v1"');
    expect(persistence).toContain('"terminal-case-result.json"');
    expect(persistence).toContain("result.failures.length > 0");
    expect(persistence).toContain("terminal-${result.phase_reached}-failure");
    expect(source).toContain("persistTerminalCaseEvidence(artifactDir, caseIndex + 1, result)");
    expect(source.indexOf("persistTerminalCaseEvidence(artifactDir, caseIndex + 1, result)")).toBeLessThan(
      source.indexOf("results.push(result)"),
    );
  });

  it("scrolls a clipped exact parameter wrapper before requiring its owned native input", () => {
    const source = readRunner();
    const exactInputLookup = source.slice(
      source.indexOf("async function findSafeInputOwnedByExactEditor"),
      source.indexOf("function tapNode"),
    );

    expect(exactInputLookup).toContain("if (!input)");
    expect(exactInputLookup).toContain("lookup.node.bounds");
    expect(exactInputLookup).toContain("nativeNodeSafeViewportAdjustment");
    expect(exactInputLookup).toContain('editorAdjustment !== "none"');
    expect(exactInputLookup).toContain("swipe(editorAdjustment)");
    expect(exactInputLookup).not.toContain("android.widget.EditText");
  });

  it("selects exact enum options without requiring an EditText inside the enum editor", () => {
    const source = readRunner();
    const setter = source.slice(
      source.indexOf("async function setInlineParameter"),
      source.indexOf("function revisionLabel"),
    );

    expect(setter.indexOf("presentation.choices.length > 0")).toBeLessThan(
      setter.indexOf("findSafeInputOwnedByExactEditor"),
    );
    expect(setter).toContain("editable-param-option-${key}-${value}");
    expect(setter).toContain("request-estimate-missing-param-${key}");
    expect(setter).toContain("dirty || (!editor && !missing)");
    expect(setter).toContain("waitForCommittedValue()");
  });

  it("requires an immutable revision acknowledgement instead of accepting a stale apply status", () => {
    const source = readRunner();
    const editApply = source.slice(
      source.indexOf("async function applyEditAndWaitForChangedRevision"),
      source.indexOf("function visibleBuildIdentity"),
    );
    const editFlow = source.slice(
      source.indexOf("const changedRevision = revisionBeforeEdit"),
      source.indexOf("const editedDiff"),
    );

    expect(editApply).toContain('tapById("editable-param-batch-apply", 16)');
    expect(editApply).toContain("waitForChangedRevision");
    expect(editApply).toContain("changed.label !== previousRevisionLabel");
    expect(editApply).toContain("Math.min(120_000, remainingMs)");
    expect(editApply).not.toContain("request-estimate-parameter-apply-status");
    expect(source).toContain("applyEditAndWaitForChangedRevision(revisionBeforeEdit)");
    expect(editFlow).not.toContain('waitForId("request-estimate-parameter-apply-status"');
  });

  it("reopens the exact cold-replayed revision without assuming that a capped page count grows", () => {
    const source = readRunner();
    const coldReplay = source.slice(
      source.indexOf("const coldLaunch = launchUri(requestUri())"),
      source.indexOf('markPhase("cold_replay_complete")'),
    );

    expect(coldReplay).toContain("tapHistoryEntryByExactTitle(registration.professionalNameRu)");
    expect(coldReplay).toContain("history_exact_title_open_failed");
    expect(coldReplay).not.toContain("waitForApprovedHistoryCountAtLeast");
    expect(coldReplay).not.toContain('tapById("consumer-repair-history-main"');
  });

  it("opens the PDF owned by the selected immutable history snapshot before any generic row PDF", () => {
    const source = readRunner();
    const pdfOpen = source.slice(
      source.indexOf("const pdfTapped ="),
      source.indexOf("if (!pdfTapped)"),
    );

    expect(pdfOpen.indexOf('tapById("consumer-repair-history-open-pdf-expanded"')).toBeLessThan(
      pdfOpen.indexOf('tapById("consumer-repair-history-pdf"'),
    );
    expect(pdfOpen.indexOf('tapById("consumer-repair-history-open-pdf-inline"')).toBeLessThan(
      pdfOpen.indexOf('tapById("consumer-repair-history-pdf"'),
    );
  });
});
