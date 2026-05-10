import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function countHookCalls(source: string): number {
  return Array.from(source.matchAll(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g)).length;
}

describe("S_RUNTIME_07 CalcModal controller boundary", () => {
  it("keeps CalcModal as a thin render shell around the controller boundary", () => {
    const modalSource = readRepoFile("src/components/foreman/CalcModal.tsx");
    const controllerSource = readRepoFile("src/components/foreman/useCalcModalController.ts");
    const originalHookCallSites = 41;
    const currentHookCallSites = countHookCalls(modalSource);

    expect(modalSource).toContain('import { useCalcModalController } from "./useCalcModalController";');
    expect(modalSource).toContain("const { handleClose, contentProps } = useCalcModalController(props);");
    expect(modalSource).toContain("<CalcModalContent {...contentProps} />");
    expect(currentHookCallSites).toBeLessThanOrEqual(2);
    expect(originalHookCallSites - currentHookCallSites).toBeGreaterThanOrEqual(39);

    expect(controllerSource).toContain("export function useCalcModalController");
    expect(controllerSource).toContain("useSafeAreaInsets()");
    expect(controllerSource).toContain("useCalcFields(workType?.code)");
    expect(controllerSource).toContain("const calc = useCallback(async () =>");
    expect(controllerSource).toContain("onToggleSecondaryFields: handleToggleSecondaryFields");
  });

  it("preserves CalcModal behavior owners in the controller instead of moving them to content", () => {
    const controllerSource = readRepoFile("src/components/foreman/useCalcModalController.ts");
    const contentSource = readRepoFile("src/components/foreman/CalcModalContent.tsx");

    expect(controllerSource).toContain("Keyboard.dismiss()");
    expect(controllerSource).toContain("synchronizeCalcModalFields");
    expect(controllerSource).toContain("parseCalcFields");
    expect(controllerSource).toContain("runCalcWorkKitRpc");
    expect(controllerSource).toContain("redactSensitiveValue(error)");
    expect(contentSource).not.toContain("runCalcWorkKitRpc");
    expect(contentSource).not.toContain("useCalcFields(");
    expect(contentSource).toContain('import type { Field, BasisKey } from "./useCalcFields";');
  });

  it("keeps the controller out of direct Supabase calls and global store ownership", () => {
    const controllerSource = readRepoFile("src/components/foreman/useCalcModalController.ts");

    expect(controllerSource).not.toMatch(/from ["'][^"']*supabase/i);
    expect(controllerSource).not.toContain("supabase.rpc(");
    expect(controllerSource).not.toMatch(/create\(/);
    expect(controllerSource).not.toMatch(/zustand|useForemanStore/i);
  });
});
