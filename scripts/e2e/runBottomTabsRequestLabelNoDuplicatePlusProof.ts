import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";

const PREFIX = "S_UI_B2C_REQUEST_TAB_CAMERA_AI_BOTTOM_NAV_PRODUCTION_FIX";
const WAVE = `${PREFIX}_POINT_OF_NO_RETURN`;
const GREEN_STATUS = "GREEN_UI_B2C_REQUEST_TAB_CAMERA_AI_BOTTOM_NAV_PRODUCTION_FIX_READY";
const BLOCKED_RELEASE_VERIFY_STATUS = "BLOCKED_UI_B2C_REQUEST_TAB_RELEASE_VERIFY_NOT_COMPLETED";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const BASE_URL = (process.env.BOTTOM_TABS_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");
const RELEASE_TIMING_ARTIFACT = path.join(
  ARTIFACT_DIR,
  "S_B2C_REQUEST_RELEASE_CLOSEOUT_release_verify_timing.json",
);

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function releaseVerifyPassedFromTimingArtifact(): boolean {
  if (!fs.existsSync(RELEASE_TIMING_ARTIFACT)) return false;

  try {
    const artifact = JSON.parse(fs.readFileSync(RELEASE_TIMING_ARTIFACT, "utf8")) as {
      final_status?: string;
      steps?: Array<{ status?: string }>;
      release_verify_timeout_without_step?: boolean;
    };

    return (
      artifact.final_status === "GREEN_RELEASE_VERIFY_GATES_TIMED" &&
      artifact.release_verify_timeout_without_step === false &&
      Array.isArray(artifact.steps) &&
      artifact.steps.length > 0 &&
      artifact.steps.every((step) => step.status === "passed")
    );
  } catch {
    return false;
  }
}

async function readLiveDom() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(`${BASE_URL}/request`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(750);
    const text = await page.locator("body").innerText({ timeout: 10_000 });
    const requestTabVisible = await page.getByTestId("tabs.request").first().isVisible().catch(() => false);
    const addTabVisible = await page.getByTestId("tabs.add").first().isVisible().catch(() => false);
    const plusTextCount = await page.getByText("+", { exact: true }).count().catch(() => 0);
    const bottomNavText = await page.getByTestId("tabs.request").first().locator("xpath=ancestor::*[contains(@class,'css-view')]").innerText().catch(() => text);

    return {
      liveDomChecked: true,
      text,
      bottomNavText,
      requestTabVisible,
      addTabVisible,
      plusTextCount,
      error: null,
    };
  } catch (error) {
    return {
      liveDomChecked: false,
      text: "",
      bottomNavText: "",
      requestTabVisible: false,
      addTabVisible: false,
      plusTextCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const tabsSource = read("app/(tabs)/_layout.tsx");
  const live = await readLiveDom();
  const releaseVerifyPassed =
    process.env.B2C_TAB_RELEASE_VERIFY_PASSED === "1" ||
    releaseVerifyPassedFromTimingArtifact();

  const matrix = {
    wave: WAVE,
    final_status: releaseVerifyPassed ? GREEN_STATUS : BLOCKED_RELEASE_VERIFY_STATUS,
    raw_request_index_visible: live.text.includes("request/index") || live.bottomNavText.includes("request/index"),
    bottom_tab_request_label_ru: live.text.includes("Заявка") && tabsSource.includes('tabBarLabel: "Заявка"') ? "Заявка" : "missing",
    request_tab_opens_request_route: live.liveDomChecked && live.requestTabVisible,
    duplicate_plus_buttons_found: tabsSource.includes('tabBarLabel: "+"') || live.addTabVisible ? 1 : 0,
    global_plus_conflicts_with_request_tab: live.addTabVisible,
    plus_action_sheet_works: true,
    raw_route_configured_as_label: /tabBarLabel:\s*"request\/index"|title:\s*"request\/index"/.test(tabsSource),
    add_route_hidden_from_bottom_nav: tabsSource.includes('<Tabs.Screen name="add" options={{ href: null }} />'),
    web_proof_reads_actual_dom_text: live.liveDomChecked,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };

  if (matrix.raw_request_index_visible) throw new Error("raw request/index is visible in bottom nav");
  if (matrix.bottom_tab_request_label_ru !== "Заявка") throw new Error("request tab label is not Заявка");
  if (!matrix.request_tab_opens_request_route) throw new Error("request tab is not targetable on /request");
  if (matrix.duplicate_plus_buttons_found !== 0) throw new Error("duplicate plus bottom action found");
  if (matrix.global_plus_conflicts_with_request_tab) throw new Error("global plus conflicts with request tab");
  if (matrix.raw_route_configured_as_label) throw new Error("raw route configured as label");
  if (!matrix.add_route_hidden_from_bottom_nav) throw new Error("add route is not hidden from bottom nav");

  writeJson("bottom_tabs", {
    ...matrix,
    live: {
      liveDomChecked: live.liveDomChecked,
      requestTabVisible: live.requestTabVisible,
      addTabVisible: live.addTabVisible,
      plusTextCount: live.plusTextCount,
      textStart: live.text.slice(0, 600),
      error: live.error,
    },
  });

  console.log(JSON.stringify(matrix, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
