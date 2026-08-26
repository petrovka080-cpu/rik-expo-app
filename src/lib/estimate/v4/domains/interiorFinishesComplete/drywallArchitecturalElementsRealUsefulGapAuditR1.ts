import {
  buildAllBatch002DrywallSuccessorsR3,
  type Batch002DrywallSuccessorDefinitionR3,
} from "./drywallArchitecturalElementsSuccessorR3";
import { DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4 } from "./drywallArchitecturalElementsProfessionalV4";
import {
  buildAllBatch002DrywallTechnologyPassportDraftsR1,
} from "./drywallArchitecturalElementsTechnologyPassportR1";
import {
  evaluateTechnologyPassportR1,
  technologyPassportR1Sha256,
  type TechnologyPassportR1,
} from "../../../backendPlatform/technologyPassportR1";

/**
 * This is a runtime gap audit, not an engineering expectation source.
 *
 * Importing the existing successor is allowed here because the module only
 * measures the current implementation. It must never be used to author a
 * TechnologyPassportR1 or to turn the current self-referential GREEN into a
 * real-useful-content GREEN.
 */
export const BATCH002_REAL_USEFUL_GAP_AUDIT_R1_CONTRACT =
  "real-useful-estimates.batch002-runtime-gap-audit-r1.v1" as const;

export const BATCH002_REAL_USEFUL_REQUIRED_BLOCKERS_R1 = [
  "ENGINEER_ACCEPTANCE_MISSING",
  "EXACT_EQUIPMENT_RUNTIME_ROW_MISSING",
  "LEGACY_EQUIPMENT_POLICY_CONTRADICTS_MASTER",
] as const;

export type Batch002RealUsefulGapBlockerR1 =
  typeof BATCH002_REAL_USEFUL_REQUIRED_BLOCKERS_R1[number];

export type Batch002RealUsefulGapAuditRowR1 = {
  contract: typeof BATCH002_REAL_USEFUL_GAP_AUDIT_R1_CONTRACT;
  catalogId: string;
  system: Batch002DrywallSuccessorDefinitionR3["system"];
  operation: Batch002DrywallSuccessorDefinitionR3["operation"];
  variant: Batch002DrywallSuccessorDefinitionR3["variant"];
  runtimeRowCounts: {
    total: number;
    materials: number;
    constructionWorks: number;
    exactEquipment: number;
    delivery: number;
  };
  legacyContentDecision: {
    status: Batch002DrywallSuccessorDefinitionR3["contentDecision"]["status"];
    allowed: boolean;
  };
  independentPassport: {
    present: true;
    reviewStatus: "DRAFT";
    passportSha256: string;
    expectedEquipmentRules: number;
  };
  legacySeparateEquipmentPolicy: "REJECT_SEPARATE_MACHINE_EQUIPMENT";
  realUsefulDecision: "RED";
  blockers: readonly Batch002RealUsefulGapBlockerR1[];
  gate: {
    mode: "SHADOW_PREPARED_ONLY";
    productionAdmissionAttached: false;
    currentUserRuntimeChanged: false;
  };
};

export type Batch002RealUsefulGapAuditR1 = {
  contract: typeof BATCH002_REAL_USEFUL_GAP_AUDIT_R1_CONTRACT;
  expectedCatalogCount: 55;
  observedCatalogCount: number;
  exactCatalogCoverage: boolean;
  independentPassportDraftCoverage: "55/55";
  engineerAcceptedPassportCoverage: "0/55";
  expectedEquipmentRuleCoverage: "55/55";
  exactRuntimeEquipmentCoverage: "0/55";
  realUsefulGreenCoverage: "0/55";
  legacyContentGreenCount: number;
  realUsefulRedCount: number;
  productionAdmissionAttachedCount: 0;
  rows: readonly Batch002RealUsefulGapAuditRowR1[];
};

function countGroup(
  definition: Batch002DrywallSuccessorDefinitionR3,
  group: string,
): number {
  return definition.resources.filter((resource) => resource.group === group).length;
}

function auditDefinition(
  definition: Batch002DrywallSuccessorDefinitionR3,
  passport: TechnologyPassportR1,
): Batch002RealUsefulGapAuditRowR1 {
  if (definition.catalogId !== passport.catalogId) {
    throw new Error(`BATCH002_R1_PASSPORT_RUNTIME_IDENTITY_DRIFT:${definition.catalogId}:${passport.catalogId}`);
  }
  const passportDecision = evaluateTechnologyPassportR1(passport, []);
  if (JSON.stringify(passportDecision.errors) !== JSON.stringify(["ENGINEER_ACCEPTANCE_MISSING"])) {
    throw new Error(`BATCH002_R1_PASSPORT_STRUCTURE_RED:${passport.catalogId}:${passportDecision.errors.join("|")}`);
  }
  const exactEquipment = countGroup(definition, "machine_equipment");
  if (exactEquipment !== 0) {
    throw new Error(`BATCH002_R1_UNEXPECTED_EQUIPMENT_BASELINE_DRIFT:${definition.catalogId}:${exactEquipment}`);
  }
  return {
    contract: BATCH002_REAL_USEFUL_GAP_AUDIT_R1_CONTRACT,
    catalogId: definition.catalogId,
    system: definition.system,
    operation: definition.operation,
    variant: definition.variant,
    runtimeRowCounts: {
      total: definition.resources.length,
      materials: countGroup(definition, "material"),
      constructionWorks: countGroup(definition, "construction_work"),
      exactEquipment,
      delivery: countGroup(definition, "delivery"),
    },
    legacyContentDecision: {
      status: definition.contentDecision.status,
      allowed: definition.contentDecision.allowed,
    },
    independentPassport: {
      present: true,
      reviewStatus: "DRAFT",
      passportSha256: technologyPassportR1Sha256(passport),
      expectedEquipmentRules: passport.equipmentRules.length,
    },
    legacySeparateEquipmentPolicy: "REJECT_SEPARATE_MACHINE_EQUIPMENT",
    realUsefulDecision: "RED",
    blockers: BATCH002_REAL_USEFUL_REQUIRED_BLOCKERS_R1,
    gate: {
      mode: "SHADOW_PREPARED_ONLY",
      productionAdmissionAttached: false,
      currentUserRuntimeChanged: false,
    },
  };
}

export function buildBatch002RealUsefulGapAuditR1(): Batch002RealUsefulGapAuditR1 {
  const definitions = buildAllBatch002DrywallSuccessorsR3();
  const passports = buildAllBatch002DrywallTechnologyPassportDraftsR1();
  const expectedIds = [...DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4];
  const observedIds = definitions.map((definition) => definition.catalogId);
  const rows = definitions.map((definition, index) => auditDefinition(definition, passports[index]!));
  return {
    contract: BATCH002_REAL_USEFUL_GAP_AUDIT_R1_CONTRACT,
    expectedCatalogCount: 55,
    observedCatalogCount: rows.length,
    exactCatalogCoverage: JSON.stringify(observedIds) === JSON.stringify(expectedIds),
    independentPassportDraftCoverage: "55/55",
    engineerAcceptedPassportCoverage: "0/55",
    expectedEquipmentRuleCoverage: "55/55",
    exactRuntimeEquipmentCoverage: "0/55",
    realUsefulGreenCoverage: "0/55",
    legacyContentGreenCount: rows.filter((row) => row.legacyContentDecision.status === "GREEN" && row.legacyContentDecision.allowed).length,
    realUsefulRedCount: rows.filter((row) => row.realUsefulDecision === "RED").length,
    productionAdmissionAttachedCount: 0,
    rows,
  };
}
