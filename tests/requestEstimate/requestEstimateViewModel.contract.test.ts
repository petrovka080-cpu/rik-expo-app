import { foundationViewModel } from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate view model", () => {
  it("groups request draft positions into localized professional sections", () => {
    const vm = foundationViewModel();
    expect(vm?.title).toBe("ленточный фундамент");
    expect(vm?.summary).toContain("Ленточный фундамент");
    expect(vm?.sections.map((section) => section.title)).toEqual(expect.arrayContaining(["Материалы", "Работы", "Оборудование / доставка"]));
  });
});
