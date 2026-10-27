/** @jest-environment jsdom */

import {
  __resetPooledWebPdfFramesForTests,
  mountPooledWebPdfFrame,
} from "./pdfViewerWebFramePool";

describe("PDF web frame render pool", () => {
  afterEach(() => {
    __resetPooledWebPdfFramesForTests();
    document.body.replaceChildren();
  });

  it("reuses one loaded Blob iframe across immutable revision remounts", () => {
    const firstContainer = document.createElement("div");
    const secondContainer = document.createElement("div");
    document.body.append(firstContainer, secondContainer);
    const firstLoad = jest.fn();
    const first = mountPooledWebPdfFrame({
      container: firstContainer,
      uri: "blob:immutable-pdf",
      title: "Estimate",
      renderInstanceKey: "render-1",
      onLoad: firstLoad,
      onError: jest.fn(),
    });
    first.iframe.dispatchEvent(new Event("load"));
    expect(firstLoad).toHaveBeenCalledTimes(1);
    first.release();

    const secondLoad = jest.fn();
    const second = mountPooledWebPdfFrame({
      container: secondContainer,
      uri: "blob:immutable-pdf",
      title: "Estimate",
      renderInstanceKey: "render-2",
      onLoad: secondLoad,
      onError: jest.fn(),
    });

    expect(second.iframe).toBe(first.iframe);
    expect(second.reusedReadyFrame).toBe(true);
    expect(secondContainer.querySelectorAll("iframe")).toHaveLength(1);
    second.release();
  });

  it("enforces a three-frame LRU maximum and releases an evicted iframe", () => {
    const mounts = ["one", "two", "three"].map((id) => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const mount = mountPooledWebPdfFrame({
        container,
        uri: `blob:${id}`,
        title: id,
        renderInstanceKey: id,
        onLoad: jest.fn(),
        onError: jest.fn(),
      });
      mount.release();
      return mount;
    });
    const fourthContainer = document.createElement("div");
    document.body.appendChild(fourthContainer);
    const fourth = mountPooledWebPdfFrame({
      container: fourthContainer,
      uri: "blob:four",
      title: "four",
      renderInstanceKey: "four",
      onLoad: jest.fn(),
      onError: jest.fn(),
    });

    expect(mounts[0].iframe.isConnected).toBe(false);
    fourth.release();
    expect(
      document.querySelectorAll("[data-testid='pdf-viewer-web-frame-pool'] iframe"),
    ).toHaveLength(3);
  });
});
