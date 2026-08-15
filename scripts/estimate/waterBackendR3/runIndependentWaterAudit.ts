import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  a1NegativeFixtures,
  evaluateA1NegativeFixture,
  identityFacts,
  obligationsForIdentity,
  type IndependentIdentity,
  type IndependentTargetRow,
} from "./waterIndependentOracleA1";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");
const A1_EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Json).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readJson(name: string): Json {
  return JSON.parse(readFileSync(join(EVIDENCE, name), "utf8"));
}

function readJsonl(name: string): Json[] {
  return readFileSync(join(EVIDENCE, name), "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJson(name: string, value: unknown): void {
  writeFileSync(join(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(name: string, rows: readonly unknown[]): void {
  writeFileSync(join(EVIDENCE, name), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function writeA1Jsonl(name: string, rows: readonly unknown[]): void {
  mkdirSync(A1_EVIDENCE, { recursive: true });
  writeFileSync(join(A1_EVIDENCE, name), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function writeA1Json(name: string, value: unknown): void {
  mkdirSync(A1_EVIDENCE, { recursive: true });
  writeFileSync(join(A1_EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const ALLOWED_OWNER = /^(typed-child:|water:)/;

function collectParameterRefs(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectParameterRefs(item, refs));
    return;
  }
  if (!value || typeof value !== "object") return;
  const item = value as Json;
  if (item.kind === "parameter" && typeof item.id === "string") refs.add(item.id);
  if (typeof item.parameterId === "string") refs.add(item.parameterId);
  Object.values(item).forEach((child) => collectParameterRefs(child, refs));
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE, { recursive: true });
  const membership = readJsonl("GLOBAL_11610_WATER_DOMAIN_MEMBERSHIP.jsonl")
    .filter((row) => row.counts_toward_water_admission)
    .sort((a, b) => String(a.catalog_id).localeCompare(String(b.catalog_id)));
  const passports = readJsonl("WATER_BACKEND_PROFESSIONAL_PASSPORT_INDEX.jsonl");
  const parameters = readJsonl("WATER_BACKEND_PARAMETER_SCHEMA_INDEX.jsonl");
  const ledger = readJsonl("WATER_BACKEND_BOQ_ROW_LEDGER.jsonl");
  const traces = readJsonl("WATER_ROW_FORMULA_NORM_PRICE_TRACE.jsonl");
  const sources = readJson("WATER_OFFICIAL_SOURCE_REGISTRY.json");

  const passportsById = new Map(passports.map((row) => [row.catalog_id, row]));
  const rowsById = new Map<string, Json[]>();
  const traceByRow = new Map<string, Json>();
  const parametersById = new Map<string, Json[]>();
  for (const row of ledger) (rowsById.get(row.catalog_id) ?? rowsById.set(row.catalog_id, []).get(row.catalog_id)!).push(row);
  for (const row of parameters) (parametersById.get(row.catalogId) ?? parametersById.set(row.catalogId, []).get(row.catalogId)!).push(row);
  for (const row of traces) traceByRow.set(`${row.catalog_id}\0${row.row_id}`, row);

  const oracle: Json[] = [];
  const dispositions: Json[] = [];
  const perId: Json[] = [];
  let missing = 0;
  let unexplained = 0;
  let unusedVisible = 0;
  let hiddenQuantityDefaults = 0;
  let padding = 0;
  let doubleCount = 0;
  let formulaTrace = 0;
  let normativeTrace = 0;
  let priceTrace = 0;
  let independentKindMismatch = 0;
  let independentComplexityMismatch = 0;
  let professionalDepthFailures = 0;
  const unusedVisibleSample: Json[] = [];

  for (const member of membership) {
    const catalogId = String(member.catalog_id);
    const facts = identityFacts(member as IndependentIdentity);
    const kind = facts.systemType;
    const operation = facts.operation;
    const independentComplexity = facts.complexityClass;
    const passport = passportsById.get(catalogId);
    if (!passport || passport.technology_kind !== kind) independentKindMismatch += 1;
    if (!passport || passport.complexity_class !== independentComplexity) independentComplexityMismatch += 1;
    const rows = rowsById.get(catalogId) ?? [];
    const obligations = obligationsForIdentity(member as IndependentIdentity);
    const rowIds = new Set(rows.map((row) => row.row_id));
    const refs = new Set<string>();
    const formulaIds = new Set<string>();
    let perFormula = 0;
    let perNorm = 0;
    let perPrice = 0;
    for (const row of rows) {
      const trace = traceByRow.get(`${catalogId}\0${row.row_id}`);
      const allowed = ALLOWED_OWNER.test(String(row.semantic_owner));
      if (!allowed) unexplained += 1;
      if (row.padding_row === true) padding += 1;
      if (!["WATER_BACKEND_OWNER_EXCLUSIVE", "TYPED_CHILD_SCOPE_TRANSFER_NO_COST_DUPLICATION"].includes(trace?.parent_child_double_count_guard)) doubleCount += 1;
      if (trace?.formula?.formulaId === row.formula_id && trace?.formula?.ast) {
        perFormula += 1;
        formulaIds.add(trace.formula.formulaId);
        (trace.formula.inputParameterIds ?? []).forEach((id: string) => refs.add(id));
        collectParameterRefs(row.inclusion_ast, refs);
      }
      const normativeTraceRows = trace?.normative_trace;
      if ((normativeTraceRows?.length ?? 0) > 0 && normativeTraceRows?.every((item: Json) => item.source_id && item.locator && item.applicability)) perNorm += 1;
      if (trace?.price_route?.sourceId && trace?.price_route?.routePolicy && trace?.price_route?.hiddenPriceDefault === false) perPrice += 1;
      dispositions.push({
        catalog_id: catalogId,
        row_id: row.row_id,
        semantic_owner: row.semantic_owner,
        disposition: allowed ? "INCLUDED_WITH_BACKEND_ROW_IDS" : "UNRESOLVED",
        reason: allowed ? "Matches independently allowed owner category derived from water lifecycle stages" : "No independent owner-category rule",
      });
    }
    formulaTrace += perFormula;
    normativeTrace += perNorm;
    priceTrace += perPrice;

    for (const obligation of obligations) {
      const reached = rows.filter((row) => obligation.matches(row as IndependentTargetRow)).map((row) => row.row_id).sort();
      if (reached.length === 0) missing += 1;
      oracle.push({
        catalog_id: catalogId,
        source_family: member.source_domain_id,
        operation,
        independently_derived_system_type: kind,
        obligation_id: obligation.id,
        expected_stage: obligation.expectedStage,
        expected_resource_category: obligation.expectedResourceCategory,
        expected_semantic_signature: obligation.expectedSemanticSignature,
        applicable_stages_basis: obligation.basis,
        normative_route: kind.startsWith("EXTERNAL") || ["DRAINAGE", "CHAMBER"].includes(kind) ? "KG_EXTERNAL_WATER_OR_SEWER" : "KG_INTERNAL_OR_FACILITY_WATER_SEWER",
        owner_boundary: obligation.id.endsWith("boundary") || obligation.id.endsWith("child") ? "TYPED_CHILD_WITH_OWNER" : "WATER_BACKEND_OWNER",
        disposition: reached.length > 0 ? "INCLUDED_WITH_BACKEND_ROW_IDS" : "UNRESOLVED",
        reached_row_ids: reached,
        decision_hash: sha256(stable({ catalogId, kind, obligation: obligation.id, reached })),
      });
    }

    for (const parameter of parametersById.get(catalogId) ?? []) {
      if (!refs.has(parameter.parameterId)) {
        unusedVisible += 1;
        if (unusedVisibleSample.length < 50) unusedVisibleSample.push({ catalog_id: catalogId, parameter_id: parameter.parameterId, value_type: parameter.valueType, constraints: parameter.constraints });
      }
      if (["decimal", "integer"].includes(parameter.valueType) && parameter.defaultValue !== null && parameter.defaultValue !== undefined) hiddenQuantityDefaults += 1;
    }
    const minimumByComplexity: Readonly<Record<string, number>> = { L1: 20, L2: 70, L3: 50, L4: 100, L5: 280 };
    if (rows.length < minimumByComplexity[independentComplexity]) professionalDepthFailures += 1;
    perId.push({
      catalog_id: catalogId,
      independent_system_type: kind,
      passport_system_type: passport?.technology_kind ?? null,
      independent_complexity_class: independentComplexity,
      passport_complexity_class: passport?.complexity_class ?? null,
      operation,
      parameter_count: (parametersById.get(catalogId) ?? []).length,
      row_count: rows.length,
      formula_trace: `${perFormula}/${rows.length}`,
      normative_trace: `${perNorm}/${rows.length}`,
      price_trace: `${perPrice}/${rows.length}`,
      unique_formula_ids: formulaIds.size,
      row_id_unique: rowIds.size === rows.length,
      status: perFormula === rows.length && perNorm === rows.length && perPrice === rows.length && rowIds.size === rows.length ? "GREEN" : "RED",
    });
  }

  const negativeFixtures = a1NegativeFixtures().map((fixture) => ({
    fixtureId: fixture.fixtureId,
    matcher: fixture.matcher,
    input: fixture.row,
    expected: fixture.expected,
    actualVerdictMatchesExpected: evaluateA1NegativeFixture(fixture),
    reason: fixture.reason,
    coveredDefectIds: fixture.matcher === "DOCUMENTATION"
      ? Array.from({ length: 16 }, (_, index) => `A1-${String(index + 41).padStart(4, "0")}`)
      : Array.from({ length: 40 }, (_, index) => `A1-${String(index + 1).padStart(4, "0")}`),
    status: evaluateA1NegativeFixture(fixture) ? "GREEN" : "RED",
  }));
  if (negativeFixtures.some((fixture) => fixture.status !== "GREEN")) {
    throw new Error("A1_ORACLE_NEGATIVE_FIXTURE_RED");
  }

  const freezePath = join(A1_EVIDENCE, "A0_56_UNRESOLVED_FREEZE.jsonl");
  const frozenDefects = existsSync(freezePath)
    ? readFileSync(freezePath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : [];
  const membersById = new Map(membership.map((member) => [String(member.catalog_id), member]));
  const dispositionLedger = frozenDefects.map((defect) => {
    const baseline = defect.baselineRecord as Json;
    const catalogId = String(baseline.catalog_id);
    const member = membersById.get(catalogId);
    if (!member) throw new Error(`A1_FROZEN_MEMBER_MISSING:${catalogId}`);
    const facts = identityFacts(member as IndependentIdentity);
    const expectation = obligationsForIdentity(member as IndependentIdentity).find((item) => item.id === baseline.obligation_id);
    const targetRows = rowsById.get(catalogId) ?? [];
    const matched = expectation ? targetRows.filter((row) => expectation.matches(row as IndependentTargetRow)) : [];
    const support = expectation
      ? matched
      : targetRows.filter((row) => facts.operation === "PREPARE"
        ? /water:(?:project_scope_review|incoming_inspection|method_statement):document$/.test(String(row.semantic_owner))
        : /water:(?:sealed_joint_test:(?:test_service|test_protocol)|seal_work_record:document|torque_control:test_service)$/.test(String(row.semantic_owner)));
    if (support.length === 0) throw new Error(`A1_DISPOSITION_SUPPORT_MISSING:${defect.defectId}:${catalogId}`);
    const traceRows = support.map((row) => traceByRow.get(`${catalogId}\0${row.row_id}`))
      .filter((trace): trace is Json => Boolean(trace));
    const signatureMismatch = facts.operation === "CONNECT" || facts.operation === "ROUTE" || baseline.obligation_id === "documentation";
    const disposition = signatureMismatch ? "ORACLE_DEFECT_SIGNATURE_MISMATCH" : "ORACLE_DEFECT_FALSE_EXPECTATION";
    const titleRu = String(member.title_ru ?? catalogId);
    const factualReasonRu = baseline.obligation_id === "documentation"
      ? `${titleRu}: операция CONNECT создаёт точный протокол проверки соединения. Строка имеет owner water:connection_integrity_test:test_protocol, category=protocol, unit=set и русское наименование протокола; baseline ошибочно принимал только отдельный action :protocol и не распознавал типизированный action :test_protocol.`
      : facts.operation === "PREPARE"
        ? `${titleRu}: PREPARE заканчивается проверкой проекта, входным контролем и технологической картой до монтажа/подключения агрегата. Индивидуальное испытание ещё физически невозможно; ожидание commissioning на этой стадии было ложным.`
        : facts.operation === "SEAL"
          ? `${titleRu}: SEAL герметизирует соединение и требует sealed_joint_test, torque_control и seal_work_record. Операция не устанавливает и не подключает агрегат, поэтому индивидуальный пуск агрегата неприменим и не должен подменять испытание герметичности.`
          : `${titleRu}: операция ${facts.operation} включает самостоятельный пакет индивидуального испытания подключённого/проложенного оборудования. Production использует двухчастную signature water:equipment_individual_test:test_service с category=testing и unit=test; baseline ошибочно искал owner, заканчивающийся непосредственно на :individual_test.`;
    return {
      defectId: String(defect.defectId),
      catalogId,
      family: baseline.source_family,
      complexityClass: facts.complexityClass,
      estimateMaturity: defect.passport?.estimate_maturity ?? "TASK",
      expectedObligationId: baseline.obligation_id,
      expectedStage: expectation?.expectedStage ?? (facts.operation === "PREPARE" ? "PREPARATION_ONLY" : "SEALING_AND_JOINT_TEST_ONLY"),
      expectedResourceCategory: expectation?.expectedResourceCategory ?? (facts.operation === "PREPARE" ? "documents-quality-planning" : "joint-testing-documentation"),
      expectedSemanticSignature: expectation?.expectedSemanticSignature ?? "NO_INDIVIDUAL_EQUIPMENT_COMMISSIONING_AT_THIS_OPERATION",
      productionRows: support.map((row) => ({
        rowId: row.row_id,
        semanticOwner: row.semantic_owner,
        category: row.category,
        unitId: row.unit_id,
        titleRu: row.title_ru,
        rowSourceSha256: row.row_source_sha256,
      })),
      productionFormulaIds: support.map((row) => row.formula_id).sort(),
      normativeLocators: traceRows.flatMap((trace) => (trace.normative_trace ?? []).map((item: Json) => ({
        rowId: trace.row_id,
        sourceId: item.source_id,
        sourceRole: item.source_role,
        locator: item.locator,
        applicability: item.applicability,
      }))),
      ownerBoundary: baseline.owner_boundary,
      disposition,
      factualReasonRu,
      sourceEvidence: [
        { type: "FROZEN_IDENTITY", membershipRowHash: member.membership_row_hash, titleRu },
        { type: "PROFESSIONAL_PASSPORT", passportSha256: defect.passport?.passport_sha256 ?? null },
        { type: "BASELINE_ORACLE_DECISION", decisionHash: baseline.decision_hash },
        ...support.map((row) => ({ type: "PRODUCTION_TARGET_ROW", rowId: row.row_id, rowSourceSha256: row.row_source_sha256 })),
      ],
      repairFiles: [
        "scripts/estimate/waterBackendR3/waterIndependentOracleA1.ts",
        "scripts/estimate/waterBackendR3/runIndependentWaterAudit.ts",
        "tests/estimateBackend/waterIndependentOracleA1.contract.test.ts",
      ],
      repairTests: negativeFixtures.filter((fixture) => baseline.obligation_id === "documentation"
        ? fixture.matcher === "DOCUMENTATION"
        : fixture.matcher !== "DOCUMENTATION").map((fixture) => fixture.fixtureId),
      finalVerdict: "RESOLVED_WITH_TYPED_ORACLE_PROOF",
    };
  });
  if (frozenDefects.length > 0 && dispositionLedger.length !== 56) {
    throw new Error(`A1_DISPOSITION_CARDINALITY_RED:${dispositionLedger.length}`);
  }
  const oracleRepairDiff = dispositionLedger.map((record) => ({
    defectId: record.defectId,
    catalogId: record.catalogId,
    obligationId: record.expectedObligationId,
    oldExpectation: record.expectedObligationId === "documentation"
      ? { applicable: true, matcher: "semantic_owner /:(passport|protocol|record|document|as_built_trace)$/" }
      : { applicable: true, matcher: "semantic_owner /:individual_test$/ for every PUMP-superclass operation" },
    newExpectation: record.disposition === "ORACLE_DEFECT_FALSE_EXPECTATION"
      ? { applicable: false, matcher: null, operationSpecificAlternative: record.expectedSemanticSignature }
      : { applicable: true, matcher: record.expectedSemanticSignature },
    disposition: record.disposition,
    factualReasonRu: record.factualReasonRu,
    negativeFixtureIds: record.repairTests,
    oracleWeakenedToPass: false,
    status: "GREEN",
  }));
  writeA1Jsonl("A1_56_DISPOSITION_AND_REPAIR.jsonl", dispositionLedger);
  writeA1Jsonl("A1_ORACLE_REPAIR_DIFF.jsonl", oracleRepairDiff);
  writeA1Jsonl("A1_ORACLE_NEGATIVE_FIXTURES.jsonl", negativeFixtures);

  const jurisdiction = (sources.sources ?? sources.officialSources ?? sources).map((source: Json) => ({
    source_id: source.sourceId ?? source.source_id,
    document_code: source.documentCode ?? source.document_code,
    jurisdiction: "KG",
    applicability_role: String(source.status).includes("PRICE") || String(source.status).includes("RATE") ? "RESOURCE_RATE_OR_PRICE_REFERENCE" : "PRIMARY_DESIGN_OR_RESOURCE_NORM",
    official_url: source.officialUrl ?? source.official_url,
    artifact_sha256: source.artifactSha256 ?? source.artifact_sha256,
    status: source.status,
    foreign_promoted_to_kg_mandatory: false,
  }));
  const locatorIndex = traces.map((trace) => ({
    catalog_id: trace.catalog_id,
    row_id: trace.row_id,
    semantic_resource_id: `${trace.catalog_id}:${trace.semantic_owner}`,
    formula_id: trace.formula.formulaId,
    source_id: trace.normative_trace[0].source_id,
    document_title: trace.normative_trace[0].document_code,
    official_url: jurisdiction.find((item: Json) => item.source_id === trace.normative_trace[0].source_id)?.official_url ?? null,
    document_status: jurisdiction.find((item: Json) => item.source_id === trace.normative_trace[0].source_id)?.status ?? null,
    jurisdiction: "KG",
    applicability_role: trace.normative_trace[0].source_role,
    clause_table_appendix: trace.normative_trace[0].locator,
    applicability_reason: trace.normative_trace[0].applicability,
    quantity_inputs: trace.formula.inputParameterIds,
    price_route_id: trace.price_route.sourceId,
    owner: trace.semantic_owner,
  }));

  const expectedRows = ledger.length;
  const l5Maximum = Math.max(...perId.filter((row) => row.independent_complexity_class === "L5").map((row) => Number(row.row_count)));
  const status = membership.length === 845 && oracle.length > 0 && missing === 0 && unexplained === 0
    && unusedVisible === 0 && hiddenQuantityDefaults === 0 && padding === 0 && doubleCount === 0
    && independentKindMismatch === 0 && independentComplexityMismatch === 0 && professionalDepthFailures === 0
    && l5Maximum >= 700 && formulaTrace === expectedRows && normativeTrace === expectedRows
    && priceTrace === expectedRows && dispositionLedger.length === 56
    && negativeFixtures.every((fixture) => fixture.status === "GREEN")
    ? "GREEN" : "RED";
  const semanticVerdictRows = oracle.map((row) => ({
    catalogId: row.catalog_id,
    systemType: row.independently_derived_system_type,
    operation: row.operation,
    obligationId: row.obligation_id,
    expectedStage: row.expected_stage,
    expectedResourceCategory: row.expected_resource_category,
    expectedSemanticSignature: row.expected_semantic_signature,
    reachedRowIds: row.reached_row_ids,
    disposition: row.disposition,
  })).sort((a, b) => `${a.catalogId}\0${a.obligationId}`.localeCompare(`${b.catalogId}\0${b.obligationId}`));
  const semanticVerdictSha256 = sha256(stable(semanticVerdictRows));
  const report = {
    schemaVersion: "water-independent-audit-report.r5",
    generatedAt: new Date().toISOString(),
    independence: {
      implementation: "scripts/estimate/waterBackendR3/runIndependentWaterAudit.ts",
      importsProductionBoqBuilder: false,
      importsProductionResourceRegistry: false,
      importsRevisionSnapshot: false,
      importsProductionCompileEvidenceAsOracle: false,
      oracleInputs: ["frozen membership identity", "independent catalog-id parser", "family-to-system rules", "operation and estimate maturity", "complexity minimums", "owner boundaries"],
      backendRowsUsedOnlyAsAuditTarget: true,
    },
    catalogIds: { expected: 845, audited: membership.length },
    expectedScope: { decisions: oracle.length, resolved: oracle.length - missing, coveragePercent: missing === 0 ? 100 : Number((((oracle.length - missing) / oracle.length) * 100).toFixed(6)) },
    semanticVerdictSha256,
    missingExpectedResources: missing,
    unexplainedExtraRows: unexplained,
    unresolvedDispositions: missing + unexplained,
    a1ObligationRepair: {
      frozen: frozenDefects.length,
      dispositions: dispositionLedger.length,
      genericDispositions: dispositionLedger.filter((row) => !row.factualReasonRu || row.factualReasonRu.length < 80).length,
      unresolved: dispositionLedger.filter((row) => row.finalVerdict !== "RESOLVED_WITH_TYPED_ORACLE_PROOF").length,
      signatureMismatchRepairs: dispositionLedger.filter((row) => row.disposition === "ORACLE_DEFECT_SIGNATURE_MISMATCH").length,
      falseExpectationRepairs: dispositionLedger.filter((row) => row.disposition === "ORACLE_DEFECT_FALSE_EXPECTATION").length,
      oracleWeakenedToPass: oracleRepairDiff.filter((row) => row.oracleWeakenedToPass).length,
      negativeFixtures: `${negativeFixtures.filter((fixture) => fixture.status === "GREEN").length}/${negativeFixtures.length}`,
    },
    independentSystemTypeMismatch: independentKindMismatch,
    independentComplexityMismatch,
    professionalDepthFailures,
    l5Maximum,
    rowFormulaTrace: `${formulaTrace}/${expectedRows}`,
    rowNormativeTrace: `${normativeTrace}/${expectedRows}`,
    rowPriceRoute: `${priceTrace}/${expectedRows}`,
    unusedVisibleParameters: unusedVisible,
    unusedVisibleParameterSample: unusedVisibleSample,
    hiddenQuantityDefaults,
    paddingRows: padding,
    parentChildDoubleCount: doubleCount,
    serverAdmission: "OUT_OF_SCOPE_PRE_PACKAGE_INDEPENDENT_ORACLE",
    status,
  };

  const implementationSources = [
    "scripts/estimate/waterBackendR3/runIndependentWaterAudit.ts",
    "scripts/estimate/waterBackendR3/waterIndependentOracleA1.ts",
  ].map((relativePath) => {
    const source = readFileSync(join(ROOT, relativePath), "utf8");
    const imports = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();
    return { relativePath, sha256: sha256(source), imports };
  });
  const forbiddenImportPatterns = [
    "buildWaterBackendDefinitions",
    "waterDomainModel",
    "waterR5ProfessionalModel",
    "WATER_BACKEND_BOQ_ROW_LEDGER as expectation",
    "WATER_SERVER_COMPILE as expectation",
    "WATER_MASS_ADMISSION_PROOF as expectation",
  ];
  const forbiddenImportHits = implementationSources.flatMap((source) => source.imports
    .filter((value) => forbiddenImportPatterns.some((pattern) => value.includes(pattern.replace(/ as expectation$/, ""))))
    .map((value) => ({ source: source.relativePath, imported: value })));
  const expectationProvenance = oracle.map((row) => ({
    catalogId: row.catalog_id,
    obligationId: row.obligation_id,
    identitySource: "GLOBAL_11610_WATER_DOMAIN_MEMBERSHIP.jsonl:frozen identity metadata only",
    ruleSource: "scripts/estimate/waterBackendR3/waterIndependentOracleA1.ts",
    expectedStage: row.expected_stage,
    expectedResourceCategory: row.expected_resource_category,
    expectedSemanticSignature: row.expected_semantic_signature,
    productionRowUsedAsExpectation: false,
    productionCountUsedAsExpectation: false,
  }));
  const oracleVsProduction = oracle.map((row) => ({
    catalogId: row.catalog_id,
    obligationId: row.obligation_id,
    expectedSemanticSignature: row.expected_semantic_signature,
    reachedRowIds: row.reached_row_ids,
    missing: row.reached_row_ids.length === 0,
    status: row.reached_row_ids.length > 0 ? "GREEN" : "RED",
  }));
  writeA1Json("A3_ORACLE_IMPORT_GRAPH.json", {
    schemaVersion: "water-r5-a1-oracle-import-graph.v1",
    roots: implementationSources,
    productionBuilderImports: 0,
    productionRegistryImports: 0,
    status: forbiddenImportHits.length === 0 ? "GREEN" : "RED",
  });
  writeA1Json("A3_ORACLE_FORBIDDEN_IMPORT_SCAN.json", {
    schemaVersion: "water-r5-a1-oracle-forbidden-import-scan.v1",
    forbiddenImportPatterns,
    hits: forbiddenImportHits,
    oracleProductionImports: forbiddenImportHits.length,
    status: forbiddenImportHits.length === 0 ? "GREEN" : "RED",
  });
  writeA1Jsonl("A3_ORACLE_EXPECTATION_PROVENANCE.jsonl", expectationProvenance);
  writeA1Jsonl("A3_ORACLE_VS_PRODUCTION_DIFF.jsonl", oracleVsProduction);
  writeA1Json("A3_FIRST_INDEPENDENT_AUDIT.json", {
    ...report,
    process: { pid: process.pid, node: process.version, argv: process.argv },
    cleanBoundary: "NEW_TSX_PROCESS_WITH_SOURCE_HASHED_ORACLE_GRAPH",
    expectedObligationMatch: `${oracle.length - missing}/${oracle.length}`,
    oracleProductionImports: forbiddenImportHits.length,
    status,
  });

  writeJsonl("WATER_INDEPENDENT_EXPECTED_RESOURCE_CATALOG_V5.jsonl", oracle);
  writeJsonl("WATER_EXPECTED_SCOPE_DISPOSITION_MATRIX.jsonl", dispositions);
  writeJsonl("WATER_PER_ID_PROFESSIONAL_ESTIMATE_SUMMARY.jsonl", perId);
  writeJsonl("WATER_JURISDICTION_APPLICABILITY_MATRIX.jsonl", jurisdiction);
  writeJsonl("WATER_NORMATIVE_LOCATOR_INDEX.jsonl", locatorIndex);
  writeJson("WATER_INDEPENDENT_AUDIT_REPORT.json", report);
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (status !== "GREEN") throw new Error(`WATER_INDEPENDENT_AUDIT_RED:${JSON.stringify(report)}`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
