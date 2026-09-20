import { hasRequiredResourceToken } from "../../scripts/e2e/realEstimateAcceptanceTokens";

describe("real estimate resource-token reconciliation", () => {
  const visibleEstimate = [
    "Стальной прокат по КМ/КМД",
    "Высокопрочные болты и анкеры по узлам",
    "Контрольный обмер опорных поверхностей",
    "Сборка и сварка металлоконструкций",
    "Автокран для монтажа",
    "Проверка проектной топологии",
    "Технологическая привязка пожарной сигнализации",
    "Прокладка огнестойкого кабеля",
    "Водоотводная решётка",
    "ПНР лифтового оборудования",
  ].join("\n");

  it.each([
    "сталь / металлопрокат",
    "болты / анкера",
    "обмер / схема",
    "сварка / сборка",
    "кран / автовышка",
    "проектная привязка warning",
    "прокладка кабеля",
    "реш",
    "ПНР",
  ])("recognizes a present normative resource: %s", (token) => {
    expect(hasRequiredResourceToken(visibleEstimate, token)).toBe(true);
  });

  it.each([
    "бетон / раствор",
    "погружной насос",
    "испытание давлением",
  ])("does not invent an absent resource: %s", (token) => {
    expect(hasRequiredResourceToken(visibleEstimate, token)).toBe(false);
  });
});
