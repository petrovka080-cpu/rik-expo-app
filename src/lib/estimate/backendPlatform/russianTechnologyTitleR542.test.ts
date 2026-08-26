import {
  CONCRETE_COMPONENT_TITLE_RU_R542,
  concreteParameterTitleRuR542,
  HVAC_COMPONENT_TITLE_RU_R542,
  localizeTechnologyTitleRu,
  waterMaterialVariantLabelRuR542,
} from "./russianTechnologyTitleR542";

const ENGLISH_PROSE = /\b(?:acceptance|anchor|concrete|design|factory|formwork|owner|project|repair|revision|scope|silos|submittals?|testing|temporary|works?)\b/iu;

describe("R5.4.2 public Russian technology labels", () => {
  it("covers the complete imported concrete and HVAC component dictionaries", () => {
    expect(Object.keys(CONCRETE_COMPONENT_TITLE_RU_R542)).toHaveLength(347);
    expect(Object.keys(HVAC_COMPONENT_TITLE_RU_R542)).toHaveLength(81);
    for (const title of [
      ...Object.values(CONCRETE_COMPONENT_TITLE_RU_R542),
      ...Object.values(HVAC_COMPONENT_TITLE_RU_R542),
    ]) {
      expect(title).toMatch(/[А-Яа-яЁё]/u);
      expect(title).not.toMatch(ENGLISH_PROSE);
    }
  });

  it("localizes component suffixes and machine parameter identifiers", () => {
    expect(localizeTechnologyTitleRu("выполнение silos")).toBe("выполнение силосные сооружения");
    expect(localizeTechnologyTitleRu("Проектное количество: заморозка project basis и revision"))
      .toBe("Проектное количество: фиксация исходных проектных данных и редакции");
    expect(concreteParameterTitleRuR542("labor_norm", "temporary works design."))
      .toBe("Норма трудозатрат — проект временных конструкций");
    expect(concreteParameterTitleRuR542("delivery_distance_km"))
      .toBe("Расстояние доставки");
  });

  it("keeps enum identifiers immutable while returning Russian display labels", () => {
    expect(waterMaterialVariantLabelRuR542("FACTORY_PACKAGE"))
      .toBe("комплектная установка заводского изготовления");
    expect(waterMaterialVariantLabelRuR542("PUMP_DUTY_STANDBY"))
      .toBe("насос — основной и резервный агрегаты");
    expect(waterMaterialVariantLabelRuR542("UNRECOGNIZED_MACHINE_ID"))
      .toBe("UNRECOGNIZED_MACHINE_ID");
  });
});
