import { requireExplicitRequestCompany } from "./requestCompanyScope";
describe("explicit new-request company intent", () => {
  it("preserves the exact explicitly selected UUID", () => {
    expect(requireExplicitRequestCompany(" 11111111-1111-1111-1111-111111111111 ")).toBe("11111111-1111-1111-1111-111111111111");
  });
  it.each([null, undefined, "", "first membership", { company_id: "A" }])("never guesses from %p", value => {
    expect(() => requireExplicitRequestCompany(value)).toThrow("EXPLICIT_COMPANY_REQUIRED");
  });
});
