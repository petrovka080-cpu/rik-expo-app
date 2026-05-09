import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(__dirname, "..", "..");

const readRepoFile = (relativePath: string): string =>
  readFileSync(join(repoRoot, relativePath), "utf8");

const selectedSourceFiles = [
  "src/screens/buyer/components/BuyerItemRow.tsx",
  "src/screens/buyer/BuyerSubcontractTab.tsx",
  "src/screens/buyer/buyerSubcontractForm.model.ts",
  "src/components/foreman/CalcModal.tsx",
  "src/components/foreman/useCalcFields.ts",
  "src/components/foreman/WorkTypePicker.tsx",
  "src/components/map/MapScreen.tsx",
] as const;

const weakCastPatterns = [
  { label: "as any", pattern: /\bas\s+any\b/ },
  { label: "as never", pattern: /\bas\s+never\b/ },
  { label: "unknown as", pattern: /\bunknown\s+as\b/ },
  { label: "@ts-ignore", pattern: /@ts-ignore/ },
  { label: "@ts-expect-error", pattern: /@ts-expect-error/ },
  { label: "director reject optional cast", pattern: /director_reject_(?:reason|note)\?:\s*unknown/ },
  { label: "last offer optional cast", pattern: /last_offer_(?:supplier|price)\?:\s*unknown/ },
  { label: "paged query cast", pattern: /as\s+unknown\s+as\s+Paged/ },
] as const;

describe("UI unsafe cast batch B rows/modals contract", () => {
  it("keeps selected row, modal, and map sources free of known weak casts", () => {
    const findings = selectedSourceFiles.flatMap((file) => {
      const source = readRepoFile(file);
      return weakCastPatterns
        .filter(({ pattern }) => pattern.test(source))
        .map(({ label }) => `${file}: ${label}`);
    });

    expect(findings).toEqual([]);
  });

  it("keeps BuyerItemRow optional supplier fields on the typed row contract", () => {
    const source = readRepoFile("src/screens/buyer/components/BuyerItemRow.tsx");

    expect(source).toContain("it.director_reject_reason");
    expect(source).toContain("it.director_reject_note");
    expect(source).toContain("it.last_offer_supplier");
    expect(source).toContain("it.last_offer_price");
  });

  it("keeps BuyerSubcontractTab contractor attach and select payloads typed without casts", () => {
    const source = readRepoFile("src/screens/buyer/BuyerSubcontractTab.tsx");

    expect(source).toContain("toBuyerSubcontractWorkMode(form.workMode)");
    expect(source).toContain("toBuyerSubcontractPriceType(form.priceType)");
    expect(source).toContain("firstBuyerSubcontractContractorRow(direct.data)");
    expect(source).toContain("filterBuyerSubcontractContractorRows(fallback.data)");
    expect(source).toContain("buildContractorAttachPatch(cid)");
  });

  it("keeps CalcModal row sources behind guarded paged query adapters", () => {
    const calcFieldsSource = readRepoFile("src/components/foreman/useCalcFields.ts");
    const pickerSource = readRepoFile("src/components/foreman/WorkTypePicker.tsx");

    expect(calcFieldsSource).toContain("createGuardedPagedQuery");
    expect(calcFieldsSource).toContain("isRecordRow");
    expect(pickerSource).toContain("createGuardedPagedQuery");
    expect(pickerSource).toContain("isRecordRow");
  });
});
