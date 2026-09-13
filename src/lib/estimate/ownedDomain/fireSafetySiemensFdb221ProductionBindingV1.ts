import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  SIEMENS_SINTESO_FDB221_NORM_ID,
  SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID,
  SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS,
  SIEMENS_SINTESO_FDB221_SOURCE_ID,
  SIEMENS_SINTESO_FDB221_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  designed_detector_point_count: "Укажите утверждённое проектом количество совместимых точек пожарных извещателей, шт.; площадь не используется для их автоматического расчёта.",
  approved_fire_alarm_design_and_code_basis: "Укажите номер утверждённого проекта АПС и применённую нормативную основу.",
  selected_detector_product_number: "Укажите точный номер выбранного совместимого извещателя Siemens; FDB221 является основанием, а не извещателем.",
  selected_base_reference: "Подтвердите основание Siemens FDB221, заказной номер A5Q00001664.",
  detector_base_compatibility_document_revision: "Укажите документ и ревизию, подтверждающие совместимость выбранного извещателя с FDB221.",
  installation_environment: "Подтвердите сухое внутреннее помещение; влажная среда требует отдельной насадки основания.",
  surface_or_recessed_supply_method: "Укажите подвод линии к основанию: поверхностный или скрытый.",
  surface_cable_diameter_mm: "Для поверхностного подвода укажите наружный диаметр кабеля не более 6 мм; для скрытого укажите 0 мм.",
  conductor_cross_section_mm2: "Укажите сечение подключаемых жил в диапазоне 0,2–1,5 мм².",
  humid_or_wet_base_attachment_scope: "Подтвердите, что насадка основания для влажной среды не требуется для сухого помещения.",
  auxiliary_terminal_scope: "Подтвердите, включается ли отдельная вспомогательная клемма; базовая привязка требует явного исключения.",
  detector_heating_scope: "Подтвердите, включается ли отдельный обогрев извещателя; базовая привязка требует явного исключения.",
  locking_and_designation_plate_scope: "Подтвердите, включаются ли отдельные фиксатор и табличка; базовая привязка требует явного исключения.",
  project_spare_quantity: "Укажите явный проектный запас оснований FDB221, шт., включая 0.",
  commissioning_and_acceptance_scope: "Укажите номер программы ПНР и приёмки пожарной сигнализации.",
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

export function extractSiemensSintesoFdb221CanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/(?:siemens\s+)?(?:sinteso\s+)?fdb221|a5q00001664/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID,
  };
  const pointCount = firstNumber(
    text,
    /(?:утвержд[её]нн[а-яё]*\s+)?(?:проектн[а-яё]*\s+)?(?:количеств[а-яё]*\s+)?точ(?:ек|ки)\s+(?:пожарн[а-яё]*\s+)?извещател[а-яё]*\D{0,12}(\d+)/iu,
  );
  if (pointCount !== null && pointCount > 0) result.designed_detector_point_count = pointCount;
  const designBasis = field(
    text,
    /(?:утвержд[её]нн[а-яё]*\s+)?проект\s+апс(?:\s+и\s+нормативн[а-яё]*\s+основ[а-яё]*)?\s*[:№#=]\s*([^;,\n]+)/iu,
  );
  if (designBasis) result.approved_fire_alarm_design_and_code_basis = designBasis;
  const detectorProduct = field(
    text,
    /(?:модель|номер|артикул)\s+(?:совместим[а-яё]*\s+)?извещател[а-яё]*\s*[:№#=]\s*([a-z0-9._/-]+)/iu,
  );
  if (detectorProduct) result.selected_detector_product_number = detectorProduct.toUpperCase();
  if (/fdb221\s*[/,; -]*\s*a5q00001664|a5q00001664\s*[/,; -]*\s*fdb221/iu.test(text)) {
    result.selected_base_reference = "FDB221/A5Q00001664";
  }
  const compatibilityDocument = field(
    text,
    /(?:документ\s+совместимости|compatibility\s+document)(?:\s+и\s+ревизи[яю])?\s*[:№#=]\s*([a-z0-9._/-]+)/iu,
  );
  if (compatibilityDocument) {
    result.detector_base_compatibility_document_revision = compatibilityDocument;
  }
  if (/сух(?:ое|ом)\s+(?:внутренн(?:ее|ем)\s+)?помещени/iu.test(text)) {
    result.installation_environment = "DRY_INDOOR";
  }
  if (/(?:подвод\s+(?:линии|кабеля)|supply\s+method)\s*[:=]?\s*поверхностн/iu.test(text)) {
    result.surface_or_recessed_supply_method = "SURFACE";
  } else if (/(?:подвод\s+(?:линии|кабеля)|supply\s+method)\s*[:=]?\s*(?:скрыт|утоплен|recessed)/iu.test(text)) {
    result.surface_or_recessed_supply_method = "RECESSED";
  }
  const cableDiameter = firstNumber(
    text,
    /(?:наружн[а-яё]*\s+)?диаметр\s+кабел[а-яё]*\D{0,12}(\d+(?:[.,]\d+)?)\s*мм/iu,
  );
  if (cableDiameter !== null && cableDiameter >= 0) result.surface_cable_diameter_mm = cableDiameter;
  const conductorCrossSection = firstNumber(
    text,
    /сечени[ея]\s+(?:подключаем[а-яё]*\s+)?жил[а-яё]*\D{0,12}(\d+(?:[.,]\d+)?)\s*(?:мм2|мм²)/iu,
  );
  if (conductorCrossSection !== null && conductorCrossSection > 0) {
    result.conductor_cross_section_mm2 = conductorCrossSection;
  }
  if (/(?:насадк[а-яё]*\s+основани[а-яё]*\s+для\s+влажн[а-яё]*\s+сред[а-яё]*|humid[^;,\n]*attachment)\s*[:=]?\s*не\s+треб/iu.test(text)) {
    result.humid_or_wet_base_attachment_scope = "NOT_REQUIRED_DRY_INDOOR";
  }
  if (/(?:вспомогательн[а-яё]*\s+клемм[а-яё]*|auxiliary\s+terminal)\s*[:=]?\s*не\s+(?:включ|треб)/iu.test(text)) {
    result.auxiliary_terminal_scope = "NOT_INCLUDED";
  }
  if (/(?:обогрев\s+извещател[а-яё]*|detector\s+heating)\s*[:=]?\s*не\s+(?:включ|треб)/iu.test(text)) {
    result.detector_heating_scope = "NOT_INCLUDED";
  }
  if (/(?:фиксатор\s+и\s+табличк[а-яё]*|locking\s+and\s+designation\s+plate)\s*[:=]?\s*не\s+(?:включ|треб)/iu.test(text)) {
    result.locking_and_designation_plate_scope = "NOT_INCLUDED";
  }
  const spareQuantity = firstNumber(
    text,
    /(?:проектн[а-яё]*\s+)?запас\s+(?:основани[а-яё]*\s+)?(?:fdb221\s*)?\D{0,8}(\d+)\s*(?:шт|piece|pcs)/iu,
  );
  if (spareQuantity !== null && spareQuantity >= 0) result.project_spare_quantity = spareQuantity;
  const commissioningScope = field(
    text,
    /(?:программ[а-яё]*\s+)?пнр\s+и\s+при[её]мк[а-яё]*\s*[:№#=]\s*([a-z0-9._/-]+)/iu,
  );
  if (commissioningScope) result.commissioning_and_acceptance_scope = commissioningScope;
  return Object.freeze(result);
}

export function siemensSintesoFdb221MissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (
    canonicalParameters?.product_profile_id !== SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID
  ) return [];
  return SIEMENS_SINTESO_FDB221_REQUIRED_EXPLICIT_PARAMETER_IDS
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
      unit_id: parameterId.endsWith("_count") || parameterId.endsWith("_quantity")
        ? "piece"
        : parameterId.endsWith("_mm2")
          ? "mm2"
          : parameterId.endsWith("_mm")
            ? "mm"
          : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-fire-safety-prompt:${parameterId}`,
      captured_at: "consumer-fire-safety-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the Siemens FDB221 fire-alarm request.",
    },
  ]));
}

export function applySiemensSintesoFdb221PhysicalNormToFireSafetyBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "fire_alarm_system" ||
    plan.semanticFrame.materialSystem !== "fire_alarm_system"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FIRE_ALARM_DETECTION",
    operation_class: "INSTALL",
    material_system: "SIEMENS_SINTESO_FDB221_BASE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "material_2") return row;
    const source = {
      ...row,
      name: "Основания адресных пожарных извещателей Siemens Sinteso FDB221 A5Q00001664 (не извещатели)",
      templateId: "fire-safety:siemens-sinteso-fdb221-base:v1",
      templateVersion: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_document_version,
      normId: SIEMENS_SINTESO_FDB221_NORM_ID,
      normFamilyId: "norm_family:fire_safety:siemens_sinteso_detector_base",
      normSourceId: SIEMENS_SINTESO_FDB221_SOURCE_ID,
      normSourceTitle: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_title,
      normVersion: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Siemens",
      normSourceEffectiveDate: "2021-01-08",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: SIEMENS_SINTESO_FDB221_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "fire_safety_siemens_sinteso_fdb221_detector_base",
      materialKey: "siemens_sinteso_fdb221_a5q00001664_base",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Расход оснований FDB221 заблокирован до утверждения числа совместимых точек, совместимости, условий подключения и явного запаса.",
        sourcePolicy: "manual_review" as const,
        formulaId: "siemens_fdb221_base_quantity_blocked_v1",
        quantityFormula: "blocked until every exact FDB221 applicability parameter is explicit",
        calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}; baseIsNotDetector=true`,
        includedInEstimate: false,
        includedInProcurement: false,
        optional: false,
        editable: false,
        parameterBlockerIds: resolution.blockers,
      };
    }
    return {
      ...source,
      quantity: resolution.calculated_siemens_fdb221_base_quantity_piece!,
      unit: "pcs",
      comment: "Одно основание FDB221 на утверждённую совместимую точку плюс только явный проектный запас; извещатели и аксессуары учитываются отдельными строками.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "siemens_fdb221_exact_base_quantity_v1",
      quantityFormula: "designed_detector_point_count + project_spare_quantity",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_siemens_fdb221_base_quantity_piece}`,
        "resultUnit=piece",
        "baseIsNotDetector=true",
        "areaBasedDetectorCount=false",
        "explicitProjectSparesOnly=true",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
