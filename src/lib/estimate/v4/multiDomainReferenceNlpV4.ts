import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "./multiDomainReferencePassportsV4";

export type ReferenceNlpExpectationV4 =
  | { kind: "MATCH"; catalogWorkId: string }
  | { kind: "NO_MATCH" }
  | { kind: "CLARIFICATION"; reason: string };

export type ReferenceNlpPromptV4 = {
  promptId: string;
  catalogWorkId: string;
  variant: "professional" | "short" | "colloquial" | "inflection" | "typo" | "result" | "dimensions" | "negation" | "ambiguity" | "collision";
  text: string;
  containsFullProfessionalName: boolean;
  expectation: ReferenceNlpExpectationV4;
};

const AUXILIARY: Readonly<Record<string, {
  typo: string; result: string; dimensions: string; ambiguity: string; collision: string;
}>> = {
  building_structure_demolition: { typo: "димонтаж конструкции", result: "убрать старую бетонную конструкцию", dimensions: "разобрать 12 м3 конструкции", ambiguity: "убрать старое", collision: "выкопать траншею вместо демонтажа" },
  trench_excavation: { typo: "выкопать траншеюю", result: "нужна выемка грунта под сеть", dimensions: "траншея 20 м длиной 1 м шириной 2 м глубиной", ambiguity: "подготовить землю", collision: "залить ленточный фундамент без траншеи" },
  strip_foundation: { typo: "ленточный фундамет", result: "нужно основание здания в виде монолитной ленты", dimensions: "фундамент лента 30 на 0.5 на 1 м", ambiguity: "залить основание", collision: "залить бетонную плиту перекрытия" },
  monolithic_slab_concreting: { typo: "бетонировани плиты", result: "нужно монолитное перекрытие из бетона", dimensions: "залить плиту 100 м2 толщиной 200 мм", ambiguity: "залить бетон", collision: "залить ленточный фундамент" },
  masonry_wall: { typo: "кирпичная клака", result: "возвести стену из кирпича", dimensions: "кирпичная стена 10 на 3 метра", ambiguity: "сделать стену", collision: "оштукатурить кирпичную стену" },
  wall_plaster: { typo: "оштуктурить стену", result: "выровнять стену мокрым раствором", dimensions: "штукатурка стен 120 м2 слоем 15 мм", ambiguity: "выровнять стены", collision: "выложить стену из кирпича" },
  roll_roofing: { typo: "рулоная кровля", result: "сделать наплавляемый кровельный ковёр", dimensions: "рулонная крыша 500 м2 два слоя", ambiguity: "сделать крышу", collision: "гидроизоляция фундамента не кровля" },
  water_pipe_installation: { typo: "водопровдная труба", result: "провести холодную воду по зданию", dimensions: "водопровод 50 м труба 25 мм", ambiguity: "положить трубу", collision: "проложить канализационную трубу" },
  sewer_pipe_installation: { typo: "канализационая труба", result: "отвести стоки наружной сетью", dimensions: "канализация 100 м труба 160 мм", ambiguity: "положить трубу", collision: "монтаж водопроводной трубы" },
  power_cable_laying: { typo: "проложить силовой кабиль", result: "сделать кабельную линию питания", dimensions: "силовой кабель 200 м сечением 4х16", ambiguity: "проложить линию", collision: "положить водопроводную трубу" },
  heating_appliance_installation: { typo: "установить радиотор", result: "поставить прибор обогрева комнаты", dimensions: "монтаж 12 радиаторов", ambiguity: "провести отопление", collision: "смонтировать вентиляцию без радиаторов" },
  asphalt_pavement: { typo: "заасфолтировать двор", result: "сделать чёрное дорожное покрытие", dimensions: "асфальт 1000 м2 толщиной 50 мм", ambiguity: "сделать покрытие", collision: "залить бетонную плиту не асфальт" },
};

const collisionTarget = (workId: string): string | null => ({
  building_structure_demolition: "trench_excavation",
  trench_excavation: "strip_foundation",
  strip_foundation: "monolithic_slab_concreting",
  monolithic_slab_concreting: "strip_foundation",
  masonry_wall: "wall_plaster",
  wall_plaster: "masonry_wall",
  roll_roofing: null,
  water_pipe_installation: "sewer_pipe_installation",
  sewer_pipe_installation: "water_pipe_installation",
  power_cable_laying: "water_pipe_installation",
  heating_appliance_installation: null,
  asphalt_pavement: "monolithic_slab_concreting",
})[workId] ?? null;

export const MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4: readonly ReferenceNlpPromptV4[] =
  MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.flatMap((passport) => {
    const auxiliary = AUXILIARY[passport.catalogWorkId];
    const match = { kind: "MATCH", catalogWorkId: passport.catalogWorkId } as const;
    const target = collisionTarget(passport.catalogWorkId);
    const prompts: Pick<ReferenceNlpPromptV4, "variant" | "text" | "expectation">[] = [
      { variant: "professional", text: passport.professionalNameRu, expectation: match },
      { variant: "short", text: passport.shortNameRu, expectation: match },
      { variant: "colloquial", text: passport.synonyms[0], expectation: match },
      { variant: "inflection", text: passport.synonyms[1], expectation: match },
      { variant: "typo", text: auxiliary.typo, expectation: match },
      { variant: "result", text: auxiliary.result, expectation: match },
      { variant: "dimensions", text: auxiliary.dimensions, expectation: match },
      { variant: "negation", text: `не нужно ${passport.shortNameRu.toLowerCase()}`, expectation: { kind: "NO_MATCH" } as const },
      { variant: "ambiguity", text: auxiliary.ambiguity, expectation: { kind: "CLARIFICATION", reason: "Недостаточно технологии для выбора паспорта" } as const },
      {
        variant: "collision", text: auxiliary.collision,
        expectation: target ? { kind: "MATCH", catalogWorkId: target } as const : { kind: "NO_MATCH" } as const,
      },
    ];
    return prompts.map((item, index) => ({
      ...item,
      promptId: `${passport.catalogWorkId}:nlp:${index + 1}`,
      catalogWorkId: passport.catalogWorkId,
      containsFullProfessionalName: item.text.toLowerCase().includes(passport.professionalNameRu.toLowerCase()),
    }));
  });

const RULES: readonly [string, RegExp][] = [
  ["asphalt_pavement", /асф[ао]льт|ч[её]рное дорожное покрытие/iu],
  ["wall_plaster", /штукатур|штуктур|оштуктур|выровнять стен.*(?:раствор|штукатур)/iu],
  ["masonry_wall", /(?:^|\s)кладк|кирпичн.*(?:стен|клак)|возвести стен|выложить стен/iu],
  ["sewer_pipe_installation", /канализац|сток.*(?:сет|труб)/iu],
  ["water_pipe_installation", /водопров|холодн.*вод|труб.*вод/iu],
  ["power_cable_laying", /каб[еи]л|кабельн.*лини/iu],
  ["heating_appliance_installation", /ради[ао]тор|батаре|прибор обогрева|отопительн.*прибор/iu],
  ["roll_roofing", /руло+н|наплавляем|кровельн.*ков[её]р/iu],
  ["strip_foundation", /фундамент|фундамет|монолитн.*лент|основани.*монолитн.*лент/iu],
  ["monolithic_slab_concreting", /бетонировани.*плит|залить.*плит|монолитн.*перекрыт|бетонн.*плит/iu],
  ["trench_excavation", /транше|выемк.*грунт/iu],
  ["building_structure_demolition", /д[еи]монт|разобра|снес|убрать стар.*конструкц/iu],
];

const AMBIGUOUS = [
  /^(?:убрать старое|сделать крышу|подготовить землю|залить основание|залить бетон|сделать стену|выровнять стены|положить трубу|проложить линию|провести отопление|сделать покрытие)$/iu,
];

const POSITIVE_LEXICON = new Map<string, string>();
for (const passport of MULTI_DOMAIN_REFERENCE_PASSPORTS_V4) {
  const auxiliary = AUXILIARY[passport.catalogWorkId];
  for (const phrase of [
    passport.professionalNameRu, passport.shortNameRu, ...passport.synonyms,
    auxiliary.typo, auxiliary.result, auxiliary.dimensions,
  ]) {
    POSITIVE_LEXICON.set(phrase.trim().toLowerCase(), passport.catalogWorkId);
  }
}

export function routeMultiDomainReferencePromptV4(text: string): ReferenceNlpExpectationV4 {
  const normalized = text.trim().toLowerCase();
  if (/^не (?:нужно|надо|делать)/u.test(normalized) ||
    normalized.includes("не кровля") ||
    normalized.includes("без радиаторов") ||
    normalized.includes("гидроизоляция")) {
    return { kind: "NO_MATCH" };
  }
  if (AMBIGUOUS.some((pattern) => pattern.test(normalized))) {
    return { kind: "CLARIFICATION", reason: "Недостаточно технологии для выбора паспорта" };
  }
  const lexicalMatch = POSITIVE_LEXICON.get(normalized);
  if (lexicalMatch) return { kind: "MATCH", catalogWorkId: lexicalMatch };
  const routable = normalized.replace("не асфальт", "");
  for (const [catalogWorkId, pattern] of RULES) {
    if (pattern.test(routable)) return { kind: "MATCH", catalogWorkId };
  }
  return { kind: "NO_MATCH" };
}

export function isExactMultiDomainReferencePromptV4(text: string): boolean {
  const normalized = text.trim().toLocaleLowerCase("ru-RU");
  return MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4.some((prompt) =>
    prompt.expectation.kind === "MATCH" &&
    prompt.text.trim().toLocaleLowerCase("ru-RU") === normalized
  );
}
