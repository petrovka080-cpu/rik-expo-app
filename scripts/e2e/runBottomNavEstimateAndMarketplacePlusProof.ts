import * as fs from "fs";
import * as path from "path";

const artifactsDir = path.resolve(process.cwd(), "artifacts");

function writeArtifact(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const tabs = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");
  const navRow = tabs.slice(
    tabs.indexOf("{renderTab(BOTTOM_NAV_ITEMS[0])}"),
    tabs.indexOf("{showAssistantFab"),
  );
  const order = [
    tabs.indexOf('label: "Офис"'),
    tabs.indexOf('label: "Смета"'),
    tabs.indexOf('label: "Маркет"'),
    tabs.indexOf('label: "Чат"'),
    tabs.indexOf('label: "Профиль"'),
  ];
  const renderOrder = [
    navRow.indexOf("{renderTab(BOTTOM_NAV_ITEMS[0])}"),
    navRow.indexOf("{renderTab(BOTTOM_NAV_ITEMS[1])}"),
    navRow.indexOf("{renderTab(BOTTOM_NAV_ITEMS[2])}"),
    navRow.indexOf('testID="bottom-nav-marketplace-add"'),
    navRow.indexOf("{renderTab(BOTTOM_NAV_ITEMS[3])}"),
    navRow.indexOf("{renderTab(BOTTOM_NAV_ITEMS[4])}"),
  ];
  const trace = {
    bottom_nav_order: "Офис / Смета / Маркет / ＋ / Чат / Профиль",
    all_labels_found: order.every((index) => index >= 0),
    order_correct: renderOrder.every((index) => index >= 0) && renderOrder.every((index, position) => position === 0 || renderOrder[position - 1] < index),
    marketplace_plus_preserved: tabs.includes('testID="bottom-nav-marketplace-add"') && tabs.includes("＋"),
    marketplace_plus_after_market: renderOrder[2] < renderOrder[3],
    duplicate_plus_found: (tabs.match(/testID="bottom-nav-marketplace-add"/g) ?? []).length !== 1,
    raw_request_index_visible: tabs.includes("request/index</Text>"),
    raw_add_index_visible: tabs.includes("add/index"),
  };
  writeArtifact("S_AI_ESTIMATE_TO_PDF_bottom_nav_trace.json", trace);
  if (!trace.all_labels_found || !trace.order_correct || !trace.marketplace_plus_preserved || !trace.marketplace_plus_after_market) {
    throw new Error(`Bottom nav estimate/plus proof failed: ${JSON.stringify(trace)}`);
  }
  if (trace.duplicate_plus_found || trace.raw_request_index_visible || trace.raw_add_index_visible) {
    throw new Error(`Bottom nav duplicate/raw route proof failed: ${JSON.stringify(trace)}`);
  }
  console.log("GREEN_BOTTOM_NAV_ESTIMATE_MARKETPLACE_PLUS_READY");
}

main();
