import {
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../ai/estimateTemplate10000/productionProfessionalNormPackRegistry";
import { constructionNormativeRegistryV1 } from "./v4/domainFactory/constructionNormativeRegistryV1";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
} from "./v4/domainFactory/professionalPhysicalNormApplicabilityV1";

export type ProfessionalNormSourceAdmissionInput = {
  normSourceId?: string | null;
  normId?: string | null;
  normVersion?: string | null;
  sourceParameters?: Readonly<Record<string, unknown>> | null;
};

export type ProfessionalNormSourceAdmission = {
  admitted: boolean;
  route: "STATIC_CATALOG_REGISTRY" | "CANONICAL_PHYSICAL_APPLICABILITY" | "NONE";
  reason:
    | "ADMITTED_STATIC_CATALOG_REGISTRY"
    | "ADMITTED_CANONICAL_PHYSICAL_APPLICABILITY"
    | "SOURCE_ID_MISSING"
    | "STATIC_REGISTRY_IDENTITY_MISMATCH"
    | "PHYSICAL_APPLICABILITY_NOT_APPLIED"
    | "PHYSICAL_APPLICABILITY_IDENTITY_MISMATCH"
    | "PHYSICAL_RUNTIME_BINDING_MISSING"
    | "NORMATIVE_SOURCE_REGISTRY_MISSING_OR_INACTIVE";
};

type UnknownRecord = Readonly<Record<string, unknown>>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function rejected(reason: ProfessionalNormSourceAdmission["reason"]): ProfessionalNormSourceAdmission {
  return { admitted: false, route: "NONE", reason };
}

function physicalResolutionCandidates(resolution: UnknownRecord): UnknownRecord[] {
  const candidates: UnknownRecord[] = [resolution];
  const appliedNorms = resolution.applied_norms;
  if (Array.isArray(appliedNorms)) {
    for (const value of appliedNorms) {
      const candidate = record(value);
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates;
}

export function classifyProfessionalNormSourceAdmission(
  input: ProfessionalNormSourceAdmissionInput,
): ProfessionalNormSourceAdmission {
  const sourceId = text(input.normSourceId);
  const normId = text(input.normId);
  const normVersion = text(input.normVersion);
  if (!sourceId) return rejected("SOURCE_ID_MISSING");

  const staticRegistryItem = PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.find((item) => item.sourceId === sourceId);
  if (staticRegistryItem) {
    if (staticRegistryItem.normId !== normId || staticRegistryItem.sourceDocumentVersion !== normVersion) {
      return rejected("STATIC_REGISTRY_IDENTITY_MISMATCH");
    }
    return {
      admitted: true,
      route: "STATIC_CATALOG_REGISTRY",
      reason: "ADMITTED_STATIC_CATALOG_REGISTRY",
    };
  }

  const resolution = record(input.sourceParameters?.professionalPhysicalNormApplicabilityV1);
  if (!resolution || resolution.status !== "APPLIED" ||
      (Array.isArray(resolution.blockers) && resolution.blockers.length > 0)) {
    return rejected("PHYSICAL_APPLICABILITY_NOT_APPLIED");
  }
  const candidate = physicalResolutionCandidates(resolution).find((value) =>
    text(value.source_id) === sourceId &&
    text(value.norm_id) === normId &&
    text(value.source_document_version) === normVersion &&
    text(value.source_definition_hash)
  );
  if (!candidate) return rejected("PHYSICAL_APPLICABILITY_IDENTITY_MISMATCH");

  const binding = CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.find((value) =>
    value.source_id === sourceId &&
    value.norm_id === normId &&
    value.source_document_version === normVersion &&
    value.source_definition_hash === text(candidate.source_definition_hash)
  );
  if (!binding) return rejected("PHYSICAL_RUNTIME_BINDING_MISSING");

  const sourceCard = constructionNormativeRegistryV1.get(sourceId);
  if (!sourceCard || !["active", "project-specific"].includes(sourceCard.status)) {
    return rejected("NORMATIVE_SOURCE_REGISTRY_MISSING_OR_INACTIVE");
  }
  return {
    admitted: true,
    route: "CANONICAL_PHYSICAL_APPLICABILITY",
    reason: "ADMITTED_CANONICAL_PHYSICAL_APPLICABILITY",
  };
}

export function isAdmittedProfessionalNormSource(input: ProfessionalNormSourceAdmissionInput): boolean {
  return classifyProfessionalNormSourceAdmission(input).admitted;
}
