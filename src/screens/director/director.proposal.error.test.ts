import { errText } from "./director.proposal";

describe("director proposal error text", () => {
  it("uses Error.message when available", () => {
    expect(errText(new Error("approve failed"))).toBe("approve failed");
  });

  it("uses Supabase object message instead of rendering [object Object]", () => {
    expect(
      errText({
        code: "42883",
        message: "No function matches the given name and argument types",
        details: "director_approve_min_auto(text)",
      }),
    ).toBe("No function matches the given name and argument types");
  });

  it("falls back to code, details and hint for object-shaped errors without message", () => {
    expect(
      errText({
        code: "42501",
        details: "contractor",
        hint: "forbidden actor role",
      }),
    ).toBe("42501: contractor: forbidden actor role");
  });
});
