export const CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION =
  "ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1" as const;

export type CanonicalRevisionIdentityDefinition = {
  id: string;
  title_ru: string;
  canonical_title_ru?: unknown;
  passport?: unknown;
  domain: string;
  approved_template_baseline_id?: string | null;
  cumulative_manifest?: boolean;
};

export function canonicalDefinitionTitleRu(definition: {
  title_ru?: unknown;
  canonical_title_ru?: unknown;
  passport?: unknown;
}): string {
  const passport = definition.passport && typeof definition.passport === "object" && !Array.isArray(definition.passport)
    ? definition.passport as Record<string, unknown>
    : null;
  return String(
    passport?.canonicalRuName
      ?? definition.canonical_title_ru
      ?? definition.title_ru
      ?? "",
  ).trim();
}

export type CanonicalRevisionIdentityParameter = {
  parameter_id?: unknown;
  unit_id?: unknown;
};

export type CanonicalRevisionIdentityParent = {
  revision_contract_version?: unknown;
  source_request_text?: unknown;
  primary_measure_parameter_id?: unknown;
} | null;

export type CanonicalRevisionIdentityInput = {
  catalogId: string;
  parentRevisionId: string | null;
  requestIdentity: Record<string, unknown>;
  definition: CanonicalRevisionIdentityDefinition;
  parameterDefinitions: CanonicalRevisionIdentityParameter[];
  parameters: Record<string, unknown>;
  effectiveUserParameters: Record<string, unknown>;
  baselineAssumptions: Record<string, unknown>;
  parent: CanonicalRevisionIdentityParent;
  searchReleaseId: string | null;
  compilerVersion: string;
  hashText: (value: string) => string | Promise<string>;
};

function publicUnitRu(unitId: unknown): string {
  const unit = String(unitId ?? "").trim();
  const units: Record<string, string> = {
    m2: "м²", m3: "м³", m: "м", mm: "мм", cm: "см", km: "км",
    pcs: "шт.", item: "шт.", kg: "кг", t: "т", l: "л",
    man_hour: "чел.-ч", machine_hour: "маш.-ч", person_shift: "чел.-смена",
    service: "усл.", test: "исп.", document: "док.", trip: "рейс", t_km: "т·км",
    m3_m3: "м³/м³", m3_m: "м³/м", percent: "%",
  };
  return units[unit] ?? unit;
}

function publicMeasureValue(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? "").trim();
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 6 }).format(numeric);
}

function writerError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

export async function buildCanonicalRevisionIdentity(
  input: CanonicalRevisionIdentityInput,
): Promise<Record<string, unknown>> {
  const parentHasCanonicalIdentity = input.parent?.revision_contract_version
    === CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION;
  const sourceRequestText = parentHasCanonicalIdentity
    ? String(input.parent?.source_request_text ?? "").trim()
    : String(input.requestIdentity.sourceRequestText ?? "").trim();
  const primaryMeasureParameterId = parentHasCanonicalIdentity
    ? String(input.parent?.primary_measure_parameter_id ?? "").trim()
    : String(input.requestIdentity.primaryMeasureParameterId ?? "").trim();
  if (!sourceRequestText || !primaryMeasureParameterId) {
    throw writerError("source request identity is unavailable", "SOURCE_REQUEST_IDENTITY_REQUIRED");
  }
  const primary = input.parameterDefinitions.find(
    (parameter) => parameter.parameter_id === primaryMeasureParameterId,
  );
  const primaryMeasureValue = input.parameters[primaryMeasureParameterId];
  if (!primary || primaryMeasureValue == null || !String(primaryMeasureValue).trim()) {
    throw writerError("primary measure is unavailable", "PRIMARY_MEASURE_REQUIRED");
  }
  const canonicalWorkTitleRu = canonicalDefinitionTitleRu(input.definition);
  if (!canonicalWorkTitleRu) {
    throw writerError("canonical work title is unavailable", "DEFINITION_INTEGRITY_FAILED");
  }
  const primaryMeasureUnitId = String(primary.unit_id ?? "").trim();
  const displayTitleRu = `${canonicalWorkTitleRu} — ${publicMeasureValue(primaryMeasureValue)}`
    + `${primaryMeasureUnitId ? ` ${publicUnitRu(primaryMeasureUnitId)}` : ""}`;
  return {
    contractVersion: CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION,
    sourceRequestText,
    sourceRequestHash: await input.hashText(sourceRequestText),
    canonicalWorkTitleRu,
    displayTitleRu,
    primaryMeasureParameterId,
    primaryMeasureValue: String(primaryMeasureValue),
    primaryMeasureUnitId: primaryMeasureUnitId || null,
    normalizedIntent: {
      catalogId: input.catalogId,
      groupId: input.definition.domain,
      primaryMeasure: {
        parameterId: primaryMeasureParameterId,
        value: String(primaryMeasureValue),
        unitId: primaryMeasureUnitId || null,
      },
      parameters: input.parameters,
    },
    definitionVersionId: input.definition.id,
    groupId: input.definition.domain,
    searchReleaseId: input.searchReleaseId,
    userInputSnapshot: input.effectiveUserParameters,
    acceptedBaselineSnapshot: input.baselineAssumptions,
    assumptionSnapshot: input.baselineAssumptions,
    formulaGraphVersion: input.compilerVersion,
    legacyParentIdentityRecovery: input.parent != null && !parentHasCanonicalIdentity,
  };
}

export const CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION =
  "estimate_commit_compile_job_v1" as const;

export function buildCanonicalRevisionCommitPayload(input: {
  rowCount: number;
  currencyCode: string;
  totals: Record<string, unknown>;
  checksumSha256: string;
  compilerVersion: string;
  parameters: Record<string, unknown>;
  approvedTemplateBaselineId: string | null;
  baselineAssumptions: Record<string, unknown>;
  effectiveUserParameters: Record<string, unknown>;
  parentRevisionId: string | null;
  identityContract: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    rowCount: input.rowCount,
    currencyCode: input.currencyCode,
    totals: input.totals,
    checksumSha256: input.checksumSha256,
    compilerVersion: input.compilerVersion,
    migrationSource: null,
    resolvedParameters: input.parameters,
    parameterSources: {
      approvedTemplateBaselineId: input.approvedTemplateBaselineId,
      baselineAssumptions: input.baselineAssumptions,
      userParameters: input.effectiveUserParameters,
      parentRevisionId: input.parentRevisionId,
      identityContract: input.identityContract,
    },
  };
}
