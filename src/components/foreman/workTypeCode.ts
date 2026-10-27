export const normalizeWorkTypeCode = (workTypeCode: unknown): string =>
  String(workTypeCode ?? "").trim().toUpperCase();

