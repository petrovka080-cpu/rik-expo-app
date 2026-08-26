import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { ConsumerRepairRequestStickyActions } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";
import { ConsumerRepairDeliveryFieldsCard } from "../../src/features/consumerRepair/ConsumerRepairMediaButtons";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  type ConsumerRepairAiDraft,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import {
  CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  type CanonicalParameter,
  type CanonicalParameterSession,
} from "../../src/lib/estimate/canonicalParameters";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) =>
      mockReact.createElement("MockIonicon", { name }),
  };
});

type JsonTree = ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>;
type BackendSessionScenario = "wet_zone" | "complete" | "missing" | "partial";

const BACKEND_REVISION_ID = "11111111-2222-4333-8444-555555555555";
const BACKEND_RELEASE_ID = "batch002-ui-contract-release";

function visibleText(tree: JsonTree): string {
  if (!tree) return "";
  if (Array.isArray(tree)) return tree.map(visibleText).join("\n");
  return (tree.children ?? [])
    .map((child) => (typeof child === "string" ? child : visibleText(child)))
    .join("\n");
}

function countJsonTestId(tree: JsonTree, testID: string): number {
  if (!tree) return 0;
  if (Array.isArray(tree)) {
    return tree.reduce((count, node) => count + countJsonTestId(node, testID), 0);
  }
  return (tree.props?.testID === testID ? 1 : 0) +
    (tree.children ?? []).reduce(
      (count, child) =>
        count + countJsonTestId(typeof child === "string" ? null : child, testID),
      0,
    );
}

function parameter(input: {
  parameterId: string;
  label: string;
  value: number | string | null;
  unit?: string | null;
  allowedValues?: readonly { value: string; label: string }[];
  displayOrder: number;
}): CanonicalParameter {
  const missing = input.value == null;
  return {
    parameterId: input.parameterId,
    label: input.label,
    description: input.label,
    value: input.value,
    valueType: typeof input.value === "string" || input.allowedValues ? "string" : "number",
    unit: input.unit ?? null,
    requiredLevel: "BLOCKING_REQUIRED",
    visibilityCondition: { kind: "ALWAYS" },
    validation: input.allowedValues ? { nonEmpty: true } : { min: 0 },
    allowedValues: input.allowedValues ?? [],
    source: missing ? "MISSING" : "ASSUMED",
    state: missing ? "BLOCKING_REQUIRED" : "ASSUMED",
    confidence: missing ? 0 : 0.7,
    assumption: missing ? null : "Backend baseline pending explicit confirmation.",
    affectsRows: [],
    affectsFormula: [],
    normativeSource: null,
    displayOrder: input.displayOrder,
    sourceText: "backend canonical parameter-session fixture",
    valid: true,
    validationIssues: [],
  };
}

function backendSession(scenario: BackendSessionScenario, draftId: string): CanonicalParameterSession {
  const values = scenario === "complete"
    ? { area_m2: 87, route_length_m: 154, outlet_count: 10, switch_count: 10, lighting_point_count: 8 }
    : scenario === "partial"
      ? { area_m2: 100, route_length_m: null, outlet_count: 10, switch_count: 10, lighting_point_count: null }
      : { area_m2: null, route_length_m: null, outlet_count: null, switch_count: null, lighting_point_count: null };
  const parameters = scenario === "wet_zone"
    ? [parameter({
        parameterId: "exterior_surface_kind",
        label: "Тип наружного покрытия",
        value: null,
        allowedValues: [{ value: "PARKING", label: "Парковка" }],
        displayOrder: 1,
      })]
    : [
        parameter({ parameterId: "area_m2", label: "Площадь", value: values.area_m2, unit: "m2", displayOrder: 1 }),
        parameter({ parameterId: "route_length_m", label: "Длина кабельной трассы", value: values.route_length_m, unit: "m", displayOrder: 2 }),
        parameter({ parameterId: "outlet_count", label: "Количество розеток", value: values.outlet_count, unit: "item", displayOrder: 3 }),
        parameter({ parameterId: "switch_count", label: "Количество выключателей", value: values.switch_count, unit: "item", displayOrder: 4 }),
        parameter({ parameterId: "lighting_point_count", label: "Количество точек освещения", value: values.lighting_point_count, unit: "item", displayOrder: 5 }),
      ];
  const missing = parameters.filter((entry) => entry.value == null).map((entry) => entry.parameterId);
  const assumed = parameters.filter((entry) => entry.source === "ASSUMED").map((entry) => entry.parameterId);
  return {
    coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
    sessionId: `backend-session:${BACKEND_REVISION_ID}`,
    draftId,
    revisionId: BACKEND_REVISION_ID,
    schemaId: `backend-schema:${scenario}`,
    schemaVersion: "definition:test",
    workPassportId: `backend-work:${scenario}`,
    canonicalWorkKey: `backend-work:${scenario}`,
    calculationVersion: "backend-compiler:test",
    status: missing.length > 0 ? "BLOCKING_REQUIRED" : "PRELIMINARY_WITH_ASSUMPTIONS",
    parameters,
    blockingMissingParameterIds: missing,
    contractMissingParameterIds: [],
    assumptionParameterIds: assumed,
    invalidParameterIds: [],
    fingerprint: `backend-fixture:${scenario}`,
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  };
}

function backendProjectedBundle(scenario: BackendSessionScenario): ConsumerRepairDraftBundle {
  __resetConsumerRepairRequestStoreForTests();
  const includeRows = scenario === "wet_zone" || scenario === "complete";
  const aiDraft: ConsumerRepairAiDraft = {
    titleRu: "Backend canonical estimate",
    summaryRu: "Immutable backend revision projection",
    repairType: "estimate",
    items: includeRows ? [{
      itemType: "work",
      titleRu: "Монтаж по backend revision",
      quantity: 1,
      unit: "item",
      currency: "KGS",
      source: "ai_suggested",
      sourceParameters: {
        canonicalBackendRevisionId: BACKEND_REVISION_ID,
        canonicalBackendReleaseId: BACKEND_RELEASE_ID,
        rowCode: "backend-work-row",
      },
    }] : [],
    missingData: [],
    dangerousDiyBlocked: false,
  };
  const created = createConsumerRepairRequestDraft({
    consumerUserId: "electrical-parameter-editor-ui",
    problemText: `backend canonical ${scenario}`,
    repairType: "estimate",
    city: "Bishkek",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    aiDraft,
  });
  return {
    ...created,
    canonicalParameterSession: backendSession(scenario, created.draft.id),
    durableHistorySummary: includeRows ? created.durableHistorySummary : {
      schemaVersion: "consumer_repair_durable_history_summary_v1",
      rowCount: 0,
      materialRowsCount: 0,
      workRowsCount: 0,
      totalPrice: null,
      currency: "KGS",
      sourceRevisionId: BACKEND_REVISION_ID,
      sourceReleaseId: BACKEND_RELEASE_ID,
      sourceSnapshotId: `backend-snapshot:${scenario}`,
      rowsHash: null,
      totalsHash: null,
      fullSnapshotHash: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      compactedAt: "2026-08-19T00:00:00.000Z",
      fullSnapshotAvailable: false,
    },
  };
}

function renderElectricalPanel(scenario: BackendSessionScenario) {
  const bundle = backendProjectedBundle(scenario);
  const noop = jest.fn();
  const onApplyParamBatch = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ConsumerRepairDraftPanel
        bundle={bundle}
        aiAnswerRu={null}
        onDecrease={noop}
        onIncrease={noop}
        onQuantityChange={noop}
        onUnitPriceChange={noop}
        onRemove={noop}
        onAddManual={noop}
        onAddCustom={noop}
        onApplyParamPatch={noop}
        onApplyParamBatch={onApplyParamBatch}
      />,
    );
  });
  if (renderer.root.findAllByProps({ testID: "request-estimate-parameter-panel" }).length === 0) {
    const toggle = renderer.root
      .findAllByProps({ testID: "request-estimate-parameters-toggle" })
      .find((node) => typeof node.props.onPress === "function");
    if (!toggle) throw new Error("BACKEND_PARAMETER_TOGGLE_MISSING");
    act(() => toggle.props.onPress());
  }
  return { renderer, bundle, onApplyParamBatch };
}

describe("backend-projected canonical parameter editor UI replacement contract", () => {
  it("formally retires the frontend compiler fixture in favor of a backend revision/session projection", () => {
    const bundle = backendProjectedBundle("complete");
    expect(bundle.items[0]?.sourceParameters).toMatchObject({
      canonicalBackendRevisionId: BACKEND_REVISION_ID,
      canonicalBackendReleaseId: BACKEND_RELEASE_ID,
    });
    expect(bundle.canonicalParameterSession?.revisionId).toBe(BACKEND_REVISION_ID);
  });

  it("commits an explicitly tapped required enum default even when display text is unchanged", () => {
    const { renderer, onApplyParamBatch } = renderElectricalPanel("wet_zone");
    expect(countJsonTestId(renderer.toJSON(), "request-estimate-missing-param-exterior_surface_kind")).toBe(1);
    const exactDefault = renderer.root.findByProps({
      testID: "editable-param-option-exterior_surface_kind-PARKING",
    });
    act(() => exactDefault.props.onPress());
    expect(countJsonTestId(renderer.toJSON(), "editable-param-dirty-exterior_surface_kind")).toBe(1);
    const apply = renderer.root.findByProps({ testID: "editable-param-batch-apply" });
    act(() => apply.props.onPress());
    expect(onApplyParamBatch).toHaveBeenCalledWith([
      { operation: "add_param", paramKey: "exterior_surface_kind", rawValue: "PARKING" },
    ]);
  });

  it("renders five separate editable backend parameters with visible values and assumptions", () => {
    const { renderer } = renderElectricalPanel("complete");
    const keys = ["area_m2", "route_length_m", "outlet_count", "switch_count", "lighting_point_count"];
    const tree = renderer.toJSON();
    keys.forEach((key) => expect(countJsonTestId(tree, `editable-param-chip-${key}`)).toBe(1));
    expect(countJsonTestId(tree, "request-estimate-assumed-parameters")).toBe(1);
    const text = visibleText(tree);
    expect(text).toMatch(/Площадь[\s\S]*87/u);
    expect(text).toMatch(/Длина кабельной трассы[\s\S]*154/u);
    expect(text).toMatch(/Количество розеток[\s\S]*10/u);
    expect(text).toMatch(/Количество выключателей[\s\S]*10/u);
    expect(text).toMatch(/Количество точек освещения[\s\S]*8/u);
  });

  it("preserves an unsaved parameter while a refreshed backend session changes fingerprint", () => {
    const bundle = backendProjectedBundle("complete");
    const noop = jest.fn();
    const onApplyParamBatch = jest.fn();
    const panel = (currentBundle: ConsumerRepairDraftBundle) => (
      <ConsumerRepairDraftPanel
        bundle={currentBundle}
        aiAnswerRu={null}
        onDecrease={noop}
        onIncrease={noop}
        onQuantityChange={noop}
        onUnitPriceChange={noop}
        onRemove={noop}
        onAddManual={noop}
        onAddCustom={noop}
        onApplyParamPatch={noop}
        onApplyParamBatch={onApplyParamBatch}
      />
    );
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(panel(bundle)); });
    const toggle = renderer.root.findAllByProps({ testID: "request-estimate-parameters-toggle" })
      .find((node) => typeof node.props.onPress === "function");
    if (!toggle) throw new Error("BACKEND_PARAMETER_TOGGLE_MISSING");
    act(() => toggle.props.onPress());
    const area = renderer.root.findByProps({ testID: "editable-param-chip-area_m2" });
    const input = area.findByProps({ testID: "editable-param-popover-input" });
    act(() => input.props.onChangeText("111"));
    expect(renderer.root.findAllByProps({ testID: "editable-param-batch-apply" }).length).toBeGreaterThan(0);

    const refreshed = {
      ...bundle,
      canonicalParameterSession: {
        ...bundle.canonicalParameterSession!,
        fingerprint: "backend-fixture:complete:refreshed",
        updatedAt: "2026-08-19T00:01:00.000Z",
      },
    };
    act(() => renderer.update(panel(refreshed)));
    const apply = renderer.root.findAllByProps({ testID: "editable-param-batch-apply" })
      .find((node) => typeof node.props.onPress === "function");
    if (!apply) throw new Error("BACKEND_PARAMETER_BATCH_APPLY_MISSING");
    act(() => apply.props.onPress());
    expect(onApplyParamBatch).toHaveBeenCalledWith([
      { operation: "update_param", paramKey: "area_m2", rawValue: "111" },
    ]);
  });

  it("shows concrete missing backend fields while calculation is blocked", () => {
    const { renderer, bundle } = renderElectricalPanel("missing");
    expect(bundle.items).toHaveLength(0);
    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    const tree = renderer.toJSON();
    ["area_m2", "route_length_m", "outlet_count", "switch_count", "lighting_point_count"]
      .forEach((key) => expect(countJsonTestId(tree, `request-estimate-missing-param-${key}`)).toBe(1));
    expect(countJsonTestId(tree, "estimate-draft-session-blocked")).toBe(0);
  });

  it("keeps approval visibly blocked until the backend session has every required field", () => {
    const bundle = backendProjectedBundle("missing");
    const noop = jest.fn();
    let actions!: TestRenderer.ReactTestRenderer;
    act(() => {
      actions = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot={false}
          approvalBlockedByEstimate={bundle.canonicalParameterSession?.status === "BLOCKING_REQUIRED"}
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onPrepareDraft={noop}
        />,
      );
    });
    expect(visibleText(actions.toJSON())).toContain("Сначала рассчитайте смету");
    expect(actions.root.findAllByProps({ testID: "consumer-repair-approve" })[0].props.disabled).toBe(true);
    expect(countJsonTestId(actions.toJSON(), "consumer-repair-delete-draft")).toBe(1);
    act(() => actions.unmount());
  });

  it("offers one explicit formation action for a new prompt over an existing backend draft", () => {
    const noop = jest.fn();
    let actions!: TestRenderer.ReactTestRenderer;
    act(() => {
      actions = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot={false}
          hasPendingPrompt
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onPrepareDraft={noop}
        />,
      );
    });
    expect(countJsonTestId(actions.toJSON(), "consumer-repair-prepare-draft")).toBe(1);
    expect(countJsonTestId(actions.toJSON(), "consumer-repair-approve")).toBe(0);
    act(() => actions.root.findAllByProps({ testID: "consumer-repair-prepare-draft" })[0].props.onPress());
    expect(noop).toHaveBeenCalledTimes(1);
    act(() => actions.unmount());
  });

  it("keeps every delivery field reachable without restoring a duplicate prompt composer", () => {
    const noop = jest.fn();
    let delivery!: TestRenderer.ReactTestRenderer;
    act(() => {
      delivery = TestRenderer.create(
        <ConsumerRepairDeliveryFieldsCard
          city=""
          addressText=""
          preferredTimeText=""
          contactPhone=""
          onCityChange={noop}
          onAddressTextChange={noop}
          onPreferredTimeTextChange={noop}
          onContactPhoneChange={noop}
        />,
      );
    });
    expect(countJsonTestId(delivery.toJSON(), "consumer-repair-delivery-card")).toBe(1);
    expect(countJsonTestId(delivery.toJSON(), "consumer-repair-address-input")).toBe(1);
    expect(countJsonTestId(delivery.toJSON(), "consumer-repair-phone-input")).toBe(1);
    expect(countJsonTestId(delivery.toJSON(), "consumer-repair-time-input")).toBe(1);
    act(() => delivery.unmount());
  });

  it("keeps partial backend inputs visible without inventing BOQ rows", () => {
    const { renderer, bundle } = renderElectricalPanel("partial");
    const tree = renderer.toJSON();
    expect(countJsonTestId(tree, "request-estimate-missing-parameter-summary")).toBe(1);
    expect(visibleText(tree)).toContain("Длина кабельной трассы");
    expect(bundle.canonicalParameterSession?.parameters.find(
      (entry) => entry.parameterId === "outlet_count",
    )?.value).toBe(10);
    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    expect(bundle.items).toHaveLength(0);
  });
});
