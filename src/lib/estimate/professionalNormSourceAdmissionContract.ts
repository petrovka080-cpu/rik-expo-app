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
    | "NORMATIVE_SOURCE_REGISTRY_MISSING_OR_INACTIVE"
    | "BACKEND_SOURCE_ADMISSION_REQUIRED"
    | "BACKEND_SOURCE_ADMISSION_IDENTITY_MISMATCH";
};

