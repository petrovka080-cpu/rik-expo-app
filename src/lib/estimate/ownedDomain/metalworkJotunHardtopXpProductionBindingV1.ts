import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  JOTUN_HARDTOP_XP_100UM_NORM_ID,
  JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID,
  JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS,
  JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
  JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  coated_steel_area_m2: "Укажите чистую площадь окрашиваемой стальной поверхности, м².",
  specified_dry_film_thickness_um: "Подтвердите проектную толщину сухой плёнки Jotun Hardtop XP: 100 мкм.",
  application_method: "Укажите утверждённый способ нанесения покрытия.",
  surface_profile: "Укажите номер ведомости подготовки и профиль стальной поверхности.",
  application_loss_factor: "Укажите коэффициент потерь нанесения; теоретическая ветка требует явное значение 1,0 без потерь.",
  selected_kit_size_l: "Подтвердите выбранный типовой комплект Jotun Hardtop XP: 5 или 20 л; автоматическое округление не выполняется.",
  component_mixing_ratio_confirmed: "Подтвердите объёмное соотношение компонентов A:B = 10:1.",
  coating_system_approved: "Подтвердите утверждение всей системы покрытия и совместимость предыдущего слоя.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match?.[1] ? decimal(match[1]) : null;
}

function field(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

export function extractJotunHardtopXpCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/jotun\s+hardtop\s+xp/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID,
  };
  const area = firstNumber(
    text,
    /(?:чист[а-яё]*\s+)?площад[ьи]\s+(?:окрашиваем[а-яё]*\s+)?стальн[а-яё]*\s+поверхност[а-яё]*\D{0,14}(\d+(?:[.,]\d+)?)\s*(?:м2|м²|sqm)/iu,
  );
  if (area !== null && area > 0) result.coated_steel_area_m2 = area;
  const dryFilmThickness = firstNumber(
    text,
    /(?:толщин[а-яё]*\s+сух[а-яё]*\s+пл[её]нк[а-яё]*|dft)\D{0,12}(\d+(?:[.,]\d+)?)\s*(?:мкм|um|µm)/iu,
  );
  if (dryFilmThickness !== null && dryFilmThickness > 0) {
    result.specified_dry_film_thickness_um = dryFilmThickness;
  }
  const applicationMethod = field(
    text,
    /(?:способ\s+нанесени[яе]|application\s+method)\s*[:=]\s*([^;,\n]+)/iu,
  );
  if (applicationMethod) result.application_method = applicationMethod;
  const surfaceProfile = field(
    text,
    /(?:профиль\s+поверхност[а-яё]*|surface\s+profile)\s*[:№#=]\s*([^;,\n]+)/iu,
  );
  if (surfaceProfile) result.surface_profile = surfaceProfile;
  const lossFactor = firstNumber(
    text,
    /коэффициент\s+потер[ьи]\s+нанесени[яе]\D{0,10}(\d+(?:[.,]\d+)?)/iu,
  );
  if (lossFactor !== null && lossFactor > 0) result.application_loss_factor = lossFactor;
  const kitSize = firstNumber(
    text,
    /(?:выбранн[а-яё]*\s+)?комплект\s+(?:jotun\s+hardtop\s+xp\s*)?\D{0,8}(\d+(?:[.,]\d+)?)\s*л/iu,
  );
  if (kitSize !== null && kitSize > 0) result.selected_kit_size_l = kitSize;
  if (/(?:соотношени[ея]\s+компонент[а-яё]*\s+a\s*:\s*b\s*=\s*10\s*:\s*1|mixing\s+ratio\s+10\s*:\s*1)\s*[:=]?\s*подтвержд/iu.test(text)) {
    result.component_mixing_ratio_confirmed = true;
  }
  if (/(?:систем[а-яё]*\s+покрыти[яе]\s+и\s+совместимост[ьи]\s+предыдущ[а-яё]*\s+сло[яе]|coating\s+system)\s*[:=]?\s*утвержд/iu.test(text)) {
    result.coating_system_approved = true;
  }
  return Object.freeze(result);
}

export function jotunHardtopXpMissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (canonicalParameters?.product_profile_id !== JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID) {
    return [];
  }
  return JOTUN_HARDTOP_XP_100UM_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => canonicalParameters[parameterId] == null)
    .map((parameterId) => PARAMETER_QUESTIONS_RU[parameterId] ?? parameterId);
}

function explicitParameterValues(
  canonicalParameters: Readonly<Record<string, Primitive>>,
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(canonicalParameters).map(([parameterId, value]) => [
    parameterId,
    {
      value,
      unit_id: parameterId.endsWith("_m2")
        ? "m2"
        : parameterId.endsWith("_um")
          ? "um"
          : parameterId.endsWith("_l")
            ? "l"
            : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-metalwork-prompt:${parameterId}`,
      captured_at: "consumer-metalwork-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the Jotun Hardtop XP steel-coating request.",
    },
  ]));
}

export function applyJotunHardtopXpPhysicalNormToMetalworkBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== JOTUN_HARDTOP_XP_100UM_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "steel_protective_coating_system" ||
    plan.semanticFrame.materialSystem !== "jotun_hardtop_xp_coating_system"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "STEEL_PROTECTIVE_COATING",
    operation_class: "APPLY",
    material_system: "JOTUN_HARDTOP_XP",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "material_1") return row;
    const source = {
      ...row,
      name: "Покрытие Jotun Hardtop XP при 100 мкм сухой плёнки — теоретический объём",
      templateId: "metalwork:jotun-hardtop-xp-100um:v1",
      templateVersion: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_document_version,
      normId: JOTUN_HARDTOP_XP_100UM_NORM_ID,
      normFamilyId: "norm_family:metalwork:jotun_hardtop_xp_theoretical_litres",
      normSourceId: JOTUN_HARDTOP_XP_100UM_SOURCE_ID,
      normSourceTitle: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_title,
      normVersion: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Jotun",
      normSourceEffectiveDate: "2026-06-24",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: JOTUN_HARDTOP_XP_100UM_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "metalwork_jotun_hardtop_xp_100um_theoretical_litres",
      materialKey: "jotun_hardtop_xp_100um",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Теоретический объём Hardtop XP заблокирован до подтверждения площади, 100 мкм, подготовки, системы и границ потерь/комплектов.",
        sourcePolicy: "manual_review" as const,
        formulaId: "jotun_hardtop_xp_theoretical_quantity_blocked_v1",
        quantityFormula: "blocked until every exact Hardtop XP applicability parameter is explicit",
        calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
        includedInEstimate: false,
        includedInProcurement: false,
        optional: false,
        editable: false,
        parameterBlockerIds: resolution.blockers,
      };
    }
    return {
      ...source,
      quantity: resolution.calculated_jotun_hardtop_xp_theoretical_quantity_l!,
      unit: "l",
      comment: "Теоретический объём при 100 мкм DFT до потерь нанесения и округления до комплектов 5/20 л.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "jotun_hardtop_xp_exact_theoretical_quantity_v1",
      quantityFormula: "coated_steel_area_m2 / 6.3",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_jotun_hardtop_xp_theoretical_quantity_l}`,
        "resultUnit=l",
        "applicationLoss=false",
        "kitRounding=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
