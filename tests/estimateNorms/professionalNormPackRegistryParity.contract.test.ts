import fs from "node:fs";
import path from "node:path";

import {
  PROFESSIONAL_NORM_PACK_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  inferProfessionalNormPackBasisUnit,
  PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID,
} from "../../scripts/estimate/professionalNormPackBasisRegistry";

type PhysicalNormItem = {
  norm_id: string;
  parameters: string[];
  unit: string;
  rate: { value: number };
  applicability?: Record<string, unknown>;
  rounding: { package_size: number };
  source: { url: string };
};

type PhysicalNormPack = {
  work_group: string;
  source_pack_version: string;
  review_status: string;
  norm_items: PhysicalNormItem[];
};

describe("professional norm-pack production registry parity", () => {
  it("keeps all physical sources governed while the parameterless 10k scalar registry stays empty", () => {
    const root = path.resolve(process.cwd(), "data/estimate-norms/professional");
    const physical = new Map<string, {
      group: string;
      sourcePackVersion: string;
      reviewStatus: string;
      item: PhysicalNormItem;
    }>();
    const basisById: Readonly<Record<string, string>> = PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID;
    for (const file of fs.readdirSync(root).filter((name) => name.endsWith(".json") && !name.includes("remediation-plan"))) {
      const pack = JSON.parse(fs.readFileSync(path.join(root, file), "utf8")) as PhysicalNormPack;
      for (const item of pack.norm_items) {
        physical.set(item.norm_id, {
          group: pack.work_group,
          sourcePackVersion: pack.source_pack_version,
          reviewStatus: pack.review_status,
          item,
        });
      }
    }

    const failures = [...physical.entries()].flatMap(([normId, source]) => {
      const basisParameter = basisById[normId] ?? "";
      return [
        source.group ? "" : `work_group_missing:${normId}`,
        source.sourcePackVersion ? "" : `source_pack_version_missing:${normId}`,
        source.reviewStatus === "reviewed" ? "" : `physical_pack_not_reviewed:${normId}`,
        source.item.parameters.includes(basisParameter) ? "" : `basis_parameter_not_declared:${normId}`,
        inferProfessionalNormPackBasisUnit(basisParameter) ? "" : `work_basis_unit_missing:${normId}`,
        source.item.source.url.startsWith("https://") ? "" : `source_url_invalid:${normId}`,
      ].filter(Boolean);
    });

    expect(failures).toEqual([]);
    expect(physical.size).toBe(54);
    expect(Object.keys(PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID)).toHaveLength(54);
    expect(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS).toEqual([]);
    expect(PROFESSIONAL_NORM_PACK_GROUPS).toEqual([]);
  });
});
