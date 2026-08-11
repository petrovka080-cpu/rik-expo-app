import type {
  EstimateDraftRevision,
  EstimateDraftRevisionParam,
} from "../estimateDraftRevisionContract";
import type { EstimateDraftSession } from "../draftSession/estimateDraftSession";
import {
  createCanonicalParameterSession,
  type CanonicalParameterSchema,
  type CanonicalParameterSeed,
  type CanonicalParameterSession,
  type CanonicalParameterSource,
  type CanonicalParameterValue,
} from "./canonicalParameterCore";
import {
  ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA,
  REGISTERED_CANONICAL_PARAMETER_SCHEMAS,
} from "./registeredCanonicalParameterSchemas";
import {
  asphaltRelatedCatalogBindingV4,
  getAsphaltRelatedProfileByCatalogRecordIdV4,
} from "../v4/asphalt/asphaltRelatedSemanticRegistryV4";

function catalogBoundSchema(
  schema: CanonicalParameterSchema,
  identity: Readonly<Record<string, unknown>> | null | undefined,
): CanonicalParameterSchema {
  const parameterSchemaId = typeof identity?.parameterSchemaId === "string"
    ? identity.parameterSchemaId.trim()
    : "";
  const passportId = typeof identity?.professionalEstimatePassportId === "string"
    ? identity.professionalEstimatePassportId.trim()
    : "";
  const formulaBindingId = typeof identity?.formulaBindingId === "string"
    ? identity.formulaBindingId.trim()
    : "";
  if (!parameterSchemaId || !passportId) return schema;
  return Object.freeze({
    ...schema,
    schemaId: parameterSchemaId.startsWith("canonical:")
      ? parameterSchemaId
      : `canonical:${parameterSchemaId}`,
    workPassportId: passportId,
    calculationVersion: formulaBindingId
      ? `${schema.calculationVersion}|${formulaBindingId}`
      : schema.calculationVersion,
  });
}

function sourceForParam(
  parameter: EstimateDraftRevisionParam,
): Exclude<CanonicalParameterSource, "MISSING"> {
  if (parameter.source === "edited_by_user") return "USER_EXPLICIT";
  if (parameter.source === "user_input") return "TEXT_EXTRACTED";
  if (parameter.source === "derived") return "CALCULATED";
  return "ASSUMED";
}

function primitive(value: unknown): value is CanonicalParameterValue {
  return (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  );
}

function repeatableGroupSummary(
  revision: EstimateDraftRevision,
  groupKey: "asphalt_layers" | "crushed_layers",
): CanonicalParameterSeed | null {
  const prefix = groupKey === "asphalt_layers"
    ? "asphalt_layer_"
    : "crushed_layer_";
  const countKey = groupKey === "asphalt_layers"
    ? "asphalt_layer_count"
    : "crushed_layer_count";
  const entries = Object.entries(revision.params)
    .filter(([key]) => key.startsWith(prefix) && key !== countKey)
    .sort(([left], [right]) => left.localeCompare(right));
  const count = revision.params[countKey]?.value;
  if (entries.length === 0 && typeof count !== "number") return null;
  const explicit = entries.some(([, parameter]) =>
    parameter.source === "edited_by_user" || parameter.source === "user_input"
  );
  const summary = [
    typeof count === "number" ? `${count} сл.` : null,
    ...entries.map(([key, parameter]) => `${key}=${parameter.value}`),
  ].filter(Boolean).join("; ");
  return {
    parameterId: groupKey,
    value: summary,
    source: explicit ? "TEXT_EXTRACTED" : "ASSUMED",
    confidence: explicit ? 0.95 : 0.55,
    assumption: explicit
      ? null
      : "Состав повторяемой группы собран из явно показанных предварительных параметров слоёв.",
    sourceText: summary,
  };
}

export function projectEstimateDraftRevisionToCanonicalSession(input: {
  revision: EstimateDraftRevision;
  draftId: string;
  createdAt: string;
  previousSession?: CanonicalParameterSession | null;
}): CanonicalParameterSession | null {
  const firstRowIdentity = input.revision.boq.rows[0]?.sourceParameters;
  const exactAsphaltResourceRevision =
    firstRowIdentity?.asphaltRelatedV4 === true &&
    input.revision.professionalWorkId === ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA.canonicalWorkKey;
  const canonicalSchema = exactAsphaltResourceRevision
    ? ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA
    : REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey(
      input.revision.professionalWorkId ?? "",
    ) ??
    REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey(
      input.revision.matchedFamily,
    ) ??
    REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByWorkPassportId(
      input.revision.selectedTemplateId,
    );
  if (!canonicalSchema) return null;
  const schema = catalogBoundSchema(
    canonicalSchema,
    firstRowIdentity,
  );

  const seeds: CanonicalParameterSeed[] = [];
  for (const definition of schema.definitions) {
    const parameter = input.revision.params[definition.parameterId];
    if (parameter && primitive(parameter.value)) {
      seeds.push({
        parameterId: definition.parameterId,
        value: parameter.value,
        source: sourceForParam(parameter),
        confidence:
          parameter.source === "edited_by_user" ||
          parameter.source === "user_input"
            ? 1
            : 0.6,
        assumption:
          parameter.source === "default_assumption"
            ? input.revision.assumptions.find(
                (assumption) => assumption.key === definition.parameterId,
              )?.reason ?? `Предварительное значение: ${definition.label}`
            : null,
        sourceText: parameter.sourceText ?? null,
      });
      continue;
    }
    if (
      definition.parameterId === "asphalt_layers" ||
      definition.parameterId === "crushed_layers"
    ) {
      const group = repeatableGroupSummary(
        input.revision,
        definition.parameterId,
      );
      if (group) seeds.push(group);
      continue;
    }
    const assumption = input.revision.assumptions.find(
      (candidate) =>
        candidate.key === definition.parameterId &&
        !candidate.replacedByUserInput &&
        primitive(candidate.value),
    );
    if (assumption && primitive(assumption.value)) {
      seeds.push({
        parameterId: definition.parameterId,
        value: assumption.value,
        source: "ASSUMED",
        confidence: 0.5,
        assumption: assumption.reason,
        sourceText: assumption.reason,
      });
    }
  }
  return createCanonicalParameterSession({
    schema,
    draftId: input.draftId,
    revisionId: input.revision.revisionId,
    seeds,
    createdAt: input.createdAt,
    previousSession: input.previousSession,
  });
}

export function projectEstimateDraftSessionToCanonicalSession(input: {
  session: EstimateDraftSession;
  createdAt: string;
  previousSession?: CanonicalParameterSession | null;
}): CanonicalParameterSession | null {
  const canonicalWorkKey = input.session.workIntent?.canonicalWorkKey;
  if (!canonicalWorkKey) return null;
  const canonicalSchema =
    REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey(
      canonicalWorkKey,
    );
  if (!canonicalSchema) return null;
  const catalogWorkId = input.session.workIntent?.catalogWorkId ?? canonicalWorkKey;
  const asphaltProfile = getAsphaltRelatedProfileByCatalogRecordIdV4(catalogWorkId);
  const binding = asphaltProfile
    ? asphaltRelatedCatalogBindingV4(asphaltProfile, catalogWorkId)
    : null;
  const schema = catalogBoundSchema(canonicalSchema, binding ? {
    parameterSchemaId: binding.parameterSchemaId,
    professionalEstimatePassportId: binding.professionalPassportId,
    formulaBindingId: binding.formulaBindingId,
  } : null);
  const seeds: CanonicalParameterSeed[] = schema.definitions.flatMap(
    (definition) => {
      const parameter = input.session.parameters[definition.parameterId];
      if (!parameter || !primitive(parameter.value)) return [];
      const assumed = parameter.origin === "PROJECT_DERIVED";
      return [{
        parameterId: definition.parameterId,
        value: parameter.value,
        source: assumed ? "ASSUMED" as const : "TEXT_EXTRACTED" as const,
        confidence: assumed ? 0.55 : 0.95,
        assumption: assumed
          ? parameter.sourceText ??
            `Предварительное значение: ${definition.label}`
          : null,
        sourceText: parameter.sourceText ?? null,
      }];
    },
  );
  return createCanonicalParameterSession({
    schema,
    draftId: input.session.draftId,
    revisionId:
      input.session.activeRevisionId ??
      `${input.session.draftId}:parameters:${input.session.selectionEpoch}`,
    seeds,
    createdAt: input.createdAt,
    previousSession: input.previousSession,
  });
}
