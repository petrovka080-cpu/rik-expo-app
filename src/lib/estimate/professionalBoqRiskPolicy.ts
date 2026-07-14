import type { ProfessionalBoqRiskLevel, ProfessionalBoqRiskPolicy } from "./professionalBoqContract";

type RiskRule = {
  code: string;
  level: ProfessionalBoqRiskLevel;
  patterns: RegExp[];
  noteRu: string;
  missingInputsRu: string[];
};

const STANDARD_NOTE =
  "Предварительный BOQ построен по указанным объемам; перед закупкой и финальной ценой проверьте объект и спецификацию.";

const SPECIALIST_NOTE =
  "Работа относится к повышенному риску: BOQ не является разрешением на выполнение, нужен профильный специалист и проверка условий объекта.";

const REGULATED_NOTE =
  "Регулируемая или опасная работа: предварительный BOQ можно использовать для заявки, но выполнение требует профильного подрядчика, обследования, допусков и местных требований.";

const RISK_RULES: RiskRule[] = [
  {
    code: "gas_or_boiler",
    level: "regulated",
    patterns: [/газ|gas/i, /котел|котёл|котельн|boiler/i],
    noteRu: REGULATED_NOTE,
    missingInputsRu: ["тип топлива и схема подключения", "требования газовой/котельной службы", "проект и акт допуска, если применимо"],
  },
  {
    code: "electrical_power",
    level: "regulated",
    patterns: [/лэп|вл\s*\d|кв\b|кабельн|электр|подстанц|трансформатор|power\s*line|high\s*voltage/i],
    noteRu: REGULATED_NOTE,
    missingInputsRu: ["однолинейная схема и категория надежности", "условия подключения и допуски", "трасса, точки подключения и испытания"],
  },
  {
    code: "structural_demolition",
    level: "regulated",
    patterns: [/несущ|load[-\s]?bearing/i, /демонтаж.*стен|снос.*стен|structural\s*demolition/i],
    noteRu: REGULATED_NOTE,
    missingInputsRu: ["обследование конструктора", "схема временного усиления или подпорок", "согласование демонтажа"],
  },
  {
    code: "height_facade_roof",
    level: "regulated",
    patterns: [/высотн|на\s+высот|фасад.*остекл|остекл.*фасад|кровл|крыша|roof|working\s+at\s+height/i],
    noteRu: REGULATED_NOTE,
    missingInputsRu: ["план доступа и страховки", "ветровые ограничения и зона работ", "проект креплений или узлов"],
  },
  {
    code: "hydraulic_bridge_tunnel",
    level: "regulated",
    patterns: [/дамб|плотин|гидротех|мост|тоннел|тоннель|bridge|tunnel|dam/i],
    noteRu: REGULATED_NOTE,
    missingInputsRu: ["геология/гидрология и расчетная схема", "проект производства работ", "требования инспекции и приемки"],
  },
  {
    code: "road_traffic",
    level: "elevated",
    patterns: [/дорог|асфальт|проезж|road|pavement/i],
    noteRu: SPECIALIST_NOTE,
    missingInputsRu: ["геодезия и продольный профиль", "категория дороги и схема движения на период работ", "основание, водоотвод и требования приемки"],
  },
  {
    code: "external_underground_networks",
    level: "elevated",
    patterns: [/водоснаб|канализац|наружн.*сет|пнд|труб|колодц|sewer|water\s+supply|pipeline/i],
    noteRu: SPECIALIST_NOTE,
    missingInputsRu: ["трасса, глубина заложения и пересечения сетей", "точки подключения и требования эксплуатирующей организации", "испытания, промывка/дезинфекция и исполнительная схема"],
  },
  {
    code: "industrial_foundation",
    level: "elevated",
    patterns: [/фундамент.*оборуд|оборуд.*фундамент|анкера|industrial\s+equipment/i],
    noteRu: SPECIALIST_NOTE,
    missingInputsRu: ["нагрузки оборудования", "схема анкеров", "марка бетона и армирование"],
  },
  {
    code: "diamond_drilling",
    level: "elevated",
    patterns: [/алмазн.*бур|бурени|сверлен|diamond\s+drill/i],
    noteRu: SPECIALIST_NOTE,
    missingInputsRu: ["материал и армирование основания", "точки отверстий и допуск по диаметру", "наличие скрытых инженерных сетей"],
  },
  {
    code: "fencing_site_work",
    level: "elevated",
    patterns: [/забор|огражден|огражден|профлист|профнастил|fenc/i],
    noteRu: SPECIALIST_NOTE,
    missingInputsRu: ["грунт и глубина бетонирования столбов", "ворота/калитка и фурнитура", "рельеф и разметка линии ограждения"],
  },
];

function strongerLevel(left: ProfessionalBoqRiskLevel, right: ProfessionalBoqRiskLevel): ProfessionalBoqRiskLevel {
  const rank: Record<ProfessionalBoqRiskLevel, number> = { standard: 0, elevated: 1, regulated: 2 };
  return rank[right] > rank[left] ? right : left;
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function buildProfessionalBoqRiskPolicy(input: {
  prompt: string;
  repairType?: string | null;
  selectedWorkKey?: string | null;
}): ProfessionalBoqRiskPolicy {
  const text = [input.prompt, input.repairType, input.selectedWorkKey].filter(Boolean).join(" ");
  const matched = RISK_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text)));
  const riskLevel = matched.reduce<ProfessionalBoqRiskLevel>(
    (level, rule) => strongerLevel(level, rule.level),
    "standard",
  );
  const fallbackNote = riskLevel === "standard"
    ? STANDARD_NOTE
    : riskLevel === "regulated"
      ? REGULATED_NOTE
      : SPECIALIST_NOTE;
  return {
    riskLevel,
    riskCodes: matched.map((rule) => rule.code),
    summaryNoteRu: matched.find((rule) => rule.level === riskLevel)?.noteRu ?? fallbackNote,
    publicNotesRu: unique(matched.length > 0 ? matched.map((rule) => rule.noteRu) : [STANDARD_NOTE]),
    missingInputsRu: unique(matched.flatMap((rule) => rule.missingInputsRu)),
    requiresSpecialist: riskLevel !== "standard",
  };
}
