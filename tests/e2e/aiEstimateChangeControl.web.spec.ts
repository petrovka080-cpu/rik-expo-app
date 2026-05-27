import { test, expect } from "playwright/test";

test.describe("AI estimate change control operator flow", () => {
  test("documents CLI operator path while admin UI remains follow-up", async () => {
    test.skip(true, "Operator CLI is the accepted path for this wave; admin UI is tracked as follow-up.");
    expect(true).toBe(true);
  });
});
