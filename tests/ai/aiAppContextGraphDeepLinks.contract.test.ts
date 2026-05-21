import {
  getAiDeepLinkDefinition,
  makeAiSourceRefId,
} from "../../src/lib/ai/appContextGraph";
import { buildAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS deep links", () => {
  it("registers required internal routes and keeps PDF page/highlight metadata", () => {
    expect(getAiDeepLinkDefinition("procurement_request").buildRoute("req-124").route).toBe("/request/[id]");
    expect(getAiDeepLinkDefinition("warehouse_issue").buildRoute("issue-88").route).toBe("/office/warehouse");
    expect(getAiDeepLinkDefinition("payment").buildRoute("pay-77").route).toBe("/office/accountant");
    expect(getAiDeepLinkDefinition("work").buildRoute("work-gkl-1").route).toBe("/office/foreman");
    expect(getAiDeepLinkDefinition("marketplace_product").buildRoute("mp-gkl").route).toBe("/product/[id]");

    const graph = buildAiAppContextGraphFixture();
    const pdf = graph.sourceRefs.find((ref) => ref.id === makeAiSourceRefId("pdf_document", "pdf-45"));
    expect(pdf?.appLink?.route).toBe("/pdf-viewer");
    expect(pdf?.appLink?.page).toBe(1);
    expect(pdf?.appLink?.highlightText).toBe("125 000 KGS");
  });
});
