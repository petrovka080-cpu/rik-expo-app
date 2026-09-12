import fs from "node:fs";
import path from "node:path";

import {
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
  norm_items: PhysicalNormItem[];
};

describe("professional norm-pack production registry parity", () => {
  it("binds only physical pack values with identical units, rates, packages and source URLs", () => {
    const root = path.resolve(process.cwd(), "data/estimate-norms/professional");
    const physical = new Map<string, { group: string; item: PhysicalNormItem }>();
    const basisById: Readonly<Record<string, string>> = PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID;
    for (const file of fs.readdirSync(root).filter((name) => name.endsWith(".json") && !name.includes("remediation-plan"))) {
      const pack = JSON.parse(fs.readFileSync(path.join(root, file), "utf8")) as PhysicalNormPack;
      for (const item of pack.norm_items) physical.set(item.norm_id, { group: pack.work_group, item });
    }

    const failures = PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.flatMap((registered) => {
      const source = physical.get(registered.normId);
      if (!source) return [`missing_physical_norm:${registered.normId}`];
      const basisParameter = basisById[registered.normId] ?? "";
      return [
        source.group === registered.workGroup ? "" : `work_group_mismatch:${registered.normId}`,
        source.item.unit === registered.unit ? "" : `unit_mismatch:${registered.normId}`,
        source.item.rate.value === registered.consumptionRate ? "" : `rate_mismatch:${registered.normId}`,
        source.item.rounding.package_size === registered.packageSize ? "" : `package_mismatch:${registered.normId}`,
        source.item.source.url === registered.sourceUrl ? "" : `source_url_mismatch:${registered.normId}`,
        source.item.parameters.includes(basisParameter) ? "" : `basis_parameter_not_declared:${registered.normId}`,
        inferProfessionalNormPackBasisUnit(basisParameter) === registered.workBasisUnit
          ? ""
          : `work_basis_unit_mismatch:${registered.normId}`,
        source.item.applicability?.simple_rate_multiplication_forbidden === true
          ? `non_linear_norm_registered_as_scalar:${registered.normId}`
          : "",
      ].filter(Boolean);
    });

    expect(failures).toEqual([]);
    expect(physical.size).toBe(59);
    expect(Object.keys(PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID)).toHaveLength(59);
  });
});
