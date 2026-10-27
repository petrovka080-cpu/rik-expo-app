export const LEAFLET_WEB_CSS_ID = "leaflet-css-cdn";
export const LEAFLET_WEB_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

type LeafletCssLink = {
  id: string;
  rel: string;
  href: string;
};

export type LeafletCssDocument<
  TLink extends LeafletCssLink = LeafletCssLink,
> = {
  getElementById(id: string): unknown | null;
  createElement(tagName: "link"): TLink;
  head: {
    appendChild(node: TLink): unknown;
  };
};

const browserLeafletCssDocument = (): LeafletCssDocument<HTMLLinkElement> => ({
  getElementById: (id) => document.getElementById(id),
  createElement: () => document.createElement("link"),
  head: {
    appendChild: (node) => document.head.appendChild(node),
  },
});

function injectLeafletWebCss<TLink extends LeafletCssLink>(
  doc: LeafletCssDocument<TLink>,
): void {
  if (doc.getElementById(LEAFLET_WEB_CSS_ID)) return;

  const link = doc.createElement("link");
  link.id = LEAFLET_WEB_CSS_ID;
  link.rel = "stylesheet";
  link.href = LEAFLET_WEB_CSS_URL;
  doc.head.appendChild(link);
}

export function ensureLeafletWebCss(doc?: LeafletCssDocument): void {
  if (doc) {
    injectLeafletWebCss(doc);
    return;
  }
  injectLeafletWebCss(browserLeafletCssDocument());
}
