import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office console noise contract", () => {
  it("keeps success observability structured without dev-console spam", () => {
    const observability = read("src/lib/observability/platformObservability.ts");
    const directorData = read("src/screens/director/director.data.ts");
    const directorRepository = read("src/screens/director/director.repository.ts");
    const smoke = read("scripts/e2e/runOfficeInstantOpenSmoke.ts");

    expect(observability).toContain("PRINT_SUCCESS_OBSERVABILITY");
    expect(observability).toContain('event.result === "error" || PRINT_SUCCESS_OBSERVABILITY');
    expect(observability).not.toContain('console.error("[platform.observability]", payload)');
    expect(observability).toContain('console.info("[platform.observability]", payload)');
    expect(directorData).toContain('process.env.EXPO_PUBLIC_RIK_DEBUG_FETCH_LOGS !== "1"');
    expect(directorRepository).toContain('process.env.EXPO_PUBLIC_RIK_DEBUG_FETCH_LOGS !== "1"');
    expect(smoke).toContain("consoleWarnCount");
    expect(smoke).toContain("consoleErrorCount");
    expect(smoke).toContain("successObservabilityConsoleSpam");
  });
});
