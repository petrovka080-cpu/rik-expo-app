import { ContextResolutionResult, SemanticSource } from "./foreman.context";
import { RefOption } from "./foreman.types";

export interface AdaptedFieldUi {
  label: string;
  placeholder: string;
  options: RefOption[];
  isHidden: boolean;
  isValidValue: (val: string) => boolean;
}

export interface FormContextUiModel {
  locator: AdaptedFieldUi;
  zone: AdaptedFieldUi;
}

type SourceRule = {
  include: string[];
  exclude?: string[];
};

const SOURCE_RULES: Record<SemanticSource, SourceRule> = {
  floor_like: {
    include: ["этаж", "уров", "подвал", "цокол", "кровл", "техэтаж", "floor", "lvl-"],
    exclude: [],
  },
  section_like: {
    include: ["секц", "блок", "пролет", "корпус", "ось", "захватк", "line", "мезонин"],
    exclude: ["этаж", "мансард", "чердак", "лиф", "вестибюл"],
  },
  area_like: {
    include: ["участ", "сектор", "периметр", "площад", "наруж", "террит", "двор", "зона"],
    exclude: ["этаж", "мансард", "чердак", "подъезд", "коридор", "лиф"],
  },
  block_like: {
    include: ["блок", "корпус", "модул", "секц", "городок", "кампус"],
    exclude: ["этаж", "мансард", "чердак", "лиф", "вестибюл"],
  },
  technical_node_like: {
    include: ["узел", "камера", "секц", "отсек", "линия", "шкаф", "колод", "блок", "мезонин"],
    exclude: ["этаж", "мансард", "чердак", "вестибюл", "подъезд", "лиф"],
  },
  zone_indoor: {
    include: ["помещ", "коридор", "холл", "сануз", "шахт", "кварт", "офис", "вход", "ось"],
    exclude: [],
  },
  zone_industrial: {
    include: ["участ", "линия", "ось", "рамп", "отгруз", "склад", "секц", "зона"],
    exclude: ["мансард", "чердак", "квартир", "лифтов", "вестибюл"],
  },
  zone_outdoor: {
    include: ["сектор", "периметр", "въезд", "наруж", "контур", "пешеход", "участ", "площад"],
    exclude: ["этаж", "мансард", "чердак", "лиф", "коридор", "вестибюл"],
  },
  zone_campus: {
    include: ["блок", "корпус", "участ", "модул", "зона", "сектор"],
    exclude: ["мансард", "чердак", "лиф", "квартир"],
  },
  zone_technical: {
    include: ["узел", "камера", "тех", "отсек", "шкаф", "зона", "участ"],
    exclude: ["этаж", "мансард", "чердак", "лиф", "квартир", "вестибюл"],
  },
  zone_generic: {
    include: ["зона", "участ", "сектор", "ось", "секц", "блок", "помещ"],
    exclude: [],
  },
};

const normalize = (v: string) => String(v || "").trim().toLowerCase();

function matchRule(option: RefOption, rule: SourceRule): boolean {
  if (!option.code) return true;
  const text = `${normalize(option.name)} ${normalize(option.code)}`;
  const included = rule.include.some((token) => text.includes(normalize(token)));
  if (!included) return false;
  const excluded = (rule.exclude || []).some((token) => text.includes(normalize(token)));
  return !excluded;
}

function enforceWithFallback(raw: RefOption[], rule: SourceRule, emptyLabel: string): RefOption[] {
  const withContextEmpty = raw.map((o) => (!o.code ? { ...o, name: emptyLabel } : o));
  const filtered = withContextEmpty.filter((o) => matchRule(o, rule));
  if (filtered.length > 1) return filtered;

  // If there are no class-specific matches, keep only semantically safe baseline.
  const baseline = withContextEmpty.filter((o) => {
    if (!o.code) return true;
    const name = normalize(o.name);
    return !name.includes("мансард") && !name.includes("чердак");
  });
  return baseline.length ? baseline : [{ code: "", name: emptyLabel }];
}

export function adaptFormContext(
  ctxResult: ContextResolutionResult,
  rawLvlOptions: RefOption[],
  rawZoneOptions: RefOption[],
): FormContextUiModel {
  const { config } = ctxResult;

  const locatorRule = SOURCE_RULES[config.locatorSource];
  const zoneRule = SOURCE_RULES[config.zoneSource];

  const locatorOptions =
    config.localizationMode === "none"
      ? [{ code: "", name: config.empty.locatorPlaceholder }]
      : enforceWithFallback(rawLvlOptions, locatorRule, config.empty.locatorPlaceholder);
  const zoneOptions = enforceWithFallback(rawZoneOptions, zoneRule, config.empty.zonePlaceholder);

  return {
    locator: {
      label: config.locatorLabel,
      placeholder: config.empty.locatorPlaceholder,
      options: locatorOptions,
      isHidden: config.localizationMode === "none" && locatorOptions.length <= 1,
      isValidValue: (value: string) => !value || locatorOptions.some((o) => o.code === value),
    },
    zone: {
      label: config.zoneLabel,
      placeholder: config.empty.zonePlaceholder,
      options: zoneOptions,
      isHidden: false,
      isValidValue: (value: string) => !value || zoneOptions.some((o) => o.code === value),
    },
  };
}
