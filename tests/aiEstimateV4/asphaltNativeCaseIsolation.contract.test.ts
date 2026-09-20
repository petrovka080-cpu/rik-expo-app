import fs from "node:fs";
import path from "node:path";

const readRunner = (): string => fs.readFileSync(
  path.resolve(process.cwd(), "scripts/e2e/runAsphalt35NativeAndroidApi34Matrix.ts"),
  "utf8",
);
const read = (relativePath: string): string => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("Asphalt native case isolation contract", () => {
  it("exposes the guarded local auth broker to the Android emulator before native login", () => {
    const source = readRunner();
    const bootstrap = source.slice(
      source.indexOf("async function openCurrentDevBundle"),
      source.indexOf("async function ensureAuthenticatedRequestRoute"),
    );
    const auth = source.slice(
      source.indexOf("async function ensureAuthenticatedRequestRoute"),
      source.indexOf("async function collectVisibleRowNames"),
    );

    expect(source).toContain("const LOCAL_DEVELOPER_AUTH_BROKER_PORT = 54_329");
    expect(source).toContain("const LOCAL_DEVELOPER_SUPABASE_PORT = 54_321");
    expect(source).toContain("const LOCAL_DEVELOPER_CANONICAL_BACKEND_PORT = 8_765");
    expect(bootstrap).toContain('"reverse"');
    expect(bootstrap).toContain("[LOCAL_DEVELOPER_AUTH_BROKER_PORT, LOCAL_DEVELOPER_AUTH_BROKER_PORT]");
    expect(bootstrap).toContain("[LOCAL_DEVELOPER_SUPABASE_PORT, LOCAL_DEVELOPER_SUPABASE_PORT]");
    expect(bootstrap).toContain("[LOCAL_DEVELOPER_CANONICAL_BACKEND_PORT, LOCAL_DEVELOPER_CANONICAL_BACKEND_PORT]");
    expect(bootstrap).toContain("`tcp:${devicePort}`");
    expect(bootstrap).toContain("if (!adb([");
    expect(auth).toContain('findNodeById(snapshot, "auth.login.local-consumer")');
    expect(source).toContain("async function signOutCurrentNativeSession()");
    expect(source).not.toContain("async function reuseCurrentLocalConsumerSession()");
    expect(source).toContain('findNodeById(snapshot, "bottom-tab-profile")');
    expect(source).toContain('nodeHasId(node, "android:id/button1")');
    expect(auth).toContain("await signOutCurrentNativeSession()");
    expect(auth).toContain("A visually restored session can carry an expired provider token");
    expect(auth).toContain('reason: "native_existing_session_sign_out_failed"');
    expect(auth).toContain('reason: "native_local_consumer_login_screen_missing"');
    expect(auth).toContain('findNodeById(snapshot, "auth.login.error")');
    expect(auth).toContain('reason: "native_local_consumer_login_rejected"');
    expect(source).toContain('findNodeById(snapshot, "profile.logout.button")');
    expect(source).toContain("const x = Math.round(width * 0.9)");
    expect(source).not.toContain('tapById("profile.logout.button"');
  });

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
    expect(source).toContain("`canonical-work:expanded:${profile.canonicalWorkKey}`");
    expect(source).not.toContain("requestedCatalogRecordId: profile.canonicalCatalogRecordId");

    expect(read("src/lib/pdf/PdfViewerNativeShell.tsx")).toContain('testID="native-pdf-handoff-shell"');
    expect(read("src/lib/pdf/PdfViewerScreenContent.tsx")).toContain('testID="pdf-viewer-back"');
  });

  it("isolates repeated owner launches without overloading the actor-role context", () => {
    const source = readRunner();
    const requestUri = source.slice(
      source.indexOf("function requestUri("),
      source.indexOf("function launchUri("),
    );

    expect(requestUri).toContain("launchNonce?: string");
    expect(requestUri).toContain('url.searchParams.set("launchNonce", launchNonce)');
    expect(requestUri).not.toContain('url.searchParams.set("context"');
  });

  it("discards only a proven incomplete diagnostic draft before a fresh owner launch", () => {
    const source = readRunner();
    const discard = source.slice(
      source.indexOf("async function discardIncompleteDiagnosticDraftIfPresent"),
      source.indexOf("async function findSafeNodeById"),
    );

    expect(discard).toContain('findNodeById(snapshot, "consumer-estimate-initial-revision-recovery")');
    expect(discard).toContain('findNodeById(snapshot, "consumer-repair-delete-draft")');
    expect(discard).toContain('findNodeById(snapshot, "consumer-repair-screen")');
    expect(source).toContain("if (!await discardIncompleteDiagnosticDraftIfPresent())");
    expect(source).toContain('"stale_incomplete_diagnostic_draft_discard_failed"');
    expect(discard).not.toContain('"pm", "clear"');
    expect(discard).not.toContain("uninstall");
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

  it("runs the bridge owner with the exact 200 by 32 metre geometry", () => {
    const source = readRunner();

    expect(source).toContain("const BRIDGE_ASPHALT_NATIVE_INPUTS");
    expect(source).toContain("area_m2: 6_400");
    expect(source).toContain('geometry_method: "rectangle"');
    expect(source).toContain("length_m: 200");
    expect(source).toContain("width_m: 32");
    expect(source).toContain('waterproofing_condition: "ACCEPTED"');
    expect(source).toContain('profile.canonicalWorkKey === "bridge_asphalt"');
    expect(source).toContain("function nativeRawPrompt(registration: NativeMatrixRegistration)");
    expect(source).toContain("мост 200 × 32 м (6400 м²)");
    expect(source).toContain("rawInput: nativeRawPrompt(registration)");
    expect(source).toContain("const launchPrompt = nativeRawPrompt(registration)");
    expect(source).toContain("ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4");
    expect(source).toContain("getAsphaltRelatedBaselineAssumptionV4(registration.extraProfile!, key)");
    expect(source).toContain("values.emulsion_rate_l_m2 = values.base_emulsion_rate_l_m2");
    expect(source).toContain("exact_bridge_geometry:");
  });

  it("uses real native item identities while proving bridge delete, restore, and uninterrupted pricing", () => {
    const source = readRunner();
    const acceptance = source.slice(
      source.indexOf("async function runBridgeNativeAmendmentAcceptance"),
      source.indexOf("function buildIdentityEvidenceLog"),
    );

    expect(acceptance).toContain('const removePrefix = "consumer-repair-item-remove-"');
    expect(acceptance).toContain("findSafeRequestNodeByIdPrefixFromTop(removePrefix, 64)");
    expect(acceptance).not.toContain("`${removePrefix}${targetRowId}`");
    expect(acceptance).toContain('"consumer-repair-restore-item"');
    expect(acceptance).toContain(
      "row_counts: [expectedCompleteCount, expectedCompleteCount - 1, expectedCompleteCount]",
    );
    expect(acceptance).toContain('const priceInputPrefix = "consumer-repair-item-unit-price-input-"');
    expect(acceptance).toContain("findSafeRequestNodeByIdPrefixFromTop(priceInputPrefix, 64)");
    expect(acceptance).toContain('for (const digit of ["1", "5", "0"])');
    expect(acceptance).toContain('steps.map((step) => step.value).join("|") !== "1|15|150"');
    expect(acceptance).toContain("steps.some((step) => !step.focused || !step.exact_test_id)");
    expect(acceptance).toContain("const initialRows = await allCanonicalRows(");
    expect(acceptance).toContain("current.current_revision_id,");
    expect(acceptance).toContain("row.includedInEstimate !== false");
    expect(acceptance).toContain("canonicalBackendRowIsPayable");
    expect(source).toContain("returnKnownRequestContainerToTop(96)");
    expect(acceptance).toContain("historyDisplayTitleRu = String(pricedRevision.displayTitleRu");
    expect(source).toContain('terminal_status: failures.length === 0 ? "PASS" : "FAIL"');
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

  it("keeps source-owned norm gaps blocked instead of inventing P0 input or reporting green", () => {
    const source = readRunner();

    expect(source).toContain('terminal_status: "PASS" | "FAIL" | "BLOCKED"');
    expect(source).toContain('blocker_kind: "EXTERNAL_SOURCE_GAP" | null');
    expect(source).toContain('definition.sourceRole === "TECHNICAL_SOURCE_INPUT"');
    expect(source).toContain('definition.sourceRole === "MATERIAL_PASSPORT_INPUT"');
    expect(source).toContain('terminal_status: "BLOCKED"');
    expect(source).toContain('blocker_kind: "EXTERNAL_SOURCE_GAP"');
    expect(source).toContain('"BLOCKED_NATIVE_ANDROID_API34_EXTERNAL_SOURCE_GAPS"');
    expect(source).toContain("blockedCount === 0");
    expect(source).toContain("terminal_not_run:");
    expect(source).toContain('boq_name_assertion_status: "PASS" | "FAIL" | "NOT_RUN_SOURCE_BLOCKED"');
    expect(source).toContain("sourceBlockedWithNoAdditionalUserInput(registration)");
    expect(source).toContain("sourceGateAdvertisedBeforeOpen");
    expect(source).toContain('"source_managed_gate_not_visible_after_exact_intent"');
    expect(source).toContain('"RED_NATIVE_ANDROID_API34_DIAGNOSTIC"');
    expect(source).toContain("if (result.failures.length > 0) break");
    expect(source).not.toContain("sourceManagedBlockers.map((key) => rawParameterValue");
    expect(source).toContain('definition.sourceRole !== "USER_PROJECT_INPUT"');
    expect(source).toContain("expectedCriticalKeys.every((key) => criticalKeys.has(key))");
    expect(source).toContain('markPhase("p0_discovery_started")');
    expect(source).toContain('markPhase("p0_discovery_complete")');
  });

  it("persists resumable phase progress before terminal evidence", () => {
    const source = readRunner();

    expect(source).toContain('schema: "asphalt-native-case-progress/v1"');
    expect(source).toContain('markPhase("case_started")');
    expect(source).toContain('markPhase("external_source_gate_confirmed")');
    expect(source).toContain('markPhase(`p0_fill_${key}_started`)');
    expect(source).toContain('markPhase(`p0_fill_${key}_committed`)');
    expect(source).toContain('markPhase("p0_batch_apply_started")');
    expect(source).toContain('markPhase("p0_batch_apply_tapped")');
    expect(source).toContain('const progressPath = path.join(caseDir, "progress.json")');
    expect(source).toContain("replaceEvidenceFileAtomically(temporary, progressPath)");
    expect(source).toContain("fs.renameSync(temporaryPath, targetPath)");
    expect(source).toContain('["EPERM", "EACCES", "EBUSY"].includes(code)');
    expect(source).toContain("terminal_status: result.terminal_status");
    expect(source).toContain("replaceEvidenceFileAtomically(progressTemporary, progressPath)");
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
    expect(setter).toContain("const visibleEditor = findNodeById(visibleSnapshot, editorId)");
    expect(setter).toContain("findOptionOwnedByEditor(visibleSnapshot, visibleEditor, optionId)");
    expect(setter).toContain("const exactOwned = visibleEditor");
    expect(setter).toContain("nativeNodeSafeViewportAdjustment(visibleOption.bounds, viewport().height)");
    expect(setter).toContain("findSafeOptionOwnedByExactEditor(editorId, optionId)");
    expect(setter.indexOf("const visibleSnapshot = dumpUi()")).toBeLessThan(
      setter.indexOf("findSafeOptionOwnedByExactEditor(editorId, optionId)"),
    );
    expect(setter).toContain("if (!exactOwned) return false");
    expect(setter).toContain("const stableSnapshot = dumpUi()");
    expect(setter).toContain("const stableEditor = findNodeById(stableSnapshot, editorId)");
    expect(setter).toContain("findOptionOwnedByEditor(stableSnapshot, stableEditor, optionId)");
    expect(setter).toContain('nativeNodeSafeViewportAdjustment(stableOption.bounds, viewport().height) !== "none"');
    expect(setter.indexOf("await wait(800)")).toBeLessThan(
      setter.indexOf("const stableSnapshot = dumpUi()"),
    );
    expect(setter.indexOf("const stableEditor = findNodeById(stableSnapshot, editorId)")).toBeLessThan(
      setter.indexOf("if (!tapNode(stableOption)) return false"),
    );
    expect(setter.indexOf("if (!tapNode(stableOption)) return false")).toBeLessThan(
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
    expect(exactGutterScroll).toContain("(rect.bottom - rect.top) * (fine ? 0.44 : 0.28)");
    expect(exactGutterScroll).toContain("(rect.bottom - rect.top) * (fine ? 0.56 : 0.72)");
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
    const exactIntentP0 = source.slice(
      source.indexOf('observedPrecreate.failureToken ?? "preliminary_compiled_revision_observation_missing_after_exact_intent"'),
      source.indexOf("if (sourceBlockedWithNoAdditionalUserInput(registration))"),
    );

    expect(disclosureFlow).toContain("findSafeRequestNodeByIdFromTop(testId, 24)");
    expect(disclosureFlow).toContain("findSafeRequestNodeByIdFromTop(toggleId, maxSwipes)");
    expect(disclosureFlow).toContain("findRequestNodeByIdFromTop(contentId, maxSwipes)");
    expect(disclosureFlow).toContain("tapNode(exactToggle)");
    expect(disclosureFlow).toContain("attempt < 8");
    expect(disclosureFlow).toContain("tapNode(settledToggle)");
    expect(disclosureFlow).not.toContain("scrollToId(");
    expect(disclosureFlow).not.toContain("tapById(");
    expect(exactIntentP0).toContain('await collapseDisclosureIfOpen("request-estimate-items-editor")');
    expect(exactIntentP0).not.toContain("p0_items_disclosure_normalization_failed_after_exact_intent");
    expect(exactIntentP0).toContain("const openedParameters = await openDisclosureAndFind(");
    expect(exactIntentP0).toContain('findNodeById(initial, "request-estimate-parameter-panel")');
    expect(exactIntentP0).not.toContain('collapseDisclosureIfOpen("request-estimate-parameters-toggle")');
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

    expect(coldReplay).toContain("const expectedApprovedRevisionId = pricedRevisionId ?? revisionAfterEdit");
    expect(coldReplay).toContain("tapApprovedHistoryEntryByExactTitle(expectedApprovedHistoryTitle, expectedApprovedRevisionId)");
    expect(coldReplay).toContain("consumer-repair-history-revision-${expectedApprovedRevisionId}");
    expect(coldReplay).toContain("history_exact_title_open_failed");
    expect(coldReplay).toContain('markPhase("history_exact_title_open_complete")');
    expect(coldReplay).toContain("coldRequestReady");
    expect(coldReplay).toContain('waitForIdSparse("consumer-repair-screen"');
    expect(coldReplay).not.toContain('waitForIdSparse("consumer-repair-history-button"');
    expect(coldReplay).toContain("!coldDevBundleInitiallyReady && !coldRequestReady");
    expect(coldReplay).toContain('tapById("consumer-repair-history-button", 16, 0.2, 0.66)');
    expect(coldReplay.indexOf("!coldDevBundleInitiallyReady && !coldRequestReady")).toBeGreaterThan(
      coldReplay.indexOf('if (!await tapById("consumer-repair-history-button"'),
    );
    expect(coldReplay).not.toContain("waitForApprovedHistoryCountAtLeast");
    expect(coldReplay).not.toContain('tapById("consumer-repair-history-main"');
  });

  it("accepts approval only after the durable status transition without requiring a capped history count to grow", () => {
    const source = readRunner();
    const approval = source.slice(
      source.indexOf("const approvedHistoryCountBefore"),
      source.indexOf('markPhase("approval_durable_commit_complete")'),
    );

    expect(source).toContain("async function waitForApprovalDurableCommitStatus");
    expect(source).toContain('status?.text.includes("Заявка утверждена. PDF сохранён в истории")');
    expect(approval).toContain("waitForApprovalDurableCommitStatus()");
    expect(approval).not.toContain("waitForApprovedHistoryIncrement(approvedHistoryCountBefore)");
  });

  it("lets the launch-time native durable write finish before the first route hierarchy dump", () => {
    const source = readRunner();
    const launchPersist = source.slice(
      source.indexOf("const launchPrompt = nativeRawPrompt(registration)"),
      source.indexOf("let observedP0: string[] = []"),
    );

    expect(source).toContain("async function waitForInitialRuntimePersistWithoutUiDumpContention");
    expect(source).toContain("input.timeoutMs ?? 45_000");
    expect(launchPersist).toContain("launchBaselinePersistCount = readRuntimeBuildTiming().persist_count");
    expect(launchPersist).toContain("waitForInitialRuntimePersistWithoutUiDumpContention({");
    expect(launchPersist).toContain("if (!registration.scopeOptionTestId)");
    expect(launchPersist).toContain('"first_persist_marker_missing_within_45s"');
    expect(launchPersist).not.toContain("dumpUi()");
  });

  it("reads build identity and timing from the bounded ReactNativeJS log stream", () => {
    const source = readRunner();
    const identity = source.slice(
      source.indexOf("function buildIdentityEvidenceLog"),
      source.indexOf("function capture("),
    );
    const timing = source.slice(
      source.indexOf("const readRuntimeBuildTiming"),
      source.indexOf("const finishAtRootFailure"),
    );

    expect(identity).toContain('"ReactNativeJS:I"');
    expect(identity).toContain('"*:S"');
    expect(timing).toContain('"ReactNativeJS:I"');
    expect(timing).toContain('"*:S"');
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
    expect(ownerLookup).toContain("expectedRevisionId?: string | null");
    expect(ownerLookup).toContain("findApprovedHistoryEntryByExactTitle(snapshot, expectedTitle, expectedRevisionId)");
    expect(source).toContain('/^Статус:\\s*утверждена(?:\\s|·|$)/u.test(node.text)');
    expect(source).toContain("let retainedRuntimeBuildTiming = parseNativeEstimateBuildTimingEvidence");
    expect(source).toContain('nodeHasId(node, "consumer-repair-history-main")');
    expect(source).toContain('nodeHasId(node, "consumer-repair-history-row")');
    expect(source).toContain("0.82");
    expect(ownerLookup).toContain("findNativeNodeOwnedByExactWrapper(");
    expect(ownerLookup).toContain('nodeHasId(candidate, "consumer-repair-history-pdf")');
    expect(ownerLookup).not.toContain("consumer-repair-history-open-pdf-inline");
    expect(ownerLookup).toContain('swipe("down", step % 4 === 3)');
    expect(ownerLookup).toContain("stableBoundaryCount >= 2");
    expect(pdfOpen).toContain("expectedApprovedHistoryTitle,");
    expect(pdfOpen).toContain("expectedApprovedRevisionId,");
    expect(pdfOpen).toContain("exactHistoryPdfNode && tapNode(exactHistoryPdfNode)");
    expect(pdfOpen).not.toContain("consumer-repair-history-open-pdf-expanded");
  });

  it("reads external-viewer PDF bytes from the Android instant cache without crashing on shell text", () => {
    const source = readRunner();
    const extraction = source.slice(
      source.indexOf("async function extractGeneratedPdfText"),
      source.indexOf("function dumpUi"),
    );

    expect(extraction).toContain('`cache/${safeFileName}`');
    expect(extraction).toContain('`cache/generated-pdfs/${safeFileName}`');
    expect(extraction).toContain('=== "%PDF-"');
    expect(extraction).toContain('Buffer.from("%%EOF")');
    expect(extraction).toContain("} catch {");
    expect(extraction).toContain("return null;");
    expect(source).toContain('normalizedPdfText.includes("статус: полная")');
    expect(source).toContain('failures.push("native_pdf_full_status_missing")');
    expect(source).toContain("&& pdfFullStatusVisible");
  });

  it("checks the PDF against the exact approved history title used to open it", () => {
    const source = readRunner();
    const pdfProjection = source.slice(
      source.indexOf("const normalizedPdfText"),
      source.indexOf("const missingPdfBoqRowNames"),
    );

    expect(pdfProjection).toContain(
      'normalizedPdfText.includes(expectedApprovedHistoryTitle.toLocaleLowerCase("ru-RU"))',
    );
    expect(pdfProjection).not.toContain(
      'normalizedPdfText.includes(registration.professionalNameRu.toLocaleLowerCase("ru-RU"))',
    );
  });

  it("selects a short enum only through the exact parameter editor it belongs to", () => {
    const source = readRunner();
    const enumLookup = source.slice(
      source.indexOf("async function findSafeOptionOwnedByExactEditor"),
      source.indexOf("async function focusInputOwnedByExactEditor"),
    );
    const enumTap = source.slice(
      source.indexOf("const tapExactEnumOptionAndWaitForCommit"),
      source.indexOf(
        "for (let attempt = 0; attempt < 3; attempt += 1)",
        source.indexOf("const tapExactEnumOptionAndWaitForCommit"),
      ),
    );

    expect(enumLookup).toContain("await swipeFine(snapshot, direction)");
    expect(enumLookup).toContain("findOptionOwnedByEditor(snapshot, editor, optionId)");
    expect(enumLookup).toContain("stableBoundaryCount >= 2");
    expect(enumTap).toContain("findSafeOptionOwnedByExactEditor(editorId, optionId)");
    expect(enumTap).toContain("findOptionOwnedByEditor(stableSnapshot, stableEditor, optionId)");
    expect(enumTap).not.toContain("findSafeRequestNodeByIdFromTop(optionId");
  });

  it("reveals the full deterministic parameter batch before filling fields beyond the first five", () => {
    const source = readRunner();
    const reveal = source.slice(
      source.indexOf("async function revealAllMissingParametersIfPresent"),
      source.indexOf("async function findRequestNodeByIdFromTop"),
    );
    const deterministic = source.slice(
      source.indexOf("if (deterministicProjectKeys)"),
      source.indexOf("} else {", source.indexOf("if (deterministicProjectKeys)")),
    );

    expect(reveal).toContain('const testId = "request-estimate-show-more-parameters"');
    expect(reveal).toContain("findSafeRequestNodeByIdFine(testId, 32)");
    expect(reveal).toContain("return !findNodeById(dumpUi(), testId)");
    expect(deterministic).toContain("await revealAllMissingParametersIfPresent()");
    expect(deterministic).toContain("await returnKnownRequestContainerToTop()");
    expect(deterministic.indexOf("await revealAllMissingParametersIfPresent()")).toBeLessThan(
      deterministic.indexOf("await returnKnownRequestContainerToTop()"),
    );
  });

  it("derives legacy owner inputs from role governance while leaving source norms unresolved", () => {
    const source = readRunner();
    const governance = source.slice(
      source.indexOf("const OWNER_SUPPLIED_PARAMETER_ROLES"),
      source.indexOf("function rawParameterValue"),
    );

    expect(governance).toContain('"USER_PROJECT_INPUT"');
    expect(governance).toContain('"PROJECT_DESIGN_INPUT"');
    expect(governance).toContain('"LOGISTICS_INPUT"');
    expect(governance).toContain("registration.extraProfile != null");
    expect(governance).toContain("definition.key !== registration.editParameterKey");
    expect(governance).toContain("definition.sourceFixedBinding == null");
    expect(governance).not.toContain('"TECHNICAL_SOURCE_INPUT"');
    expect(governance).not.toContain('"MATERIAL_PASSPORT_INPUT"');
    expect(source).toContain("deterministicOwnerSuppliedProjectKeys(registration)");
  });

  it("acknowledges the intermediate immutable revision before filling conditional parameters", () => {
    const source = readRunner();
    const start = source.indexOf('markPhase("p0_batch_apply_tapped")');
    const end = source.indexOf("let lastDependentSnapshot = initial", start);
    const intermediate = source.slice(start, end);
    const finalCreate = source.slice(
      source.indexOf("const observedCreate = await observeCompiledRevisionAcrossViewport"),
      source.indexOf("if (!observedCreate.observation)"),
    );

    expect(intermediate).toContain('phase: "create-first-batch"');
    expect(intermediate).toContain("previousRevisionId: createPreviousRevisionId");
    expect(intermediate).toContain("intermediateCompiledRevision = observedIntermediate.observation");
    expect(intermediate).toContain("createPreviousRevisionId = intermediateCompiledRevision.current_revision_id");
    expect(intermediate).toContain("createBaselineRevisionOrdinal = intermediateCompiledRevision.revision_ordinal");
    expect(intermediate).toContain("createExpectedBuildDelta = 0");
    expect(intermediate).toContain("expectedRowCount: null");
    expect(finalCreate).toContain("baselineBuildCount: createBaselineBuildCount");
    expect(finalCreate).toContain("expectedBuildDelta: createExpectedBuildDelta");
    expect(source).toContain("intermediate_compiled_revision: intermediateCompiledRevision");
  });

  it("proves the current source-gap count from the open-panel copy and an exact gate identity", () => {
    const source = readRunner();
    const gate = source.slice(
      source.indexOf("async function confirmExactSourceManagedGate"),
      source.indexOf("async function waitForApprovalDurableCommitStatus"),
    );

    expect(gate).toContain("const countSnapshot = dumpUi()");
    expect(gate).toContain("Данные заказчика заполнены; для ${sourceManagedKeys.length}");
    expect(gate).toContain("(?:нормы|норм)");
    expect(gate).toContain("/Скрыть параметры/u.test(toggleLabel)");
    expect(gate).toContain("if (!tapNode(toggle)) return false");
    expect(gate).toContain("countEvidence = toggleLabel");
    expect(gate).toContain("request-estimate-source-gate-${sourceManagedKeys[0]}");
    expect(gate).toContain("openDisclosureAndFind(");
  });
});
