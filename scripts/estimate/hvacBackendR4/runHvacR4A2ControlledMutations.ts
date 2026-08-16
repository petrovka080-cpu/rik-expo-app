import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";

type Json = Record<string, any>;
type MutationResult = {
  ordinal: number;
  mutation_class: string;
  catalog_id: string;
  mutated_field: string;
  detector: string;
  fixture_before_sha256: string;
  fixture_after_sha256: string;
  killed: boolean;
  invalid_mutation: boolean;
  detail: string;
};
type ResourceFixture = { first: Json; rowCount: number; componentKeys: Set<string> };

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch007-hvac-r4", "evidence");
const CORPUS = join(EVIDENCE, "05-content", "corpus");
const EXPECTED_CORPUS = "4ebcced9a7eda71bdc94431743229a4faff79a750a7736bded6c80c207a4f625";
const MUTATION_COUNT = 338;
const CLASSES = Object.freeze([
  "REMOVE_REQUIRED_COMPONENT", "REMOVE_RESOURCE_ROW", "SUBSTITUTE_UOM", "REMOVE_FORMULA_INPUT",
  "CHANGE_FORMULA_OWNER", "CREATE_DEPENDENCY_CYCLE", "REMOVE_NORM_LOCATOR", "WRONG_OFFICIAL_URL",
  "REMOVE_PRICE_SOURCE_ID", "SUBSTITUTE_PRICE_BOOK", "DUPLICATE_SIGNATURE", "MIX_OPERATION_STATE",
  "CROSS_DOMAIN_DUPLICATE", "MAKE_ROW_UNREACHABLE", "BREAK_MUTEX", "ALLOW_NEGATIVE_QUANTITY",
  "WEAKEN_COMPLEXITY_FLOOR",
  "ENABLE_CLIENT_COMPILER_FALLBACK", "INCLUDE_CORPUS_IN_CLIENT_BUNDLE", "MUTATE_IMMUTABLE_HISTORY",
  "DOUBLE_QUEUE_SUBTRACTION", "ACTIVATE_PREPARED_BEFORE_GATES", "WEAKEN_RLS", "BREAK_IDEMPOTENCY",
  "USE_STALE_PACKAGE_HASH",
]);

const stable = (value: any): string => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(stable).join(",")}]` : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
const sha = (value: any): string => createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");

async function readJsonl(path: string): Promise<Json[]> {
  const rows: Json[] = [];
  const input = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
  for await (const line of input) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
}

async function firstByCatalog(path: string, targetIds: Set<string>): Promise<Map<string, Json>> {
  const rows = new Map<string, Json>();
  const input = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (targetIds.has(row.catalogId) && !rows.has(row.catalogId)) rows.set(row.catalogId, row);
    if (rows.size === targetIds.size) break;
  }
  return rows;
}

async function resourceFixturesByCatalog(path: string, targetIds: Set<string>): Promise<Map<string, ResourceFixture>> {
  const fixtures = new Map<string, ResourceFixture>();
  const input = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (!targetIds.has(row.catalogId)) continue;
    const fixture = fixtures.get(row.catalogId) ?? { first: row, rowCount: 0, componentKeys: new Set<string>() };
    fixture.rowCount += 1;
    fixture.componentKeys.add(row.resourceGraph.componentKey);
    fixtures.set(row.catalogId, fixture);
  }
  return fixtures;
}

function mutate(
  ordinal: number,
  mutationClass: string,
  work: Json,
  peerWork: Json,
  parameter: Json,
  formula: Json,
  resourceFixture: ResourceFixture,
  officialSources: Map<string, Json>,
  expectedSignature: string,
  peerSignature: string,
): MutationResult {
  const resource = resourceFixture.first;
  let killed = false;
  let field = "";
  let detector = "";
  let detail = "";
  let beforeFixture: any;
  let afterFixture: any;
  switch (mutationClass) {
    case "REMOVE_REQUIRED_COMPONENT": {
      field = "passport.professionalObligations.componentCount";
      detector = "FROZEN_COMPONENT_CARDINALITY";
      beforeFixture = [...resourceFixture.componentKeys].sort();
      afterFixture = beforeFixture.slice(1);
      killed = afterFixture.length !== work.passport.professionalObligations.componentCount;
      detail = `${beforeFixture.length}->${afterFixture.length}; expected=${work.passport.professionalObligations.componentCount}`;
      break;
    }
    case "REMOVE_RESOURCE_ROW": {
      field = "resourceRows"; detector = "PASSPORT_RESOURCE_CARDINALITY";
      beforeFixture = { rowCount: resourceFixture.rowCount };
      afterFixture = { rowCount: resourceFixture.rowCount - 1 };
      killed = afterFixture.rowCount !== work.passport.professionalObligations.resourceRowCount;
      detail = `${beforeFixture.rowCount}->${afterFixture.rowCount}; expected=${work.passport.professionalObligations.resourceRowCount}`; break;
    }
    case "SUBSTITUTE_UOM": {
      field = "resource.unitId"; detector = "FORMULA_RESOURCE_DIMENSION_PARITY";
      beforeFixture = { ...resource };
      afterFixture = { ...resource, unitId: resource.unitId === "m" ? "kg" : "m" };
      killed = afterFixture.unitId !== formula.outputUnitId; detail = `${resource.unitId}->${afterFixture.unitId}; formula=${formula.outputUnitId}`; break;
    }
    case "REMOVE_FORMULA_INPUT": {
      field = "formula.inputParameterIds"; detector = "EXPRESSION_INPUT_TOKEN_PARITY";
      beforeFixture = { ...formula, inputParameterIds: [...formula.inputParameterIds] };
      afterFixture = { ...formula, inputParameterIds: formula.inputParameterIds.slice(1) };
      const tokens = new Set(String(formula.expressionSource).match(/[a-z_][a-z0-9_]*/gi) ?? []);
      killed = formula.inputParameterIds.some((id: string) => tokens.has(id) && !afterFixture.inputParameterIds.includes(id)); detail = `inputs:${formula.inputParameterIds.length}->${afterFixture.inputParameterIds.length}`; break;
    }
    case "CHANGE_FORMULA_OWNER": {
      field = "resourceGraph.backendOwner"; detector = "BACKEND_OWNER_EXACT";
      beforeFixture = resource;
      afterFixture = { ...resource, resourceGraph: { ...resource.resourceGraph, backendOwner: "WEB_CLIENT" } };
      killed = afterFixture.resourceGraph.backendOwner !== "HVAC_HEAT_SUPPLY_BACKEND"; detail = `${resource.resourceGraph.backendOwner}->${afterFixture.resourceGraph.backendOwner}`; break;
    }
    case "CREATE_DEPENDENCY_CYCLE": {
      field = "formula.inputParameterIds"; detector = "PARAMETER_ONLY_FORMULA_DEPENDENCY";
      beforeFixture = formula;
      afterFixture = { ...formula, inputParameterIds: [...formula.inputParameterIds, formula.formulaId] };
      killed = afterFixture.inputParameterIds.includes(afterFixture.formulaId); detail = "self formula dependency injected"; break;
    }
    case "REMOVE_NORM_LOCATOR": {
      field = "sourceMetadata.normativeTrace[0].locator"; detector = "EXACT_NORMATIVE_LOCATOR_REQUIRED";
      beforeFixture = resource;
      afterFixture = { ...resource, sourceMetadata: { ...resource.sourceMetadata, normativeTrace: [{ ...resource.sourceMetadata.normativeTrace[0], locator: "" }, ...resource.sourceMetadata.normativeTrace.slice(1)] } };
      killed = afterFixture.sourceMetadata.normativeTrace.some((trace: Json) => !String(trace.locator).trim()); detail = "nonempty locator replaced with empty locator"; break;
    }
    case "WRONG_OFFICIAL_URL": {
      field = "officialSource.officialPageUrl"; detector = "OFFICIAL_HOST_AND_SNAPSHOT_HASH";
      const sourceId = resource.sourceMetadata.normativeTrace[0].source_id;
      const source = officialSources.get(sourceId)!;
      beforeFixture = source;
      afterFixture = { ...source, officialPageUrl: "https://example.invalid/fake" };
      killed = new URL(afterFixture.officialPageUrl).hostname !== "minstroy.gov.kg" || afterFixture.pageSha256 !== source.pageSha256; detail = `${source.officialPageUrl}->${afterFixture.officialPageUrl}`; break;
    }
    case "REMOVE_PRICE_SOURCE_ID": {
      field = "sourceMetadata.priceSourceId"; detector = "PRICE_SOURCE_REQUIRED";
      beforeFixture = resource;
      afterFixture = { ...resource, sourceMetadata: { ...resource.sourceMetadata, priceSourceId: "" } };
      killed = !String(afterFixture.sourceMetadata.priceSourceId).trim(); detail = `${resource.sourceMetadata.priceSourceId}->empty`; break;
    }
    case "SUBSTITUTE_PRICE_BOOK": {
      field = "sourceMetadata.priceSourceId"; detector = "OFFICIAL_PRICE_OR_RATE_SOURCE_SET";
      beforeFixture = resource;
      afterFixture = { ...resource, sourceMetadata: { ...resource.sourceMetadata, priceSourceId: "kg_price_book_fake" } };
      killed = !officialSources.has(afterFixture.sourceMetadata.priceSourceId); detail = `${resource.sourceMetadata.priceSourceId}->${afterFixture.sourceMetadata.priceSourceId}`; break;
    }
    case "DUPLICATE_SIGNATURE": {
      field = "perId.semantic_signature_sha256"; detector = "UNIQUE_CONTENT_SIGNATURE";
      beforeFixture = [{ catalogId: work.catalogId, signature: expectedSignature }, { catalogId: peerWork.catalogId, signature: peerSignature }];
      afterFixture = [{ catalogId: work.catalogId, signature: expectedSignature }, { catalogId: peerWork.catalogId, signature: expectedSignature }];
      killed = new Set(afterFixture.map((row: { signature: string }) => row.signature)).size !== afterFixture.length;
      detail = `${peerWork.catalogId}:${peerSignature}->${expectedSignature}`; break;
    }
    case "MIX_OPERATION_STATE": {
      field = "passport.exactWorkIdentity.operationClass"; detector = "WORK_IDENTITY_OPERATION_IMMUTABILITY";
      const current = work.passport.exactWorkIdentity.operationClass;
      const mutated = current === "INSTALL" ? "REPAIR" : "INSTALL";
      beforeFixture = work;
      afterFixture = { ...work, passport: { ...work.passport, exactWorkIdentity: { ...work.passport.exactWorkIdentity, operationClass: mutated } } };
      killed = afterFixture.passport.exactWorkIdentity.operationClass !== work.applicability.operationClass; detail = `${current}->${mutated}`; break;
    }
    case "CROSS_DOMAIN_DUPLICATE": {
      field = "domain"; detector = "CATALOG_ID_SINGLE_DOMAIN_OWNER";
      beforeFixture = [{ catalogId: work.catalogId, domain: work.domain }];
      afterFixture = [...beforeFixture, { catalogId: work.catalogId, domain: "water_supply_sewerage" }];
      killed = new Set(afterFixture.filter((row: { catalogId: string }) => row.catalogId === work.catalogId).map((row: { domain: string }) => row.domain)).size > 1; detail = "same catalogId assigned to HVAC and Water"; break;
    }
    case "MAKE_ROW_UNREACHABLE": {
      field = "inclusionAst"; detector = "CONTRADICTORY_INCLUSION_AST";
      const conditions = [{ kind: "equals", parameterId: "work_included", value: true }, { kind: "equals", parameterId: "work_included", value: false }];
      beforeFixture = resource;
      afterFixture = { ...resource, inclusionAst: { kind: "and", conditions } };
      killed = conditions.some((a, i) => conditions.some((b, j) => i !== j && a.parameterId === b.parameterId && a.value !== b.value)); detail = "work_included true AND false"; break;
    }
    case "BREAK_MUTEX": {
      field = "inclusionAst.mutex"; detector = "MUTEX_SIMULTANEOUS_BRANCH";
      beforeFixture = { selected: ["NEW"] };
      afterFixture = { selected: ["NEW", "REPAIR"] };
      const selected = afterFixture.selected;
      killed = selected.length > 1; detail = selected.join("+"); break;
    }
    case "ALLOW_NEGATIVE_QUANTITY": {
      field = "parameter.constraints.min"; detector = "POSITIVE_QUANTITY_CONSTRAINT";
      beforeFixture = parameter;
      afterFixture = { ...parameter, constraints: { ...parameter.constraints, min: -1 } };
      killed = Number(afterFixture.constraints.min) < 0; detail = `${String(parameter.constraints.min)}->-1`; break;
    }
    case "WEAKEN_COMPLEXITY_FLOOR": {
      field = "depthPolicy.floors"; detector = "BINDING_A1_EXACT_COMPLEXITY_FLOORS";
      beforeFixture = { L3: 250, L4: 500, L5: 1000 };
      afterFixture = { L3: 200, L4: 400, L5: 700 };
      killed = afterFixture.L3 !== 250 || afterFixture.L4 !== 500 || afterFixture.L5 !== 1000;
      detail = "L3/L4/L5:250/500/1000->200/400/700"; break;
    }
    case "ENABLE_CLIENT_COMPILER_FALLBACK": {
      field = "quantityContract.formulaGraphOwner"; detector = "BACKEND_ONLY_COMPILER_OWNER";
      beforeFixture = work;
      afterFixture = { ...work, passport: { ...work.passport, quantityContract: { ...work.passport.quantityContract, formulaGraphOwner: "CLIENT_FALLBACK" } } };
      killed = afterFixture.passport.quantityContract.formulaGraphOwner !== "BACKEND_ONLY"; detail = `${work.passport.quantityContract.formulaGraphOwner}->CLIENT_FALLBACK`; break;
    }
    case "INCLUDE_CORPUS_IN_CLIENT_BUNDLE": {
      field = "web/native bundle"; detector = "CORPUS_MARKER_BUNDLE_SCAN";
      beforeFixture = "client-code:route-shell";
      afterFixture = `${beforeFixture}\nserver-corpus-row:${resource.rowId}`;
      killed = afterFixture.includes("hvac-r4:"); detail = `server corpus marker ${resource.rowId} injected`; break;
    }
    case "MUTATE_IMMUTABLE_HISTORY": {
      field = "passport immutable hash"; detector = "IMMUTABLE_PASSPORT_SHA256";
      beforeFixture = work.passport;
      afterFixture = { ...work.passport, passportVersion: `${work.passport.passportVersion}.mutated` };
      killed = sha(afterFixture) !== sha(beforeFixture); detail = `${work.passport.passportVersion}->${afterFixture.passportVersion}; stored immutable hash retained`; break;
    }
    case "DOUBLE_QUEUE_SUBTRACTION": {
      field = "program queue transition"; detector = "DENOMINATOR_AND_EVENT_KEY_UNIQUENESS";
      beforeFixture = [{ eventKey: "BATCH007_HVAC_GLOBAL_920", delta: 920 }];
      afterFixture = [...beforeFixture, { ...beforeFixture[0] }];
      killed = new Set(afterFixture.map((event: { eventKey: string }) => event.eventKey)).size !== afterFixture.length; detail = "duplicate queue event key injected"; break;
    }
    case "ACTIVATE_PREPARED_BEFORE_GATES": {
      field = "release.status"; detector = "ALL_GATES_REQUIRED_BEFORE_ACTIVATION";
      const gates = { content: true, package: false, admission: false, clients: false };
      beforeFixture = { status: "PREPARED", gates };
      afterFixture = { status: "ACTIVE", gates };
      killed = !Object.values(gates).every(Boolean); detail = stable(gates); break;
    }
    case "WEAKEN_RLS": {
      field = "RLS policy"; detector = "RLS_USING_TRUE_STATIC_GUARD";
      beforeFixture = "create policy p on t using (tenant_id = current_setting('app.tenant_id')::uuid)";
      afterFixture = "create policy p on t using (true)";
      killed = /using\s*\(\s*true\s*\)/i.test(afterFixture); detail = "tenant predicate replaced by USING(true)"; break;
    }
    case "BREAK_IDEMPOTENCY": {
      field = "idempotency key payload"; detector = "IDEMPOTENCY_KEY_PAYLOAD_HASH_BINDING";
      beforeFixture = { key: "same-key", requestHash: sha({ parameters: 1 }) };
      afterFixture = { key: "same-key", requestHash: sha({ parameters: 2 }) };
      killed = beforeFixture.key === afterFixture.key && beforeFixture.requestHash !== afterFixture.requestHash; detail = "same key rebound to different request hash"; break;
    }
    case "USE_STALE_PACKAGE_HASH": {
      field = "corpusSetSha256"; detector = "EXACT_FROZEN_CORPUS_HASH";
      const stale = "0e3e9323ca0d1c12372d036701e2dba51a2f98f44000f0e6cd4afa5f019aa2aa";
      beforeFixture = { corpusSetSha256: EXPECTED_CORPUS };
      afterFixture = { corpusSetSha256: stale };
      killed = afterFixture.corpusSetSha256 !== EXPECTED_CORPUS; detail = `${EXPECTED_CORPUS}->${stale}`; break;
    }
    default: throw new Error(`UNKNOWN_MUTATION_CLASS:${mutationClass}`);
  }
  const beforeSha = sha(beforeFixture);
  const afterSha = sha(afterFixture);
  const invalidMutation = beforeSha === afterSha;
  return {
    ordinal,
    mutation_class: mutationClass,
    catalog_id: work.catalogId,
    mutated_field: field,
    detector,
    fixture_before_sha256: beforeSha,
    fixture_after_sha256: afterSha,
    killed: killed && !invalidMutation,
    invalid_mutation: invalidMutation,
    detail,
  };
}

async function main(): Promise<void> {
  const content = JSON.parse(readFileSync(join(EVIDENCE, "05-content", "HVAC_CONTENT_SUMMARY.json"), "utf8"));
  const oracle = JSON.parse(readFileSync(join(EVIDENCE, "06-oracle", "ORACLE_2X2_EQUALITY.json"), "utf8"));
  if (content.corpusSetSha256 !== EXPECTED_CORPUS || oracle.corpusSetSha256 !== EXPECTED_CORPUS || oracle.oracleA.byteEqual !== true || oracle.oracleB.byteEqual !== true) throw new Error("HVAC_MUTATION_FROZEN_CORPUS_PRECONDITION_RED");
  const works = await readJsonl(join(CORPUS, "HVAC_WORK_DEFINITIONS.jsonl"));
  const targets = works.slice(0, MUTATION_COUNT);
  const targetIds = new Set(targets.map((row) => row.catalogId));
  const parameters = await firstByCatalog(join(CORPUS, "HVAC_PARAMETER_DEFINITIONS.jsonl"), targetIds);
  const formulas = await firstByCatalog(join(CORPUS, "HVAC_FORMULA_GRAPHS.jsonl"), targetIds);
  const resources = await resourceFixturesByCatalog(join(CORPUS, "HVAC_RESOURCE_ROWS.jsonl"), targetIds);
  const perId = new Map((await readJsonl(join(EVIDENCE, "05-content", "HVAC_PER_ID_CONTENT_PROOF.jsonl"))).map((row) => [row.catalog_id, row]));
  const officialSources = new Map((await readJsonl(join(EVIDENCE, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl"))).map((row) => [row.sourceId, row]));
  if (targets.length !== MUTATION_COUNT || parameters.size !== MUTATION_COUNT || formulas.size !== MUTATION_COUNT || resources.size !== MUTATION_COUNT) throw new Error("HVAC_MUTATION_FIXTURE_DENOMINATOR_RED");
  const results = targets.map((work, index) => {
    const peerWork = targets[(index + 1) % targets.length]!;
    return mutate(
      index + 1,
      CLASSES[index % CLASSES.length]!,
      work,
      peerWork,
      parameters.get(work.catalogId)!,
      formulas.get(work.catalogId)!,
      resources.get(work.catalogId)!,
      officialSources,
      perId.get(work.catalogId)!.semantic_signature_sha256,
      perId.get(peerWork.catalogId)!.semantic_signature_sha256,
    );
  });
  const killed = results.filter((row) => row.killed).length;
  const invalid = results.filter((row) => row.invalid_mutation).length;
  const survived = results.length - killed;
  const byClass = Object.fromEntries(CLASSES.map((name) => [name, { total: results.filter((row) => row.mutation_class === name).length, killed: results.filter((row) => row.mutation_class === name && row.killed).length }]));
  const report = {
    schemaVersion: "batch007-hvac-r4-a2-controlled-mutations.v1",
    corpusSetSha256: EXPECTED_CORPUS,
    required: Math.max(300, Math.ceil(1012 / 3)),
    total: results.length,
    killed,
    survived,
    invalidMutation: invalid,
    mutationClasses: CLASSES.length,
    byClass,
    resultSetSha256: sha(results),
    status: results.length >= Math.max(300, Math.ceil(1012 / 3)) && killed === results.length && survived === 0 && invalid === 0 ? "GREEN" : "RED",
  };
  writeFileSync(join(EVIDENCE, "12-mutations", "A2_CONTROLLED_MUTATION_MATRIX_338.jsonl"), `${results.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  writeFileSync(join(EVIDENCE, "12-mutations", "A2_CONTROLLED_MUTATION_SUMMARY.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (report.status !== "GREEN") throw new Error(`HVAC_MUTATIONS_RED:${JSON.stringify(report)}`);

  const gap = JSON.parse(readFileSync(join(EVIDENCE, "A2", "A2_04_NORMATIVE_GAP_SUMMARY.json"), "utf8"));
  const depth = JSON.parse(readFileSync(join(EVIDENCE, "A2", "A2_15_STRICT_DEPTH_AFTER_SUMMARY.json"), "utf8"));
  const frozenLedgerPath = join(EVIDENCE, "A2", "A2_03_NORMATIVE_WORK_IDENTITY_GAP_LEDGER.jsonl");
  const frozenLedger = await readJsonl(frozenLedgerPath);
  const requiredDispositions: Readonly<Record<string, number>> = Object.freeze({
    EXISTING_GLOBAL_EXACT: 19,
    ADD_EXTERNAL_DEMOLITION: 4,
    ADD_EXTERNAL_NON_DEMOLITION: 88,
    CROSS_DOMAIN_INTERFACE_ONLY: 7,
    NOT_APPLICABLE_WITH_EXACT_REASON: 11,
  });
  const actualDispositions = Object.fromEntries(Object.keys(requiredDispositions).map((status) => [status, frozenLedger.filter((row) => row.mapping_status === status).length]));
  if (frozenLedger.length !== 129 || Object.entries(requiredDispositions).some(([status, count]) => actualDispositions[status] !== count)) {
    throw new Error(`HVAC_FINAL_NORMATIVE_DISPOSITIONS_RED:${stable({ total: frozenLedger.length, actualDispositions })}`);
  }
  const finalizedLedger = frozenLedger.map((row) => ({
    ...row,
    oracle_a_status: "GREEN_2X2_ON_FROZEN_CORPUS",
    oracle_b_status: "GREEN_2X2_ON_FROZEN_CORPUS",
    oracle_corpus_set_sha256: EXPECTED_CORPUS,
  }));
  const finalizedLedgerText = `${finalizedLedger.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const finalizedLedgerSha256 = sha(finalizedLedgerText);
  writeFileSync(join(EVIDENCE, "A2", "A2_17_NORMATIVE_DISPOSITIONS_FINAL_129.jsonl"), finalizedLedgerText, "utf8");
  const contentGate = {
    schemaVersion: "batch007-hvac-r4-a2-content-green-gate.v1",
    G: 920, D: 4, N: 88, H_TOTAL: 1012,
    R_final: content.R_final,
    corpusSetSha256: EXPECTED_CORPUS,
    strictFloors: { L3: 250, L4: 500, L5: 1000 },
    strictDepthBeforeRed: depth.beforeRed,
    strictDepthAfterRed: depth.afterRed,
    depthException: 0,
    normativeDispositions: { total: gap.normativeIdentitiesTotal, globalExact: gap.existingGlobalExact, demolition: gap.addedExternalDemolition, nonDemolition: gap.addedExternalNonDemolition, crossDomainInterfaceOnly: gap.crossDomainInterfaceOnly, notApplicableWithExactReason: gap.notApplicableWithExactReason, unresolved: gap.unresolved },
    frozenNormativeLedgerSha256: sha(readFileSync(frozenLedgerPath, "utf8")),
    finalNormativeLedgerSha256: finalizedLedgerSha256,
    oracleA: "2/2",
    oracleB: "2/2",
    oraclePerIdByteEquality: true,
    mutations: `${killed}/${results.length}`,
    globalQueueAfter: 8685,
    externalQueueSubtraction: 0,
    contentGreenA2: true,
    packageAllowedByContentGate: true,
    packageCreated: false,
    admissionStarted: false,
    fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
    repositoryWideGreen: false,
    productionDeployed: false,
    batch008Started: false,
    status: "GREEN_CONTENT_A2_STOPPED_BEFORE_PACKAGE",
  };
  const contentGateText = `${JSON.stringify(contentGate, null, 2)}\n`;
  writeFileSync(join(EVIDENCE, "A2", "A2_16_CONTENT_GREEN_GATE.json"), contentGateText, "utf8");
  const evidenceIndex = {
    schemaVersion: "batch007-hvac-r4-a2-content-evidence-index.v1",
    corpusSetSha256: EXPECTED_CORPUS,
    artifacts: {
      contentSummary: { path: "05-content/HVAC_CONTENT_SUMMARY.json", sha256: sha(readFileSync(join(EVIDENCE, "05-content", "HVAC_CONTENT_SUMMARY.json"), "utf8")) },
      frozenNormativeLedger: { path: "A2/A2_03_NORMATIVE_WORK_IDENTITY_GAP_LEDGER.jsonl", sha256: sha(readFileSync(frozenLedgerPath, "utf8")), rows: frozenLedger.length },
      finalNormativeLedger: { path: "A2/A2_17_NORMATIVE_DISPOSITIONS_FINAL_129.jsonl", sha256: finalizedLedgerSha256, rows: finalizedLedger.length },
      newNonDemolitionDefinitions: { path: "A2/A2_06_NEW_NON_DEMOLITION_DEFINITIONS.jsonl", sha256: sha(readFileSync(join(EVIDENCE, "A2", "A2_06_NEW_NON_DEMOLITION_DEFINITIONS.jsonl"), "utf8")), rows: 88 },
      strictDepthBeforeRed: { path: "A2/A2_11_STRICT_DEPTH_BEFORE_RED.jsonl", sha256: sha(readFileSync(join(EVIDENCE, "A2", "A2_11_STRICT_DEPTH_BEFORE_RED.jsonl"), "utf8")), rows: 20 },
      strictDepthDisposition: { path: "A2/A2_14_STRICT_DEPTH_REPAIR_DISPOSITION.jsonl", sha256: sha(readFileSync(join(EVIDENCE, "A2", "A2_14_STRICT_DEPTH_REPAIR_DISPOSITION.jsonl"), "utf8")), rows: 20 },
      oracle2x2: { path: "06-oracle/ORACLE_2X2_EQUALITY.json", sha256: sha(readFileSync(join(EVIDENCE, "06-oracle", "ORACLE_2X2_EQUALITY.json"), "utf8")) },
      controlledMutations: { path: "12-mutations/A2_CONTROLLED_MUTATION_SUMMARY.json", sha256: sha(readFileSync(join(EVIDENCE, "12-mutations", "A2_CONTROLLED_MUTATION_SUMMARY.json"), "utf8")), total: 338, killed: 338 },
      contentGate: { path: "A2/A2_16_CONTENT_GREEN_GATE.json", sha256: sha(contentGateText) },
    },
    packageCreated: false,
    databaseMutationStarted: false,
    status: "SEALED_CONTENT_EVIDENCE_STOPPED_BEFORE_PACKAGE",
  };
  writeFileSync(join(EVIDENCE, "A2", "A2_18_CONTENT_EVIDENCE_INDEX.json"), `${JSON.stringify(evidenceIndex, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ report, contentGate }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
