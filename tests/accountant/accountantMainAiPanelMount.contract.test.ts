import fs from "fs";
import path from "path";

describe("accountant.main AI panel mount", () => {
  it("mounts the prepared finance panel before the inbox rows", () => {
    const viewSource = fs.readFileSync(
      path.join(process.cwd(), "src/screens/accountant/components/AccountantScreenView.tsx"),
      "utf8",
    );
    const listSource = fs.readFileSync(
      path.join(process.cwd(), "src/screens/accountant/components/AccountantListSection.tsx"),
      "utf8",
    );

    expect(viewSource).toContain("AccountantMainAiPanel");
    expect(viewSource).toContain('from "./AccountantListSection"');
    expect(viewSource).not.toContain("features/ai/screens/accountant");
    expect(viewSource).toContain("inboxHeader={accountantAiPanel}");
    expect(listSource).toContain("ListHeaderComponent={isHistory ? historyHeader : inboxHeader ?? null}");
  });
});
