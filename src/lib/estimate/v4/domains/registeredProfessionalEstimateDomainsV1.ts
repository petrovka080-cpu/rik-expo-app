import type { ConsumerRepairAiDraft } from "../../../consumerRequests/consumerRequestTypes";
import type { GlobalWorkCategory } from "../../../ai/globalEstimate";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../buildEstimateFromInlineWorkPrompt";
import type { CanonicalParameterSchema } from "../../canonicalParameters";
import {
  INTERIOR_FINISHES_CANONICAL_PARAMETER_SCHEMAS,
  INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildInteriorFinishesFromInlineInputV1,
} from "./interiorFinishesComplete";

export const REGISTERED_PROFESSIONAL_ESTIMATE_DOMAINS_VERSION_V1 =
  "registered-professional-estimate-domains:v1" as const;

export type RegisteredProfessionalEstimateSelectionV1 = {
  domain_id: string;
  catalog_id: string;
  work_key: string;
  template_id: string;
  title_ru: string;
  category_key: GlobalWorkCategory;
  category_title_ru: string;
  canonical_parameter_schema: CanonicalParameterSchema;
  calculation_strategy_id: string;
  engine_version: string;
};

function normalizedIdentity(value: string | null | undefined): string {
  return String(value ?? "").normalize("NFKC").trim();
}

function registeredInteriorCategoryKey(sourceDomainId: string): GlobalWorkCategory {
  if (sourceDomainId === "drywall_ceiling") return "drywall";
  if (sourceDomainId === "flooring") return "flooring";
  if (sourceDomainId === "tile_stone") return "tile";
  return "plastering";
}

export function resolveRegisteredProfessionalEstimateSelectionV1(
  identity: string | null | undefined,
): RegisteredProfessionalEstimateSelectionV1 | null {
  const exactIdentity = normalizedIdentity(identity);
  if (!exactIdentity) return null;
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((candidate) =>
    exactIdentity === candidate.catalog_id ||
    exactIdentity === candidate.work_key ||
    exactIdentity === candidate.template_id ||
    exactIdentity === `domain-passport:${candidate.catalog_id}:v1`
  );
  if (!inventory) return null;
  const canonicalParameterSchema = INTERIOR_FINISHES_CANONICAL_PARAMETER_SCHEMAS.find(
    (schema) => schema.canonicalWorkKey === inventory.work_key,
  );
  if (!canonicalParameterSchema) {
    throw new Error(`REGISTERED_PROFESSIONAL_DOMAIN_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
  }
  return Object.freeze({
    domain_id: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    template_id: `domain-passport:${inventory.catalog_id}:v1`,
    title_ru: inventory.localized_name_ru,
    category_key: registeredInteriorCategoryKey(inventory.source_domain_id),
    category_title_ru: "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0435 \u043e\u0442\u0434\u0435\u043b\u043e\u0447\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
    canonical_parameter_schema: canonicalParameterSchema,
    calculation_strategy_id: canonicalParameterSchema.calculationVersion,
    engine_version: REGISTERED_PROFESSIONAL_ESTIMATE_DOMAINS_VERSION_V1,
  });
}

export function buildRegisteredProfessionalEstimateParameterCollectionDraftV1(input: {
  selection: RegisteredProfessionalEstimateSelectionV1;
  raw_input: string;
}): ConsumerRepairAiDraft {
  return {
    titleRu: input.selection.title_ru,
    summaryRu:
      "\u0412\u044b\u0431\u0440\u0430\u043d\u0430 \u0442\u043e\u0447\u043d\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430. \u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u043d\u044b\u0435 \u0438 \u043d\u043e\u0440\u043c\u0430\u0442\u0438\u0432\u043d\u044b\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u0434\u043b\u044f \u0440\u0430\u0441\u0447\u0451\u0442\u0430.",
    repairType: input.selection.work_key,
    selectedWork: {
      selectedCatalogWorkId: input.selection.catalog_id,
      selectedWorkKey: input.selection.work_key,
      selectedWorkTitleRu: input.selection.title_ru,
      selectedWorkCategoryKey: input.selection.category_key,
      selectedWorkCategoryTitleRu: input.selection.category_title_ru,
      selectedWorkRawInput: input.raw_input,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    },
    items: [],
    missingData: input.selection.canonical_parameter_schema.definitions
      .filter((definition) => definition.requiredLevel === "BLOCKING_REQUIRED")
      .map((definition) => definition.label),
    dangerousDiyBlocked: false,
  };
}

export function buildRegisteredProfessionalEstimateFromInlineInputV1(
  input: BuildEstimateFromInlineWorkPromptInput,
) {
  return buildInteriorFinishesFromInlineInputV1(input);
}
