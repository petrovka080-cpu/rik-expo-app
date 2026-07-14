import React from "react";

import { renderWebPortal } from "./createWebPortal.web";

const mockCreatePortal = jest.fn((element: React.ReactElement, _container: Element) => element);

jest.mock("react-dom", () => ({
  createPortal: (element: React.ReactElement, container: Element) =>
    mockCreatePortal(element, container),
}));

const originalDocument = globalThis.document;

describe("createWebPortal.web", () => {
  beforeEach(() => {
    mockCreatePortal.mockClear();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { body: {} },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  });

  it("portals modal content into document.body on web", () => {
    const element = <div data-testid="modal" />;

    expect(renderWebPortal(element)).toBe(element);
    expect(mockCreatePortal).toHaveBeenCalledTimes(1);
    expect(mockCreatePortal.mock.calls[0]?.[1]).toBe(globalThis.document.body);
  });
});
