import { readFileSync } from "fs";
import { join } from "path";
import { styles } from "../../src/screens/buyer/BuyerSubcontractTab.styles";

const TAB_PATH = join(__dirname, "..", "..", "src", "screens", "buyer", "BuyerSubcontractTab.tsx");
const VIEW_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "buyer",
  "BuyerSubcontractTab.view.tsx",
);
const MODEL_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "buyer",
  "BuyerSubcontractTab.model.ts",
);
const DATA_MODEL_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "buyer",
  "useBuyerSubcontractDataModel.ts",
);
const EDITOR_STATE_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "buyer",
  "useBuyerSubcontractEditorState.ts",
);
const ACTIONS_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "buyer",
  "useBuyerSubcontractActions.ts",
);
const STYLES_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "buyer",
  "BuyerSubcontractTab.styles.ts",
);

describe("BuyerSubcontractTab decomposition", () => {
  const tabSource = readFileSync(TAB_PATH, "utf8");
  const viewSource = readFileSync(VIEW_PATH, "utf8");
  const modelSource = readFileSync(MODEL_PATH, "utf8");
  const dataModelSource = readFileSync(DATA_MODEL_PATH, "utf8");
  const editorStateSource = readFileSync(EDITOR_STATE_PATH, "utf8");
  const actionsSource = readFileSync(ACTIONS_PATH, "utf8");
  const stylesSource = readFileSync(STYLES_PATH, "utf8");

  it("keeps static styles in the dedicated typed boundary", () => {
    expect(tabSource).toContain('from "./BuyerSubcontractTab.view"');
    expect(viewSource).toContain('from "./BuyerSubcontractTab.styles"');
    expect(tabSource).not.toContain("StyleSheet.create({");
    expect(stylesSource).toContain("StyleSheet.create({");
  });

  it("keeps render-heavy primitives in the view boundary", () => {
    expect(viewSource).toContain("FlashList");
    expect(viewSource).toContain("SingleDatePickerSheet");
    expect(viewSource).toContain("SendPrimaryButton");
    expect(tabSource).not.toContain("FlashList");
    expect(tabSource).not.toContain("SingleDatePickerSheet");
    expect(tabSource).not.toContain("renderItem");
  });

  it("keeps the controller hook pressure below the previous tab baseline", () => {
    const hookCount = (tabSource.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g) || []).length;

    expect(hookCount).toBeLessThanOrEqual(12);
  });

  it("moves tab data, editor state, and actions into focused typed boundaries", () => {
    expect(tabSource).toContain('from "./useBuyerSubcontractDataModel"');
    expect(tabSource).toContain('from "./useBuyerSubcontractEditorState"');
    expect(tabSource).toContain('from "./useBuyerSubcontractActions"');
    expect(modelSource).toContain("buildBuyerSubcontractPatch");
    expect(dataModelSource).toContain("listForemanSubcontractsPage");
    expect(editorStateSource).toContain("buyerSubcontractToFormState");
    expect(actionsSource).toContain("createSubcontractDraftWithPatch");
  });

  it("keeps new tab boundaries free of direct provider calls", () => {
    const newBoundarySources = [
      ["BuyerSubcontractTab.model.ts", modelSource],
      ["useBuyerSubcontractDataModel.ts", dataModelSource],
      ["useBuyerSubcontractEditorState.ts", editorStateSource],
      ["useBuyerSubcontractActions.ts", actionsSource],
    ];
    const providerFindings = newBoundarySources.flatMap(([fileName, source]) =>
      /supabase|\.from\(|fetch\(/.test(source) ? [fileName] : [],
    );

    expect(providerFindings).toEqual([]);
  });

  it("keeps empty and loading panels inside the render-only view boundary", () => {
    expect(viewSource).toContain("ListFooterComponent");
    expect(viewSource).toContain("ListEmptyComponent");
    expect(tabSource).not.toContain("ListEmptyComponent");
  });

  it("preserves key style handles used by the tab", () => {
    expect(styles.createBtn).toBeTruthy();
    expect(styles.card).toBeTruthy();
    expect(styles.formHeader).toBeTruthy();
    expect(styles.input).toBeTruthy();
    expect(styles.emptyText).toBeTruthy();
  });
});
