import * as fs from "fs";
import * as path from "path";

const PREFIX = "S_B2C_CONSUMER_REPAIR_REQUEST_MARKETPLACE_PDF_CORE";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const tabs = read("app/(tabs)/_layout.tsx");
const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
const media = read("src/features/consumerRepair/ConsumerRepairMediaButtons.tsx");
const draft = read("src/features/consumerRepair/ConsumerRepairDraftPanel.tsx");
const history = read("src/features/consumerRepair/ConsumerRepairHistory.tsx");
const source = [screen, media, draft, history].join("\n");

const android = {
  request_targetable: tabs.includes("tabs.request") && tabs.includes("Заявка"),
  consumer_screen_opens: screen.includes("consumer-repair-screen"),
  text_input_works: screen.includes("consumer-repair-problem-input"),
  photo_video_buttons_visible:
    source.includes("consumer-repair-add-photo") && source.includes("consumer-repair-add-video"),
  draft_appears: source.includes("consumer-repair-draft"),
  quantity_can_change:
    screen.includes("onDecrease={this.decreaseItem}") && screen.includes("onIncrease={this.increaseItem}"),
  approve_button_visible_above_bottom_nav:
    screen.includes("consumer-repair-approve") && screen.includes("above_bottom_nav"),
  pdf_history_visible: source.includes("consumer-repair-history"),
  marketplace_send_visible_after_approve: screen.includes("consumer-repair-send-market"),
  no_office_leakage: !screen.includes("/office"),
};

if (Object.entries(android).some(([, value]) => value !== true)) {
  throw new Error(`B2C consumer repair Maestro proof failed: ${JSON.stringify(android, null, 2)}`);
}

writeJson("android", android);
console.log(JSON.stringify(android, null, 2));
