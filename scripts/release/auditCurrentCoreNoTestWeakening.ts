import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE_CHECKPOINT = "e4daae88344f3f8f07e943701df5529aa9c64b74";
const USER_OWNED_TEST_PATHS = new Set([
  "tests/e2e/androidDeepLinkLaunchContract.contract.test.ts",
]);
const GUARDED_FIXTURES = [
  "tests/fixtures/aiPlatform/eval/aiEstimateGoldenEvalCases.json",
  "tests/fixtures/estimate/productionGradeWebAndroidCriticalCases.json",
] as const;
const REVIEWED_GUARDED_FIXTURE_CHANGES: Readonly<Record<string, {
  base_blob: string;
  reviewed_blob: string;
  production_reason: string;
  proof_coverage_not_reduced: string;
}>> = {
  "tests/fixtures/aiPlatform/eval/aiEstimateGoldenEvalCases.json": {
    base_blob: "b6f0e6b69318312c2604f24343b7a9ebebe7a8a6",
    reviewed_blob: "c4ccc9d173a34a0a43ef102a07c6cfeb62c92ec1",
    production_reason: "make every road golden request explicitly select the complete road-structure scope instead of relying on a forbidden implicit default",
    proof_coverage_not_reduced: "all 700 cases and their expected outputs remain present; only the 35 road prompts are strengthened with explicit base-course and two-layer asphalt evidence",
  },
  "tests/fixtures/estimate/productionGradeWebAndroidCriticalCases.json": {
    base_blob: "72bfbeddc03b040e3310f6d1415eabecb148bac3",
    reviewed_blob: "073d9f291d9c7e92bed3f8cf602c1f590164f8ab",
    production_reason: "replace broad category expectations with exact canonical work identities and align unit contracts with the domain-specific BOQ",
    proof_coverage_not_reduced: "the fixture remains exactly 100 cases across all ten coverage groups; the reviewed blob strengthens 33 family checks to exact identities, expands Asphalt V4 units, and removes only semantically inapplicable units",
  },
};

type TestContractAuditEntry = {
  path: string;
  old_expectation: string;
  new_expectation: string;
  production_reason: string;
  proof_coverage_not_reduced: string;
};

function entry(
  pathValue: string,
  oldExpectation: string,
  newExpectation: string,
  productionReason: string,
  proof: string,
): TestContractAuditEntry {
  return {
    path: pathValue,
    old_expectation: oldExpectation,
    new_expectation: newExpectation,
    production_reason: productionReason,
    proof_coverage_not_reduced: proof,
  };
}

export const CURRENT_CORE_TEST_CONTRACT_AUDIT: readonly TestContractAuditEntry[] = [
  entry("src/components/map/leafletWebCss.test.ts", "double-cast partial Document fixture", "typed minimal CSS document adapter", "remove an unsafe test cast while matching the production dependency boundary", "the same two calls still assert exactly one stylesheet insertion and exact id, rel and href"),
  entry("src/features/ai/assistantStorage.test.ts", "double-cast AsyncStorage mock", "structurally typed AsyncStorage mock", "remove an unsafe test cast without changing storage behavior", "bounded retention, expiry envelope, clear behavior and foreman snapshot trimming assertions are unchanged"),
  entry("src/lib/ai_reports.test.ts", "double-cast Supabase from mock", "typed Jest module mock", "remove an unsafe test cast and retain the real transport chain", "the exact select and rik_code filter remain asserted and the removed company_id filter remains forbidden"),
  entry("src/lib/crossStorage.test.ts", "double-cast AsyncStorage mock", "structurally typed AsyncStorage mock", "remove an unsafe test cast without changing persistence semantics", "protected envelope, legacy plaintext, safe parse and circular stringify assertions are unchanged"),
  entry("src/lib/developerOverride.test.ts", "localhost or native development could open override without explicit opt-in", "explicit opt-in is required together with local, development or internal runtime proof", "keep temporary developer access while production remains fail-closed", "adds production denial and opt-in checks while retaining local web, native dev, internal channel and automation coverage"),
  entry("src/lib/estimate/v4/asphalt/roadScopeTruthV4.test.ts", "non-road template word collision was uncovered", "drawings inside a non-road ID must remain NOT_ROAD", "road intent is determined from semantic subject, not incidental substrings", "adds a negative resolver case"),
  entry("src/lib/exports/xlsxExport.test.ts", "mocked third-party xlsx runtime", "deterministic bounded OOXML without formulas, macros or external links", "remove vulnerable universal parser from runtime", "adds archive determinism, malicious payload and bounds checks"),
  entry("src/lib/filePick.test.ts", "minimal detached input mock", "DOM-attached input lifecycle mock", "match the production browser file-pick lifecycle", "same user behavior plus cleanup coverage"),
  entry("src/lib/observability/console.governance.test.ts", "Jasmine global fail helper", "portable thrown Error", "Jest runtime no longer exposes the legacy helper consistently", "violation scan and failure semantics are unchanged"),
  entry("src/lib/supabaseClient.test.ts", "single concatenated logger argument", "structured logger prefix and message arguments", "match governed logger ownership", "warning text and once-only behavior remain asserted"),
  entry("src/screens/profile/AddListingScreen.contract.test.ts", "two-destination single-line ternary", "seller, my-listings and market return destinations", "the add-listing flow now preserves its exact entry destination", "adds the third governed return route while retaining seller and market coverage"),
  entry("src/screens/profile/addListingCatalogItem.contract.test.ts", "catalog item construction lived inside the screen without an owner contract", "pure catalog-item owner preserves identity, unit, kind and city precedence", "decompose AddListingScreen without changing listing semantics", "adds exact deterministic output coverage for the extracted owner"),
  entry("src/screens/profile/addListingCoordinates.contract.test.ts", "location permission and coordinate validation lived inside the screen", "injected coordinate gateway fails closed and accepts only finite coordinates", "make permission and sensor failure behavior independently testable", "adds denied, valid and non-finite coordinate cases"),
  entry("src/screens/profile/addListingNavigation.contract.test.ts", "return-route ternary lived inside the screen", "typed navigation owner covers seller, my-listings and market", "preserve deep-link return ownership after decomposition", "adds exact assertions for every supported destination"),
  entry("src/screens/profile/addListingProjection.contract.test.ts", "instant listing projection lived inside the screen", "pure projection owner preserves catalog, seller, media and numeric semantics", "separate view orchestration from market domain projection", "adds exact normalized price, quantity, identity and image assertions"),
  entry("src/screens/profile/addListingSubmission.contract.test.ts", "coordinate lookup, mutation and instant caches were coupled inside the screen", "submission owner has injected gateways and explicit coordinate failure result", "make the publish transaction independently verifiable", "adds a negative no-mutation case and exact dual-cache success coverage"),
  entry("src/screens/profile/addListingValidation.contract.test.ts", "validation rules lived inside the screen", "pure validation owner rejects incomplete input and parses positive decimal prices", "separate form policy from UI orchestration", "adds malformed-field, locale decimal, zero and nonnumeric negative cases"),
  entry("src/screens/profile/hooks/useAddListingOwners.contract.test.ts", "owner loading and form state were embedded in AddListingScreen", "source contract requires dedicated form and owner-context hooks", "enforce real responsibility boundaries below the 500-line component limit", "requires both owner hooks and forbids the extracted services in the screen"),
  entry("tests/ai/assistantClientModelGatewayMigration.contract.test.ts", "assistantClient was required to import AiModelGateway directly", "assistantClient uses ServerAiModelProvider and the provider owns AiModelGateway", "enforce the canonical AI platform provider boundary", "still forbids legacy Gemini and requestAiGeneratedText while additionally proving both chain links"),
  entry("tests/aiEstimateV4/catalogProfessionalCoverageLedgerV4.contract.test.ts", "no honest 11610 corpus classification ledger", "exact 12/7152/1288/3158 classification", "prevent technical templates from being promoted to passports", "adds exact totals, uniqueness, ownership and unresolved-input checks"),
  entry("tests/aiEstimateV4/estimateRevisionSafeJsonBoundary.contract.test.ts", "durable envelope parsing had no malformed or size mutation matrix", "checksum-valid input passes while malformed, truncated, primitive, wrong-version, corrupted and oversized payloads fail closed", "bound durable JSON before checksum and parse in UTF-8 bytes", "adds eleven positive and negative read/write boundary assertions without removing recovery coverage"),
  entry("tests/app/office-index-route-scope.test.tsx", "brittle receipt projection harness", "exact route consumes and clears receipt", "verify the real route ownership boundary", "assertions cover both projection and one-time consumption"),
  entry("tests/architecture/aiEstimateArchitectureFitnessMatrix.contract.test.ts", "opaque status mismatch", "same matrix assertions with diagnostic payload", "make failures actionable without changing a threshold", "1000/1000, 200/200 and 100/100 remain exact"),
  entry("tests/architecture/architectureAntiRegressionSuite.test.ts", "component debt fixture asserted only file, line and hook counts and AI ownership stopped at a direct gateway import", "fixture asserts all eight component metrics and the AI test proves assistant-to-platform-provider-to-gateway ownership", "keep the unit contract aligned with the strengthened live architecture scanner", "exact equality remains in place and five component metrics plus the provider chain are added"),
  entry("tests/architecture/allRoutesHaveErrorBoundary.contract.test.ts", "53 exact routes", "54 exact routes", "route inventory gained one governed route", "boundary equality remains exact and the inventory count increases"),
  entry("tests/architecture/consumerRepairRequestScreenSingleCanonicalChrome.contract.test.ts", "sent or approved always opened the existing PDF", "only a finalized current revision opens the existing PDF", "an edited finalized request needs a fresh PDF and approval", "retains both PDF actions and adds stale-revision protection"),
  entry("tests/architecture/globalLocalAndroidApi34Smoke.contract.test.ts", "obsolete visible-line component strings", "current editable row and top-proof semantic anchors", "follow canonical request presentation ownership", "requires row count, editable status and representative visible lines"),
  entry("tests/architecture/godComponentsDecomposition.contract.test.ts", "scanner GREEN did not prove the physical AddListingScreen boundary", "AddListingScreen must be below 500 physical and callable meaningful lines with all metrics present", "prevent formatter or StyleSheet accounting from hiding a real monolith", "adds exact live-scanner metric presence and two unchanged 500-line thresholds"),
  entry("tests/architecture/transportOwnershipMap.test.ts", "70 owners including deleted xlsx loader", "69 live transport owners", "unsafe xlsx transport owner was removed", "owner map still equals the complete live transport inventory"),
  entry("tests/boqDepth/masonryDepth.contract.test.ts", "masonry depth assertion accepted eight or more rows", "masonry compiler must return exactly 75 governed rows", "seal the current professional masonry BOM/WBS depth against truncation", "changes a lower bound into exact equality at a substantially higher row count"),
  entry("tests/boqDepth/professionalDocumentationPackage.contract.test.ts", "professional depth coverage did not independently reject procurement materials fabricated from as-built documentation", "as-built documentation is exactly one governed labor set with no material projection and valid unit/depth semantics", "keep documentation ownership in labor and out of procurement", "adds a negative material-row assertion plus exact section, unit, quantity, trace, unit-semantics and depth validation"),
  entry("tests/boqDepth/professionalWbsNoPadding.contract.test.ts", "generic WBS metadata checks", "mini-CHP phase-by-phase applicability and governance", "prove depth comes from plant systems rather than row padding", "adds exact 20 phases, five roles, formulas, sources and procurement flags"),
  entry("tests/consumerRepair/approvedHistoryDurableStorageMigration.contract.test.ts", "hard-coded 500-row assumptions", "large revisions use durable storage and compact revisions remain local", "exercise the actual transactional size boundary", "adds recovery, failure injection and edited-row parity"),
  entry("tests/consumerRepair/durableQuantityEditTransaction.contract.test.ts", "expected raw internal trace toggle in row UI", "internal trace is absent from editable public row", "internal identifiers are projected through sanitized summary/PDF owners", "structured trace persistence and sanitized projection remain covered elsewhere"),
  entry("tests/e2e/androidApi34ProofEnvironment.contract.test.ts", "hard-coded work tokens in shell source", "semantic anchors plus representative BOQ tokens", "separate route-shell evidence from work content evidence", "requires both semantic anchors and representative domain tokens"),
  entry("tests/estimateArchitecture/noSplitBrainEstimateEngine.contract.test.ts", "synthetic family fallback was tolerated", "synthetic family fallback must be zero", "canonical family ownership is now complete", "strictly strengthens the architecture gate"),
  entry("tests/estimateBackfill/catalogBackfillBatches.contract.test.ts", "95 concrete/electrical templates were counted as transport", "exact corrected P1/P2 counts and zero misclassified templates", "family classification follows construction domain ownership", "adds a semantic regression assertion in addition to exact counts"),
  entry("tests/estimateCalculator/familyMaterialSlotPolicies.test.ts", "selected a fence case that did not explicitly request a gate", "gate scenario explicitly asks for a 4 m gate", "test optional material applicability, not resolver ambiguity", "the paired no-gate assertion still proves absence when not requested"),
  entry("tests/estimateInfrastructure/aiEstimateQuantityTrace.contract.test.ts", "ambiguous road prompt implicitly chose scope", "trace test supplies explicit ROAD_SURFACING_ONLY scope", "isolate quantity-trace behavior from the separately tested scope selector", "road ambiguity remains covered by roadScopeTruth and resolver suites"),
  entry("tests/estimateRuntime/estimatorMemoryLifecycleGate.contract.test.ts", "sharding could hide retained estimator objects", "synthetic plateau passes and retained growth fails", "keep a one-process leak gate independent of sharding", "adds a new negative memory-growth contract"),
  entry("tests/estimateRuntime/full11610TrustedCostingAudit.test.ts", "claimed 11610 preliminary prices", "exact 11270 preliminary plus 340 PRICE_INPUT_REQUIRED outcomes", "missing rates must not become fake prices", "all 11610 outcomes, zero fake totals and exact priority splits remain asserted"),
  entry("tests/estimateRuntime/professionalBoqRuntimeContract.test.ts", "runtime contract did not reject duplicate fallback equipment or an area-priced tile primer", "fence equipment must reuse specialized BOQ rows and tile primer must remain a consumable quantity", "prevent literal-name fallback matching from adding unpriced duplicate equipment and preserve physical material units", "adds two negative duplicate-row assertions and an exact kg primer-unit assertion while retaining the full 18-case runtime contract"),
  entry("tests/estimateStructuredPipeline/requestUsesStructuredPayload.contract.test.ts", "raw visible text equality", "sanitized canonical visible text equality", "public projection must not expose internal keys", "same payload rows and top-proof lines remain covered after sanitation"),
  entry("tests/officeEstimate/directorPdfNormSources.contract.test.ts", "PDF exposed normId key syntax", "PDF shows public certified provenance labels", "preserve evidence without leaking internal identifiers", "asserts all three provenance concepts and rejects internal key syntax"),
  entry("tests/officeEstimate/professionalCostingPdfBuyerHandoff.test.ts", "no below-threshold price outcome case", "PRICE_INPUT_REQUIRED parity across costing, PDF and buyer handoff", "prevent partial totals from being presented as preliminary totals", "adds a complete negative price-coverage path"),
  entry("tests/pdf/pdfDocumentViewerEntry.test.ts", "single concatenated logger argument", "structured logger prefix, event and payload", "match governed observability API", "navigation payload assertions are unchanged"),
  entry("tests/perf/performance-budget.test.ts", "consumer-repair governance/persistence, row display, unit semantics, and seven post-checkpoint core modules counted in broader budgets", "all four exact owner groups have independent caps", "keep module attribution aligned with extracted domain and current-core boundaries", "the pre-existing growth and aggregate source budgets are unchanged; each extracted group receives its own exact cap"),
  entry("tests/perf/flatListTuningBatchB.contract.test.ts", "initial/batch render budget 6", "stricter initial/batch render budget 5", "reduce initial list work", "budget is tightened and refresh completion remains asserted"),
  entry("tests/perf/reactMemoBarriersBatchB.contract.test.ts", "format-sensitive source assertion", "whitespace-normalized exact memo export assertion", "avoid formatter-only failures", "same 15 memo barriers and export owners remain exact"),
  entry("tests/releasePipeline/deterministicShardedFullJestRunner.contract.test.ts", "no full-manifest shard integrity contract", "stable weighted plan with duplicate/missing rejection", "make full regression scalable without excluding suites", "adds exact union and determinism checks"),
  entry("tests/requestEstimate/trustedCostingUi.test.ts", "UI covered preliminary amount only", "UI distinguishes preliminary and PRICE_INPUT_REQUIRED", "show honest price resolution", "adds missing-price negative coverage without removing preliminary coverage"),
  entry("tests/scale/renderExpoWebStagingServer.contract.test.ts", "stale retired release branch", "current production-candidate branch", "match checked-in Render configuration", "server command, health check and deployment contract remain asserted"),
  entry("tests/scale/routeErrorBoundaryCoverage.contract.test.ts", "53 routes", "54 routes with 54 boundaries or explicit exceptions", "inventory gained one governed route", "coverage remains 100 percent with a higher exact route count"),
  entry("tests/security/securityScannerMutationFixtures.contract.test.ts", "security scan had no self-test mutations", "seven sensitive payload classes must turn the scanner RED and clean evidence must return GREEN", "prove the scanner detects secrets, private URLs and personal data instead of trusting a static green report", "adds API key, bearer, private URL, email, phone, local path and authorization-header mutations plus clean-state recovery"),
  entry("tests/ui/stickyActionBar.contract.test.ts", "pointerEvents component prop source shape", "shared pointerNone style source shape", "use the canonical cross-platform style owner", "still requires pointerEvents none and the shared button-content wrapper"),
];

function git(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
      maxBuffer: 50 * 1024 * 1024,
    }).trim();
  } catch {
    return fallback;
  }
}

function changedTestPaths(): string[] {
  const tracked = git(["diff", "--name-only", BASE_CHECKPOINT, "--", "*.test.ts", "*.test.tsx"])
    .split(/\r?\n/);
  const untracked = git(["ls-files", "--others", "--exclude-standard", "--", "*.test.ts", "*.test.tsx"])
    .split(/\r?\n/);
  return [...new Set([...tracked, ...untracked]
    .map((value) => value.trim().replace(/\\/g, "/"))
    .filter((value) => value && !USER_OWNED_TEST_PATHS.has(value)))]
    .sort();
}

function addedDiffLines(): string[] {
  return git([
    "diff",
    "--unified=0",
    BASE_CHECKPOINT,
    "--",
    ".",
    ":(exclude)scripts/release/auditCurrentCoreNoTestWeakening.ts",
    ":(exclude)package-lock.json",
  ])
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  const subjectSha = git(["rev-parse", "HEAD"], "unknown");
  const changedTests = changedTestPaths();
  const ledgerPaths = CURRENT_CORE_TEST_CONTRACT_AUDIT.map((item) => item.path).sort();
  const missingLedgerEntries = changedTests.filter((file) => !ledgerPaths.includes(file));
  const staleLedgerEntries = ledgerPaths.filter((file) => !changedTests.includes(file));
  const additions = addedDiffLines();
  const forbiddenFocusChanges = additions.filter((line) =>
    /\.(?:only|skip)\s*\(|\b(?:fdescribe|fit|xdescribe|xit|xtest)\s*\(/.test(line)
  );
  const timeoutOrMemoryWeakening = additions.filter((line) =>
    /jest\.setTimeout|--testTimeout|--max-old-space-size|--forceExit|passWithNoTests|\bretry\b/.test(line)
  );
  const modifiedGuardedFixtures = GUARDED_FIXTURES.filter((file) =>
    git(["diff", "--name-only", BASE_CHECKPOINT, "--", file]).trim() === file
  );
  const guardedFixtureReviews = modifiedGuardedFixtures.map((file) => {
    const review = REVIEWED_GUARDED_FIXTURE_CHANGES[file];
    const baseBlob = git(["rev-parse", `${BASE_CHECKPOINT}:${file}`], "missing");
    const currentBlob = git(["hash-object", file], "missing");
    return {
      path: file,
      base_blob: baseBlob,
      current_blob: currentBlob,
      review: review ?? null,
      exact_review_match:
        review != null &&
        review.base_blob === baseBlob &&
        review.reviewed_blob === currentBlob,
    };
  });
  const unreviewedModifiedGuardedFixtures = guardedFixtureReviews
    .filter((item) => !item.exact_review_match)
    .map((item) => item.path);
  const costingTest = fs.readFileSync(
    path.join(process.cwd(), "tests", "estimateRuntime", "full11610TrustedCostingAudit.test.ts"),
    "utf8",
  );
  const ledgerTest = fs.readFileSync(
    path.join(process.cwd(), "tests", "aiEstimateV4", "catalogProfessionalCoverageLedgerV4.contract.test.ts"),
    "utf8",
  );
  const explicitTruthAssertionsPresent =
    costingTest.includes("templates_costing_ready).toBe(11270)") &&
    costingTest.includes("templates_price_input_required).toBe(340)") &&
    ledgerTest.includes("DISTINCT_PROFESSIONAL_PASSPORT: 12") &&
    ledgerTest.includes("SCOPE_PRESET: 7152") &&
    ledgerTest.includes("PARAMETERIZED_VARIANT: 1288") &&
    ledgerTest.includes("DOMAIN_REVIEW_REQUIRED: 3158");
  const architectureAllowlist = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "ai", "enterpriseGuardrails", "aiEnterpriseAllowedLayers.ts"),
    "utf8",
  );
  const architectureLayersCovered = [
    "estimateContinuousDetection",
    "estimatePricing",
    "expandedComplexWorks",
    "professionalEstimateCalculator",
  ].every((layer) => architectureAllowlist.includes(`layer: "${layer}"`));
  const blockers = [
    ...missingLedgerEntries.map((file) => `test_change_without_audit:${file}`),
    ...staleLedgerEntries.map((file) => `stale_test_audit_entry:${file}`),
    ...forbiddenFocusChanges.map((line) => `focused_or_skipped_test_added:${line}`),
    ...timeoutOrMemoryWeakening.map((line) => `timeout_or_memory_weakening_added:${line}`),
    ...unreviewedModifiedGuardedFixtures.map((file) => `guarded_fixture_modified_without_exact_review:${file}`),
    explicitTruthAssertionsPresent ? "" : "honest_11610_exact_assertions_missing",
    architectureLayersCovered ? "" : "architecture_layer_inventory_incomplete",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_CURRENT_CORE_NO_TEST_WEAKENING_AUDIT"
      : "STOP_CURRENT_CORE_NO_TEST_WEAKENING_AUDIT",
    base_checkpoint: BASE_CHECKPOINT,
    subject_sha: subjectSha,
    changed_test_files_count: changedTests.length,
    changed_test_files: changedTests,
    guarded_fixtures: GUARDED_FIXTURES,
    guarded_fixtures_modified: modifiedGuardedFixtures,
    guarded_fixture_reviews: guardedFixtureReviews,
    forbidden_focus_changes: forbiddenFocusChanges,
    timeout_or_memory_weakening_changes: timeoutOrMemoryWeakening,
    explicit_11610_truth_assertions_present: explicitTruthAssertionsPresent,
    architecture_allowlist_inventory_complete: architectureLayersCovered,
    audit_entries: CURRENT_CORE_TEST_CONTRACT_AUDIT,
    blockers,
    fake_green_claimed: false,
  };
  const outputPath = path.join(
    process.cwd(),
    ".release-runtime",
    "current-core-no-test-weakening",
    subjectSha,
    "summary.json",
  );
  writeJson(outputPath, summary);
  console.info(JSON.stringify(summary, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/release/auditCurrentCoreNoTestWeakening.ts")) {
  main();
}
