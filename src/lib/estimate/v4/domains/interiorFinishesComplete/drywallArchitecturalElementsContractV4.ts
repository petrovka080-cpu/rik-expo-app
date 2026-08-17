import type { ProfessionalChildAssemblyV4 } from "../../professionalProjectAssemblyV4";
import type {
  ProfessionalDomainParameterSchemaV1,
  ProfessionalNormativeProfileV1,
  ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";

export type DrywallArchitecturalElementOperationV4 =
  | "FRAME"
  | "ALIGN"
  | "CLAD"
  | "FINISH_JOINT"
  | "INSULATE"
  | "PREPARE"
  | "REPAIR";

export type DrywallArchitecturalElementVariantV4 =
  | "standard"
  | "large_area"
  | "small_area"
  | "technical_room"
  | "wet_zone"
  | "high_load";

export type DrywallArchitecturalElementWorkContractV4 = {
  schema_version: "DrywallArchitecturalElementWorkContractV4" | "DrywallFlatCeilingWorkContractV6";
  catalog_id: string;
  work_key: string;
  title_ru: string;
  system: "BULKHEAD" | "CURVE" | "CEILING";
  group: DrywallArchitecturalElementOperationV4;
  operation: DrywallArchitecturalElementOperationV4;
  variant: DrywallArchitecturalElementVariantV4;
  group_key: string;
  normative_source_ids: readonly string[];
  required_stages: readonly string[];
  optional_stages: readonly string[];
  owned_cost_scope: readonly string[];
  forbidden_cost_scope: readonly string[];
  non_cost_dependencies: readonly string[];
  normative_proof_bundle_id: string;
  professional_proof_bundle_id: string;
};

export type DrywallArchitecturalElementProfessionalPackagePartsV4 = {
  contract: DrywallArchitecturalElementWorkContractV4;
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};
