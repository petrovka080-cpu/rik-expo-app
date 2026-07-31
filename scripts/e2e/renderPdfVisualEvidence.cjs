const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createCanvas } = require("@napi-rs/canvas");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function longestRuns(imageData, width, height) {
  const isInk = (offset) => {
    const alpha = imageData[offset + 3];
    return alpha > 0 && (
      imageData[offset] < 245 ||
      imageData[offset + 1] < 245 ||
      imageData[offset + 2] < 245
    );
  };
  let nonWhitePixels = 0;
  let horizontalLineRows = 0;
  let verticalLineColumns = 0;

  for (let y = 0; y < height; y += 1) {
    let currentRun = 0;
    let longestRun = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (isInk(offset)) {
        nonWhitePixels += 1;
        currentRun += 1;
        longestRun = Math.max(longestRun, currentRun);
      } else {
        currentRun = 0;
      }
    }
    if (longestRun >= width * 0.45) horizontalLineRows += 1;
  }

  for (let x = 0; x < width; x += 1) {
    let currentRun = 0;
    let longestRun = 0;
    for (let y = 0; y < height; y += 1) {
      const offset = (y * width + x) * 4;
      if (isInk(offset)) {
        currentRun += 1;
        longestRun = Math.max(longestRun, currentRun);
      } else {
        currentRun = 0;
      }
    }
    if (longestRun >= height * 0.04) verticalLineColumns += 1;
  }

  return { nonWhitePixels, horizontalLineRows, verticalLineColumns };
}

async function main() {
  const [pdfPath, pngPath, resultPath] = process.argv.slice(2);
  if (!pdfPath || !pngPath || !resultPath) {
    throw new Error("renderPdfVisualEvidence requires pdf, png, and result paths");
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const document = await pdfjs.getDocument({
    data,
    disableWorker: true,
    useSystemFonts: true,
  }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1.35 });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  const [operatorList, textContent] = await Promise.all([
    page.getOperatorList(),
    page.getTextContent(),
    page.render({ canvasContext: context, viewport }).promise,
  ]);
  const png = canvas.toBuffer("image/png");
  fs.mkdirSync(path.dirname(pngPath), { recursive: true });
  fs.writeFileSync(pngPath, png);

  const pixels = longestRuns(
    context.getImageData(0, 0, width, height).data,
    width,
    height,
  );
  const pathOperatorCount = operatorList.fnArray.filter((operator) =>
    operator === pdfjs.OPS.constructPath ||
    operator === pdfjs.OPS.stroke ||
    operator === pdfjs.OPS.fillStroke
  ).length;
  const nonWhiteRatio = pixels.nonWhitePixels / (width * height);
  const result = {
    schema: "pdf-rendered-visual-evidence:v1",
    renderer: "pdfjs-dist+@napi-rs/canvas",
    page_number: 1,
    document_page_count: document.numPages,
    width,
    height,
    png_bytes: png.length,
    png_sha256: sha256(png),
    pdf_sha256: sha256(Buffer.from(data)),
    text_item_count: textContent.items.length,
    path_operator_count: pathOperatorCount,
    non_white_pixels: pixels.nonWhitePixels,
    non_white_ratio: Math.round(nonWhiteRatio * 1_000_000) / 1_000_000,
    horizontal_line_rows: pixels.horizontalLineRows,
    vertical_line_columns: pixels.verticalLineColumns,
    screenshot_path: pngPath.replace(/\\/g, "/"),
    accepted:
      png.length > 5_000 &&
      textContent.items.length > 20 &&
      pathOperatorCount > 10 &&
      nonWhiteRatio > 0.01 &&
      pixels.horizontalLineRows >= 2 &&
      pixels.verticalLineColumns >= 2,
  };
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await document.destroy();
}

main().catch((error) => {
  const resultPath = process.argv[4];
  if (resultPath) {
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    fs.writeFileSync(resultPath, `${JSON.stringify({
      schema: "pdf-rendered-visual-evidence:v1",
      accepted: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2)}\n`, "utf8");
  }
  process.exitCode = 1;
});
