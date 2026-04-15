import {
  ensureLeafletWebCss,
  LEAFLET_WEB_CSS_ID,
  LEAFLET_WEB_CSS_URL,
} from "./leafletWebCss";

describe("ensureLeafletWebCss", () => {
  it("injects leaflet css once into the current document", () => {
    const appended: Record<string, unknown>[] = [];
    const fakeDocument = {
      getElementById: jest.fn((id: string) =>
        appended.find((node) => node.id === id) ?? null,
      ),
      createElement: jest.fn(() => ({ id: "", rel: "", href: "" })),
      head: {
        appendChild: jest.fn((node: Record<string, unknown>) => {
          appended.push(node);
          return node;
        }),
      },
    } as unknown as Document;

    ensureLeafletWebCss(fakeDocument);
    ensureLeafletWebCss(fakeDocument);

    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({
      id: LEAFLET_WEB_CSS_ID,
      rel: "stylesheet",
      href: LEAFLET_WEB_CSS_URL,
    });
  });
});
