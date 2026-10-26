import type { AiLiveScreenButton } from "./aiLiveScreenButtonContract";

const FORBIDDEN_ENGLISH_COPY = [
  "Open",
  "Run",
  "Prepare",
  "Draft",
  "Approval required",
  "Source trace",
  "Provider",
  "Runtime",
  "Debug",
  "Fallback",
  "Entity",
  "Intent",
  "Planner",
  "Payload",
] as const;

const MOJIBAKE_PATTERN = /(?:Рљ|Р“|Рџ|Р”|Рћ|РЎ|Рќ|Р‘|Р°|Рµ|Рё|Рѕ|Рў|СЃ|С‚|СЊ|С‡|С‰|в„–|В·)/;

export type AiLiveRussianCopyGuardResult = {
  passed: boolean;
  englishSignals: string[];
  mojibakeSignals: string[];
  genericButtonLabels: string[];
};

function hasCyrillic(value: string): boolean {
  return /[А-Яа-яЁё]/.test(value);
}

export function findAiLiveRussianCopyIssues(text: string): Pick<AiLiveRussianCopyGuardResult, "englishSignals" | "mojibakeSignals"> {
  const source = String(text || "");
  const englishSignals = FORBIDDEN_ENGLISH_COPY.filter((word) => new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "i").test(source));
  const mojibakeSignals = MOJIBAKE_PATTERN.test(source) ? ["mojibake"] : [];
  return { englishSignals, mojibakeSignals };
}

export function validateAiLiveScreenRussianCopy(input: {
  buttons?: readonly AiLiveScreenButton[];
  texts?: readonly string[];
}): AiLiveRussianCopyGuardResult {
  const texts = [
    ...(input.texts ?? []),
    ...(input.buttons ?? []).flatMap((button) => [button.labelRu, button.concreteQuestionRu]),
  ];
  const issues = texts.map(findAiLiveRussianCopyIssues);
  const englishSignals = [...new Set(issues.flatMap((issue) => issue.englishSignals))];
  const mojibakeSignals = [...new Set(issues.flatMap((issue) => issue.mojibakeSignals))];
  const genericButtonLabels = (input.buttons ?? [])
    .filter((button) => {
      const label = button.labelRu.trim();
      const words = label.split(/\s+/).filter(Boolean);
      return words.length < 2 || !hasCyrillic(label) || /^(проверить|открыть|подготовить|показать)$/i.test(label);
    })
    .map((button) => button.labelRu);

  return {
    passed: englishSignals.length === 0 && mojibakeSignals.length === 0 && genericButtonLabels.length === 0,
    englishSignals,
    mojibakeSignals,
    genericButtonLabels,
  };
}
