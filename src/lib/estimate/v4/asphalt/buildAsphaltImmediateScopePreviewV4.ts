import type { EstimateDraftRevision } from "../../estimateDraftRevisionContract";
import { ASPHALT_V4_RUNTIME_TEMPLATE_ID } from "./compileAsphaltProfessionalEstimateV4";
import { ASPHALT_WORK_ID_V4 } from "./asphaltV4Constants";

export type AsphaltImmediateScopePreviewItemV4 = {
  id: string;
  category: "material" | "work" | "equipment";
  title_ru: string;
  quantity_status_ru: "Количество будет рассчитано после уточнения параметров";
};

function numericParam(revision: EstimateDraftRevision, key: string): number | null {
  const value = revision.params[key]?.value;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function booleanParam(revision: EstimateDraftRevision, key: string): boolean | null {
  const value = revision.params[key]?.value;
  if (value === true || value === "yes") return true;
  if (value === false || value === "no") return false;
  return null;
}

function item(
  id: string,
  category: AsphaltImmediateScopePreviewItemV4["category"],
  titleRu: string,
): AsphaltImmediateScopePreviewItemV4 {
  return {
    id,
    category,
    title_ru: titleRu,
    quantity_status_ru: "Количество будет рассчитано после уточнения параметров",
  };
}

export function isAsphaltV4EstimateRevision(revision: EstimateDraftRevision | null | undefined): boolean {
  return revision?.selectedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    revision?.matchedFamily === ASPHALT_WORK_ID_V4 ||
    revision?.professionalWorkId === ASPHALT_WORK_ID_V4;
}

export function buildAsphaltImmediateScopePreviewV4(
  revision: EstimateDraftRevision | null | undefined,
): AsphaltImmediateScopePreviewItemV4[] {
  if (!revision || !isAsphaltV4EstimateRevision(revision) || revision.boq.rows.length > 0) return [];
  const asphaltLayerCount = Math.max(1, Math.min(4, Math.round(numericParam(revision, "asphalt_layer_count") ?? 1)));
  const result: AsphaltImmediateScopePreviewItemV4[] = [];
  for (let position = 1; position <= asphaltLayerCount; position += 1) {
    const role = asphaltLayerCount === 1
      ? "слоя покрытия"
      : position === 1
        ? "нижнего слоя покрытия"
        : position === asphaltLayerCount
          ? "верхнего слоя покрытия"
          : `промежуточного слоя ${position}`;
    result.push(item(`preview:asphalt-layer-${position}:material`, "material", `Асфальтобетонная смесь для ${role}`));
    result.push(item(`preview:asphalt-layer-${position}:work`, "work", `Укладка и уплотнение ${role}`));
  }
  if (asphaltLayerCount > 1) {
    result.push(item("preview:interlayer-emulsion:material", "material", "Битумная эмульсия для межслойной обработки"));
    result.push(item("preview:interlayer-emulsion:work", "work", "Межслойная обработка битумной эмульсией"));
  }
  result.push(item("preview:asphalt-paver:equipment", "equipment", "Асфальтоукладчик для механизированной укладки"));
  result.push(item("preview:road-roller:equipment", "equipment", "Дорожный каток для уплотнения покрытия"));

  if (booleanParam(revision, "milling_required") === true) {
    result.push(item("preview:milling:work", "work", "Фрезерование существующего покрытия"));
    result.push(item("preview:milling-machine:equipment", "equipment", "Дорожная фреза"));
  }
  if (booleanParam(revision, "geotextile_required") === true) {
    result.push(item("preview:geotextile:material", "material", "Геотекстиль подтверждаемого типа"));
    result.push(item("preview:geotextile:work", "work", "Укладка геотекстиля"));
  }
  if (booleanParam(revision, "curb_required") === true) {
    result.push(item("preview:curb:material", "material", "Бортовой камень подтверждаемого типа"));
    result.push(item("preview:curb:work", "work", "Установка бортового камня"));
  }
  if (booleanParam(revision, "drainage_required") === true) {
    result.push(item("preview:drainage:material", "material", "Элементы водоотвода подтверждаемого типа"));
    result.push(item("preview:drainage:work", "work", "Устройство водоотвода"));
  }
  return result;
}
