import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import ts from "typescript";

type Json = Record<string, any>;

const MASTER_SHA256 =
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const ROOT = resolve(".");
const SOURCE = resolve("scripts/dev/buildR555InteractiveActionManifest.ts");
const MANIFEST = resolve(
  ".release-runtime/r555/manifests/INTERACTIVE_ACTION_MANIFEST.json",
);
const RECEIPT = resolve(
  ".release-runtime/r555/evidence/24A_R555_INTERACTIVE_ACTION_MANIFEST.json",
);

const INTERACTION_PROPS = [
  "onPress",
  "onLongPress",
  "onSubmitEditing",
  "onSubmit",
  "onEndReached",
  "onRefresh",
  "onRequestClose",
  "onSwipeableOpen",
  "renderRightActions",
  "onValueChange",
  "onChangeText",
  "onSelectionChange",
  "href",
] as const;

const MUTATION_SIGNAL =
  /add|apply|approve|attach|capture|change|close|confirm|create|delete|issue|login|logout|publish|recalculate|remove|reset|restore|retry|save|send|sign|submit|switch|toggle|update|upload|write/iu;
const ARTIFACT_SIGNAL = /pdf|procurement|purchase|photo|camera|document|attachment/iu;
const PAGINATION_SIGNAL = /load.?more|pagination|next|previous|end.?reached/iu;
const NAVIGATION_SIGNAL = /back|close|href|link|navigate|open|push|replace|route|tab/iu;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_ACTION_MANIFEST:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function sourceFiles(): string[] {
  const output = execFileSync(
    "rg",
    ["--files", "app", "src", "-g", "*.tsx"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return output
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean)
    .sort();
}

function attributeValue(attribute: ts.JsxAttribute, file: ts.SourceFile): string {
  const initializer = attribute.initializer;
  if (!initializer) return "true";
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (ts.isJsxExpression(initializer)) {
    return initializer.expression?.getText(file).trim() || "undefined";
  }
  return initializer.getText(file).trim();
}

function attributesOf(
  node: ts.JsxOpeningLikeElement,
  file: ts.SourceFile,
): { values: Record<string, string>; spreads: string[] } {
  const values: Record<string, string> = {};
  const spreads: string[] = [];
  for (const property of node.attributes.properties) {
    if (ts.isJsxAttribute(property)) {
      values[property.name.getText(file)] = attributeValue(property, file);
    } else {
      spreads.push(property.expression.getText(file));
    }
  }
  return { values, spreads };
}

function routeFor(path: string): string {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized.startsWith("app/")) {
    const route = normalized
      .replace(/^app\//u, "")
      .replace(/\.(tsx|ts)$/u, "")
      .split("/")
      .filter((part) => !/^\(.+\)$/u.test(part) && part !== "_layout")
      .map((part) => (part === "index" ? "" : part))
      .filter(Boolean)
      .join("/");
    return `/${route}`.replace(/\/$/u, "") || "/";
  }
  const domains = [
    "consumerRepair",
    "director",
    "foreman",
    "buyer",
    "accountant",
    "warehouse",
    "contractor",
    "security",
    "profile",
    "market",
    "chat",
    "ai",
  ];
  const domain = domains.find((candidate) => normalized.includes(`/${candidate}/`));
  return domain ? `component:${domain}` : `component:${normalized.split("/").at(-2) ?? "shared"}`;
}

function rolesFor(path: string): string[] {
  const normalized = path.toLowerCase();
  const officeRoles = [
    "director",
    "foreman",
    "buyer",
    "accountant",
    "warehouse",
    "contractor",
    "security",
    "estimator",
    "engineer",
  ];
  const exact = officeRoles.filter((role) => normalized.includes(role));
  if (exact.length > 0) return exact;
  if (normalized.includes("consumerrepair") || normalized.includes("request")) return ["consumer"];
  if (normalized.includes("auth")) return ["anonymous", "authenticated"];
  return ["authenticated"];
}

function selectorContract(
  attributes: Record<string, string>,
  sourceRef: string,
): {
  web: string;
  android: string;
  selector_quality: "test_id" | "accessibility_label" | "source_only";
} {
  const testId = attributes.testID;
  if (testId && testId !== "undefined") {
    return {
      web: `[data-testid=${JSON.stringify(testId)}]`,
      android: testId,
      selector_quality: "test_id",
    };
  }
  const label = attributes.accessibilityLabel;
  if (label && label !== "undefined") {
    return {
      web: `[aria-label=${JSON.stringify(label)}]`,
      android: `accessibilityLabel:${label}`,
      selector_quality: "accessibility_label",
    };
  }
  return {
    web: `source:${sourceRef}`,
    android: `source:${sourceRef}`,
    selector_quality: "source_only",
  };
}

function actionKind(tag: string, prop: string, signal: string): string {
  if (prop === "onSubmitEditing" || prop === "onSubmit") return "keyboard_submit";
  if (prop === "onEndReached" || PAGINATION_SIGNAL.test(signal)) return "pagination";
  if (prop === "onSwipeableOpen" || prop === "renderRightActions") return "swipe";
  if (prop === "onRequestClose") return "modal_close";
  if (prop === "href" || /Link/u.test(tag)) return "link_or_deep_link";
  if (/Touchable/iu.test(tag)) return "touchable";
  if (/Pressable/iu.test(tag)) return "pressable";
  if (/Button/iu.test(tag)) return ARTIFACT_SIGNAL.test(signal) ? "artifact_button" : "button";
  if (prop === "onChangeText" || prop === "onValueChange") return "input_change";
  return "interactive_component";
}

function backendOwner(path: string, signal: string, mutation: boolean): string {
  if (!mutation) return NAVIGATION_SIGNAL.test(signal) ? "client_router" : "client_ui_state";
  if (ARTIFACT_SIGNAL.test(signal)) return "canonical_estimate_artifact_backend";
  if (/consumerRepair|estimate/iu.test(path)) return "canonical_estimate_backend";
  const domain = rolesFor(path).find((role) => role !== "authenticated");
  return domain ? `${domain}_canonical_backend` : "screen_domain_backend";
}

function stateContracts(input: {
  handler: string;
  attributes: Record<string, string>;
  mutation: boolean;
  owner: string;
}): Json {
  const disabled = input.attributes.disabled;
  const busy =
    input.attributes.loading ??
    input.attributes.busy ??
    input.attributes.submitting ??
    (disabled && /loading|busy|pending|saving|submitting/iu.test(disabled) ? disabled : "none");
  return {
    visibility_precondition: "owning component and conditional branch are rendered",
    enabled_disabled_rule:
      disabled && disabled !== "undefined" ? `disabled_when:${disabled}` : "enabled_when_rendered",
    loading: busy === "none" ? "no explicit loading prop; handler must settle synchronously or own state" : `busy_when:${busy}`,
    success: input.mutation ? "backend-confirmed success state or resulting canonical content" : "requested UI/navigation state becomes visible",
    empty: input.mutation ? "explicit empty/no-result state; no false success" : "not_applicable_or_owning_screen_empty_state",
    error: input.mutation ? "Russian actionable error state; raw exception hidden" : "no silent no-op; access/config state is explicit",
    retry: /retry/iu.test(input.handler) ? "this action is the explicit bounded retry" : input.mutation ? "bounded explicit retry reuses command identity" : "repeat action is safe",
    timeout: input.mutation ? "central request timeout policy; infinite spinner forbidden" : "not_applicable_for_local_action",
    idempotency: input.mutation ? "stable server command identity required for retry" : "not_applicable_no_server_mutation",
    backend_owner: input.owner,
    expected_mutation: input.mutation ? "domain-scoped mutation owned by backend" : "none_or_local_navigation_state",
  };
}

const CRITICAL_ACTIONS: Json[] = [
  { id: "login_consumer", selectors: ["auth.login.local-consumer"], evidence: ["23E"] },
  { id: "logout_relogin", selectors: ["profile.logout.button", "auth.login.local-consumer"], evidence: ["23E"] },
  { id: "role_switch", selectors: ["local-developer-role-toggle", "local-developer-role-${role}"], evidence: ["23A"] },
  { id: "main_tabs", selectors: ["bottom-tab-office", "bottom-tab-request", "bottom-tab-market", "bottom-tab-chat", "bottom-tab-profile"], evidence: ["23B"] },
  { id: "work_search", selectors: ["consumer-repair-problem-input"], evidence: ["13", "21C", "22D"] },
  { id: "work_select", selectors: ["consumer-repair-work-suggestion-${index}"], evidence: ["13", "22D"] },
  { id: "delivery_contact", selectors: ["consumer-repair-city-input", "consumer-repair-address-input", "consumer-repair-phone-input"], evidence: [] },
  { id: "material", selectors: ["consumer-repair-add-manual-item", "request-estimate-add-from-catalog"], evidence: [] },
  { id: "photo", selectors: ["consumer-repair-add-photo", "consumer-repair-add-photo-draft"], evidence: [] },
  { id: "note", selectors: ["consumer-repair-add-custom-item"], evidence: [] },
  { id: "compile_estimate", selectors: ["consumer-repair-prepare-draft"], evidence: ["22B", "22C", "22D", "23G"] },
  { id: "parameters_recalculate", selectors: ["editable-param-batch-apply"], evidence: ["22B", "22C", "22D"] },
  { id: "history_reopen", selectors: ["consumer-repair-history-button", "consumer-repair-history-open"], evidence: ["22B", "22C", "22D"] },
  { id: "pdf", selectors: ["consumer-estimate-make-pdf"], evidence: ["22B", "22C", "22D"] },
  { id: "procurement", selectors: ["consumer-estimate-open-procurement"], evidence: ["22B", "22C", "22D"] },
  { id: "approve", selectors: ["consumer-repair-approve"], evidence: [] },
  { id: "delete_draft_confirm", selectors: ["consumer-repair-delete-draft", "consumer-repair-delete-confirm"], evidence: [] },
  { id: "cancel_delete", selectors: ["consumer-repair-delete-cancel"], evidence: [] },
  { id: "pagination", selectors: ["consumer-repair-history-load-more"], evidence: [] },
  { id: "auth_config_backend_recovery", selectors: ["protected-identity-retry", "config-recovery-retry", "consumer-repair-storage-try-again"], evidence: ["23E"] },
];

function main(): void {
  const actions: Json[] = [];
  const files = sourceFiles();
  const sourceCorpusParts: string[] = [];
  for (const path of files) {
    const absolute = resolve(path);
    const text = readFileSync(absolute, "utf8");
    sourceCorpusParts.push(text);
    const sourceFile = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sourceFile);
        const { values: attributes, spreads } = attributesOf(node, sourceFile);
        const interactionProp = INTERACTION_PROPS.find((prop) => attributes[prop] !== undefined);
        if (interactionProp) {
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          const sourceRef = `${path.replace(/\\/gu, "/")}:${position.line + 1}`;
          const handler = attributes[interactionProp] ?? interactionProp;
          const signal = `${tag} ${interactionProp} ${handler} ${attributes.testID ?? ""} ${attributes.accessibilityLabel ?? ""}`;
          const mutation = MUTATION_SIGNAL.test(signal) && !NAVIGATION_SIGNAL.test(signal);
          const owner = backendOwner(path, signal, mutation);
          const selectors = selectorContract(attributes, sourceRef);
          const rawId = `${sourceRef}|${tag}|${interactionProp}|${handler}|${attributes.testID ?? ""}`;
          actions.push({
            action_id: `action-${sha256(rawId).slice(0, 16)}`,
            action_kind: actionKind(tag, interactionProp, signal),
            route_screen: routeFor(path),
            roles: rolesFor(path),
            source: { path: path.replace(/\\/gu, "/"), line: position.line + 1, tag, interaction_prop: interactionProp, handler, spread_props: spreads },
            ...stateContracts({ handler, attributes, mutation, owner }),
            audit_event: `ui.action.${sha256(rawId).slice(0, 16)}`,
            web_selector: selectors.web,
            android_accessibility_or_test_id: selectors.android,
            selector_quality: selectors.selector_quality,
            evidence_cases: [`static-source:${sourceRef}`],
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  const testIdText = actions.map((action) => `${action.web_selector} ${action.android_accessibility_or_test_id}`).join("\n");
  const sourceCorpus = sourceCorpusParts.join("\n");
  const critical = CRITICAL_ACTIONS.map((entry) => {
    const selectorsPresent = entry.selectors.every((selector: string) => {
      const prefix = selector.split("${", 1)[0] ?? selector;
      return testIdText.includes(selector) || sourceCorpus.includes(selector) ||
        (prefix.length >= 8 && (testIdText.includes(prefix) || sourceCorpus.includes(prefix)));
    });
    return {
      ...entry,
      selectors_present_in_static_inventory: selectorsPresent,
      web_execution: entry.evidence.length > 0 ? "EVIDENCE_LINKED_REVIEW_REQUIRED" : "PENDING",
      android_execution: "PENDING_NORMAL_APK",
    };
  });
  const ids = actions.map((action) => action.action_id);
  const selectorQuality = {
    test_id: actions.filter((action) => action.selector_quality === "test_id").length,
    accessibility_label: actions.filter((action) => action.selector_quality === "accessibility_label").length,
    source_only: actions.filter((action) => action.selector_quality === "source_only").length,
  };
  const manifestBase = {
    schema: "r555.interactive-action-manifest.v1",
    generated_at_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    builder_source_sha256: sha256(readFileSync(SOURCE)),
    source_roots: ["app", "src"],
    source_files_scanned: files.length,
    action_denominator: actions.length,
    duplicate_action_ids: ids.length - new Set(ids).size,
    interaction_props: INTERACTION_PROPS,
    selector_quality: selectorQuality,
    required_contract_fields: [
      "route_screen", "roles", "visibility_precondition", "enabled_disabled_rule",
      "loading", "success", "empty", "error", "retry", "timeout", "idempotency",
      "backend_owner", "expected_mutation", "audit_event", "web_selector",
      "android_accessibility_or_test_id", "evidence_cases",
    ],
    critical_actions: {
      denominator: critical.length,
      static_selectors_present: critical.filter((entry) => entry.selectors_present_in_static_inventory).length,
      web_terminal_green: 0,
      android_terminal_green: 0,
      status: "GLOBAL_RED_PENDING_DYNAMIC_WEB_ANDROID_ACTION_EVIDENCE",
      items: critical,
    },
    actions,
  };
  invariant(actions.length > 0, "ZERO_ACTIONS");
  invariant(manifestBase.duplicate_action_ids === 0, "DUPLICATE_ACTION_IDS");
  atomicJson(MANIFEST, {
    ...manifestBase,
    payload_sha256: sha256(JSON.stringify(manifestBase)),
  });

  const receiptBase = {
    schema: "r555.interactive-action-manifest-receipt.v1",
    generated_at_utc: new Date().toISOString(),
    status: "GREEN_R555_INTERACTIVE_ACTION_MANIFEST_INVENTORY_BUILT_DYNAMIC_EVIDENCE_PENDING",
    master_sha256: MASTER_SHA256,
    builder_source_sha256: sha256(readFileSync(SOURCE)),
    manifest_sha256: sha256(readFileSync(MANIFEST)),
    source_files_scanned: files.length,
    action_denominator: actions.length,
    selector_quality: selectorQuality,
    critical_action_denominator: critical.length,
    critical_static_selectors_present: critical.filter((entry) => entry.selectors_present_in_static_inventory).length,
    critical_web_terminal_green: 0,
    critical_android_terminal_green: 0,
    dynamic_execution_status: "GLOBAL_RED_PENDING_WEB_ANDROID",
    scope: { local_only: true, production_accessed: false, deployed: false, merged: false, released: false, ota: false },
  };
  atomicJson(RECEIPT, {
    ...receiptBase,
    payload_sha256: sha256(JSON.stringify(receiptBase)),
  });
  process.stdout.write(`${JSON.stringify({
    status: receiptBase.status,
    source_files: files.length,
    actions: actions.length,
    selectors: selectorQuality,
    critical_static: `${receiptBase.critical_static_selectors_present}/${critical.length}`,
    dynamic: receiptBase.dynamic_execution_status,
  })}\n`);
}

main();
