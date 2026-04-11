import { applyRootLayoutWebContainerStyle } from "./rootLayoutWebContainer";
import type { RootLayoutWebDocumentLike } from "./rootLayoutWebContainer";

describe("rootLayoutWebContainer", () => {
  it("applies stable scroll container styles to the web root", () => {
    const doc: RootLayoutWebDocumentLike = {
      documentElement: { style: {} },
      body: { style: {} },
      getElementById: jest.fn(() => ({ style: {} })),
    };

    const result = applyRootLayoutWebContainerStyle(doc);

    expect(result).toEqual({ ok: true, rootFound: true });
    expect(doc.documentElement.style.height).toBe("100%");
    expect(doc.body.style.height).toBe("100%");
    expect(doc.body.style.overflow).toBe("auto");
    expect(doc.getElementById).toHaveBeenCalledWith("root");
  });

  it("returns a typed failure instead of throwing or swallowing setup errors", () => {
    const result = applyRootLayoutWebContainerStyle({
      documentElement: { style: {} },
      body: null,
      getElementById: jest.fn(),
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        errorClass: "Error",
        errorMessage: expect.stringContaining("body.style"),
      }),
    );
  });

  it("keeps missing root non-fatal while reporting rootFound=false", () => {
    const result = applyRootLayoutWebContainerStyle({
      documentElement: { style: {} },
      body: { style: {} },
      getElementById: jest.fn(() => null),
    });

    expect(result).toEqual({ ok: true, rootFound: false });
  });
});
