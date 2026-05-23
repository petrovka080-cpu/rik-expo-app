import fs from "node:fs";
import path from "node:path";

const sourcePath = path.join(process.cwd(), "src", "screens", "accountant", "useAccountantPayActions.ts");

describe("accountant pay actions hook discipline", () => {
  it("does not suppress exhaustive-deps in payment callbacks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("react-hooks/exhaustive-deps");
    expect(source).not.toContain("TODO(P1): review deps");
    expect(source).toContain("const {");
    expect(source).toContain("afterPaymentSync");
    expect(source).toContain("setCurrentPaymentId");
    expect(source).not.toContain("}, [p]");
  });
});
