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
    expect(isolation).toContain("function externalViewerAnrCloseNode");
    expect(isolation).toContain('nodeHasId(node, "android:id/alertTitle")');
    expect(isolation).toContain('nodeHasId(node, "android:id/aerr_close")');
    expect(isolation).toContain('expectedPdfProjection === "android_external_viewer"');
    expect(isolation).toContain("external_viewer_anr_close_failed");
    expect(isolation).toContain("function pressSystemBackAndWaitForIdAbsent");
    expect(isolation).toContain('pressSystemBackAndWaitForIdAbsent("native-pdf-handoff-shell")');
    expect(isolation).toContain('pressSystemBackAndWaitForIdAbsent("consumer-repair-history-modal")');
    expect(isolation).toContain('snapshot.ok !== false && !findNodeById(snapshot, testId)');
    expect(isolation).toContain("snapshot = await waitForKnownCaseBoundarySurface()");
    expect(isolation).toContain("blocking_modal_present: blockingModalPresent");
    expect(isolation).toContain("data_wipes: 0");
    expect(isolation).not.toContain('"pm", "clear"');
    expect(isolation).not.toContain("uninstall");

    expect(source).toContain('restoreNativeCaseIsolation("before_case")');
    expect(source).toContain('restoreNativeCaseIsolation("after_pdf", pdfProbe.mode)');
    expect(source.indexOf('restoreNativeCaseIsolation("before_case")')).toBeLessThan(
      source.indexOf("const launch = launchUri(requestUri("),
    );
    expect(source).toContain("registration.requestedCatalogRecordId");

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

  it("adds the R9 extra9 matrix and the exact three-case API34 diagnostic without weakening old35", () => {
    const source = readRunner();

    expect(source).toContain('value("--matrix-scope=")');
    expect(source).toContain('matrixScopeRaw !== "all44"');
    expect(source).toContain('args.includes("--r9-diagnostic")');
    expect(source).toContain("ASPHALT_RELATED_EXTRA_PROFILES_V4.map");
    expect(source).toContain('"road-scope-option-full_road_infrastructure"');
    expect(source).toContain('"diagnostic-demolition-no-haul"');
    expect(source).toContain('"diagnostic-demolition-with-haul"');
    expect(source).toContain('dependentParameterKeys: ["haul_distance_km", "truck_payload_t"]');
    expect(source).toContain('haul_required: true');
    expect(source).toContain('"dependent_p0_second_apply_failed"');
    expect(source).toContain('total: "27/27"');
    expect(source).toContain('total: "132/132"');
    expect(source).toContain('"ASPHALT_R9_ANDROID_M44X3_RESULT.json"');
    expect(source).toContain("old_35_subset:");
    expect(source).toContain("extra_9_subset:");
    expect(source).toContain("observed_boq_rows: appliedRowCount");
    expect(source).toContain('"asphalt-r9-extra-9-native-api34-27-result.json"');
    expect(source).toContain("registration.requestedCatalogRecordId");
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

  it("types a P0 value only after focus is proven inside the exact parameter editor", () => {
    const source = readRunner();
    const focusExact = source.slice(
      source.indexOf("async function focusInputOwnedByExactEditor"),
      source.indexOf("function tapNode"),
    );
    const setter = source.slice(
      source.indexOf("async function setInlineParameter"),
      source.indexOf("async function applyEditAndWaitForChangedRevision"),
    );

    expect(focusExact).toContain("const stableEditor = findNodeById(stableSnapshot, editorId)");
    expect(focusExact).toContain("findInputOwnedByEditor(stableSnapshot, stableEditor)");
    expect(focusExact).toContain("tapNode(stableInput)");
    expect(focusExact).toContain("const focusedEditor = findNodeById(focusedSnapshot, editorId)");
    expect(focusExact).toContain("findInputOwnedByEditor(focusedSnapshot, focusedEditor)");
    expect(focusExact).toContain("focusedInput?.attrs.includes('focused=\"true\"')");
    expect(setter).toContain("if (!await focusInputOwnedByExactEditor(editorId)) {");
    expect(setter.indexOf("focusInputOwnedByExactEditor(editorId)")).toBeLessThan(
      setter.indexOf("replaceFocusedInput(value)"),
    );
    expect(setter).toContain("exact-focus-missing");
    expect(setter).toContain("input-not-committed");
    expect(setter).not.toContain("tapNode(owned.input)");
  });

  it("rereads a transiently missing UiAutomator XML before fingerprinting or deleting it", () => {
    const source = readRunner();
    const dumpFlow = source.slice(
      source.indexOf("function dumpUi"),
      source.indexOf("function nodeHasId"),
    );

    expect(source).toContain("let uiDumpSequence = 0");
    expect(dumpFlow).toContain("dumpAttempt < 2");
    expect(dumpFlow).toContain("uiDumpSequence += 1");
    expect(dumpFlow).toContain("`${UI_DUMP_DEVICE_PATH_PREFIX}-${process.pid}-${uiDumpSequence}.xml`");
    expect(dumpFlow).toContain("let read = dumped.ok");
    expect(dumpFlow).toContain('!read.output.includes("<hierarchy")');
    expect(dumpFlow).toContain("readAttempt < 20");
    expect(dumpFlow).toContain('["shell", "sleep", "0.25"]');
    expect(dumpFlow).toContain('read = adb(["exec-out", "cat", uiDumpDevicePath]');
    expect(dumpFlow.indexOf("readAttempt < 20")).toBeLessThan(
      dumpFlow.indexOf('["shell", "rm", "-f", uiDumpDevicePath]'),
    );
    expect(dumpFlow).toContain('return { ok: false, xml: "", nodes: []');
  });

  it("observes the committed native value before dismissing the IME", () => {
    const source = readRunner();
    const focusHandoff = source.slice(
      source.indexOf("async function replaceFocusedInput"),
      source.indexOf("async function setTextInput"),
    );

    expect(focusHandoff).toContain("const dismissed = await dismissSoftKeyboard()");
    expect(focusHandoff).toContain("const focusedInput = before.nodes.find");
    expect(focusHandoff).toContain('["shell", "input", "keycombination", "113", "29"]');
    expect(focusHandoff).toContain("if (!selectedAll.ok) return false");
    expect(focusHandoff).toContain("const visibleDeadline = Date.now() + 5_000");
    expect(focusHandoff).toContain("const currentFocusedInput = snapshot.nodes.find");
    expect(focusHandoff).toContain("currentFocusedInput?.text === value");
    expect(focusHandoff).toContain("if (!typedValueVisible) return false");
    expect(focusHandoff.indexOf("await wait(800)")).toBeLessThan(
      focusHandoff.indexOf("const visibleDeadline"),
    );
    expect(focusHandoff).not.toContain("length: 96");
    expect(focusHandoff).not.toContain('"keyevent", "123"');
    expect(focusHandoff).toContain('class="android.widget.EditText"');
    expect(focusHandoff).toContain('focused="true"');
    expect(focusHandoff).toContain("return dismissed");
    expect(focusHandoff).not.toContain('["shell", "input", "keyevent", "66"]');
    expect(focusHandoff).not.toContain('["shell", "input", "keyevent", "111"]');
    expect(focusHandoff.indexOf("currentFocusedInput?.text === value")).toBeLessThan(
      focusHandoff.indexOf("dismissSoftKeyboard()"),
    );
  });

  it("keeps the native IME dismissed without submitting a focused delivery field before viewport search", () => {
    const source = readRunner();
    const observation = source.slice(
      source.indexOf("async function observeCompiledRevisionAcrossViewport"),
      source.indexOf("function inputText"),
    );

    expect(observation).toContain("const keyboardDismissed = await dismissSoftKeyboard()");
    expect(observation).toContain("const keyboardRemainedDismissed = keyboardDismissed && await dismissSoftKeyboard()");
    expect(observation).toContain("STOP_R9_HARNESS_COMPILED_VIEWPORT_IME_NOT_DISMISSED");
    expect(observation).not.toContain("blurFocusedNativeTextInput()");
    expect(observation.indexOf("dismissSoftKeyboard()")).toBeLessThan(
      observation.indexOf("findCompiledRevisionMarkerAcrossViewport"),
    );
  });

  it("selects exact enum options without requiring an EditText inside the enum editor", () => {
    const source = readRunner();
    const setter = source.slice(
      source.indexOf("async function setInlineParameter"),
      source.indexOf("async function applyEditAndWaitForChangedRevision"),
    );

    expect(setter.indexOf("presentation.choices.length > 0")).toBeLessThan(
      setter.indexOf("focusInputOwnedByExactEditor"),
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
    expect(setter).toContain("const visibleSnapshot = dumpUi()");
    expect(setter).toContain("const visibleNode = findNodeById(visibleSnapshot, optionId)");
    expect(setter).toContain("const exactSafeNode = visibleNode");
    expect(setter).toContain("nativeNodeSafeViewportAdjustment(visibleNode.bounds, viewport().height)");
    expect(setter).toContain("findSafeRequestNodeByIdFromTop(optionId, 18)");
    expect(setter.indexOf("const visibleSnapshot = dumpUi()")).toBeLessThan(
      setter.indexOf("findSafeRequestNodeByIdFromTop(optionId, 18)"),
    );
    expect(setter).toContain("if (!exactSafeNode) return false");
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

  it("finds enum options from the exact request ScrollView gutter without a system-edge or center gesture", () => {
    const source = readRunner();
    const topReturn = source.slice(
      source.indexOf("function requestSummaryCardAnchoredInSafeViewport"),
      source.indexOf("async function findSafeRequestNodeByIdFromTop"),
    );
    const finder = source.slice(
      source.indexOf("async function findSafeRequestNodeByIdFromTop"),
      source.indexOf("async function readSettledViewport"),
    );

    expect(topReturn).toContain('findNodeById(snapshot, "request-estimate-summary-card")');
    expect(topReturn).toContain("nativeNodeSafeViewportAdjustment(summary.bounds, viewport().height)");
    expect(topReturn).toContain("requestSummaryCardAnchoredInSafeViewport(snapshot)");
    expect(topReturn).toContain("scrollKnownRequestContainer(snapshot, direction)");
    expect(topReturn).toContain('scanForAnchor("down")');
    expect(topReturn).toContain('scanForAnchor("up")');
    expect(topReturn).toContain("step < maxSwipes");
    expect(source).toContain("Math.min(50, (rect.right - rect.left) * 0.046)");
    expect(source).not.toContain("Math.min(76, (rect.right - rect.left) * 0.071)");
    expect(source).not.toContain("Math.min(64, (rect.right - rect.left) * 0.06)");
    expect(source).not.toContain("Math.min(24, (rect.right - rect.left) * 0.02)");
    const exactGutterScroll = source.slice(
      source.indexOf("async function scrollKnownRequestContainer"),
      source.indexOf("function scrollKnownRequestContainerUp"),
    );
    expect(exactGutterScroll).toContain("await wait(200)");
    expect(exactGutterScroll).toContain("(rect.bottom - rect.top) * 0.28");
    expect(exactGutterScroll).toContain("(rect.bottom - rect.top) * 0.72");
    expect(exactGutterScroll).toContain('const motionEvents: readonly ["DOWN" | "MOVE" | "UP", number][]');
    expect(exactGutterScroll).toContain('["DOWN", startY]');
    expect(exactGutterScroll).toContain('["MOVE", yAt(0.5)]');
    expect(exactGutterScroll).toContain('["UP", endY]');
    expect(exactGutterScroll).toContain('"motionevent"');
    expect(exactGutterScroll).not.toContain('"swipe"');
    expect(exactGutterScroll).toContain("if (index > 0) await wait(80)");
    expect(exactGutterScroll).toContain("if (!await dismissSoftKeyboard()) return false");
    expect(exactGutterScroll).toContain("return dismissSoftKeyboard()");
    expect(exactGutterScroll.indexOf("await wait(200)")).toBeLessThan(
      exactGutterScroll.indexOf("const motionEvents"),
    );
    expect(finder).toContain("await returnKnownRequestContainerToTop()");
    expect(finder).toContain("step <= maxSwipes");
    expect(finder).toContain('scrollKnownRequestContainer(snapshot, "up")');
    expect(finder).toContain("nativeNodeSafeViewportAdjustment(node.bounds, viewport().height)");
    expect(finder).toContain("stableBoundaryCount >= 2");
    expect(finder).not.toContain('const x = Math.round(width * 0.5)');
  });

  it("navigates estimate disclosures only through exact request-container IDs", () => {
    const source = readRunner();
    const disclosureFlow = source.slice(
      source.indexOf("async function collapseDisclosureIfOpen"),
      source.indexOf("async function findOptionalApprovalContactInputs"),
    );
    const editTransition = source.slice(
      source.indexOf("const create = true"),
      source.indexOf("const changedRevision = await applyEditAndWaitForChangedRevision"),
    );

    expect(disclosureFlow).toContain("findSafeRequestNodeByIdFromTop(testId, 24)");
    expect(disclosureFlow).toContain("findSafeRequestNodeByIdFromTop(toggleId, maxSwipes)");
    expect(disclosureFlow).toContain("findRequestNodeByIdFromTop(contentId, maxSwipes)");
    expect(disclosureFlow).toContain("tapNode(exactToggle)");
    expect(disclosureFlow).not.toContain("scrollToId(");
    expect(disclosureFlow).not.toContain("tapById(");
    expect(editTransition).not.toContain("await returnToTop(16)");
  });

  it("reanchors primary P0 Apply before exact batch-action lookup", () => {
    const source = readRunner();
    const p0Apply = source.slice(
      source.indexOf("for (const key of expectedP0)"),
      source.indexOf("const observedCreate = await observeCompiledRevisionAcrossViewport"),
    );

    expect(p0Apply).toContain("await returnToTop(20)");
    expect(p0Apply).toContain('tapById("editable-param-batch-apply", 16)');
    expect(p0Apply.indexOf("await returnToTop(20)")).toBeLessThan(
      p0Apply.indexOf('tapById("editable-param-batch-apply", 16)'),
    );
  });

  it("reanchors the create marker from a safely visible summary instead of a clipped XML remnant", () => {
    const source = readRunner();
    const createFlow = source.slice(
      source.indexOf("const d0Timing = readRuntimeBuildTiming()"),
      source.indexOf("if (!observedCreate.observation)"),
    );

    expect(createFlow).toContain("returnKnownRequestContainerToTop(40)");
    expect(createFlow).toContain('"create_post_apply_top_reanchor_failed"');
    expect(createFlow.indexOf("returnKnownRequestContainerToTop(40)")).toBeLessThan(
      createFlow.indexOf("const observedCreate"),
    );
  });

  it("acknowledges the exact scope and preliminary revision before final P0 Apply", () => {
    const source = readRunner();
    const start = source.indexOf("if (registration.scopeOptionTestId)");
    const end = source.indexOf(
      'let initial = await waitForIdSparse("request-estimate-parameters-toggle"',
      start,
    );
    const scopeFlow = source.slice(start, end);

    expect(scopeFlow).toContain("findSafeNodeById(registration.scopeOptionTestId, 6)");
    expect(scopeFlow).toContain("await wait(800)");
    expect(scopeFlow).toContain("settledScopeNode");
    expect(scopeFlow).toContain('"request-estimate-selected-scope"');
    expect(scopeFlow).toContain('phase: "precreate"');
    expect(scopeFlow).toContain('expectedCalculationStatus: "needs_more_params_but_preliminary_available"');
    expect(scopeFlow).toContain("createPreviousRevisionId = precreateCompiledRevision.current_revision_id");
    expect(scopeFlow).toContain("discoverGovernedScopeCriticalMissingKeys(initial)");
    expect(scopeFlow).toContain("p0_governance_unknown_parameter:");
    expect(scopeFlow).toContain("p0_governed_input_value_missing:");
    expect(scopeFlow).toContain("for (const key of expectedP0)");
    expect(scopeFlow).toContain('tapById("editable-param-batch-apply", 16)');
    expect(scopeFlow).not.toContain("tapById(registration.scopeOptionTestId");
    expect(scopeFlow).not.toContain("p0_schema_mismatch:");
    expect(source).toContain("expectedCalculationStatus: registration.scopeOptionTestId");
    expect(source).toContain('? "needs_more_params_but_preliminary_available"');
    expect(source).toContain(': "draft_ready"');
  });

  it("derives scope P0 from exact visible IDs and the production Asphalt schema", () => {
    const source = readRunner();
    const discovery = source.slice(
      source.indexOf("const ASPHALT_SCOPE_PARAMETER_DEFINITIONS"),
      source.indexOf("async function setInlineParameter"),
    );

    expect(discovery).toContain("ASPHALT_WORK_SPECIFIC_PARAMETERS_V4.map");
    expect(discovery).toContain('parameter.necessity === "critical"');
    expect(discovery).toContain("classifyGovernedMissingParameterKeys");
    expect(discovery).toContain("scrollKnownRequestContainerUp(snapshot)");
    expect(discovery).toContain("step <= 18");
    expect(discovery).toContain("unknownKeys");
    expect(discovery).not.toContain("registration.parameterDefinitions");
  });

  it("reacquires optional approval contact inputs in one exact forward snapshot", () => {
    const source = readRunner();
    const contactLookup = source.slice(
      source.indexOf("async function findOptionalApprovalContactInputs"),
      source.indexOf("async function readApprovedHistoryCount"),
    );
    const approvalFlow = source.slice(
      source.indexOf("const approvedHistoryCountBefore"),
      source.indexOf("const approveNode"),
    );

    expect(contactLookup).toContain("await returnToTop(20)");
    expect(contactLookup).toContain("index < 24");
    expect(contactLookup).toContain('findNodeById(snapshot, "consumer-repair-address-input")');
    expect(contactLookup).toContain('findNodeById(snapshot, "consumer-repair-phone-input")');
    expect(contactLookup).toContain("if (address && phone)");
    expect(contactLookup).toContain('findNodeById(snapshot, "consumer-repair-delivery-summary")');
    expect(contactLookup).toContain('swipe("up", index % 4 === 3)');
    expect(contactLookup).not.toContain("scrollToId");
    expect(contactLookup).not.toContain("tapNode");
    expect(approvalFlow).toContain("await findOptionalApprovalContactInputs()");
    expect(approvalFlow).toContain('nativeOptionalControlledInputIsEmpty(optionalContacts.address, "Адрес")');
    expect(approvalFlow).toContain('nativeOptionalControlledInputIsEmpty(optionalContacts.phone, "Телефон")');
    expect(approvalFlow).toContain("approval_optional_contact_state_contract_failed");
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
    const exactApplyLookup = source.slice(
      source.indexOf("async function findExactBatchApplyBeforeEditedParameter"),
      source.indexOf("async function readSettledViewport"),
    );
    const editApply = source.slice(
      source.indexOf("async function applyEditAndWaitForChangedRevision"),
      source.indexOf("function buildIdentityEvidenceLog"),
    );
    const editFlow = source.slice(
      source.indexOf("const changedRevision = await applyEditAndWaitForChangedRevision"),
      source.indexOf("const editedDiff"),
    );

    expect(exactApplyLookup).toContain('findNodeById(snapshot, "editable-param-batch-apply")');
    expect(exactApplyLookup).toContain('scrollKnownRequestContainer(snapshot, "down")');
    expect(exactApplyLookup).toContain("stableBoundaryCount >= 2");
    expect(exactApplyLookup).not.toContain("returnKnownRequestContainerToTop");
    expect(editApply).toContain("findExactBatchApplyBeforeEditedParameter()");
    expect(editApply).toContain("!exactApplyNode || !tapNode(exactApplyNode)");
    expect(editApply).toContain('capture(input.caseDir, "edit-apply-action-missing")');
    expect(editApply).not.toContain('tapById("editable-param-batch-apply"');
    expect(editApply).toContain("await returnKnownRequestContainerToTop()");
    expect(editApply).toContain('failureToken: "edit_post_apply_top_reanchor_failed"');
    expect(editApply.indexOf("await returnKnownRequestContainerToTop()")).toBeLessThan(
      editApply.indexOf("const observed = await observeCompiledRevisionAcrossViewport"),
    );
    expect(editApply).toContain("observeCompiledRevisionAcrossViewport");
    expect(editApply).toContain("previousRevisionId: input.previous.current_revision_id");
    expect(editApply).toContain("baselineRevisionOrdinal: input.previous.revision_ordinal");
    expect(editApply).toContain("expectedBuildDelta: 0");
    expect(editApply).toContain("expectedCalculationStatus: input.expectedCalculationStatus");
    expect(editApply).not.toContain("request-estimate-parameter-apply-status");
    expect(editApply).not.toContain("for (let attempt");
    expect(source).toContain("const changedRevision = await applyEditAndWaitForChangedRevision({");
    expect(editFlow).toContain("previous: createCompiledRevision");
    expect(editFlow).toContain("expectedCalculationStatus: createCompiledRevision.calculation_status");
    expect(editFlow).toContain('changedRevision.failureToken !== "edit_apply_failed"');
    expect(editFlow).toContain("failures.push(changedRevision.failureToken)");
    expect(editFlow).toContain("editCompiledRevision = changedRevision.observation");
    expect(editFlow).not.toContain('waitForId("request-estimate-parameter-apply-status"');
    expect(source).toContain("const revisionAfterEdit = changedRevision.label");
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

  it("opens only the PDF owned by the selected immutable history snapshot", () => {
    const source = readRunner();
    const ownerLookup = source.slice(
      source.indexOf("async function findSelectedHistoryInlinePdfAction"),
      source.indexOf("async function returnToTop"),
    );
    const pdfOpen = source.slice(
      source.indexOf("const exactHistoryPdfNode ="),
      source.indexOf("if (!pdfTapped)"),
    );

    expect(ownerLookup).toContain("expectedTitle: string");
    expect(ownerLookup).toContain('findNodeById(snapshot, "consumer-repair-history-readonly-snapshot")');
    expect(ownerLookup).toContain("findNativeWrapperOwningExactText(");
    expect(ownerLookup).toContain('nodeHasId(candidate, "consumer-repair-history-main")');
    expect(ownerLookup).toContain('nodeHasId(candidate, "consumer-repair-history-row")');
    expect(ownerLookup).toContain("nativeBoundsAreContainedBy(exactHistoryMain.bounds, candidate.bounds)");
    expect(ownerLookup).toContain("findNativeNodeOwnedByExactWrapper(");
    expect(ownerLookup).toContain('nodeHasId(candidate, "consumer-repair-history-pdf")');
    expect(ownerLookup).not.toContain("consumer-repair-history-open-pdf-inline");
    expect(ownerLookup).toContain('swipe("down", step % 4 === 3)');
    expect(ownerLookup).toContain("stableBoundaryCount >= 2");
    expect(pdfOpen).toContain("findSelectedHistoryInlinePdfAction(registration.professionalNameRu)");
    expect(pdfOpen).toContain("exactHistoryPdfNode && tapNode(exactHistoryPdfNode)");
    expect(pdfOpen).not.toContain("consumer-repair-history-open-pdf-expanded");
  });
});
