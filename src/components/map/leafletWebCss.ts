export const LEAFLET_WEB_CSS_ID = "leaflet-css-cdn";
export const LEAFLET_WEB_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

export function ensureLeafletWebCss(doc: Document = document): void {
  if (doc.getElementById(LEAFLET_WEB_CSS_ID)) return;

  const link = doc.createElement("link");
  link.id = LEAFLET_WEB_CSS_ID;
  link.rel = "stylesheet";
  link.href = LEAFLET_WEB_CSS_URL;
  doc.head.appendChild(link);
}
