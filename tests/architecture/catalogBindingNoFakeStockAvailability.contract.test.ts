import { listProjectFiles, readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding no fake stock availability", () => {
  it("does not invent stock, supplier, or availability values", () => {
    const offenders = listProjectFiles("src")
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        file.includes("/catalog/") ||
        file.includes("/catalogBinding/") ||
        file.includes("/consumerRepair/") ||
        file.includes("/consumerRequests/"),
      )
      .filter((file) => /const\s+fakeStock|const\s+fakeAvailability|const\s+fakeSupplier|const\s+fakeSources/i.test(readProjectFile(file)));
    expect(offenders).toEqual([]);
  });
});
