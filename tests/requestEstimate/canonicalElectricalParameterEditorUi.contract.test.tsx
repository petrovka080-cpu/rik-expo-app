import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";
import { RoadworksWaveAProductionRegistry } from "../../src/lib/estimate/v4/roadworks/roadworksWaveAProductionBinding";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) =>
      mockReact.createElement("MockIonicon", { name }),
  };
});

type JsonTree = ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>;

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
    return tree.reduce(
      (count, node) => count + countJsonTestId(node, testID),
      0,
    );
  }
  return (tree.props?.testID === testID ? 1 : 0) +
    (tree.children ?? []).reduce(
      (count, child) =>
        count + countJsonTestId(typeof child === "string" ? null : child, testID),
      0,
    );
}

function renderElectricalPanel(prompt: string, repairType = "estimate") {
  __resetConsumerRepairRequestStoreForTests();
  const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
    consumerUserId: "electrical-parameter-editor-ui",
    problemText: prompt,
    repairType,
    city: "Bishkek",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    selectedWork: null,
  });
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
  if (
    renderer.root.findAllByProps({
      testID: "request-estimate-parameter-panel",
    }).length === 0
  ) {
    const toggle = renderer.root
      .findAllByProps({ testID: "request-estimate-parameters-toggle" })
      .find((node) => typeof node.props.onPress === "function");
    if (!toggle) throw new Error("ELECTRICAL_PARAMETER_TOGGLE_MISSING");
    act(() => toggle.props.onPress());
  }
  return { renderer, bundle, onApplyParamBatch };
}

describe("canonical electrical parameter editor UI", () => {
  it("commits an explicitly tapped required enum default even when display text is unchanged", () => {
    const wetZone = RoadworksWaveAProductionRegistry.find(
      (entry) => entry.workId === "paving_roads_landscape_interior_asphalt_repair_wet_zone",
    );
    if (!wetZone) throw new Error("WET_ZONE_REGISTRATION_MISSING");
    const { renderer, bundle, onApplyParamBatch } = renderElectricalPanel(
      wetZone.professionalNameRu,
      "roadworks",
    );
    expect(countJsonTestId(
      renderer.toJSON(),
      "request-estimate-missing-param-exterior_surface_kind",
    )).toBe(1);

    const exactDefault = renderer.root.findByProps({
      testID: "editable-param-option-exterior_surface_kind-PARKING",
    });
    act(() => exactDefault.props.onPress());
    expect(countJsonTestId(renderer.toJSON(), "editable-param-dirty-exterior_surface_kind")).toBe(1);
    expect(countJsonTestId(renderer.toJSON(), "editable-param-batch-apply")).toBe(1);

    const apply = renderer.root.findByProps({ testID: "editable-param-batch-apply" });
    act(() => apply.props.onPress());
    expect(onApplyParamBatch).toHaveBeenCalledWith([
      { operation: "add_param", paramKey: "exterior_surface_kind", rawValue: "PARKING" },
    ]);
  });

  it("renders the five control values as separate editable fields with visible assumptions", () => {
    const { renderer } = renderElectricalPanel(
      "электромонтаж 10 розеток и 10 выключателей\nдлина трассы 154 метра\nплощадь 87 м²\n8 точек освещения",
    );
    const keys = [
      "area_m2",
      "route_length_m",
      "outlet_count",
      "switch_count",
      "lighting_point_count",
    ];
    const tree = renderer.toJSON();
    keys.forEach((key) => {
      expect(countJsonTestId(tree, `editable-param-chip-${key}`)).toBe(1);
    });
    expect(countJsonTestId(tree, "request-estimate-assumed-parameters")).toBe(1);
    const text = visibleText(tree);
    expect(text).toMatch(/87\s*м²/u);
    expect(text).toMatch(/154\s*(?:пог\.\s*)?м/u);
    expect(text).toMatch(/Количество розеток[\s\S]*10/u);
    expect(text).toMatch(/Количество выключателей[\s\S]*10/u);
    expect(text).toMatch(/Количество точек освещения[\s\S]*8/u);
    expect(text).not.toContain("Нужно уточнить: 0 параметров");
  });

  it("shows the same editor with concrete missing fields when calculation is blocked", () => {
    const { renderer, bundle } = renderElectricalPanel("нужен электромонтаж");
    expect(bundle.items).toHaveLength(0);
    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    const tree = renderer.toJSON();
    [
      "area_m2",
      "route_length_m",
      "outlet_count",
      "switch_count",
      "lighting_point_count",
    ].forEach((key) => {
      expect(countJsonTestId(
        tree,
        `request-estimate-missing-param-${key}`,
      )).toBe(1);
    });
    expect(countJsonTestId(tree, "estimate-draft-session-blocked")).toBe(0);
  });

  it("keeps partial cable inputs visible without inventing BOQ quantities", () => {
    const { renderer, bundle } = renderElectricalPanel(
      "смета на прокладку электрокабеля с розетками 10 шт и выключателями 10 шт площадь квартиры 100 кв м",
    );
    const tree = renderer.toJSON();
    const text = visibleText(tree);

    expect(
      countJsonTestId(tree, "request-estimate-missing-parameter-summary"),
    ).toBe(1);
    expect(text).toContain("Длина кабельной трассы");
    expect(
      bundle.canonicalParameterSession?.parameters.find(
        (parameter) => parameter.parameterId === "outlet_count",
      )?.value,
    ).toBe(10);
    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    expect(bundle.items).toHaveLength(0);
  });
});
