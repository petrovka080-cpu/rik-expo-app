import type { ProfessionalBoqAssumptions, ProfessionalBoqRiskPolicy } from "./professionalBoqContract";
import {
  buildProfessionalMissingInputPolicy,
  DRAWINGS_NOT_REQUIRED_FOR_PRELIMINARY_BOQ,
} from "./missingInputPolicy";

const PRICE_MISSING_POLICY_RU =
  "Цены не заполнены: финальный итог не рассчитывается до выбора подтвержденного источника цены.";

const SOURCE_BACKED_PRICE_POLICY_RU =
  "Цены показываются только для строк с источником; перед финальным итогом их нужно подтвердить по региону и коммерческому предложению.";

const COMMON_DEFAULT_ASSUMPTION_RU =
  "Общие профессиональные допущения: доступ, скрытые работы, доставка, подъем и местные требования уточняются перед договорной сметой.";

type DefaultAssumptionRule = {
  patterns: RegExp[];
  defaultsRu: string[];
};

const DEFAULT_RULES: DefaultAssumptionRule[] = [
  {
    patterns: [/забор|огражден|профлист|профнастил|fenc/i],
    defaultsRu: [
      "Забор: шаг столбов принят 2.5 м, фундамент столбов бетонный, нахлест профлиста 100 мм.",
      "Забор: ворота и калитка приняты 0, если они не указаны в prompt.",
    ],
  },
  {
    patterns: [/дорог|асфальт|road/i],
    defaultsRu: [
      "Дорога: принято 2 слоя асфальта, основание 200 мм и песчаный слой 100 мм.",
      "Дорога: бордюр не включен, если он не указан в prompt.",
    ],
  },
  {
    patterns: [/водоснаб|канализац|труб|пнд|sewer|water\s+supply/i],
    defaultsRu: [
      "Наружные сети: глубина траншеи принята 1.5 м, песчаная постель 100 мм.",
      "Наружные сети: колодцы/арматура и испытания вынесены в отдельные строки там, где применимо.",
    ],
  },
  {
    patterns: [/алмазн|бурени|сверлен|diamond\s+drill|core\s+drill/i],
    defaultsRu: [
      "Алмазное бурение: вода, сбор шлама, доставка установки и контроль зоны работ включены отдельными строками.",
    ],
  },
  {
    patterns: [/кровл|крыша|мансард|фасад|остекл|roof|facade/i],
    defaultsRu: [
      "Высотные/кровельные работы: доступ, страховка, узлы крепления и погодные ограничения отмечены как проверяемые вводные.",
    ],
  },
  {
    patterns: [/дамб|плотин|мост|тоннел|тоннель|bridge|tunnel|dam/i],
    defaultsRu: [
      "Инженерные сооружения: геология, гидрология, проект производства работ и приемочные требования остаются missing inputs.",
    ],
  },
  {
    patterns: [/лэп|кв\b|кабельн|электр|котел|котёл|газ|boiler|power\s+line/i],
    defaultsRu: [
      "Регулируемые инженерные системы: схема подключения, допуски, испытания и профильный подрядчик обязательны для финальной версии.",
    ],
  },
  {
    patterns: [/плитк|штукатур|покраск|краск|tile|plaster|paint/i],
    defaultsRu: [
      "Отделочные работы: подготовка основания, расходные материалы и финишная проверка выделяются отдельно, если применимо.",
    ],
  },
  {
    patterns: [/фундамент|анкер|оборудован|industrial/i],
    defaultsRu: [
      "Промышленный фундамент: нагрузки оборудования, анкера, марка бетона и армирование требуют инженерной проверки перед contract-ready.",
    ],
  },
];

function unique(items: readonly string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function defaultAssumptionsForPrompt(prompt: string): string[] {
  const matched = DEFAULT_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(prompt)))
    .flatMap((rule) => rule.defaultsRu);
  return unique([COMMON_DEFAULT_ASSUMPTION_RU, ...matched]);
}

export type ProfessionalAssumptionEngineResult = ProfessionalBoqAssumptions & {
  drawingsNotRequiredForPreliminaryBoq: typeof DRAWINGS_NOT_REQUIRED_FOR_PRELIMINARY_BOQ;
  professionalDefaultsApplied: boolean;
  defaultAssumptionsRu: string[];
  finalContractStatusBlockedUntilReview: true;
};

export function buildProfessionalAssumptionEngineResult(input: {
  prompt: string;
  rowCount: number;
  hasAnySourceBackedPrice: boolean;
  riskPolicy: ProfessionalBoqRiskPolicy;
}): ProfessionalAssumptionEngineResult {
  const missingPolicy = buildProfessionalMissingInputPolicy({
    prompt: input.prompt,
    riskPolicy: input.riskPolicy,
  });
  const pricePolicyRu = input.hasAnySourceBackedPrice ? SOURCE_BACKED_PRICE_POLICY_RU : PRICE_MISSING_POLICY_RU;
  const defaultAssumptionsRu = defaultAssumptionsForPrompt(input.prompt);
  const assumptionsRu = unique([
    `Предварительная BOQ-структура собрана по ${input.rowCount} строкам из указанного пользователем объема.`,
    missingPolicy.drawingsPolicyRu,
    ...defaultAssumptionsRu,
    pricePolicyRu,
    ...input.riskPolicy.publicNotesRu,
  ]);

  return {
    assumptionsRu,
    missingInputsRu: missingPolicy.missingInputsRu,
    pricePolicyRu,
    drawingsPolicyRu: missingPolicy.drawingsPolicyRu,
    drawingsNotRequiredForPreliminaryBoq: DRAWINGS_NOT_REQUIRED_FOR_PRELIMINARY_BOQ,
    professionalDefaultsApplied: defaultAssumptionsRu.length > 0,
    defaultAssumptionsRu,
    finalContractStatusBlockedUntilReview: true,
  };
}
