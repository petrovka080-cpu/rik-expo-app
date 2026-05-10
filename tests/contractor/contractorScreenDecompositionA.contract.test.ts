import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const countLines = (source: string): number => source.split("\n").length;
const countHookCalls = (source: string): number =>
  Array.from(source.matchAll(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g)).length;

describe("WAVE 16 contractor screen decomposition A", () => {
  const screen = read("src/screens/contractor/ContractorScreen.tsx");
  const container = read("src/screens/contractor/ContractorScreenContainer.tsx");
  const controller = read("src/screens/contractor/useContractorScreenController.tsx");
  const view = read("src/screens/contractor/ContractorScreenView.tsx");

  it("keeps ContractorScreen as a thin route shell", () => {
    expect(countLines(screen)).toBeLessThanOrEqual(40);
    expect(countHookCalls(screen)).toBe(0);
    expect(screen).toContain("ContractorScreenContainer");
    expect(screen).toContain("supabaseClient={supabase}");
    expect(screen).not.toContain("useContractorScreenState");
    expect(screen).not.toContain("useContractorHomeController");
    expect(screen).not.toContain("useContractorWorkModalController");
  });

  it("keeps lifecycle, selection, and actions in the typed controller", () => {
    expect(container).toContain("useContractorScreenController(props)");
    expect(container).toContain("<ContractorScreenView {...controller} />");

    expect(controller).toContain("useContractorScreenState");
    expect(controller).toContain("useContractorHomeController");
    expect(controller).toContain("useContractorProgressReliability");
    expect(controller).toContain("useContractorWorkModalController");
    expect(controller).toContain("useContractorActBuilderController");
    expect(controller).toContain("useContractorCards");
    expect(controller).toContain("setWorkModalMaterials: contractorProgress.setWorkModalMaterials");
  });

  it("keeps the extracted view render-only", () => {
    expect(countHookCalls(view)).toBe(0);
    expect(view).toContain("onCodeChange={setCode}");
    expect(view).toContain("onActivate={activateCode}");
    expect(view).toContain("data={contractorWorkCards}");
    expect(view).toContain("onRefresh={handleRefresh}");
    expect(view).toContain("onOpen={handleOpenUnifiedCard}");
  });

  it("does not add new provider calls or transport changes", () => {
    expect(controller).not.toContain('from "../../lib/supabaseClient"');
    expect(controller).not.toMatch(/\.(from|rpc)\s*\(/);
    expect(controller).not.toMatch(/\bfetch\s*\(/);
    expect(view).not.toContain("supabase");
    expect(view).not.toMatch(/\bfetch\s*\(/);
  });
});
