import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - audit log", () => {
  it("writes audit entries for lifecycle transitions", () => {
    const source = changeControlSource();
    expect(source).toContain("writeAudit(store, change.id, \"validated\"");
    expect(source).toContain("writeAudit(store, change.id, \"approved\"");
    expect(source).toContain("writeAudit(store, change.id, \"published\"");
    expect(source).toContain("writeAudit(store, change.id, \"rolled_back\"");
  });
});
