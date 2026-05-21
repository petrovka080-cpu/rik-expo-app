export type AiDomainNumericFact = {
  key: string;
  value: number;
  unit?: string;
  labelRu: string;
  sourceRefIds: string[];
};

export function createAiDomainNumericFact(input: AiDomainNumericFact): AiDomainNumericFact {
  return {
    ...input,
    sourceRefIds: [...new Set(input.sourceRefIds)],
  };
}

export function mergeAiDomainNumericFacts(
  factGroups: readonly AiDomainNumericFact[][],
): AiDomainNumericFact[] {
  const byKey = new Map<string, AiDomainNumericFact>();

  for (const facts of factGroups) {
    for (const fact of facts) {
      const existing = byKey.get(fact.key);
      if (!existing) {
        byKey.set(fact.key, createAiDomainNumericFact(fact));
        continue;
      }

      byKey.set(fact.key, {
        ...existing,
        sourceRefIds: [...new Set([...existing.sourceRefIds, ...fact.sourceRefIds])],
      });
    }
  }

  return [...byKey.values()];
}

export function hasRequiredAiDomainNumericFact(
  facts: readonly AiDomainNumericFact[],
  key: string,
  expected: number,
): boolean {
  return facts.some((fact) => fact.key === key && fact.value === expected);
}
