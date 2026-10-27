import type { ExpandedComplexCalculatorOutput } from "../index";
import type { S2BFamilyManifestEntry } from "./manifest";

export type S2BDomainBlockCoverageStatus =
  | "ROW_EVIDENCE"
  | "MISSING_DESIGN_INPUT"
  | "UNRESOLVED";

export type S2BDomainBlockCoverage = {
  block_id: string;
  status: S2BDomainBlockCoverageStatus;
  evidence_row_codes: string[];
  evidence_missing_inputs: string[];
};

type S2BDomainBlockEvidenceRule = {
  rowCodeTokens?: readonly string[];
  missingInputTokens?: readonly string[];
};

type FamilyEvidenceOverrides = Readonly<Record<string, S2BDomainBlockEvidenceRule>>;

const DOMAIN_BLOCK_EVIDENCE_OVERRIDES: Readonly<Record<string, FamilyEvidenceOverrides>> = {
  road_construction: {
    geotextile: {
      missingInputTokens: ["Применимость и схема укладки геотекстиля"],
    },
  },
  village_sewer_network: {
    manholes: { rowCodeTokens: ["manhole"] },
  },
  stormwater_drainage: {
    catchment_profile: {
      missingInputTokens: ["Расчётный расход дождя", "Водосборная площадь"],
    },
  },
  heat_network: {
    route: { rowCodeTokens: ["pipeline_trench"] },
    welds: { rowCodeTokens: ["pipeline_welding"] },
  },
  underground_cable_line: {
    ducts: { rowCodeTokens: ["protective_duct"] },
  },
  transformer_substation: {
    foundation: { rowCodeTokens: ["transformer_foundation"] },
  },
  bridge_construction: {
    foundations: { rowCodeTokens: ["bridge_piles", "pile_concrete"] },
  },
  tunnel_construction: {
    temporary_support: {
      missingInputTokens: ["Схема временного крепления"],
    },
    fire_safety: {
      missingInputTokens: ["Концепция пожарной безопасности"],
    },
  },
  retaining_wall: {
    geology: {
      missingInputTokens: ["Инженерно-геологические изыскания"],
    },
    excavation: {
      missingInputTokens: ["Параметры котлована и рабочей зоны"],
    },
    concrete_or_gabion: {
      rowCodeTokens: ["wall_concrete", "gabion_baskets"],
    },
    stability_check: {
      missingInputTokens: ["Расчёт устойчивости"],
    },
  },
  technological_pipeline: {
    ndt: {
      missingInputTokens: ["Программа и объём неразрушающего контроля"],
    },
  },
  boiler_house: {
    boilers: { rowCodeTokens: ["boiler_units"] },
  },
  solar_power_plant: {
    capacity_region: {
      missingInputTokens: ["Регион и климатические данные"],
    },
    panels: {
      missingInputTokens: ["Спецификация фотомодулей"],
    },
    inverters: {
      missingInputTokens: ["Спецификация инверторов"],
    },
    grid_connection: {
      missingInputTokens: ["Схема выдачи мощности"],
    },
  },
  multi_utility_trench: {
    utility_conditions: {
      missingInputTokens: ["ТУ ресурсоснабжающих организаций"],
    },
    combined_trench: { rowCodeTokens: ["utility_trench"] },
    water_branch: { rowCodeTokens: ["water_pipe"] },
    chambers: { rowCodeTokens: ["service_chambers"] },
  },
  earth_dam: {
    earthworks: { rowCodeTokens: ["embankment_fill", "excavation"] },
    slope_protection: { rowCodeTokens: ["riprap", "geotextile"] },
    monitoring: {
      missingInputTokens: ["Система мониторинга и КИП"],
    },
  },
};

function includesNormalized(value: string, token: string): boolean {
  return value.toLocaleLowerCase("ru-RU").includes(token.toLocaleLowerCase("ru-RU"));
}

function evidenceRule(entry: S2BFamilyManifestEntry, blockId: string): S2BDomainBlockEvidenceRule {
  return DOMAIN_BLOCK_EVIDENCE_OVERRIDES[entry.work_family_id]?.[blockId] ?? {
    rowCodeTokens: [blockId],
  };
}

export function resolveS2BDomainBlockCoverage(
  entry: S2BFamilyManifestEntry,
  estimate: ExpandedComplexCalculatorOutput,
): S2BDomainBlockCoverage[] {
  const rows = [
    ...estimate.material_rows,
    ...estimate.work_rows,
    ...estimate.equipment_rows,
    ...estimate.service_rows,
  ];

  return entry.required_domain_blocks.map((blockId) => {
    const rule = evidenceRule(entry, blockId);
    const evidenceRows = rows.filter((row) =>
      (rule.rowCodeTokens ?? []).some((token) => includesNormalized(row.code, token)),
    );
    if (evidenceRows.length > 0) {
      return {
        block_id: blockId,
        status: "ROW_EVIDENCE",
        evidence_row_codes: [...new Set(evidenceRows.map((row) => row.code))],
        evidence_missing_inputs: [],
      };
    }

    const evidenceMissingInputs = estimate.missing_design_inputs.filter((missingInput) =>
      (rule.missingInputTokens ?? []).some((token) => includesNormalized(missingInput, token)),
    );
    if (evidenceMissingInputs.length > 0) {
      return {
        block_id: blockId,
        status: "MISSING_DESIGN_INPUT",
        evidence_row_codes: [],
        evidence_missing_inputs: [...new Set(evidenceMissingInputs)],
      };
    }

    return {
      block_id: blockId,
      status: "UNRESOLVED",
      evidence_row_codes: [],
      evidence_missing_inputs: [],
    };
  });
}
