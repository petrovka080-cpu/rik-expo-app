import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function countHookCalls(source: string): number {
  return Array.from(source.matchAll(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g)).length;
}

describe("S_RUNTIME_06 BuyerItemRow editor model boundary", () => {
  it("moves editor state and effects out of BuyerItemRow without weakening the row contract", () => {
    const rowSource = readRepoFile("src/screens/buyer/components/BuyerItemRow.tsx");
    const modelSource = readRepoFile("src/screens/buyer/hooks/useBuyerItemEditorModel.ts");
    const originalHookCallSites = 43;
    const currentHookCallSites = countHookCalls(rowSource);

    expect(rowSource).toContain('import { useBuyerItemEditorModel } from "../hooks/useBuyerItemEditorModel";');
    expect(rowSource).toContain("} = useBuyerItemEditorModel({");
    expect(currentHookCallSites).toBeLessThanOrEqual(8);
    expect(originalHookCallSites - currentHookCallSites).toBeGreaterThanOrEqual(35);

    expect(rowSource).not.toContain("React.useState");
    expect(rowSource).not.toContain("React.useEffect");
    expect(rowSource).not.toContain("React.useMemo");
    expect(rowSource).not.toContain("useWindowDimensions");
    expect(rowSource).not.toContain("InteractionManager");

    expect(modelSource).toContain("export function useBuyerItemEditorModel");
    expect(modelSource).toContain("React.useState(String(m.price ?? \"\"))");
    expect(modelSource).toContain("React.useEffect");
    expect(modelSource).toContain("mergeNote(String(noteDraft ?? \"\"), noteAuto)");
    expect(modelSource).toContain("InteractionManager.runAfterInteractions");
  });

  it("preserves supplier picker, note, and list tuning behavior", () => {
    const rowSource = readRepoFile("src/screens/buyer/components/BuyerItemRow.tsx");
    const modelSource = readRepoFile("src/screens/buyer/hooks/useBuyerItemEditorModel.ts");

    expect(rowSource).toContain("INLINE_SUPPLIER_FLATLIST_TUNING");
    expect(rowSource).toContain("MODAL_SUPPLIER_FLATLIST_TUNING");
    expect(rowSource).toContain("keyExtractor={supplierKeyExtractor}");
    expect(rowSource).toContain("renderItem={renderInlineSupplierItem}");
    expect(rowSource).toContain("renderItem={renderModalSupplierItem}");
    expect(rowSource).toContain("export const BuyerItemRow = React.memo(BuyerItemRowInner");

    expect(modelSource).toContain("onSetSupplier(selectedLabel)");
    expect(modelSource).toContain("onPickSupplier(selectedLabel)");
    expect(modelSource).toContain("setSupplierQueryDraft(\"\")");
    expect(modelSource).toContain("isSupplierItemSelected");
  });

  it("keeps the editor model out of business transport and global store ownership", () => {
    const modelSource = readRepoFile("src/screens/buyer/hooks/useBuyerItemEditorModel.ts");

    expect(modelSource).not.toMatch(/from ["'][^"']*supabase/i);
    expect(modelSource).not.toMatch(/from ["'][^"']*catalog_api/i);
    expect(modelSource).not.toMatch(/create\(/);
    expect(modelSource).not.toMatch(/useBuyerStore|zustand/i);
  });
});
