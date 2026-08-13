import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
  buildDrywallCeilingBulkheadProfessionalPackagePartsV3,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadProfessionalV3";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/inventory";

export function allBatch001ContractParts() {
  return DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3.map((catalogId) => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId);
    if (!inventory) throw new Error(`BATCH001_CONTRACT_INVENTORY_MISSING:${catalogId}`);
    const parts = buildDrywallCeilingBulkheadProfessionalPackagePartsV3(inventory);
    if (!parts) throw new Error(`BATCH001_CONTRACT_PARTS_MISSING:${catalogId}`);
    return parts;
  });
}

export const BATCH001_EXACT_MANIFEST_HASH_V3 = "5e172c9cc2df9712028707e9b24984dbc76430670e1e95dec783b0e0d4444138" as const;
export const BATCH001_PREDECESSOR_HEAD_V3 = "3bae74556b5bab15ecdaa69737f80218b867d0e0" as const;
export const BATCH001_PREDECESSOR_TREE_V3 = "89f4c551a84a4eafa1070da0979698fe73fc5cf3" as const;
export const BATCH001_MANIFEST_FILE_SHA256_V3 = "f4fdd7b87d51d4fe62d47883cfddfb8616d48e915a1d29bd1f80cb69e106a098" as const;
export const BATCH001_AUTHORIZED_INDEX_HASH_V3 = "e84c8ae84cc0c4d3fabe6da535c33bcd2aa9ec2733c353291a4c3ebeed363ac4" as const;
export const BATCH001_SCOPE_GUARD_HASH_V3 = "8606a38bf701ffa2e5ef753122517b037bb1dc2020f5fd7aae03dc9e4e45fb13" as const;
export const BATCH001_COMBINED_WORK_SET_HASH_V3 = "47045166bda813b3994bb6f28518357c432d96eddf9643df20961a1965b31162" as const;

export function allBatch001Rows() {
  return allBatch001ContractParts().flatMap((parts) =>
    parts.child_assemblies.flatMap((assembly) => assembly.rows.map((row) => ({ parts, row }))));
}
