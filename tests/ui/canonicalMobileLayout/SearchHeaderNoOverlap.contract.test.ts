import * as fs from "fs";
import * as path from "path";

import { buildBuyerScreenViewModel } from "../../../src/screens/buyer/buyer.screen.model";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("buyer sticky search no overlap", () => {
  it("reserves the sticky search stack height before rendering cards", () => {
    const model = buildBuyerScreenViewModel({
      measuredHeaderMax: 180,
      kbOpen: false,
      isMobileEditorVisible: false,
      pickedIdsLength: 0,
      creating: false,
      tab: "inbox",
      isWeb: true,
      isDev: true,
    });
    const list = read("src/screens/buyer/components/BuyerMainList.tsx");

    expect(model.mainListHeaderPad).toBe(264);
    expect(list).toContain("APP_LAYOUT.filterStackGapPx");
    expect(list).toContain("APP_LAYOUT.scrollBottomPaddingPx");
  });
});
