import { getParameterSchemaForTemplate } from "./getParameterSchemaForTemplate";

export type InlineWorkPromptHints = {
  templateId: string;
  templateName: string;
  familyId: string;
  aliases: string[];
  requiredParamKeys: string[];
  optionalParamKeys: string[];
  unitParserRules: string[];
  promptExamples: string[];
  missingInputMessages: string[];
};

export function getPromptHintsForTemplate(templateId: string): InlineWorkPromptHints | null {
  const schema = getParameterSchemaForTemplate(templateId);
  if (!schema) return null;
  return {
    templateId: schema.templateId,
    templateName: schema.templateName,
    familyId: schema.familyId,
    aliases: schema.synonyms.slice(0, 24),
    requiredParamKeys: schema.requiredParams.map((param) => param.key),
    optionalParamKeys: schema.optionalParams.map((param) => param.key),
    unitParserRules: schema.unitParserRules,
    promptExamples: schema.promptExamples,
    missingInputMessages: [
      ...schema.requiredParams,
      ...schema.optionalParams,
    ].map((param) => param.missingMessageRu),
  };
}
