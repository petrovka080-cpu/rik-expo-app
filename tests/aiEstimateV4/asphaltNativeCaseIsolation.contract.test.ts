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
    expect(isolation).toContain("isAndroidRequestRouteSurfaceXml(snapshot.xml)");
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
    const provenancePersist = "persistTerminalCaseEvidence(artifactDir, caseIndex + 1, result, {";
    expect(source).toContain(provenancePersist);
    expect(source).toContain("candidate_sha: head");
    expect(source).toContain("tree_hash: tree");
    expect(source).toContain("run_id: options.runId");
    expect(source).toContain("evidence_kind: evidenceKind");
    expect(source.indexOf(provenancePersist)).toBeLessThan(
      source.indexOf("results.push(result)"),
    );
    expect(source).toContain("if (result.failures.length > 0) break");
  });

  it("fail-closes R6 candidate identity and isolates every diagnostic/full output by run ID", () => {
    const source = readRunner();

    expect(source).toContain('value("--run-id=")');
    expect(source).toContain('value("--expected-tree=")');
    expect(source).toContain('"asphalt-v3-final-r6"');
    expect(source).toContain("safeRunId");
    expect(source).toContain("evidenceKind");
    expect(source).toContain("run_output_root_not_empty");
    expect(source).toContain("ACTIVE_CANDIDATE_OWNER.json");
    expect(source).toContain("ACTIVE_GOAL_IDENTITY_MISMATCH:owner_commit_tree");
    expect(source).toContain("active_candidate_owner_matches: activeOwnerMatches");
    expect(source).toContain("...provenance");
    expect(source).toContain('"asphalt-native-run-artifact-manifest/v1"');
    expect(source).toContain('path.join(artifactDir, "artifact-manifest.json")');
    expect(source).not.toContain('"asphalt-v3-final-r5", head, "native-android-api34"');
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

  it("hands focus off from the exact native text input before the next enum action", () => {
    const source = readRunner();
    const focusHandoff = source.slice(
      source.indexOf("async function replaceFocusedInput"),
      source.indexOf("async function setTextInput"),
    );

    expect(focusHandoff).toContain("const dismissed = await dismissSoftKeyboard()");
    expect(focusHandoff).toContain("const blurred = dismissed && await blurFocusedNativeTextInput()");
    expect(focusHandoff).toContain('class="android.widget.EditText"');
    expect(focusHandoff).toContain('focused="true"');
    expect(focusHandoff).toContain('["shell", "input", "keyevent", "66"]');
    expect(focusHandoff).toContain("return !hasFocusedNativeTextInput(dumpUi())");
    expect(focusHandoff).toContain("return typed && dismissed && blurred");
    expect(focusHandoff).not.toContain('["shell", "input", "keyevent", "111"]');
    expect(focusHandoff.indexOf("dismissSoftKeyboard()")).toBeLessThan(
      focusHandoff.indexOf("blurFocusedNativeTextInput()"),
    );
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
    expect(setter).toContain("editable-param-option-${key}-${choiceValue}");
    expect(setter).toContain("tapExactEnumOptionAndWaitForCommit(value)");
    expect(setter).toContain("presentation.choices.length > 0 && dirty");
    expect(setter).toContain("String(choice.value) !== value");
    expect(setter).toContain("tapExactEnumOptionAndWaitForCommit(String(alternate.value))");
    expect(setter).toContain("waitForCommittedValue()");
    expect(setter).toContain("reacquireExactEnumEditorAfterRerender");
    expect(setter).toContain("const initial = await scrollToId(editorId, 8)");
    expect(setter).toContain("reverseStep < 4");
    expect(setter).toContain('swipe("down", reverseStep === 3)');
    expect(setter).toContain("findNodeById(snapshot, editorId)");
    expect(setter).toContain("const editor = exactEditor.node");
    expect(setter).not.toContain("editable-param-batch-dirty-count");
    expect(setter).toContain("tapExactEnumOptionAndWaitForCommit");
    expect(setter).toContain("await returnToTop(16)");
    expect(setter.indexOf("await returnToTop(16)")).toBeLessThan(
      setter.indexOf("findSafeNodeById(optionId, 4)"),
    );
    expect(setter).toContain("findSafeNodeById(optionId, 4)");
    expect(setter).toContain("const stableSnapshot = dumpUi()");
    expect(setter).toContain("const stableNode = findNodeById(stableSnapshot, optionId)");
    expect(setter).toContain('nativeNodeSafeViewportAdjustment(stableNode.bounds, viewport().height) !== "none"');
    expect(setter.indexOf("await wait(800)")).toBeLessThan(
      setter.indexOf("const stableSnapshot = dumpUi()"),
    );
    expect(setter.indexOf("const stableNode = findNodeById(stableSnapshot, optionId)")).toBeLessThan(
      setter.indexOf("if (!tapNode(stableNode)) return false"),
    );
    expect(setter.indexOf("if (!tapNode(stableNode)) return false")).toBeLessThan(
      setter.lastIndexOf("await wait(800)"),
    );
    expect(setter).toContain("await wait(800)");
    expect(setter.lastIndexOf("await wait(800)")).toBeLessThan(
      setter.indexOf("return waitForCommittedValue()"),
    );
    expect(setter).toContain("primary-not-dirty");
    expect(setter).toContain("alternate-not-dirty");
  });

  it("reanchors primary P0 Apply before exact batch-action lookup", () => {
    const source = readRunner();
    const p0Apply = source.slice(
      source.indexOf("for (const key of expectedP0)"),
      source.indexOf("const applied = await waitForCompiledProjection"),
    );

    expect(p0Apply).toContain("await returnToTop(20)");
    expect(p0Apply).toContain('tapById("editable-param-batch-apply", 16)');
    expect(p0Apply.indexOf("await returnToTop(20)")).toBeLessThan(
      p0Apply.indexOf('tapById("editable-param-batch-apply", 16)'),
    );
  });

  it("reacquires every exact tap target into the safe viewport from either clipped edge", () => {
    const source = readRunner();
    const exactTap = source.slice(
      source.indexOf("async function findSafeNodeById"),
      source.indexOf("async function waitForId"),
    );

    expect(exactTap).toContain("safeTopFraction = 0.2");
    expect(exactTap).toContain("safeBottomFraction = 0.62");
    expect(exactTap).toContain("safeTopFraction,");
    expect(exactTap).toContain("safeBottomFraction,");
    expect(exactTap).toContain('adjustment === "invalid"');
    expect(exactTap).toContain("swipe(adjustment)");
    expect(exactTap).toContain("findNodeById(snapshot, testId)");
    expect(exactTap).not.toContain("point.y <= height * 0.62");
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
    expect(source).toContain("const finalEditRevisionLabel = revisionLabel(edited)");
    expect(source).toContain("finalEditRevisionLabel !== revisionBeforeEdit");
    expect(source).toContain("? finalEditRevisionLabel");
  });

  it("retries only a failed paired XML capture and fail-closes incomplete successful-case evidence", () => {
    const source = readRunner();
    const captureFlow = source.slice(
      source.indexOf("function capture"),
      source.indexOf("function requestUri"),
    );

    expect(captureFlow).toContain("let dumped = dumpUi()");
    expect(captureFlow).toContain("!dumped.ok && retry < 2");
    expect(captureFlow).toContain("dumped = dumpUi()");
    expect(captureFlow).not.toContain("wait(");
    expect(source).toContain("mandatory_png_count_expected_4_received_${screenshots.length}");
    expect(source).toContain("mandatory_xml_count_expected_4_received_${uiDumps.length}");
  });

  it("reopens the exact cold-replayed revision without assuming that a capped page count grows", () => {
    const source = readRunner();
    const coldReplay = source.slice(
      source.indexOf("const coldLaunch = launchUri(requestUri())"),
      source.indexOf('markPhase("cold_replay_complete")'),
    );

    expect(coldReplay).toContain("tapHistoryEntryByExactTitle(registration.professionalNameRu)");
    expect(coldReplay).toContain("history_exact_title_open_failed");
    expect(coldReplay).toContain('tapById("consumer-repair-history-button", 16, 0.2, 0.66)');
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
