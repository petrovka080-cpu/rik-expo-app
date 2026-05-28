import type { GlobalLocalContext } from "./globalLocalContextTypes";
import type { CurrencyPolicy } from "./currencyPolicyTypes";

export function resolveCurrencyPolicy(params: {
  context: GlobalLocalContext;
  explicitCurrency?: string;
  convertedFromCurrency?: string;
  exchangeRateSourceId?: string;
  exchangeRateDate?: string;
}): CurrencyPolicy {
  if (params.explicitCurrency) {
    return {
      currency: params.explicitCurrency.toUpperCase(),
      source: "explicit_input",
      exchangeRateSourceId: params.exchangeRateSourceId,
      exchangeRateDate: params.exchangeRateDate,
      warning: buildExchangeWarning(params),
    };
  }

  if (!params.context.currency) {
    return {
      currency: null,
      source: "missing",
      warning: "Валюта не определена: уточните страну/город для локальной сметы.",
    };
  }

  return {
    currency: params.context.currency,
    source: "country_policy",
    warning: buildExchangeWarning(params),
  };
}

function buildExchangeWarning(params: {
  convertedFromCurrency?: string;
  exchangeRateSourceId?: string;
  exchangeRateDate?: string;
}): string | undefined {
  if (!params.convertedFromCurrency) return undefined;
  if (!params.exchangeRateSourceId || !params.exchangeRateDate) {
    return "Конвертация валюты не применяется без source/date курса; покажите локальную валюту или warning.";
  }
  return undefined;
}
