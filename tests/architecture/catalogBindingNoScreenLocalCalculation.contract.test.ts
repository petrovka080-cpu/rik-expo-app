import { readProjectFile } from "./catalogBindingArchitectureTestHelpers";

function readMethodBody(source: string, methodName: string): string {
  const start = source.indexOf(`private ${methodName} =`);
  expect(start).toBeGreaterThanOrEqual(0);
  const nextMethod = source.indexOf("\n  private ", start + 1);
  return source.slice(start, nextMethod > start ? nextMethod : source.length);
}

describe("catalog binding no screen-local calculation", () => {
  it("keeps catalog selection mutation in request state actions and screen-only delegates", () => {
    const screen = readProjectFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const actions = readProjectFile("src/features/consumerRepair/requestEstimateScreenActions.ts");
    const addCatalogItemBody = readMethodBody(screen, "addCatalogItem");

    expect(screen).not.toMatch(/calculateGlobalConstructionEstimate|concreteVolume|48\s*\*\s*0\.4|calculateEstimateInScreen/);
    expect(addCatalogItemBody).toContain("applyConsumerRepairCatalogItemSelection");
    expect(addCatalogItemBody).toContain("targetItemId: this.state.catalogPickerTargetItemId");
    expect(addCatalogItemBody).not.toContain("selectConsumerRepairRequestItemCatalogItem(");
    expect(addCatalogItemBody).not.toContain("addConsumerRepairRequestCatalogItem(");
    expect(addCatalogItemBody).not.toContain("mapPickerItemToCatalogItemForEstimate(");

    expect(actions).toContain("export function applyConsumerRepairCatalogItemSelection");
    expect(actions).toContain("selectConsumerRepairRequestItemCatalogItem({");
    expect(actions).toContain("itemId: params.targetItemId");
    expect(actions).toContain("addConsumerRepairRequestCatalogItem({");
    expect(actions).toContain("mapPickerItemToCatalogItemForEstimate(params.catalogItem)");
  });
});
