import { buildRequestEstimateSourceGates } from "../../src/features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairRequestItem } from "../../src/lib/consumerRequests";

function need(
  parameterId: string,
  titleRu: string,
  sourceConfirmationRequired: boolean,
  valueSourceRole = sourceConfirmationRequired ? "NORM_REQUIRED_BUT_PROJECT_SELECTED" : "USER_MEASURED",
): ConsumerRepairRequestItem {
  return {
    id: `need:${parameterId}:${titleRu}`,
    requestDraftId: "source-gate-draft",
    itemType: "service",
    titleRu: "Позиция без количества",
    quantity: null,
    unit: "machine_hour",
    unitPrice: null,
    totalPrice: null,
    currency: "KGS",
    source: "reference_price_book",
    sourceParameters: {
      canonicalPreliminaryNeed: true,
      missingParameterRequirements: [{
        parameterId,
        titleRu,
        sourceConfirmationRequired,
        valueSourceRole,
      }],
    },
    editableByConsumer: true,
    createdAt: "2026-09-11T00:00:00.000Z",
  };
}

describe("consumer source-managed norm gates", () => {
  it("separates missing technical sources from ordinary customer inputs", () => {
    const gates = buildRequestEstimateSourceGates([
      need("machine_roller_productivity_m2_per_machine_hour", "Техническое название", true),
      need("machine_roller_productivity_m2_per_machine_hour", "Техническое название", true),
      need("acceptance_lot_m2", "Площадь приёмочной партии", true),
      need("system_transport_mass_t", "Транспортная масса элементов системы", true, "MANUFACTURER_CONFIRMED"),
      need("area_m2", "Площадь работ", false),
    ]);

    expect(gates).toEqual([
      expect.objectContaining({
        parameterId: "machine_roller_productivity_m2_per_machine_hour",
        title: "Производительность катка основного уплотнения",
        affectedPositionCount: 2,
      }),
      expect.objectContaining({
        parameterId: "acceptance_lot_m2",
        title: "Размер партии для контроля качества",
        affectedPositionCount: 1,
      }),
      expect.objectContaining({
        parameterId: "system_transport_mass_t",
        title: "Транспортная масса элементов системы",
        sourceRequirement: expect.stringContaining("спецификация изделия"),
        affectedPositionCount: 1,
      }),
    ]);
    expect(gates.every((gate) => gate.sourceRequirement.includes("Заказчик") && gate.sourceRequirement.includes("не угадывает")))
      .toBe(true);
  });
});
