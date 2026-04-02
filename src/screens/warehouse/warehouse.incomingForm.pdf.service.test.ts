import { shapeWarehouseIncomingFormPdfPayload } from "./warehouse.incomingForm.pdf.service";

describe("warehouse.incomingForm.pdf.service", () => {
  it("keeps null lines payload on the safe empty-array fallback", () => {
    const result = shapeWarehouseIncomingFormPdfPayload({
      incoming: { incoming_id: "inc-1" },
      lines: null as never,
      matNameByCode: {},
      orgName: "GOX",
      warehouseName: "Main Warehouse",
    });

    expect(result.lines).toEqual([]);
  });

  it("fails in a controlled way when lines payload is truthy but not an array", () => {
    expect(() =>
      shapeWarehouseIncomingFormPdfPayload({
        incoming: { incoming_id: "inc-1" },
        lines: { bad: true } as never,
        matNameByCode: {},
        orgName: "GOX",
        warehouseName: "Main Warehouse",
      }),
    ).toThrow("Warehouse incoming PDF lines payload is invalid");
  });
});
