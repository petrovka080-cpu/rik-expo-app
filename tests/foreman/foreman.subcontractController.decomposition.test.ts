import { readFileSync } from "fs";
import { join } from "path";

describe("foreman subcontract controller decomposition audit", () => {
  const controllerSource = readFileSync(
    join(process.cwd(), "src", "screens", "foreman", "hooks", "useForemanSubcontractController.tsx"),
    "utf8",
  );

  it("keeps the controller wired through extracted owner-boundary modules", () => {
    expect(controllerSource).toContain("foreman.subcontractController.model");
    expect(controllerSource).toContain("foreman.subcontractController.guards");
    expect(controllerSource).toContain("foreman.subcontractController.effects");
    expect(controllerSource).toContain("foreman.subcontractController.telemetry");
    expect(controllerSource).toContain("deriveSubcontractControllerModel");
    expect(controllerSource).toContain("guardSendToDirector");
    expect(controllerSource).toContain("planSelectedSubcontractHydration");
    expect(controllerSource).toContain("getForemanSubcontractErrorMessage");
  });

  it("removes legacy inline helpers and silent catch from the controller owner", () => {
    expect(controllerSource).not.toContain("const patch = useMemo");
    expect(controllerSource).not.toContain("void patch");
    expect(controllerSource).not.toContain("getErrorMessage(");
    expect(controllerSource).not.toContain("resolveCodeFromDict(");
    expect(controllerSource).not.toContain("catch {");
  });
});
