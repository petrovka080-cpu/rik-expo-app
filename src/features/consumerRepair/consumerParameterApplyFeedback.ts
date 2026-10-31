/** UI feedback only. No calculation, normalization of quantities, or guessed dependencies. */
export type ConsumerParameterApplyFailure = {
  status: 'failed'; code?: string; messageRu: string; parameterIds: string[];
};

export function consumerParameterApplyFailure(error: unknown): ConsumerParameterApplyFailure {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = typeof value.code === 'string' ? value.code : undefined;
  const details = value.details && typeof value.details === 'object' ? value.details as Record<string, unknown> : {};
  const candidates = value.parameterIds ?? value.affectedParameterIds ?? details.parameterIds ?? details.affectedParameterIds
    ?? (typeof value.parameterId === 'string' ? [value.parameterId] : []);
  const parameterIds = Array.isArray(candidates) ? [...new Set(candidates.filter((id): id is string =>
    typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_.:-]{0,199}$/u.test(id)))].slice(0, 128) : [];
  const raw = typeof value.messageRu === 'string' ? value.messageRu : typeof value.message === 'string' ? value.message : '';
  const human = (code === 'FORMULA_OUTPUT_BOUNDS_FAILED' ? raw.replace(/\s*\([^()]*:[^()]*\)\s*$/u, '') : raw).trim();
  const messageRu = human && /[А-Яа-яЁё]/u.test(human) && !/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/u.test(human)
    ? human : code === 'FORMULA_OUTPUT_BOUNDS_FAILED'
      ? 'Расчёт не завершён: введённый план или исходные величины не прошли проверку расчёта. Данные сохранены на экране; проверьте согласованность плана и измерений.'
      : 'Изменения пока не применены. Введённые данные сохранены на экране; расчёт не подтвердил результат.';
  return { status: 'failed', ...(code ? { code } : {}), messageRu, parameterIds };
}

export function consumerParameterFieldStatus(input: {
  rawValue: string; dirty: boolean; required: boolean; error?: string;
  valid?: boolean; validationIssues?: readonly string[]; assumed?: boolean;
}): { kind: 'invalid' | 'missing' | 'pending' | 'provided' | 'optional' | 'preliminary'; labelRu: string } {
  if (!input.rawValue.trim()) return input.required
    ? { kind: 'missing', labelRu: 'Нужно заполнить обязательное поле' }
    : { kind: 'optional', labelRu: 'Можно уточнить, если данные известны' };
  if (input.error || input.valid === false && input.validationIssues?.some(issue => issue !== 'VALUE_REQUIRED'))
    return { kind: 'invalid', labelRu: 'Ошибка в этом поле' };
  if (input.dirty) return { kind: 'pending', labelRu: 'Изменено — ещё не применено' };
  if (input.assumed) return { kind: 'preliminary', labelRu: 'Предварительное значение — проверьте по проекту' };
  return { kind: 'provided', labelRu: 'Заполнено — значение сохранено' };
}
