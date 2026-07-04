import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

const LIVE_CRITICAL_PROMPTS = [
  "капитальный ремонт квартиры 98 м² потолок 3 м 2 санузла",
  "кладка 400 м² газоблок 300 мм",
  "строительство дороги 1 км ширина 6 м асфальт",
  "водоснабжение села 5 км труба ПЭ100 d110",
  "дамба земляная 200 м высота 5 м",
  "ЛЭП 10 кВ 2 км шаг опор 50 м",
  "остекление высотного дома 5000 м²",
  "мансардная крыша 200 м² с 6 окнами металлочерепица утепление 200 мм",
  "ТЭЦ 100 МВт турбинный зал котельное отделение",
  "ГЭС 5 МВт деривационный канал 1 км",
  "мост 30 м 2 полосы свайное основание",
  "промышленный корпус 5000 м² металлокаркас",
];

describe("golden benchmark request estimate UI flow", () => {
  it("routes critical prompts to professional drafts with visible missing inputs", () => {
    const drafts = LIVE_CRITICAL_PROMPTS.map((prompt) => buildConsumerRepairAiDraft(prompt));

    expect(drafts.every((draft) => draft.repairType !== "repair")).toBe(true);
    expect(drafts.every((draft) => draft.items.length > 0)).toBe(true);
    expect(drafts.every((draft) => draft.missingData.length > 0)).toBe(true);
    expect(drafts.flatMap((draft) => draft.items).every((row) => String(row.source).toLowerCase() !== "generic_fallback")).toBe(true);
  });
});
