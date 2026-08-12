import { estimateDeterministicHash } from "../../estimateDeterministicHash";

export const ASPHALT_M1_NORMATIVE_BINDING_VERSION_V1 = "master-11610:m1:asphalt-normative-binding:v1" as const;

export type AsphaltM1NormativeSourceRoleV1 = {
  sourceId: string;
  locatorId: string;
  applicabilityRole:
    | "KG_STATUS_OWNER"
    | "KG_APPLICABILITY_OWNER"
    | "KG_CONSTRUCTION_NORM_PRIMARY"
    | "AUTHENTICATED_TEXT_CARRIER";
};

export type AsphaltM1NormativeBindingV1 = {
  sourceIds: string[];
  sourceRoles: AsphaltM1NormativeSourceRoleV1[];
  kgStatusSourceIds: string[];
  kgApplicabilitySourceIds: string[];
  constructionNormLocatorIds: string[];
  locatorReviewStatus: "exact_construction_locator_bound";
  applicability: string;
  referenceDesignSourceId: string | null;
  normativeReviewStatus: "official_scope_verified_benchmark_fixture_inputs_confirmed" | "official_scope_verified_numeric_rate_requires_exact_table_review";
  accepted: boolean;
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function safeToken(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9._:-]+/gu, "-").replace(/^-+|-+$/gu, "");
}

const KG_ROAD_STATUS_ROLES: readonly AsphaltM1NormativeSourceRoleV1[] = Object.freeze([
  {
    sourceId: "KG_CBD_CONSTRUCTION_NORMATIVE_SYSTEM_CURRENT",
    locatorId: "KG_CBD_ORDER_13_NPA_POINTS_16_20_42",
    applicabilityRole: "KG_STATUS_OWNER",
  },
]);

const KG_ROAD_APPLICABILITY_ROLES: readonly AsphaltM1NormativeSourceRoleV1[] = Object.freeze([
  {
    sourceId: "KG_MINTRANSPORT_ROAD_QUALITY_CONTROL_RULES",
    locatorId: "KG_MINTRANSPORT_ROAD_QUALITY_RULES_SECTION_1_POINT_2",
    applicabilityRole: "KG_APPLICABILITY_OWNER",
  },
  {
    sourceId: "KG_MINTRANSPORT_ROAD_QUALITY_CONTROL_RULES",
    locatorId: "KG_MINTRANSPORT_ROAD_QUALITY_RULES_POINT_56",
    applicabilityRole: "KG_APPLICABILITY_OWNER",
  },
]);

const KG_INDUSTRIAL_FLOOR_STATUS_ROLES: readonly AsphaltM1NormativeSourceRoleV1[] = Object.freeze([
  {
    sourceId: "KG_MINSTROY_SP_KR_31_101_2024_APPROVAL_RECORD",
    locatorId: "KG_MINSTROY_ORDER_179_SP_KR_31_101_2024_EFFECTIVE_2024_07_05",
    applicabilityRole: "KG_STATUS_OWNER",
  },
]);

function constructionLocatorIds(
  rowId: string,
  wbsCode: string | null,
  industrialFloor: boolean,
): string[] {
  if (industrialFloor) {
    return [
      "KG_SP_KR_31_101_2024_5_1",
      "KG_SP_KR_31_101_2024_TABLE_5_1",
      "KG_SP_KR_31_101_2024_10_1",
      "KG_SP_KR_31_101_2024_10_6",
      "KG_SP_KR_31_101_2024_APPENDIX_B_TABLE_B_1",
    ];
  }
  const id = rowId.toLocaleLowerCase("en-US");
  const wbs = (wbsCode ?? "").replace(/^wbs:/u, "").padStart(2, "0");
  if (id.includes(":removal:") || id.includes("demolition") || id.includes("milling")) {
    return ["KG_SNIP_3_06_03_85_1_2", "KG_SNIP_3_06_03_85_3_4", "KG_SNIP_3_06_03_85_10_32"];
  }
  if (id.includes(":lighting:") || ["22", "23", "24"].includes(wbs)) {
    return ["KG_SNIP_3_06_03_85_1_2", "KG_SNIP_3_06_03_85_13_1", "KG_SNIP_3_06_03_85_13_2"];
  }
  if (id.includes(":accessible:") || id.includes("accessible_") || id.includes(":parking_geometry:") || id.includes("parking_scope_acceptance")) {
    return ["KG_SNIP_3_06_03_85_1_2", "KG_SNIP_3_06_03_85_3_1", "KG_SNIP_3_06_03_85_14_1"];
  }
  if (id.includes(":marking:") || id.includes(":sign:") || id.includes("guardrail") || ["19", "20", "21"].includes(wbs)) {
    return ["KG_SNIP_3_06_03_85_13_1", "KG_SNIP_3_06_03_85_13_2", "KG_SNIP_3_06_03_85_14_1"];
  }
  if (id.includes(":curb:") || wbs === "13") {
    return ["KG_SNIP_3_06_03_85_1_2", "KG_SNIP_3_06_03_85_14_1"];
  }
  if (id.includes(":drainage:") || ["15", "16", "18"].includes(wbs)) {
    return ["KG_SNIP_3_06_03_85_4_28", "KG_SNIP_3_06_03_85_5_4", "KG_SNIP_3_06_03_85_14_2"];
  }
  if (/site_|subgrade|soil|earthwork|excavat|bulldozer|topsoil/u.test(id) || wbs === "05") {
    return ["KG_SNIP_3_06_03_85_4_2", "KG_SNIP_3_06_03_85_4_18", "KG_SNIP_3_06_03_85_14_2"];
  }
  if (/sand_|crushed_|geotextile|base_/u.test(id) || ["08", "09"].includes(wbs)) {
    return ["KG_SNIP_3_06_03_85_5_1", "KG_SNIP_3_06_03_85_7_1", "KG_SNIP_3_06_03_85_7_2", "KG_SNIP_3_06_03_85_14_2"];
  }
  if (/journal|document|protocol|passport|handover/u.test(id) || wbs === "29") {
    return ["KG_SNIP_3_06_03_85_10_38", "KG_SNIP_3_06_03_85_14_1", "KG_SNIP_3_06_03_85_14_2"];
  }
  if (/test|control|survey|laboratory|acceptance/u.test(id) || wbs === "28") {
    return ["KG_SNIP_3_06_03_85_1_13", "KG_SNIP_3_06_03_85_10_38", "KG_SNIP_3_06_03_85_10_39", "KG_SNIP_3_06_03_85_10_40", "KG_SNIP_3_06_03_85_10_41", "KG_SNIP_3_06_03_85_14_1"];
  }
  if (/haul|delivery|trip|transport|mobilization|disposal|recycling/u.test(id) || wbs === "30") {
    return ["KG_SNIP_3_06_03_85_1_2", "KG_SNIP_3_06_03_85_10_13"];
  }
  if (/emulsion|tack|prime|surface_preparation/u.test(id)) {
    return ["KG_SNIP_3_06_03_85_10_16", "KG_SNIP_3_06_03_85_10_17"];
  }
  if (/paver|placement|lay|spread/u.test(id)) {
    return ["KG_SNIP_3_06_03_85_10_16", "KG_SNIP_3_06_03_85_10_18", "KG_SNIP_3_06_03_85_10_19"];
  }
  if (/roller|compact|density/u.test(id)) {
    return ["KG_SNIP_3_06_03_85_10_22", "KG_SNIP_3_06_03_85_10_23", "KG_SNIP_3_06_03_85_10_24", "KG_SNIP_3_06_03_85_10_25", "KG_SNIP_3_06_03_85_10_26", "KG_SNIP_3_06_03_85_10_41"];
  }
  if (/repair|patch|defect|pothole/u.test(id)) {
    return ["KG_SNIP_3_06_03_85_10_17", "KG_SNIP_3_06_03_85_10_31", "KG_SNIP_3_06_03_85_10_32"];
  }
  if (/asphalt|mixture|bitumen|pavement/u.test(id) || ["10", "11", "12"].includes(wbs)) {
    return ["KG_SNIP_3_06_03_85_10_1", "KG_SNIP_3_06_03_85_10_16", "KG_SNIP_3_06_03_85_10_18", "KG_SNIP_3_06_03_85_10_22", "KG_SNIP_3_06_03_85_10_38", "KG_SNIP_3_06_03_85_10_40"];
  }
  return ["KG_SNIP_3_06_03_85_1_1", "KG_SNIP_3_06_03_85_1_2", "KG_SNIP_3_06_03_85_14_1"];
}

function sourceRolesFor(
  locatorIds: readonly string[],
  industrialFloor: boolean,
): AsphaltM1NormativeSourceRoleV1[] {
  if (industrialFloor) {
    return [
      ...KG_INDUSTRIAL_FLOOR_STATUS_ROLES,
      ...locatorIds.map((locatorId) => ({
        sourceId: "KG_MINSTROY_SP_KR_31_101_2024_OFFICIAL_PDF",
        locatorId,
        applicabilityRole: "KG_CONSTRUCTION_NORM_PRIMARY" as const,
      })),
    ];
  }
  return [
    ...KG_ROAD_STATUS_ROLES,
    ...KG_ROAD_APPLICABILITY_ROLES,
    ...locatorIds.map((locatorId) => ({
      sourceId: "RU_HELPENG_SNIP_3_06_03_85_PDF",
      locatorId,
      applicabilityRole: "AUTHENTICATED_TEXT_CARRIER" as const,
    })),
  ];
}

function exactOfficialSources(rowId: string, wbsCode: string | null): { ids: string[]; applicability: string } {
  const id = rowId.toLocaleLowerCase("en-US");
  const wbs = (wbsCode ?? "").replace(/^wbs:/u, "").padStart(2, "0");
  if (id.includes(":removal:") || id.includes("demolition") || id.includes("milling")) {
    return {
      ids: ["kg_krer27:tables:27-03-008_to_27-03-014:official_pdf_pages:37-43"],
      applicability: "КРЕР-27 tables 27-03-008..014: asphalt pavement dismantling, cutting and milling; exact method remains project-selected",
    };
  }
  if (id.includes(":lighting:") || ["22", "23", "24"].includes(wbs)) {
    return {
      ids: [
        "kg_krer33:table:33-04-003:0.38_to_10kv_poles",
        "kg_krer_application_guidance:clause:1.8:electrical_installations_use_krerm08",
        "kg_krerp01:sections:01-11_to_01-13:cable_grounding_insulation_tests",
        "kg_sn_23-05-2019:outdoor_lighting:project_design_applicability",
      ],
      applicability: "Road-lighting geometry and equipment are owned by the approved lighting design; KRER-33/KRERm-08 guidance and KRERp-01 govern applicable installation and test resource families",
    };
  }
  if (id.includes(":accessible:") || id.includes("accessible_")) {
    return {
      ids: [
        "kg_sn_parkings_2018:scope_and_accessibility:project_design_applicability",
        "kg_krer27:tables:27-09-011_to_27-09-015:road_sign_installation",
        "kg_krer27:tables:27-09-016_to_27-09-019_and_27-09-031_to_27-09-032:official_pdf_pages:171-180",
        "eaeu_tr_ts014_2011:road_sign_and_marking_applicability",
      ],
      applicability: "Parking accessibility, geometry, symbols and sign schedule are fixed by the approved parking design; СН КР 31-12:2018 clauses 4.14, 5.1.5 and 5.1.17 govern parking-specific accessibility while the selected KRER-27 sign and marking tables own installation resources",
    };
  }
  if (id.includes(":parking_geometry:") || id.includes("parking_scope_acceptance")) {
    return {
      ids: [
        "kg_sn_parkings_2018:clause:4.16:entry_exit_visibility_and_manoeuvring",
        "kg_sn_parkings_2018:clause:5.1.4:parking_spaces_aisles_and_project_geometry",
        "kg_sn_parkings_2018:clause:5.1.5:accessible_space_dimensions",
      ],
      applicability: "Parking-space dimensions, manoeuvring aisles and entry/exit visibility are project-owned geometry under СН КР 31-12:2018 clauses 4.16 and 5.1.4; rows quantify setting-out and acceptance without inventing islands or furniture",
    };
  }
  if (id.includes(":marking:") || wbs === "19") {
    return {
      ids: ["kg_krer27:tables:27-09-016_to_27-09-019_and_27-09-031_to_27-09-032:official_pdf_pages:171-180", "eaeu_tr_ts014_2011:road_safety_marking_applicability"],
      applicability: "Marking type and measured area are fixed by the traffic-management design; KRER-27 exact marking table is selected by the specified material",
    };
  }
  if (id.includes(":sign:") || wbs === "20") {
    return {
      ids: ["kg_krer27:tables:27-09-011_to_27-09-015:road_sign_installation", "eaeu_tr_ts014_2011:road_sign_applicability"],
      applicability: "Sign schedule, type and count are project inputs; KRER-27 road-sign tables own installation resource composition",
    };
  }
  if (id.includes("guardrail") || wbs === "21") {
    return {
      ids: ["kg_krer27:tables:27-09-001_to_27-09-007:barrier_and_pedestrian_fencing", "eaeu_tr_ts014_2011:road_restraint_applicability"],
      applicability: "Barrier type, terminals and length are fixed by the road-safety design; KRER-27 tables 27-09-001..007 own applicable installation resources",
    };
  }
  if (id.includes(":curb:") || wbs === "13") {
    return {
      ids: ["kg_krer27:tables:27-02-014_to_27-02-015:curb_and_side_stones"],
      applicability: "Curb type and measured length are project inputs; KRER-27 tables 27-02-014..015 provide the applicable resource family",
    };
  }
  if (id.includes(":drainage:") || ["15", "16", "18"].includes(wbs)) {
    return {
      ids: ["kg_krer27:tables:27-02-001_27-02-003_27-02-005_27-02-007_27-02-009:surface_drainage", "kg_krer01:earthwork_table_selected_by_project_trench_method"],
      applicability: "Hydraulic layout, lengths and structure schedule are project inputs; KRER-27 section 27-02 and the applicable KRER-01 earthwork table own the resource families",
    };
  }
  if (/site_|subgrade|soil|earthwork|excavat|bulldozer|topsoil/u.test(id) || wbs === "05") {
    return {
      ids: ["kg_krer01:tables:01-01_and_01-02:earthworks_selected_by_soil_and_machine"],
      applicability: "Earthwork quantities, soil group and haul route are project inputs; the exact KRER-01 table is selected by confirmed soil and plant",
    };
  }
  if (/sand_|crushed_|geotextile|base_/u.test(id) || ["08", "09"].includes(wbs)) {
    return {
      ids: ["kg_krer27:tables:27-04-001_to_27-04-021:subbase_and_crushed_stone_base", "kg_krer27:technical_part:clause:1.6:layer_thickness_correction"],
      applicability: "Layer material, thickness and compacted quantity are project inputs; KRER-27 section 27-04 and clause 1.6 govern the selected base resource family and thickness adjustment",
    };
  }
  if (/asphalt|emulsion|paver|roller|road_worker|temperature|core_sampling|smoothness|pavement_thickness/u.test(id) || ["10", "11", "12"].includes(wbs)) {
    return {
      ids: [
        "kg_krer27:tables:27-06-019_to_27-06-021_and_27-06-029_to_27-06-031:hot_asphalt_pavement",
        "kg_krer27:technical_part:clause:1.6:layer_thickness_correction",
        "kg_krer27:technical_part:clause:1.8:bitumen_emulsion_delivery_excluded",
      ],
      applicability: "Approved layer schedule and mixture passports own thickness, density and material selection; KRER-27 hot-asphalt tables own applicable labor, machinery and material resource composition",
    };
  }
  if (wbs === "30" || /haul|delivery|trip|transport|mobilization|disposal|recycling/u.test(id)) {
    return {
      ids: ["kg_krer27:technical_part:clause:1.8:bitumen_emulsion_delivery_excluded", "kg_krer27:technical_part:clause:1.9:water_delivery_5km_boundary"],
      applicability: "Distances, payloads, destinations and fleet cycle are explicit project logistics inputs; KRER-27 clauses 1.8 and 1.9 define collection exclusions/boundaries",
    };
  }
  if (wbs === "28" || /test|control|survey|laboratory|acceptance/u.test(id)) {
    return {
      ids: ["kg_krer27:technical_part:quality_control_applicability", "project_quality_control_plan:exact_test_schedule"],
      applicability: "Test types and frequencies are fixed by the accepted project quality-control plan and applicable material/work standards",
    };
  }
  if (wbs === "29" || /document|protocol|journal|passport|handover/u.test(id)) {
    return {
      ids: ["project_document_handover_plan:exact_document_register"],
      applicability: "The project handover register owns document types and counts; document rows never substitute for construction resources",
    };
  }
  return {
    ids: ["kg_krer27:technical_part:clause:1.0:roadworks_scope"],
    applicability: "KRER-27 technical part 1.0 confirms roadwork scope; the exact reference-design row owns the accepted quantity and formula inputs",
  };
}

export function resolveAsphaltM1NormativeBindingV1(input: {
  rowId: string;
  wbsCode?: string | null;
  existingSourceIds: readonly string[];
  referenceDesignId?: string | null;
  referenceDesignSha256?: string | null;
  referenceDesignManifest?: string | null;
  referenceDesignFingerprint?: string | null;
}): AsphaltM1NormativeBindingV1 {
  const referenceDesignId = safeToken(input.referenceDesignId ?? "");
  const referenceDesignSha256 = safeToken(input.referenceDesignSha256 ?? "");
  let parsedManifest: Record<string, unknown> | null = null;
  try {
    const candidate = JSON.parse(input.referenceDesignManifest ?? "null") as unknown;
    parsedManifest = candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? candidate as Record<string, unknown>
      : null;
  } catch {
    parsedManifest = null;
  }
  const hasReferenceDesign = Boolean(
    referenceDesignId &&
    /^[a-f0-9]{64}$/u.test(referenceDesignSha256) &&
    parsedManifest?.design_id === input.referenceDesignId &&
    parsedManifest?.input_ownership === "VERSIONED_M1_BENCHMARK_FIXTURE_NOT_A_PROJECT_DESIGN_OR_PRODUCTION_DEFAULT" &&
    parsedManifest?.approval_scope === "M1_BENCHMARK_ADMISSION_ONLY; NOT A REAL PROJECT OR CONTRACT PRICE APPROVAL" &&
    estimateDeterministicHash(parsedManifest) === input.referenceDesignFingerprint,
  );
  const official = exactOfficialSources(input.rowId, input.wbsCode ?? null);
  const industrialFloor = input.existingSourceIds.includes("kg_sp_31_101_2024_floors") ||
    input.existingSourceIds.includes("kg_krer_11_floors_2015");
  const constructionNormLocatorIds = constructionLocatorIds(input.rowId, input.wbsCode ?? null, industrialFloor);
  const sourceRoles = sourceRolesFor(constructionNormLocatorIds, industrialFloor);
  const referenceDesignSourceId = hasReferenceDesign
    ? `benchmark_fixture:asphalt-m1-reference:${referenceDesignId}:sha256:${referenceDesignSha256}:row:${safeToken(input.rowId)}:formula-inputs`
    : null;
  const existing = hasReferenceDesign
    ? input.existingSourceIds.filter((sourceId) => !sourceId.startsWith("engineering_assumption:"))
    : [...input.existingSourceIds];
  return {
    sourceIds: unique([
      ...existing,
      ...official.ids,
      ...sourceRoles.map((role) => role.locatorId),
      ...(referenceDesignSourceId ? [referenceDesignSourceId] : []),
    ]),
    sourceRoles,
    kgStatusSourceIds: unique(sourceRoles
      .filter((role) => role.applicabilityRole === "KG_STATUS_OWNER")
      .map((role) => role.sourceId)),
    kgApplicabilitySourceIds: unique(sourceRoles
      .filter((role) => role.applicabilityRole === "KG_APPLICABILITY_OWNER")
      .map((role) => role.sourceId)),
    constructionNormLocatorIds,
    locatorReviewStatus: "exact_construction_locator_bound",
    applicability: official.applicability,
    referenceDesignSourceId,
    normativeReviewStatus: hasReferenceDesign
      ? "official_scope_verified_benchmark_fixture_inputs_confirmed"
      : "official_scope_verified_numeric_rate_requires_exact_table_review",
    accepted: hasReferenceDesign,
  };
}
