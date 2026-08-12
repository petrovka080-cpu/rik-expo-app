import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-five-p0-remediation-r1:expected-scope:v1";
const GENERATED_AT_UTC = "2026-08-12T00:00:00.000Z";
const REVIEWER = "CODEX_POST_AUDIT_REMEDIATION_R1";
const R63_INVENTORY_SHA256 = "a8a0b8053b3b91107d8cc1dbed794ce9b3df193a3099294c54068cdf5eccb0c1";
const IDENTITY_LEDGER_SHA256 = "c07463d286b573bb3493c6b40d90aaa81e13a5eddc8be9fb8a0e708a0d52b52f";

const STAGE_IDS = Object.freeze([
  "initial_data_and_survey",
  "site_setup_temporary_traffic_safety",
  "setting_out_geodesy",
  "demolition_milling_removal",
  "waste_classification_loading_transport_disposal",
  "earthworks_subgrade",
  "geosynthetics_separation_reinforcement",
  "drainage_dewatering",
  "subbase_base_layers",
  "prime_tack_bond_coat",
  "asphalt_mixture_production_supply_transport",
  "paving_joints_edges_compaction",
  "curbs_parking_geometry_accessibility",
  "marking_signs_barriers_lighting_explicit_scope",
  "sampling_laboratory_and_in_situ_qa",
  "acceptance_as_built_documentation",
  "site_restoration",
]);

const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));

const repoRoot = process.cwd();
const identityLedgerPath = path.resolve(String(argv["identity-ledger"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1",
  "identity", "M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv",
)));
const r63InventoryPath = path.resolve(String(argv["r63-inventory"] ?? ""));
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1",
)));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function shaObject(value) {
  return sha256(canonical(value));
}

function fileSha(file) {
  return sha256(readFileSync(file));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...data] = rows;
  return data.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""]),
  ));
}

function writeDeterministic(relative, content) {
  const file = path.join(outputRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  if (existsSync(file)) {
    invariant(readFileSync(file, "utf8") === content, `IMMUTABLE_OUTPUT_MISMATCH:${relative}`);
    return;
  }
  writeFileSync(file, content, "utf8");
}

function writeJson(relative, value) {
  writeDeterministic(relative, `${JSON.stringify(value, null, 2)}\n`);
}

function setStage(stageMap, stageId, status, reason, trigger = null) {
  invariant(STAGE_IDS.includes(stageId), `UNKNOWN_STAGE_ID:${stageId}`);
  stageMap.set(stageId, { stageId, status, reason, trigger });
}

function stagePlan(profile) {
  const stages = new Map(STAGE_IDS.map((stageId) => [stageId, {
    stageId,
    status: "NOT_APPLICABLE",
    reason: "Stage не относится к physical result этой самостоятельной работы.",
    trigger: null,
  }]));
  const applicable = (stageId, reason) => setStage(stages, stageId, "APPLICABLE", reason);
  const conditional = (stageId, reason, trigger) => setStage(stages, stageId, "CONDITIONAL", reason, trigger);

  applicable("initial_data_and_survey", "Требуется подтвердить identity, геометрию и исходное состояние объекта.");
  conditional("site_setup_temporary_traffic_safety", "Организация площадки зависит от действующего движения и доступности зоны.", "Работа выполняется в открытой для движения или занятой зоне.");
  applicable("sampling_laboratory_and_in_situ_qa", "Нужен work-specific контроль результата и входных материалов.");
  applicable("acceptance_as_built_documentation", "Нужна приёмка количества, качества и immutable proof package.");
  conditional("site_restoration", "Восстановление требуется после нарушения прилегающей зоны.", "Площадка, обочины, газон или примыкания были нарушены.");

  if (["FULL_ROAD_ASSEMBLY", "PARKING_ACCESS_ASSEMBLY"].includes(profile)) {
    applicable("setting_out_geodesy", "Полная геометрия требует разбивки и высотного контроля.");
    conditional("demolition_milling_removal", "Удаление существующих слоёв определяется survey и проектом.", "Проект или defect survey требует удаления существующей конструкции.");
    conditional("waste_classification_loading_transport_disposal", "Waste stage следует только из подтверждённого удаления.", "Demolition/milling/removal включён в scope.");
    applicable("earthworks_subgrade", "Полная pavement structure требует подготовки земляного полотна.");
    conditional("geosynthetics_separation_reinforcement", "Геосинтетика определяется расчётом и грунтовыми условиями.", "Design/geotechnical input предписывает separation или reinforcement.");
    conditional("drainage_dewatering", "Водоотвод зависит от рельефа, groundwater и design drainage.", "Есть surface/subsurface water risk или проектный drainage scope.");
    applicable("subbase_base_layers", "Полная конструкция включает проектные subbase/base layers.");
    applicable("prime_tack_bond_coat", "Связь между подготовленным основанием и асфальтовыми слоями должна быть определена проектом.");
    applicable("asphalt_mixture_production_supply_transport", "Асфальтовая смесь должна быть произведена, поставлена и доставлена в контролируемом состоянии.");
    applicable("paving_joints_edges_compaction", "Physical result требует укладки, сопряжений и уплотнения.");
    conditional("curbs_parking_geometry_accessibility", "Curbs/accessibility не включаются без geometry scope.", "Проект явно включает бордюры, parking geometry или accessibility.");
    conditional("marking_signs_barriers_lighting_explicit_scope", "Associated assets являются typed children, а не скрытой частью pavement.", "Проект явно включает marking/signs/barriers/lighting.");
  } else if (profile === "BRIDGE_ASSEMBLY") {
    applicable("setting_out_geodesy", "Bridge deck geometry и отметки требуют разбивки.");
    conditional("demolition_milling_removal", "Removal определяется состоянием существующего bridge surfacing.", "Rehabilitation design требует удаления покрытия.");
    conditional("waste_classification_loading_transport_disposal", "Waste следует только из подтверждённого removal.", "Removal включён в scope.");
    setStage(stages, "earthworks_subgrade", "NOT_APPLICABLE", "Bridge deck не является earthworks/subgrade owner.");
    setStage(stages, "geosynthetics_separation_reinforcement", "NOT_APPLICABLE", "Reinforcement bridge structure не наследуется asphalt surfacing scope.");
    conditional("drainage_dewatering", "Bridge drainage interface должен быть согласован с deck system.", "Проект включает drains или изменение runoff path.");
    setStage(stages, "subbase_base_layers", "NOT_APPLICABLE", "Road subbase/base не принадлежит bridge deck surfacing owner.");
    applicable("prime_tack_bond_coat", "Deck/waterproofing/pavement interface требует project-specific bond system.");
    applicable("asphalt_mixture_production_supply_transport", "Требуется bridge-applicable mixture supply control.");
    applicable("paving_joints_edges_compaction", "Требуются укладка, швы, примыкания и допустимый compaction method.");
    conditional("curbs_parking_geometry_accessibility", "Только bridge curb/sidewalk interface по проекту.", "Bridge design явно включает interface.");
    conditional("marking_signs_barriers_lighting_explicit_scope", "Не наследуется от дорожного assembly.", "Проект явно включает associated typed child.");
  } else if (profile === "DRAINAGE") {
    applicable("setting_out_geodesy", "Drainage требует отметок, уклонов и outlet coordinates.");
    conditional("demolition_milling_removal", "Локальное вскрытие зависит от существующей конструкции.", "Drain route пересекает существующее покрытие.");
    conditional("waste_classification_loading_transport_disposal", "Waste возникает при вскрытии.", "Removal включён.");
    conditional("earthworks_subgrade", "Траншея или лоток требует earthworks только по geometry.", "Design включает trench/channel excavation.");
    applicable("drainage_dewatering", "Это основной physical result работы.");
    conditional("subbase_base_layers", "Нарушенные слои должны быть восстановлены.", "Drainage installation вскрывает pavement structure.");
    conditional("prime_tack_bond_coat", "Нужно для asphalt reinstatement.", "Есть asphalt reinstatement.");
    conditional("asphalt_mixture_production_supply_transport", "Нужно для asphalt reinstatement.", "Есть asphalt reinstatement.");
    conditional("paving_joints_edges_compaction", "Нужно для asphalt reinstatement и примыканий.", "Есть asphalt reinstatement.");
  } else if (profile === "FINISH_ACCEPTANCE") {
    conditional("setting_out_geodesy", "Geometry verification требуется для area/level acceptance.", "Acceptance plan включает геодезические измерения.");
    setStage(stages, "sampling_laboratory_and_in_situ_qa", "APPLICABLE", "Finish/acceptance scope состоит из проверки качества и результата.");
  } else if (["DEMOLITION", "MILLING"].includes(profile)) {
    applicable("setting_out_geodesy", "Границы и depth removal должны быть размечены.");
    applicable("demolition_milling_removal", "Это основной physical result работы.");
    applicable("waste_classification_loading_transport_disposal", "Удалённый материал требует classification и traceable destination.");
    conditional("earthworks_subgrade", "Нижние слои не затрагиваются без explicit depth.", "Removal depth достигает subgrade.");
    conditional("subbase_base_layers", "Основание восстанавливается только при повреждении или проектном replacement.", "Survey/design подтверждает base repair.");
  } else if (profile === "PREPARATION") {
    conditional("setting_out_geodesy", "Разбивка нужна для локальных зон и elevations.", "Scope содержит локальные границы или отметки.");
    conditional("demolition_milling_removal", "Слабые участки удаляются только по defect survey.", "Survey подтверждает removal.");
    conditional("waste_classification_loading_transport_disposal", "Waste следует из removal.", "Removal включён.");
    conditional("prime_tack_bond_coat", "Bond coat зависит от последующего слоя и состояния поверхности.", "Preparation непосредственно предшествует bonded asphalt layer.");
  } else if (profile === "REPAIR") {
    applicable("setting_out_geodesy", "Repair boundaries и depths должны быть зафиксированы.");
    applicable("demolition_milling_removal", "Defective material удаляется до sound boundary.");
    applicable("waste_classification_loading_transport_disposal", "Removed material получает traceable disposition.");
    conditional("earthworks_subgrade", "Глубокий repair затрагивает subgrade только по survey.", "Defect reaches subgrade.");
    conditional("subbase_base_layers", "Base repair зависит от подтверждённой глубины defect.", "Defect reaches base layers.");
    applicable("prime_tack_bond_coat", "Repair interface требует bond treatment.");
    applicable("asphalt_mixture_production_supply_transport", "Replacement mixture требуется для repair volume.");
    applicable("paving_joints_edges_compaction", "Repair result требует placement, joints и compaction.");
  } else if (profile === "LEVELING") {
    applicable("setting_out_geodesy", "Leveling thickness определяется measured elevations.");
    conditional("demolition_milling_removal", "High spots удаляются только по survey/design.", "Level correction требует milling/removal.");
    conditional("waste_classification_loading_transport_disposal", "Waste следует из removal.", "Removal включён.");
    applicable("prime_tack_bond_coat", "Leveling layer требует связанного interface.");
    applicable("asphalt_mixture_production_supply_transport", "Leveling mixture quantity следует из measured thickness map.");
    applicable("paving_joints_edges_compaction", "Нужны placement и compaction leveling layer.");
  } else if (profile === "COMPACTION") {
    conditional("setting_out_geodesy", "Area/elevation verification зависит от acceptance plan.", "Контролируются elevations или layer boundaries.");
    applicable("paving_joints_edges_compaction", "Compaction является основным physical result; новые paving resources не наследуются автоматически.");
  } else if (["LAYER_PLACEMENT", "BINDER_BASE_LAYER"].includes(profile)) {
    applicable("setting_out_geodesy", "Layer area, width и elevations должны быть заданы.");
    conditional("demolition_milling_removal", "Existing layer removal не входит без explicit rehabilitation scope.", "Survey/design требует removal.");
    conditional("waste_classification_loading_transport_disposal", "Waste следует из removal.", "Removal включён.");
    conditional("subbase_base_layers", "Underlying layer принадлежит отдельному owner, кроме binder/base-layer scope.", profile === "BINDER_BASE_LAYER" ? "Binder/base design явно включает подготовку underlying base." : "Underlying base repair явно включён.");
    applicable("prime_tack_bond_coat", "Interface treatment определяется типом underlying surface и проектом.");
    applicable("asphalt_mixture_production_supply_transport", "Требуется exact mixture, supply и temperature/logistics control.");
    applicable("paving_joints_edges_compaction", "Это основной physical result layer placement.");
  }

  const result = STAGE_IDS.map((stageId) => stages.get(stageId));
  invariant(result.length === STAGE_IDS.length, `STAGE_PLAN_COUNT_MISMATCH:${profile}`);
  invariant(new Set(result.map((stage) => stage.stageId)).size === STAGE_IDS.length, `STAGE_PLAN_DUPLICATE:${profile}`);
  return result;
}

function profileFor(identity, inventory) {
  if (identity.currentIdentityId === "built-in-ai-1000:0701") return "LAYER_PLACEMENT";
  if (["built-in-ai-1000:0702", "built-in-ai-1000:0703"].includes(identity.currentIdentityId)) return "PARKING_ACCESS_ASSEMBLY";
  if (identity.currentIdentityId === "built-in-ai-1000:0670") return "DEMOLITION";
  if (identity.currentIdentityId === "built-in-ai-1000:0704") return "REPAIR";
  if (identity.currentIdentityId === "built-in-ai-1000:0705") return "MILLING";
  if (identity.currentIdentityId === "built-in-ai-1000:0706") return "LAYER_PLACEMENT";
  if (identity.currentIdentityId === "built-in-ai-1000:0707") return "BINDER_BASE_LAYER";
  if (identity.currentWorkKey === "bridge_asphalt") return "BRIDGE_ASSEMBLY";
  if (["COMPOSITE_ROAD_SCOPE", "NEW_FULL_CONSTRUCTION"].includes(inventory.operation_class)) return "FULL_ROAD_ASSEMBLY";
  return {
    COMPACT: "COMPACTION",
    DRAIN: "DRAINAGE",
    FINISH: "FINISH_ACCEPTANCE",
    INSTALL: "LAYER_PLACEMENT",
    LAY: "LAYER_PLACEMENT",
    LEVEL: "LEVELING",
    PREPARE: "PREPARATION",
    REPAIR: "REPAIR",
    SPECIAL_CONTEXT_APPLICATION: "BRIDGE_ASSEMBLY",
  }[inventory.operation_class] ?? "UNRESOLVED";
}

function scenarioMaturity(identity) {
  const id = identity.currentIdentityId;
  if (id.includes("rom_concept")) return "ROM_CONCEPT_INPUT_LIMITED";
  if (id.includes("preliminary_boq")) return "PRELIMINARY_INPUT_LIMITED";
  if (id.includes("detailed_boq_from_drawings")) return "DETAILED_DRAWINGS_REQUIRED";
  if (id.includes("tender_boq")) return "TENDER_DESIGN_REQUIRED";
  if (id.includes("as_built_estimate")) return "AS_BUILT_MEASUREMENTS_REQUIRED";
  return "WORK_EXECUTION_SCOPE";
}

function objectContext(identity, profile) {
  const key = identity.currentWorkKey;
  const context = key.includes("large_area") ? "LARGE_AREA"
    : key.includes("small_area") ? "SMALL_AREA"
      : key.includes("technical_room") ? "TECHNICAL_ROOM"
        : key.includes("wet_zone") ? "WET_ZONE"
          : key.includes("standard") ? "STANDARD_ZONE"
            : profile === "BRIDGE_ASSEMBLY" ? "BRIDGE_DECK"
              : profile === "PARKING_ACCESS_ASSEMBLY" ? "PARKING_OR_ACCESS_SURFACE"
                : profile === "FULL_ROAD_ASSEMBLY" ? "ROAD_PAVEMENT_SYSTEM"
                  : "ASPHALT_PAVEMENT_LAYER";
  return {
    objectClass: context,
    methodClass: profile,
    materialClass: ["DEMOLITION", "MILLING"].includes(profile) ? "EXISTING_ASPHALT_AND_REMOVED_MATERIAL" : "PROJECT_SPECIFIED_ASPHALT_MIXTURE_OR_EXISTING_LAYER",
  };
}

function requiredInputs(identity, profile, maturity) {
  const commonP0 = [
    { inputId: "scope_geometry", owner: "PROJECT_OR_MEASURED_INPUT", requirement: "Exact area/length/width/boundaries; no hidden geometry default." },
    { inputId: "existing_condition", owner: "SURVEY_INPUT", requirement: "Existing layer condition and interfaces." },
  ];
  const profileP0 = {
    FULL_ROAD_ASSEMBLY: [
      { inputId: "pavement_design", owner: "DESIGN_INPUT", requirement: "Layer types, thicknesses, materials and traffic/design category." },
      { inputId: "vertical_geometry", owner: "DESIGN_INPUT", requirement: "Elevations, crossfall, gradients and tie-ins." },
    ],
    PARKING_ACCESS_ASSEMBLY: [
      { inputId: "pavement_design", owner: "DESIGN_INPUT", requirement: "Layer design and traffic/loading class." },
      { inputId: "parking_access_geometry", owner: "DESIGN_INPUT", requirement: "Stalls/aisles/accessibility/turning/tie-ins when applicable." },
    ],
    BRIDGE_ASSEMBLY: [
      { inputId: "bridge_deck_interface", owner: "DESIGN_INPUT", requirement: "Deck, waterproofing, drainage, joints and allowable equipment loads." },
      { inputId: "bridge_layer_design", owner: "DESIGN_INPUT", requirement: "Bridge-specific mixture and thickness design." },
    ],
    DEMOLITION: [{ inputId: "removal_depth_and_waste_class", owner: "SURVEY_AND_LEGAL_INPUT", requirement: "Exact depth, layer boundaries, waste classification and destination." }],
    MILLING: [{ inputId: "milling_depth_map", owner: "SURVEY_OR_DESIGN_INPUT", requirement: "Measured depth map and disposal/reuse decision." }],
    REPAIR: [{ inputId: "defect_map_and_depth", owner: "SURVEY_INPUT", requirement: "Defect boundaries, repair depth and base/subgrade condition." }],
    DRAINAGE: [{ inputId: "drainage_design", owner: "DESIGN_INPUT", requirement: "Catchment, elevations, slopes, outlet and hydraulic capacity." }],
    PREPARATION: [{ inputId: "preparation_acceptance_criteria", owner: "PROJECT_SPECIFICATION", requirement: "Condition, cleanliness, moisture and repair boundary criteria." }],
    LEVELING: [{ inputId: "leveling_thickness_map", owner: "SURVEY_OR_DESIGN_INPUT", requirement: "Measured variable thickness; average hidden default prohibited." }],
    COMPACTION: [{ inputId: "compaction_target_and_method", owner: "PROJECT_AND_MANUFACTURER_INPUT", requirement: "Target density, lift state, roller method and acceptance plan." }],
    LAYER_PLACEMENT: [
      { inputId: "layer_thickness_and_mixture", owner: "DESIGN_AND_PROJECT_SPECIFICATION", requirement: "Exact compacted thickness, mixture identity and density basis." },
      { inputId: "interface_and_joint_design", owner: "PROJECT_SPECIFICATION", requirement: "Bond coat, joints, edges and tie-ins." },
    ],
    BINDER_BASE_LAYER: [
      { inputId: "binder_base_layer_design", owner: "DESIGN_INPUT", requirement: "Layer thickness, mixture, underlying support and compaction target." },
    ],
    FINISH_ACCEPTANCE: [{ inputId: "acceptance_plan", owner: "PROJECT_SPECIFICATION", requirement: "Lot boundaries, tests, tolerances and as-built deliverables." }],
  }[profile] ?? [];
  const maturityP0 = maturity === "WORK_EXECUTION_SCOPE" ? [] : [{
    inputId: "design_maturity_evidence",
    owner: maturity === "AS_BUILT_MEASUREMENTS_REQUIRED" ? "AS_BUILT_RECORD" : "PROJECT_OR_DESIGN_INPUT",
    requirement: `Scenario maturity ${maturity}; unavailable design values remain INPUT_REQUIRED.`,
  }];
  return {
    P0: [...commonP0, ...profileP0, ...maturityP0],
    P1: [
      { inputId: "logistics_plan", owner: "CONTRACTOR_METHOD_STATEMENT", requirement: "Haul routes, delivery windows, paver continuity and waste destination." },
      { inputId: "qa_lot_plan", owner: "PROJECT_QA_PLAN", requirement: "Sampling lots, test locations and acceptance responsibility." },
    ],
    P2: [
      { inputId: "productivity_optimization", owner: "CONTRACTOR_METHOD_STATEMENT", requirement: "Optional productivity inputs cannot change normative scope or quantities silently." },
    ],
    projectDesignManufacturerInputs: sortedUnique([
      ...profileP0.map((input) => input.owner),
      ...maturityP0.map((input) => input.owner),
      "MANUFACTURER_INSTRUCTION_WHERE_PRODUCT_OR_EQUIPMENT_REQUIRES",
    ]),
  };
}

function resourceOwnerClasses(profile) {
  if (profile === "FINISH_ACCEPTANCE") return ["LABOR", "QA_TESTING", "DOCUMENTATION"];
  if (["DEMOLITION", "MILLING"].includes(profile)) return ["LABOR", "EQUIPMENT", "LOGISTICS", "WASTE", "QA_TESTING", "DOCUMENTATION"];
  const base = ["LABOR", "EQUIPMENT", "QA_TESTING", "DOCUMENTATION"];
  if (profile === "COMPACTION") return base;
  return [...base, "MATERIAL", "LOGISTICS"];
}

function qaAcceptance(profile) {
  const common = ["identity_and_geometry_acceptance", "quantity_and_unit_dimensional_check", "as_built_and_proof_hash_acceptance"];
  if (["DEMOLITION", "MILLING"].includes(profile)) return [...common, "removal_depth_and_boundary_check", "waste_destination_trace"];
  if (profile === "DRAINAGE") return [...common, "elevation_slope_outlet_and_flow_check", "reinstatement_acceptance_when_triggered"];
  if (profile === "FINISH_ACCEPTANCE") return [...common, "lot_sampling_and_test_result_review", "surface_geometry_and_defect_review"];
  return [...common, "mixture_identity_and_temperature_when_applicable", "layer_thickness_and_density", "surface_regularities_joints_edges_and_tie_ins"];
}

function boundaries(profile) {
  return {
    demolition: ["DEMOLITION", "MILLING", "REPAIR"].includes(profile) ? "APPLICABLE_OR_CORE" : "CONDITIONAL_BY_SURVEY_OR_DESIGN",
    waste: ["DEMOLITION", "MILLING", "REPAIR"].includes(profile) ? "TRACEABLE_OWNER_REQUIRED" : "ONLY_WHEN_REMOVAL_TRIGGERED",
    logistics: profile === "FINISH_ACCEPTANCE" ? "LIMITED_TO_QA_AND_DOCUMENT_DELIVERY" : "EXACT_MATERIAL_EQUIPMENT_OR_WASTE_FLOW_REQUIRED",
    typedChildren: ["FULL_ROAD_ASSEMBLY", "PARKING_ACCESS_ASSEMBLY", "BRIDGE_ASSEMBLY"].includes(profile)
      ? ["drainage", "curbs", "marking", "signs", "barriers", "lighting", "accessibility"].map((typedChild) => ({ typedChild, rule: "INCLUDE_ONLY_IF_EXPLICIT_PROJECT_SCOPE_AND_SEPARATE_COST_OWNER" }))
      : [{ typedChild: "associated_systems", rule: "NOT_INHERITED_BY_ATOMIC_ASPHALT_WORK" }],
  };
}

function normSourceClasses(profile) {
  const result = ["KG_CONSTRUCTION_NORM_PRIMARY", "KG_ESTIMATE_RATE_PRIMARY"];
  if (!["DEMOLITION", "MILLING", "FINISH_ACCEPTANCE", "DRAINAGE"].includes(profile)) result.push("KG_NATIONAL_STANDARD_PRIMARY");
  if (["FULL_ROAD_ASSEMBLY", "PARKING_ACCESS_ASSEMBLY", "BRIDGE_ASSEMBLY"].includes(profile)) result.push("KG_LEGAL_OR_ADMINISTRATIVE_BASIS", "EAEU_MANDATORY_SAFETY");
  result.push("PROJECT_SPECIFICATION", "DESIGN_INPUT", "MANUFACTURER_INSTRUCTION");
  return result;
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

invariant(argv["r63-inventory"], "R63_INVENTORY_REQUIRED");
invariant(existsSync(identityLedgerPath), `IDENTITY_LEDGER_MISSING:${identityLedgerPath}`);
invariant(existsSync(r63InventoryPath), `R63_INVENTORY_MISSING:${r63InventoryPath}`);
invariant(fileSha(identityLedgerPath) === IDENTITY_LEDGER_SHA256, "IDENTITY_LEDGER_HASH_MISMATCH");
invariant(fileSha(r63InventoryPath) === R63_INVENTORY_SHA256, "R63_INVENTORY_HASH_MISMATCH");

const identities = parseCsv(readFileSync(identityLedgerPath, "utf8"));
const inventoryPayload = JSON.parse(readFileSync(r63InventoryPath, "utf8"));
const inventoryRows = inventoryPayload.records;
invariant(identities.length === 63, `IDENTITY_COUNT_MISMATCH:${identities.length}`);
invariant(Array.isArray(inventoryRows) && inventoryRows.length === 63, `R63_INVENTORY_COUNT_MISMATCH:${inventoryRows?.length}`);
const inventoryById = new Map(inventoryRows.map((row) => [row.catalog_id, row]));

const expectedScopes = identities.map((identity) => {
  const inventory = inventoryById.get(identity.currentIdentityId);
  invariant(inventory, `R63_INVENTORY_IDENTITY_MISSING:${identity.caseId}:${identity.currentIdentityId}`);
  invariant(inventory.work_key === identity.currentWorkKey, `R63_WORK_KEY_MISMATCH:${identity.caseId}`);
  const profile = profileFor(identity, inventory);
  invariant(profile !== "UNRESOLVED", `EXPECTED_SCOPE_PROFILE_UNRESOLVED:${identity.caseId}:${inventory.operation_class}`);
  const maturity = scenarioMaturity(identity);
  const stages = stagePlan(profile);
  const inputs = requiredInputs(identity, profile, maturity);
  const core = {
    schemaVersion: SCHEMA,
    caseIdentity: {
      caseId: identity.caseId,
      caseType: identity.caseType,
      catalogId: identity.catalogId || null,
      externalEntrypointId: identity.externalEntrypointId || null,
      currentIdentityId: identity.currentIdentityId,
      currentWorkKey: identity.currentWorkKey,
      cohortId: identity.cohortId,
    },
    independentProfileId: profile,
    actionLifecycle: inventory.operation_class,
    physicalResult: profile,
    ...objectContext(identity, profile),
    scenarioMaturity: maturity,
    minimalScopeScenario: {
      rule: "Только applicable stages с удовлетворёнными P0 inputs; conditional stages не включаются без trigger evidence.",
      requiredInputIds: inputs.P0.map((input) => input.inputId),
    },
    fullScopeScenario: {
      rule: "Applicable stages плюс только доказанные conditional stages; typed children сохраняют отдельного cost owner.",
      hiddenDefaultsAllowed: false,
    },
    conditionalScopeScenarios: stages.filter((stage) => stage.status === "CONDITIONAL").map((stage) => ({
      stageId: stage.stageId,
      trigger: stage.trigger,
      absentTriggerDisposition: "NOT_APPLICABLE_WITH_REASON",
    })),
    requiredInputs: inputs,
    stageApplicability: stages,
    applicableStages: stages.filter((stage) => stage.status === "APPLICABLE").map((stage) => stage.stageId),
    conditionalStages: stages.filter((stage) => stage.status === "CONDITIONAL").map((stage) => stage.stageId),
    notApplicableStages: stages.filter((stage) => stage.status === "NOT_APPLICABLE").map((stage) => ({ stageId: stage.stageId, reason: stage.reason })),
    expectedResourceOwnerClasses: resourceOwnerClasses(profile),
    expectedQaTestingAcceptance: qaAcceptance(profile),
    boundaries: boundaries(profile),
    normativeSourceClassesExpected: normSourceClasses(profile),
    actualBoqUsedAsOracle: false,
    compilerImported: false,
    actualRowCountRead: false,
    reviewer: REVIEWER,
    reviewerEvidence: {
      r63InventorySha256: R63_INVENTORY_SHA256,
      identityLedgerSha256: IDENTITY_LEDGER_SHA256,
      engineeringApplicabilityMatrix: "INDEPENDENT_ENGINEERING_APPLICABILITY_MATRIX_V1",
      normativeStatus: "PENDING_R3_OFFICIAL_SOURCE_READINESS",
    },
    verdict: "GREEN_R2_EXPECTED_SCOPE_INDEPENDENT_NORMATIVE_R3_PENDING",
  };
  return { ...core, expectedScopeHash: shaObject(core) };
});

invariant(expectedScopes.length === 63, "EXPECTED_SCOPE_COUNT_MISMATCH");
invariant(new Set(expectedScopes.map((scope) => scope.caseIdentity.caseId)).size === 63, "EXPECTED_SCOPE_DUPLICATE_CASE_ID");
invariant(expectedScopes.every((scope) => scope.stageApplicability.length === STAGE_IDS.length), "EXPECTED_SCOPE_STAGE_COVERAGE_MISMATCH");
invariant(expectedScopes.every((scope) => scope.requiredInputs.P0.length > 0), "EXPECTED_SCOPE_P0_INPUTS_EMPTY");
invariant(expectedScopes.every((scope) => scope.notApplicableStages.every((stage) => stage.reason)), "EXPECTED_SCOPE_NA_REASON_MISSING");

const cohortIds = sortedUnique(expectedScopes.map((scope) => scope.caseIdentity.cohortId));
invariant(cohortIds.length === 3, `EXPECTED_SCOPE_COHORT_COUNT_MISMATCH:${cohortIds.length}`);
for (const cohortId of cohortIds) {
  const scopes = expectedScopes.filter((scope) => scope.caseIdentity.cohortId === cohortId);
  writeDeterministic(`cohorts/${cohortId}/EXPECTED_SCOPE.jsonl`, `${scopes.map((scope) => JSON.stringify(scope)).join("\n")}\n`);
}

writeJson("cohorts/R63_EXPECTED_SCOPE_SUMMARY.json", {
  schemaVersion: `${SCHEMA}:summary`,
  generatedAtUtc: GENERATED_AT_UTC,
  cases: expectedScopes.length,
  expectedScopeHashes: Object.fromEntries(expectedScopes.map((scope) => [scope.caseIdentity.caseId, scope.expectedScopeHash])),
  cohortCounts: Object.fromEntries(cohortIds.map((cohortId) => [cohortId, expectedScopes.filter((scope) => scope.caseIdentity.cohortId === cohortId).length])),
  operationCounts: Object.fromEntries(sortedUnique(expectedScopes.map((scope) => scope.actionLifecycle)).map((operation) => [operation, expectedScopes.filter((scope) => scope.actionLifecycle === operation).length])),
  stageDecisionCells: expectedScopes.length * STAGE_IDS.length,
  emptyStageDecisionCells: 0,
  actualBoqUsedAsOracle: false,
  compilerImported: false,
  actualRowCountRead: false,
  unresolvedProfiles: 0,
  reviewer: REVIEWER,
  verdict: "GREEN_R2_EXPECTED_SCOPE_63_INDEPENDENT_FROM_ACTUAL_BOQ",
});

process.stdout.write(`${JSON.stringify({
  verdict: "GREEN_R2_EXPECTED_SCOPE_63_INDEPENDENT_FROM_ACTUAL_BOQ",
  cases: expectedScopes.length,
  stageDecisionCells: expectedScopes.length * STAGE_IDS.length,
  cohortCounts: Object.fromEntries(cohortIds.map((cohortId) => [cohortId, expectedScopes.filter((scope) => scope.caseIdentity.cohortId === cohortId).length])),
  profiles: Object.fromEntries(sortedUnique(expectedScopes.map((scope) => scope.independentProfileId)).map((profile) => [profile, expectedScopes.filter((scope) => scope.independentProfileId === profile).length])),
}, null, 2)}\n`);
