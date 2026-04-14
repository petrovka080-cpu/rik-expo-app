import { esc } from "../api/pdf_director.format.ts";

type DocumentShellOptions = {
  title: string;
  styles: string;
  body: string;
  lang?: string;
};

export type PdfTableHeader = {
  label: string;
  className?: string;
};

type RenderTableOptions = {
  headers: PdfTableHeader[];
  rowsHtml: string;
  emptyMessage?: string;
  emptyColspan?: number;
};

export const joinHtml = (parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join("");

export const renderDocumentShell = ({
  title,
  styles,
  body,
  lang,
}: DocumentShellOptions) =>
  `<!doctype html><html${lang ? ` lang="${esc(lang)}"` : ""}><head><meta charset="utf-8"/>
  <title>${esc(title)}</title>
  <style>
${styles}
  </style></head><body>
${body}
</body></html>`;

export const renderBox = (content: string) => `<div class="box">${content}</div>`;

export const renderMuted = (text: string, style?: string) =>
  `<div class="muted"${style ? ` style="${style}"` : ""}>${esc(text)}</div>`;

export const renderPageFooter = () => `<div class="page-footer"></div>`;

export const renderLabelValueCell = (label: string, valueHtml: string) =>
  `<div class="cell"><div class="lbl">${esc(label)}</div><div class="val">${valueHtml}</div></div>`;

export const renderInlineKpiRow = (label: string, valueHtml: string) =>
  `<div class="kpi"><div>${esc(label)}</div><div><b>${valueHtml}</b></div></div>`;

export const renderGridKpiCard = (label: string, valueHtml: string) =>
  `<div class="kpi"><div class="l">${esc(label)}</div><div class="v">${valueHtml}</div></div>`;

export const renderTag = (text: string, className = "tag") =>
  `<span class="${className}">${esc(text)}</span>`;

export const renderTable = ({
  headers,
  rowsHtml,
  emptyMessage,
  emptyColspan,
}: RenderTableOptions) => {
  const body =
    rowsHtml ||
    (emptyMessage
      ? `<tr><td colspan="${String(emptyColspan ?? headers.length)}">${esc(emptyMessage)}</td></tr>`
      : "");

  return `<table>
            <thead>
              <tr>
                ${headers
                  .map((header) => `<th${header.className ? ` class="${header.className}"` : ""}>${esc(header.label)}</th>`)
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${body}
            </tbody>
          </table>`;
};

export const renderTitledBoxSection = (title: string, content: string) =>
  `<h2>${esc(title)}</h2>${renderBox(content)}`;
