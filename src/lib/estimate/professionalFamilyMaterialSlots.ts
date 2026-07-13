import familyRegistryJson from "../../../data/estimate/material-completeness/family-material-slots.json";
import priorityRegistryJson from "../../../data/estimate/material-completeness/priority-family-material-slots.json";

import type { FamilyMaterialSlotPolicy, FamilyMaterialSlotPolicySlot } from "./professionalBoqMaterialCompletenessContract";
import type { ProfessionalWorkPassport } from "./workPassportContract";

type PriorityRegistryJson = {
  policies: FamilyMaterialSlotPolicy[];
};

export const PROFESSIONAL_FAMILY_MATERIAL_SLOT_REGISTRY_METADATA = familyRegistryJson as {
  schema: string;
  strategy: string;
  serviceOnlyExemptions: string[];
  policy: {
    allConstructionTemplatesMaterialRequired: boolean;
    all11610TemplatesHaveMaterialRows: boolean;
    broadGenericMaterialAllowlist: boolean;
    fakeMaterialsForMinCountAllowed: boolean;
  };
};

export const PRIORITY_PROFESSIONAL_FAMILY_MATERIAL_SLOT_POLICIES: readonly FamilyMaterialSlotPolicy[] =
  (priorityRegistryJson as PriorityRegistryJson).policies;

function procurementRelevantRows(passport: ProfessionalWorkPassport) {
  return passport.boqRecipe.allRows.filter((row) =>
    row.includedInProcurement &&
    row.rowType !== "work" &&
    row.rowType !== "labor"
  );
}

export function buildSourceBackedFamilyMaterialSlotPolicy(
  passport: ProfessionalWorkPassport,
): FamilyMaterialSlotPolicy {
  const rows = procurementRelevantRows(passport);
  const requiredSlots: FamilyMaterialSlotPolicySlot[] = rows.map((row) => ({
    slotKey: `source:${row.rowType}:${row.rowId}`,
    expectedNames: [row.titleRu],
    expectedUnits: [row.sourceUnit],
    minMatchedRows: 1,
  }));
  return {
    family: passport.familyId,
    appliesToTemplateIds: [passport.templateId],
    materialRequired: true,
    requiredSlots,
    optionalButExpectedSlots: [],
    minWorkRows: Math.min(1, passport.boqRecipe.workRows.length + passport.boqRecipe.laborRows.length),
    minMaterialRows: Math.min(1, passport.boqRecipe.materialRows.length),
    minEquipmentRows: 0,
    minServiceRows: 0,
    allowsServiceOnlyEstimate: false,
  };
}

export function priorityFamilyMaterialSlotPoliciesFor(input: {
  family: string;
  templateId?: string | null;
}): FamilyMaterialSlotPolicy[] {
  return PRIORITY_PROFESSIONAL_FAMILY_MATERIAL_SLOT_POLICIES.filter((policy) => {
    if (policy.family !== input.family) return false;
    if (policy.appliesToTemplateIds.length === 0) return true;
    return Boolean(input.templateId && policy.appliesToTemplateIds.includes(input.templateId));
  });
}

export function materialSlotPoliciesForPassport(passport: ProfessionalWorkPassport): FamilyMaterialSlotPolicy[] {
  return [
    buildSourceBackedFamilyMaterialSlotPolicy(passport),
    ...priorityFamilyMaterialSlotPoliciesFor({ family: passport.familyId, templateId: passport.templateId }),
  ];
}
