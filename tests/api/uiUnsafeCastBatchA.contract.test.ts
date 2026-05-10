import fs from "fs";
import path from "path";

import { getAccountantErrorText } from "../../src/screens/accountant/helpers";
import { getContractorErrorMessage } from "../../src/screens/contractor/contractor.utils";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const UI_BATCH_A_FILES = [
  "src/screens/buyer/BuyerScreen.tsx",
  "src/screens/accountant/AccountantScreen.tsx",
  "src/screens/accountant/useAccountantScreenComposition.tsx",
  "src/screens/accountant/useAccountantKeyboard.ts",
  "src/screens/accountant/helpers.tsx",
  "src/screens/office/OfficeHubScreen.tsx",
  "src/screens/office/useOfficeHubScreenController.tsx",
  "src/screens/office/officeAccess.model.ts",
  "src/features/market/MarketHomeScreen.tsx",
  "src/screens/contractor/ContractorScreen.tsx",
  "src/screens/contractor/contractor.utils.ts",
] as const;

describe("UI unsafe cast batch A contract", () => {
  it("keeps priority god-component screens free of banned unsafe cast patterns", () => {
    for (const file of UI_BATCH_A_FILES) {
      expect(read(file)).not.toMatch(/as any|unknown as|@ts-ignore|@ts-expect-error/);
    }
  });

  it("locks the typed adapters that replaced previous UI casts", () => {
    const accountantScreen = read("src/screens/accountant/AccountantScreen.tsx");
    const accountantComposition = read("src/screens/accountant/useAccountantScreenComposition.tsx");
    const accountantKeyboard = read("src/screens/accountant/useAccountantKeyboard.ts");
    const contractorScreen = read("src/screens/contractor/ContractorScreen.tsx");
    const officeScreen = read("src/screens/office/OfficeHubScreen.tsx");
    const officeController = read("src/screens/office/useOfficeHubScreenController.tsx");
    const officeModel = read("src/screens/office/officeAccess.model.ts");

    expect(accountantScreen).toContain("useAccountantScreenComposition");
    expect(accountantComposition).toContain("getAccountantErrorText");
    expect(accountantScreen).not.toContain("e as { message");
    expect(accountantComposition).not.toContain("e as { message");
    expect(accountantScreen).not.toContain("cardScrollRef as");
    expect(accountantComposition).not.toContain("cardScrollRef as");
    expect(accountantKeyboard).toContain("RefObject<ScrollView | null>");
    expect(contractorScreen).toContain("getContractorErrorMessage");
    expect(contractorScreen).not.toContain("(e: any)");
    expect(officeModel).toContain("route: Href | null");
    expect(officeScreen).toContain("useOfficeHubScreenController");
    expect(officeController).toContain("router.push(card.route);");
    expect(officeScreen).not.toContain("router.push(card.route as");
    expect(officeController).not.toContain("router.push(card.route as");
  });

  it("preserves typed UI error text semantics without untyped callback casts", () => {
    expect(
      getAccountantErrorText({
        message: "primary",
        error_description: "description",
        details: "details",
      }),
    ).toBe("primary");
    expect(getAccountantErrorText({ details: "details" })).toBe("details");
    expect(getAccountantErrorText({ message: 404 })).toBe("404");

    expect(
      getContractorErrorMessage({
        message: "",
        error_description: "description",
        hint: "hint",
      }),
    ).toBe("description");
    expect(getContractorErrorMessage({ hint: "hint" })).toBe("hint");
    expect(getContractorErrorMessage(0)).toBe(
      "\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430",
    );
  });
});
