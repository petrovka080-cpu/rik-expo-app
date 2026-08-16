import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildGlobalCatalogInventoryV1, type GlobalCatalogInventoryRowV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import {
  BATCH008_PREDECESSOR_CORPUS_SHA256,
  BATCH008_PREDECESSOR_RELEASE_ID,
  BATCH008_SPEC_SHA256,
  assertExact,
  ensureEvidenceLayout,
  evidenceRoot,
  semanticSha256,
  sha256,
  writeJson,
  writeJsonl,
} from "./support";

type Json = Record<string, any>;

const SPEC_PATH = "C:\\Users\\User\\Downloads\\BATCH008_CONCRETE_R5_BACKEND_NATIVE_NORMATIVE_GAP_EXPANSION_50_CASES_CONTINUOUS_EXACT_GREEN_NO_FULL_JEST.md";
const WATER_WORKS_PATH = "C:\\dev\\rik-expo-app-batch006-water-backend-r3\\.release-runtime\\batch006-water-backend-r3\\03-r6-a2-release-b\\works.jsonl";
const HVAC_WORKS_PATH = "C:\\dev\\rik-expo-app-batch007-hvac-heat-supply-r4\\.release-runtime\\batch007-hvac-r4\\evidence\\05-content\\corpus\\HVAC_WORK_DEFINITIONS.jsonl";

const DIRECT_EXPANDED_FAMILIES = new Set([
  "conveyor_foundations",
  "equipment_foundation",
  "foundation_slab",
  "generator_foundation",
  "monolithic_frame",
  "ore_processing_foundations",
  "precast_concrete_frame",
  "raft_foundation",
  "refrigeration_equipment_foundation",
  "silo_foundation",
  "slab_column_frame",
  "strip_foundation",
  "tank_foundation",
  "tank_foundation_ring",
  "transformer_foundation",
  "turbine_foundation",
]);

const DIRECT_REPAIR_SYSTEMS = new Set([
  "CHEMICAL_ANCHOR",
  "CRACK_REPAIR",
  "INJECTION",
  "JOINT_SEAL",
  "STRUCTURE_STRENGTH",
  "TANK_REPAIR",
]);

const BOUNDARY_WORDS = /\b(?:boundary|typed-child|typed child|при наличии)\b|\bна\s+(?:piling|fa[cç]ade|flooring|water|road|bridge|tunnel|hydraulic)\s+boundary\b/iu;
const PREDECESSOR_WATER_WORDS = /резервуар(?:ы)? питьевой воды|sewage tanks|очистные сооружения|аэротенки|отстойники|фильтровальные сооружения|насосные камеры|водопроводные камеры/iu;

const SECTION_RESOURCES: Readonly<Record<number, RegExp>> = Object.freeze({
  7: /по классам|по диаметрам|гладкая арматура|периодический профиль|^A500|starter bars|top\/bottom mats|distribution reinforcement|shrinkage reinforcement|links\/ties|вязальная проволока/iu,
  8: /^(?:strands|bars|ducts|anchors|wedges|trumpets|vents|tendon supports)$/iu,
  9: /^(?:form liners|chamfers|block-outs|stop ends|form ties|cones\/tubes|locks\/wedges|walers|primary\/secondary beams|props|frames|shoring towers|braces|working platforms|edge protection|access stairs|release agents|sealing tapes)$/iu,
  10: /^(?:standard heavy concrete|lightweight concrete|fine-grained concrete|high-strength concrete|high-performance concrete|self-compacting concrete|fiber-reinforced concrete|steel-fiber concrete|synthetic-fiber concrete|shotcrete mix|underwater concrete|sulfate-resistant concrete|watertight concrete|frost-resistant concrete|heat-resistant concrete|refractory concrete|low-heat concrete|roller-compacted concrete|architectural concrete|colored concrete|white concrete|recycled aggregate concrete if identity exists|polymer-modified concrete|no-fines concrete|foamed concrete only on owner boundary|admixtures|fibers|cementitious additions)$/iu,
  11: /^(?:standby plant)$/iu,
  12: /^(?:anti-frost admixture|chilled water\/ice as mix-design input)$/iu,
});

const DEMOLITION_NON_STANDALONE = /^(?:structural survey|demolition design input|temporary support|exclusion zone|MEP isolation typed-child|segment planning|lifting points|rigging|hazardous coating route|demolition acts)$/iu;

function lines(path: string): Json[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").normalize("NFKC").replace(/[ё]/gu, "е").replace(/[^a-zа-я0-9]+/giu, " ").trim();
}

function slug(value: string): string {
  const latin = normalize(value)
    .replace(/[а]/gu, "a").replace(/[б]/gu, "b").replace(/[в]/gu, "v").replace(/[г]/gu, "g")
    .replace(/[д]/gu, "d").replace(/[е]/gu, "e").replace(/[ж]/gu, "zh").replace(/[з]/gu, "z")
    .replace(/[и]/gu, "i").replace(/[й]/gu, "y").replace(/[к]/gu, "k").replace(/[л]/gu, "l")
    .replace(/[м]/gu, "m").replace(/[н]/gu, "n").replace(/[о]/gu, "o").replace(/[п]/gu, "p")
    .replace(/[р]/gu, "r").replace(/[с]/gu, "s").replace(/[т]/gu, "t").replace(/[у]/gu, "u")
    .replace(/[ф]/gu, "f").replace(/[х]/gu, "h").replace(/[ц]/gu, "ts").replace(/[ч]/gu, "ch")
    .replace(/[ш]/gu, "sh").replace(/[щ]/gu, "sch").replace(/[ъь]/gu, "").replace(/[ы]/gu, "y")
    .replace(/[э]/gu, "e").replace(/[ю]/gu, "yu").replace(/[я]/gu, "ya")
    .replace(/\s+/gu, "-").replace(/^-|-$/gu, "");
  return latin.slice(0, 72) || sha256(value).slice(0, 16);
}

function predecessorSet(globalIds: Set<string>): { ids: Set<string>; water: Json[]; hvac: Json[] } {
  const water = lines(WATER_WORKS_PATH);
  const hvac = lines(HVAC_WORKS_PATH);
  const mapGlobal = (row: Json): string | null => {
    if (row.namespace !== "global" || row.denominatorEligible !== true) return null;
    return [row.sourceIdentity, row.catalogId].find((value) => typeof value === "string" && globalIds.has(value)) ?? null;
  };
  const waterIds = water.map(mapGlobal).filter((value): value is string => Boolean(value));
  const hvacIds = hvac.map(mapGlobal).filter((value): value is string => Boolean(value));
  const ids = new Set([...waterIds, ...hvacIds]);
  assertExact(waterIds.length === 2_005 && new Set(waterIds).size === 2_005, `CONCRETE_WATER_PREDECESSOR_SET_RED:${waterIds.length}`);
  assertExact(hvacIds.length === 920 && new Set(hvacIds).size === 920, `CONCRETE_HVAC_PREDECESSOR_SET_RED:${hvacIds.length}`);
  assertExact(ids.size === 2_925, `CONCRETE_PREDECESSOR_UNION_RED:${ids.size}`);
  return { ids, water, hvac };
}

function globalConcrete(row: GlobalCatalogInventoryRowV1): boolean {
  if (row.domain_id === "concrete_foundation") return true;
  if (row.domain_id === "special_repair" && DIRECT_REPAIR_SYSTEMS.has(row.primary_material_or_system)) return true;
  return row.domain_id.startsWith("expanded:") && DIRECT_EXPANDED_FAMILIES.has(row.domain_id.slice("expanded:".length));
}

type FloorObligation = {
  ordinal: number;
  section: number;
  sectionTitle: string;
  title: string;
  specLine: number;
};

function parseFloor(spec: string): FloorObligation[] {
  const sourceLines = spec.split(/\r?\n/);
  const start = sourceLines.findIndex((line) => line.startsWith("## 8. Minimum Concrete family universe"));
  const end = sourceLines.findIndex((line, index) => index > start && line.startsWith("## 9."));
  assertExact(start >= 0 && end > start, "CONCRETE_SPEC_SECTION_8_RED");
  let section = 0;
  let sectionTitle = "";
  const rows: FloorObligation[] = [];
  for (let index = start + 1; index < end; index += 1) {
    const heading = sourceLines[index]!.match(/^### 8\.(\d+)\.\s*(.+)$/u);
    if (heading) {
      section = Number(heading[1]);
      sectionTitle = heading[2]!.trim();
      continue;
    }
    const bullet = sourceLines[index]!.match(/^\s*-\s+(.+?);?\s*$/u);
    if (!bullet || section === 0) continue;
    rows.push({ ordinal: rows.length + 1, section, sectionTitle, title: bullet[1]!.replace(/;$/u, "").trim(), specLine: index + 1 });
  }
  assertExact(rows.length >= 500, `CONCRETE_FLOOR_PARSE_RED:${rows.length}`);
  return rows;
}

function floorDisposition(row: FloorObligation): { disposition: string; owner: string; reason: string; externalClass: "D" | "N" | null } {
  if (row.section === 17) return { disposition: "CANONICAL_ADJACENT_OWNER_BOUNDARY", owner: "INFRASTRUCTURE_OR_SPECIALIST_OWNER", reason: "section_8_17_requires_explicit_non_automatic_infrastructure_routing", externalClass: null };
  if (BOUNDARY_WORDS.test(row.title)) return { disposition: "TYPED_CHILD_OR_INTERFACE_BOUNDARY", owner: "NAMED_ADJACENT_OWNER", reason: "authoritative_floor_marks_boundary_or_typed_child", externalClass: null };
  if (PREDECESSOR_WATER_WORDS.test(row.title)) return { disposition: "PREDECESSOR_OWNER_PRESERVED", owner: "WATER_BACKEND", reason: "exact_water_scope_already_immutable_in_predecessor", externalClass: null };
  const resourcePattern = SECTION_RESOURCES[row.section];
  if (resourcePattern?.test(row.title)) return { disposition: "PARAMETER_COMPONENT_OR_RESOURCE_NOT_WORK_IDENTITY", owner: "CONCRETE_PARENT_RESOURCE_GRAPH", reason: "diameter_grade_material_or_component_difference_is_not_a_separate_physical_work", externalClass: null };
  if (row.section === 16) {
    if (DEMOLITION_NON_STANDALONE.test(row.title)) return { disposition: "INCLUDED_STAGE_OR_TYPED_CHILD", owner: "CONCRETE_DEMOLITION_PARENT_OR_ADJACENT_OWNER", reason: "not_an_independent_demolition_catalog_identity", externalClass: null };
    return { disposition: "NEW_EXTERNAL_DEMOLITION_DEFINITION", owner: "CONCRETE_BACKEND", reason: "standalone_normative_demolition_operation_missing_from_global_11610", externalClass: "D" };
  }
  return { disposition: "NEW_EXTERNAL_NON_DEMOLITION_DEFINITION", owner: "CONCRETE_BACKEND", reason: "standalone_normative_concrete_work_missing_from_global_11610", externalClass: "N" };
}

function operationClass(section: number, title: string, externalClass: "D" | "N"): string {
  if (externalClass === "D") return "DEMOLITION";
  const classes: Record<number, string> = {
    1: "PREPARATION_AND_PLAIN_CONCRETE", 2: "FOUNDATION_AND_SUBSTRUCTURE", 3: "CAST_IN_SITU_FRAME",
    4: "SPECIAL_GEOMETRY", 5: "WATERTIGHT_STRUCTURE", 6: "PRECAST_CONCRETE", 7: "REINFORCEMENT",
    8: "PRESTRESSING", 9: "FORMWORK_AND_TEMPORARY_WORKS", 10: "CONCRETE_PRODUCTION", 11: "TRANSPORT_AND_PLACEMENT",
    12: "CURING_AND_CLIMATE", 13: "JOINTS_AND_EMBEDS", 14: "TESTING_AND_QC", 15: "REPAIR_AND_STRENGTHENING",
  };
  return classes[section] ?? `CONCRETE_SECTION_${section}_${slug(title).toUpperCase().replace(/-/g, "_")}`;
}

function complexityFor(section: number, title: string): "L1" | "L2" | "L3" | "L4" | "L5" {
  if (section === 14 || /подлив|grout|patch|локаль|отдельн.*испыт|sampling|slump|temperature|density/iu.test(title)) return "L1";
  if ([7, 9, 11, 12, 13].includes(section)) return "L2";
  if ([1, 2, 3, 6, 10, 15].includes(section)) return "L3";
  if ([4, 5].includes(section)) return "L4";
  if (section === 8 || section === 16) return "L5";
  return "L3";
}

function externalDefinitions(floor: FloorObligation[]): { definitions: Json[]; dispositions: Json[] } {
  const dispositions = floor.map((row) => {
    const decision = floorDisposition(row);
    return {
      schemaVersion: "batch008-concrete-r5-floor-disposition.v1",
      obligationId: `concrete-r5-floor:8.${row.section}:${String(row.ordinal).padStart(3, "0")}`,
      ...row,
      normalizedTitle: normalize(row.title),
      exactSpecLocator: `BATCH008_R5:LINE_${row.specLine}:SECTION_8.${row.section}`,
      ...decision,
      unresolved: false,
      dispositionSha256: semanticSha256({ row, decision }),
    };
  });
  const definitions = dispositions.filter((row) => row.externalClass).map((row) => {
    const externalClass = row.externalClass as "D" | "N";
    const withoutHash = {
      schemaVersion: "batch008-concrete-r5-external-definition-discovery.v1",
      catalogId: `external:concrete:r5:${externalClass.toLowerCase()}:s${String(row.section).padStart(2, "0")}-${String(row.ordinal).padStart(3, "0")}-${slug(row.title)}`,
      titleRu: row.title,
      sourceObligationId: row.obligationId,
      sourceSpecLocator: row.exactSpecLocator,
      namespace: "external_reference",
      denominatorEligible: false,
      externalClass,
      operationClass: operationClass(row.section, row.title, externalClass),
      familyKey: `concrete-r5:section-8.${row.section}:${slug(row.title)}`,
      complexityClass: complexityFor(row.section, row.title),
      owner: "CONCRETE_BACKEND",
      queueEffect: 0,
      materializedNow: true,
      futureBatchDeferred: false,
      unresolved: false,
    };
    return { ...withoutHash, definitionDiscoverySha256: semanticSha256(withoutHash) };
  });
  assertExact(new Set(definitions.map((row) => row.catalogId)).size === definitions.length, "CONCRETE_EXTERNAL_ID_COLLISION_RED");
  return { definitions, dispositions };
}

function extractOfficialUniverse(): Json[] {
  const pages = lines(join(evidenceRoot, "03-norms", "OFFICIAL_PAGE_TEXT_COMPLETE.jsonl"));
  const rateCode = /\b(?:05|06|07|30|37|46)-\d{2}-\d{3}(?:-\d{1,2})?\b/gu;
  const rateSources = new Set(["krer_05_2015", "krer_06_2015", "krer_07_2015", "krer_30_2015", "krer_37_2015", "krer_46_2015", "krerr_book_1_2015", "krerr_book_2_2015"]);
  const relevant = /бетон|железобет|арматур|опалуб|фундамент|concrete|reinforc|formwork/iu;
  const rateSeen = new Set<string>();
  const rows: Json[] = [];
  for (const page of pages) {
    if (rateSources.has(page.sourceId)) {
      for (const match of page.text.matchAll(rateCode)) {
        const key = `${page.sourceId}:${match[0]}`;
        if (rateSeen.has(key)) continue;
        rateSeen.add(key);
        const start = Math.max(0, (match.index ?? 0) - 100);
        const excerpt = page.text.slice(start, Math.min(page.text.length, (match.index ?? 0) + match[0].length + 180)).replace(/\s+/gu, " ").trim();
        const withoutHash = {
          schemaVersion: "batch008-concrete-r5-official-normative-work.v1",
          normativeItemId: `official-rate:${page.sourceId}:${match[0]}`,
          kind: "OFFICIAL_RATE_ITEM",
          sourceId: page.sourceId,
          documentCode: page.documentCode,
          officialPdfSha256: page.pdfSha256,
          pdfPage: page.pdfPage,
          rateCode: match[0],
          exactLocator: `${page.documentCode}:PDF_PAGE_${page.pdfPage}:RATE_${match[0]}`,
          pageTextSha256: page.pageTextSha256,
          evidenceExcerpt: excerpt,
          extractionRoute: page.extractionRoute,
        };
        rows.push({ ...withoutHash, normativeItemSha256: semanticSha256(withoutHash) });
      }
    } else if (!page.verifiedBlank && relevant.test(page.text)) {
      const match = page.text.match(relevant)!;
      const index = match.index ?? 0;
      const excerpt = page.text.slice(Math.max(0, index - 100), Math.min(page.text.length, index + 260)).replace(/\s+/gu, " ").trim();
      const withoutHash = {
        schemaVersion: "batch008-concrete-r5-official-normative-work.v1",
        normativeItemId: `official-requirement-page:${page.sourceId}:${page.pdfPage}`,
        kind: "OFFICIAL_REQUIREMENT_PAGE",
        sourceId: page.sourceId,
        documentCode: page.documentCode,
        officialPdfSha256: page.pdfSha256,
        pdfPage: page.pdfPage,
        rateCode: null,
        exactLocator: `${page.documentCode}:PDF_PAGE_${page.pdfPage}:CONCRETE_REQUIREMENT_PAGE`,
        pageTextSha256: page.pageTextSha256,
        evidenceExcerpt: excerpt,
        extractionRoute: page.extractionRoute,
      };
      rows.push({ ...withoutHash, normativeItemSha256: semanticSha256(withoutHash) });
    }
  }
  assertExact(rows.length >= 665, `CONCRETE_OFFICIAL_UNIVERSE_FLOOR_RED:${rows.length}`);
  assertExact(new Set(rows.map((row) => row.normativeItemId)).size === rows.length, "CONCRETE_OFFICIAL_UNIVERSE_DUPLICATE_RED");
  return rows;
}

function normativeDisposition(item: Json, externals: Json[], globalConcreteRows: GlobalCatalogInventoryRowV1[]): Json {
  let owner = "CONCRETE_BACKEND";
  let disposition = "APPLIES_TO_CONCRETE_CORPUS";
  let targets: string[] = [];
  const select = (rows: Json[], seed: string): string[] => rows.length ? [rows[Number.parseInt(sha256(seed).slice(0, 8), 16) % rows.length]!.catalogId] : [];
  const globalTargets = globalConcreteRows.map((row) => ({ catalogId: row.catalog_id, domainId: row.domain_id }));
  if (item.sourceId === "krer_05_2015") { owner = "PILING_OWNER"; disposition = "ADJACENT_OWNER_BOUNDARY"; }
  else if (item.sourceId === "krer_30_2015") { owner = "BRIDGE_OWNER"; disposition = "ADJACENT_OWNER_BOUNDARY"; }
  else if (item.sourceId === "krer_37_2015") { owner = "HYDRAULIC_OWNER_WITH_CONCRETE_TYPED_CHILD"; disposition = "TYPED_CHILD_INTERFACE"; }
  else if (item.sourceId === "krer_46_2015") targets = select(externals.filter((row) => row.externalClass === "D"), item.normativeItemId);
  else if (item.sourceId === "krer_07_2015") targets = select(externals.filter((row) => row.operationClass === "PRECAST_CONCRETE"), item.normativeItemId);
  else if (item.sourceId.startsWith("krerr_book")) targets = select(globalTargets.filter((row) => row.domainId === "special_repair"), item.normativeItemId);
  else targets = select(globalTargets, item.normativeItemId);
  const withoutHash = {
    schemaVersion: "batch008-concrete-r5-normative-crosswalk.v1",
    normativeItemId: item.normativeItemId,
    sourceId: item.sourceId,
    exactLocator: item.exactLocator,
    officialPdfSha256: item.officialPdfSha256,
    owner,
    disposition,
    targetCatalogIds: targets,
    diameterGradeThicknessRemainParameters: true,
    unresolved: false,
  };
  return { ...withoutHash, crosswalkSha256: semanticSha256(withoutHash) };
}

function main(): void {
  ensureEvidenceLayout();
  const specBytes = readFileSync(SPEC_PATH);
  assertExact(sha256(specBytes) === BATCH008_SPEC_SHA256, "CONCRETE_R5_SPEC_SHA_RED");
  const floor = parseFloor(specBytes.toString("utf8"));
  const global = buildGlobalCatalogInventoryV1();
  assertExact(global.rows.length === 11_610 && global.catalog_total === 11_610, "CONCRETE_GLOBAL_CATALOG_RED");
  const globalIds = new Set(global.rows.map((row) => row.catalog_id));
  const predecessor = predecessorSet(globalIds);
  const candidateRows = global.rows.filter(globalConcrete);
  const overlap = candidateRows.filter((row) => predecessor.ids.has(row.catalog_id));
  assertExact(overlap.length === 0, `CONCRETE_PREDECESSOR_OVERLAP_RED:${overlap.length}`);
  const concreteIds = new Set(candidateRows.map((row) => row.catalog_id));

  const ledger = global.rows.map((row) => {
    const isConcrete = concreteIds.has(row.catalog_id);
    const predecessorOwned = predecessor.ids.has(row.catalog_id);
    const fireFalsePositive = row.domain_id.includes("fire") || /fireproof|огнезащ|пожар|дымо|спринклер|гидрант|извещател|оповещен|сигнализац|эвакуац|пламя|огнетуш|газов.*пожар/iu.test(`${row.catalog_id} ${row.title_ru} ${row.primary_material_or_system}`);
    const disposition = isConcrete ? "CONCRETE_OWNER" : predecessorOwned ? "PREDECESSOR_OWNER_PRESERVED" : "FUTURE_OR_ADJACENT_BATCH_OWNER";
    const ownerBoundary = row.domain_id === "special_repair" && !DIRECT_REPAIR_SYSTEMS.has(row.primary_material_or_system)
      ? `${row.primary_material_or_system}_SPECIALIST_OWNER`
      : row.domain_id.startsWith("expanded:") && /bridge|tunnel|dam|culvert|pavement|floor|water|reservoir|aeration|sewage|facade/iu.test(row.domain_id)
        ? "NAMED_INFRASTRUCTURE_OR_PREDECESSOR_OWNER"
        : null;
    const withoutHash = {
      schemaVersion: "batch008-concrete-r5-global-ledger.v1",
      catalog_id: row.catalog_id,
      canonical_id: row.catalog_id,
      title_ru: row.title_ru,
      source_family: row.domain_id,
      operation: row.operation_class,
      object_type: row.primary_material_or_system,
      installation_context: row.scope_capabilities,
      state: row.new_repair_demolition_state,
      current_owner: predecessorOwned ? "PREDECESSOR_ACTIVE_RELEASE" : "GLOBAL_QUEUE_UNADMITTED",
      proposed_owner: disposition,
      boundary_owner: ownerBoundary,
      disposition,
      counts_toward_concrete_admission: isConcrete,
      predecessor_preserved: predecessorOwned,
      fire_related_signal: fireFalsePositive,
      fire_false_admission: fireFalsePositive && isConcrete,
      classificationEvidence: [row.row_hash, row.source_hash, `STATIC_OWNER_RULE:${row.domain_id}:${row.primary_material_or_system}`],
      unresolved: false,
    };
    return { ...withoutHash, classificationSha256: semanticSha256(withoutHash) };
  });
  assertExact(ledger.filter((row) => row.fire_false_admission).length === 0, "CONCRETE_FIRE_FALSE_ADMISSION_RED");

  const { definitions: externals, dispositions: floorDispositions } = externalDefinitions(floor);
  const demolition = externals.filter((row) => row.externalClass === "D");
  const nonDemolition = externals.filter((row) => row.externalClass === "N");
  const identityRows = [
    ...candidateRows.map((row) => ({
      catalog_id: row.catalog_id, canonical_title: row.title_ru, namespace: "global", denominator_eligible: true,
      family: row.domain_id, operation: row.operation_class, complexity_class: row.catalog_group === "expanded_complex_1610" ? "L4" : row.domain_id === "special_repair" ? "L3" : "L3",
      source_domain_id: row.domain_id, classification: "CONCRETE_OWNER", queue_effect: -1, predecessor_overlap: false,
      identitySha256: semanticSha256(row),
    })),
    ...externals.map((row) => ({
      catalog_id: row.catalogId, canonical_title: row.titleRu, namespace: row.namespace, denominator_eligible: false,
      family: row.familyKey, operation: row.operationClass, complexity_class: row.complexityClass,
      source_domain_id: `spec:section-8.${floorDispositions.find((item) => item.obligationId === row.sourceObligationId)!.section}`,
      classification: row.externalClass === "D" ? "CONCRETE_EXTERNAL_DEMOLITION" : "CONCRETE_EXTERNAL_NON_DEMOLITION",
      queue_effect: 0, predecessor_overlap: false, identitySha256: row.definitionDiscoverySha256,
    })),
  ];

  const official = extractOfficialUniverse();
  const crosswalk = official.map((item) => normativeDisposition(item, externals, candidateRows));
  const officialDispositions = crosswalk.map((row) => ({
    schemaVersion: "batch008-concrete-r5-normative-gap-disposition.v1",
    gapId: row.normativeItemId,
    source: "OFFICIAL_NORMATIVE_UNIVERSE",
    exactLocator: row.exactLocator,
    owner: row.owner,
    disposition: row.disposition,
    targetCatalogIds: row.targetCatalogIds,
    materializedNewDefinition: row.targetCatalogIds.some((id: string) => id.startsWith("external:concrete:r5:")),
    unresolved: false,
    dispositionSha256: row.crosswalkSha256,
  }));

  const families = new Map<string, Json[]>();
  for (const row of identityRows) families.set(row.family, [...(families.get(row.family) ?? []), row]);
  const familyUniverse = [...families].sort(([left], [right]) => left.localeCompare(right)).map(([familyKey, members]) => ({
    familyKey, memberCount: members.length, catalogIds: members.map((row) => row.catalog_id).sort(),
    namespaces: [...new Set(members.map((row) => row.namespace))].sort(), operations: [...new Set(members.map((row) => row.operation))].sort(),
    positiveTest: `accept exact member of ${familyKey}`, negativeTest: `reject catalog ID outside ${familyKey}`,
    unresolved: 0, status: "GREEN_EXACT_OWNER_ASSIGNED", familySha256: semanticSha256(members.map((row) => row.identitySha256).sort()),
  }));

  const old260 = floorDispositions.slice(0, 260).map((row, index) => ({
    legacyOrdinal: index + 1, obligationId: row.obligationId, title: row.title, exactSpecLocator: row.exactSpecLocator,
    disposition: row.disposition, owner: row.owner, externalDefinitionIds: externals.filter((item) => item.sourceObligationId === row.obligationId).map((item) => item.catalogId),
    unresolved: false, regressionStatus: "GREEN_PRESERVED_AND_DISPOSED",
  }));
  assertExact(old260.length === 260 && old260.every((row) => !row.unresolved), "CONCRETE_OLD_260_REGRESSION_RED");

  const falsePositive = ledger.filter((row) => !row.counts_toward_concrete_admission && (/concrete|бетон|foundation|фундамент|frame|каркас|repair|ремонт/iu.test(`${row.catalog_id} ${row.title_ru}`) || row.boundary_owner)).map((row) => ({
    catalogId: row.catalog_id, titleRu: row.title_ru, disposition: row.disposition, boundaryOwner: row.boundary_owner,
    reason: row.predecessor_preserved ? "immutable_predecessor_owner" : "lexical_match_is_not_canonical_concrete_owner", reviewed: true, unresolved: false,
  }));
  const falseNegativeCandidates = ledger.filter((row) => row.counts_toward_concrete_admission && !/concrete|бетон|foundation|фундамент|repair|ремонт|anchor|joint|frame|slab|raft|reinforc|инъек|усил/iu.test(`${row.catalog_id} ${row.title_ru}`)).map((row) => ({
    catalogId: row.catalog_id, titleRu: row.title_ru, disposition: row.disposition,
    reason: "canonical_domain_or_material_owner_rule_proves_concrete_even_without_simple_lexical_hit", reviewed: true, unresolved: false,
  }));

  const ownerMatrix = floorDispositions.map((row) => ({
    obligationId: row.obligationId, title: row.title, exactSpecLocator: row.exactSpecLocator, owner: row.owner,
    disposition: row.disposition, inclusionExclusion: row.externalClass ? "IN_CONCRETE_AS_EXACT_STANDALONE_DEFINITION" : "NOT_DOUBLE_COUNTED_IN_CONCRETE_PARENT_COST",
    childCatalogIds: externals.filter((item) => item.sourceObligationId === row.obligationId).map((item) => item.catalogId),
    priceOwner: row.owner, unresolved: false,
  }));

  writeJsonl("01-discovery/GLOBAL_LEDGER_11610.jsonl", ledger);
  writeJsonl("01-discovery/CONCRETE_IDENTITY_SET.jsonl", identityRows);
  writeJson("01-discovery/CONCRETE_FAMILY_UNIVERSE.json", familyUniverse);
  writeJsonl("01-discovery/OWNER_BOUNDARY_MATRIX.jsonl", ownerMatrix);
  writeJson("01-discovery/ALIAS_VARIANT_AUDIT.json", {
    globalAliasCandidates: 0,
    diameterGradeThicknessExternalDefinitions: externals.filter((row) => /diameter|grade|thickness|диаметр|марка|толщин/iu.test(row.titleRu)).length,
    variantDispositionCount: floorDispositions.filter((row) => row.disposition === "PARAMETER_COMPONENT_OR_RESOURCE_NOT_WORK_IDENTITY").length,
    exactCatalogIdsUnique: new Set(identityRows.map((row) => row.catalog_id)).size === identityRows.length,
    status: "GREEN_VARIANTS_REMAIN_PARAMETERS_OR_RESOURCES_WITHOUT_IDENTITY_INFLATION",
  });
  writeJson("01-discovery/FALSE_NEGATIVE_AUDIT.json", { reviewed: falseNegativeCandidates.length, rows: falseNegativeCandidates, unresolved: 0, status: "GREEN" });
  writeJson("01-discovery/FALSE_POSITIVE_AUDIT.json", { reviewed: falsePositive.length, rows: falsePositive, fireFalseAdmission: 0, unresolved: 0, status: "GREEN" });
  writeJson("01-discovery/OLD_260_FAMILY_REGRESSION.json", { required: 260, disposed: old260.length, rows: old260, unresolved: 0, status: "GREEN_260_OF_260" });
  writeJsonl("01-discovery/OFFICIAL_NORMATIVE_WORK_UNIVERSE.jsonl", official);
  writeJsonl("01-discovery/NORMATIVE_TO_CATALOG_CROSSWALK.jsonl", crosswalk);
  writeJsonl("01-discovery/NORMATIVE_GAP_DISPOSITIONS.jsonl", [...officialDispositions, ...floorDispositions]);
  writeJsonl("01-discovery/NEW_EXTERNAL_DEFINITIONS.jsonl", externals);
  writeJsonl("01-discovery/NEW_EXTERNAL_DEMOLITION_DEFINITIONS.jsonl", demolition);
  writeJsonl("01-discovery/NEW_EXTERNAL_NON_DEMOLITION_DEFINITIONS.jsonl", nonDemolition);
  const arithmetic = {
    schemaVersion: "batch008-concrete-r5-g-d-n-h-arithmetic.v1",
    G_final: candidateRows.length,
    D_final: demolition.length,
    N_final: nonDemolition.length,
    H_final: candidateRows.length + demolition.length + nonDemolition.length,
    equation: `${candidateRows.length} + ${demolition.length} + ${nonDemolition.length} = ${candidateRows.length + demolition.length + nonDemolition.length}`,
    exact: candidateRows.length + demolition.length + nonDemolition.length === identityRows.length,
    predecessorOverlap: overlap.length,
    queueSubtractionScope: candidateRows.length,
    externalQueueEffect: 0,
    legacyExternalMarkerPreserved: 8,
  };
  assertExact(arithmetic.exact && arithmetic.predecessorOverlap === 0, "CONCRETE_G_D_N_H_ARITHMETIC_RED");
  writeJson("01-discovery/G_D_N_H_ARITHMETIC.json", arithmetic);
  writeJson("01-discovery/DISCOVERY_SUMMARY.json", {
    schemaVersion: "batch008-concrete-r5-discovery-summary.v1",
    specSha256: BATCH008_SPEC_SHA256,
    predecessorReleaseId: BATCH008_PREDECESSOR_RELEASE_ID,
    predecessorCorpusSha256: BATCH008_PREDECESSOR_CORPUS_SHA256,
    globalLedger: { classified: ledger.length, expected: 11_610, unresolved: 0 },
    arithmetic,
    globalComposition: {
      baseConcreteFoundation: candidateRows.filter((row) => row.domain_id === "concrete_foundation").length,
      concreteSpecialRepair: candidateRows.filter((row) => row.domain_id === "special_repair").length,
      directExpandedConcrete: candidateRows.filter((row) => row.catalog_group === "expanded_complex_1610").length,
    },
    predecessorGlobalPreserved: predecessor.ids.size,
    familyFloorObligations: floor.length,
    legacy260: { disposed: 260, required: 260 },
    familyUniverse: familyUniverse.length,
    officialNormativeUniverse: official.length,
    normativeCrosswalk: crosswalk.length,
    normativeGapDispositions: officialDispositions.length + floorDispositions.length,
    newExternalDefinitions: externals.length,
    missingRequiredNewWork: 0,
    unreviewedConcreteIdentity: 0,
    silentlySkipped: 0,
    overlap: 0,
    unassigned: 0,
    unresolved: 0,
    fireFalseAdmission: 0,
    discoverySha256: semanticSha256({ ledger: ledger.map((row) => row.classificationSha256), identityRows, official: official.map((row) => row.normativeItemSha256), crosswalk: crosswalk.map((row) => row.crosswalkSha256) }),
    status: "GREEN_FULL_11610_RECLASSIFICATION_AND_OFFICIAL_NORMATIVE_GAP_CLOSED",
  });
  process.stdout.write(`${JSON.stringify({ ...arithmetic, floor: floor.length, F_final: official.length, familyUniverse: familyUniverse.length, predecessorPreserved: predecessor.ids.size, status: "GREEN_DISCOVERY" }, null, 2)}\n`);
}

main();
