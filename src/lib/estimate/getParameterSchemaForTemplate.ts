import { buildProfessionalWorkPassport } from "./buildProfessionalWorkPassport";
import {
  buildDefaultInlineWorkAssumptions,
  INLINE_WORK_GENERIC_UNIT_PARSER_RULES,
  inlineWorkSchemaEntryFromPassportParam,
  type InlineWorkFamilyParameterSchema,
} from "./familyParameterSchemas";

const schemaCache = new Map<string, InlineWorkFamilyParameterSchema | null>();
const INLINE_WORK_PARAMETER_SCHEMA_CACHE_LIMIT = 128;

function rememberSchema(
  key: string,
  schema: InlineWorkFamilyParameterSchema | null,
): InlineWorkFamilyParameterSchema | null {
  schemaCache.delete(key);
  schemaCache.set(key, schema);
  while (schemaCache.size > INLINE_WORK_PARAMETER_SCHEMA_CACHE_LIMIT) {
    const oldest = schemaCache.keys().next().value;
    if (oldest == null) break;
    schemaCache.delete(oldest);
  }
  return schema;
}

export function getParameterSchemaForTemplate(templateId: string): InlineWorkFamilyParameterSchema | null {
  const key = String(templateId ?? "").trim();
  if (!key) return null;
  if (schemaCache.has(key)) return schemaCache.get(key) ?? null;

  const passport = buildProfessionalWorkPassport(key);
  if (!passport) {
    return rememberSchema(key, null);
  }

  const requiredParams = passport.parameterSchema.required.map(inlineWorkSchemaEntryFromPassportParam);
  const optionalParams = passport.parameterSchema.optional.map(inlineWorkSchemaEntryFromPassportParam);
  const synonyms = [
    passport.templateId,
    passport.workKey,
    passport.familyId,
    passport.localizedNameRu,
    ...passport.aliases,
    ...requiredParams.flatMap((param) => param.synonyms),
    ...optionalParams.flatMap((param) => param.synonyms),
  ].filter(Boolean);

  const schema: InlineWorkFamilyParameterSchema = {
    templateId: passport.templateId,
    templateName: passport.localizedNameRu,
    familyId: passport.familyId,
    requiredParams,
    optionalParams,
    defaultAssumptions: buildDefaultInlineWorkAssumptions({
      familyId: passport.familyId,
      templateName: passport.localizedNameRu,
    }),
    unitParserRules: [...INLINE_WORK_GENERIC_UNIT_PARSER_RULES],
    synonyms: [...new Set(synonyms)],
    promptExamples: [
      `${passport.localizedNameRu} 100 m2`,
      `${passport.localizedNameRu} length 150 m height 3 m`,
      `${passport.localizedNameRu} turnkey 5 km d132`,
    ],
    missingInputPolicy: "show_missing_and_continue_preliminary_boq",
  };

  return rememberSchema(key, schema);
}

export function clearInlineWorkParameterSchemaCache(): void {
  schemaCache.clear();
}
