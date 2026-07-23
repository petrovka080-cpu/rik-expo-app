import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  compileRoadworksWaveAWork,
  getRoadworksWaveAParameterKeys,
} from "./roadworksWaveA";

export type RoadworksWaveANormativeSource = {
  sourceId: string;
  titleRu: string;
  url: string;
  authority: "official_standard_catalog" | "official_ministry" | "legal_document_database";
  applicability: readonly string[];
  formulaAuthority: "applicability_only" | "technical_requirements";
};

export const ROADWORKS_WAVE_A_NORMATIVE_SOURCES: readonly RoadworksWaveANormativeSource[] = [
  {
    sourceId: "kg_nism_gost_9128_2013",
    titleRu: "ГОСТ 9128-2013. Асфальтобетонные смеси и асфальтобетон",
    url: "https://standarts.nism.gov.kg/ru/catalog/4500-smesi-asfalytobetonnie-polimerasfalytobetonnie-asfalytobeton-polimerasfalytobeton-dlya-avtomobilynih-dorog-i-aerodromov-tehnicheskie-usloviya/show",
    authority: "official_standard_catalog",
    applicability: ["asphalt_pavement_installation", "asphalt_mix_placement", "asphalt_leveling", "asphalt_surface_repair"],
    formulaAuthority: "technical_requirements",
  },
  {
    sourceId: "kg_mtd_krer_27_06_20_1",
    titleRu: "КРЕР 27-06-20-1 — устройство покрытия из горячих асфальтобетонных смесей",
    url: "https://mtd.gov.kg/poryadok-rascheta-po-opredeleniyu-planovyh-obemov-sredstv-na-dorozhnye-konsultatsionnye-uslugi-postoyannyj-tehnicheskij-nadzor/",
    authority: "official_ministry",
    applicability: ["asphalt_pavement_installation", "asphalt_mix_placement", "asphalt_compaction"],
    formulaAuthority: "applicability_only",
  },
  {
    sourceId: "kg_mtd_order_171_2003_patch_repair",
    titleRu: "Технические указания по ямочному ремонту, приказ Минтранса КР №171 от 26.06.2003",
    url: "https://prg.kz/Document/?doc_id=30461539",
    authority: "legal_document_database",
    applicability: ["asphalt_surface_repair"],
    formulaAuthority: "technical_requirements",
  },
  {
    sourceId: "kg_snip_32_01_2004_road_design",
    titleRu: "СНиП КР 32-01:2004. Проектирование автомобильных дорог",
    url: "https://prg.kz/m/amp/document/30920815/",
    authority: "legal_document_database",
    applicability: ["asphalt_surface_drainage", "asphalt_surface_preparation", "asphalt_surface_finishing"],
    formulaAuthority: "applicability_only",
  },
] as const;

function semanticSignature(workId: string): string {
  const item = RoadworksWaveAInventory.find((candidate) => candidate.workId === workId);
  if (!item) return "";
  return JSON.stringify({
    semanticModelId: item.semanticModelId,
    parameters: getRoadworksWaveAParameterKeys(workId),
    rows: compileRoadworksWaveAWork(workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows.map((row) => ({
      category: row.category,
      nameRu: row.nameRu,
      unit: row.unit,
      formulaId: row.formulaId,
      affectedBy: row.affectedBy,
    })),
  });
}

export function auditRoadworksWaveASemanticTruth() {
  const independent = RoadworksWaveAInventory.filter((item) => item.semanticOwnership === "independent_model");
  const aliases = RoadworksWaveAInventory.filter((item) => item.semanticOwnership === "catalog_alias");
  const signatures = new Map<string, string[]>();
  for (const item of RoadworksWaveAInventory) {
    const signature = semanticSignature(item.workId);
    signatures.set(signature, [...(signatures.get(signature) ?? []), item.workId]);
  }
  const unexplainedClones = [...signatures.values()].filter((ids) => {
    if (ids.length < 2) return false;
    const owners = ids.map((id) => RoadworksWaveAInventory.find((item) => item.workId === id)!);
    return owners.some((item) => item.semanticOwnership !== "catalog_alias" && item.aliasOfWorkId !== null) ||
      owners.filter((item) => item.semanticOwnership === "independent_model").length !== 1;
  });
  const sourceCoverage = independent.map((item) => ({
    workId: item.workId,
    sourceIds: ROADWORKS_WAVE_A_NORMATIVE_SOURCES
      .filter((source) => source.applicability.includes(item.technologyFamily))
      .map((source) => source.sourceId),
  }));
  return {
    total_work_ids: RoadworksWaveAInventory.length,
    distinct_professional_models: independent.length,
    catalog_aliases: aliases.length,
    exact_semantic_collisions: [...signatures.values()].filter((ids) => ids.length > 1),
    near_semantic_collisions: [],
    scope_profiles_ignored_by_compiler: aliases.length,
    operation_only_compilers: independent.length,
    wrong_primary_units: 0,
    missing_p0_parameters: RoadworksWaveAInventory.length,
    silent_p0_defaults: RoadworksWaveAInventory.length,
    missing_formula_sources: RoadworksWaveAInventory.length,
    generic_output_rows: RoadworksWaveAInventory.filter((item) =>
      compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS)
        .rows.some((row) => /^(Контроль результата работ|Комплект техники)/u.test(row.nameRu))
    ).length,
    missing_golden_fixtures: RoadworksWaveAInventory.length,
    models_requiring_domain_review: RoadworksWaveAInventory.length,
    unique_semantic_signatures: signatures.size,
    unexplainedCloneGroups: unexplainedClones,
    invalidAliases: aliases.filter((item) =>
      !item.aliasOfWorkId ||
      !RoadworksWaveAInventory.some((candidate) =>
        candidate.workId === item.aliasOfWorkId &&
        candidate.semanticOwnership === "independent_model" &&
        candidate.semanticModelId === item.semanticModelId
      )
    ),
    missingSourceCoverage: sourceCoverage.filter((entry) => entry.sourceIds.length === 0),
    sourceCoverage,
    blockerStatus: "STOP_ROADWORKS_WAVE_A_CATALOG_ALIASES_AND_NORMATIVE_TRUTH_NOT_PROVEN_NO_RELEASE",
    fake_green_claimed: false,
  };
}
