import fs from "fs";
import path from "path";

import { isCorruptedText, normalizeRuText } from "../text/encoding";

const viewerPath = path.join(process.cwd(), "app/pdf-viewer.tsx");
const source = fs.readFileSync(viewerPath, "utf8");

describe("PDF viewer text encoding", () => {
  it("keeps the PDF viewer handoff and loading copy readable", () => {
    const expectedLabels = [
      "…",
      "Открывается...",
      "Документ открыт во внешнем PDF-приложении",
      "Вернитесь в приложение, когда закончите, или откройте документ ещё раз отсюда.",
      "Открыть ещё раз",
      "Поделиться",
    ];

    for (const label of expectedLabels) {
      expect(source).toContain(label);
      expect(isCorruptedText(label)).toBe(false);
      expect(normalizeRuText(label)).toBe(label);
    }
  });

  it("does not keep the previous mojibake literals in the viewer path", () => {
    const corruptedMarkers = [
      "вЂ¦",
      "РћС‚РєСЂС‹РІР°РµС‚СЃСЏ",
      "Р”РѕРєСѓРјРµРЅС‚",
      "Р’РµСЂРЅРёС‚РµСЃСЊ",
      "РџРѕРґРµР»РёС‚СЊСЃСЏ",
    ];

    for (const marker of corruptedMarkers) {
      expect(source).not.toContain(marker);
    }
  });
});
