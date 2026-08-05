export const ASPHALT_WORK_ID_V4 = "asphalt_concrete_pavement" as const;
export const ASPHALT_FAMILY_ID_V4 = "road_construction" as const;
export const ASPHALT_PROFESSIONAL_NAME_RU_V4 = "Устройство асфальтобетонного дорожного покрытия" as const;
export const ASPHALT_PARAMETER_SCHEMA_ID_V4 = `${ASPHALT_WORK_ID_V4}:parameter-schema:v4` as const;
export const ASPHALT_PASSPORT_VERSION_V4 = "2026-07-22.phase1.v1" as const;
export const ASPHALT_V4_RUNTIME_TEMPLATE_ID = `${ASPHALT_WORK_ID_V4}_professional_truth_v4_phase1` as const;
export const ASPHALT_V4_RUNTIME_TEMPLATE_VERSION = ASPHALT_PASSPORT_VERSION_V4;
export const ASPHALT_V4_RUNTIME_TITLE_RU = ASPHALT_PROFESSIONAL_NAME_RU_V4;

export function asphaltParameterIdV4(canonicalKey: string): string {
  return `${ASPHALT_WORK_ID_V4}:parameter:${canonicalKey}:v4`;
}
