import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { WorkTemplateSuggestions } from "./WorkTemplateSuggestions";
import { CanonicalWorkConditionProfileSelector } from "./CanonicalWorkConditionProfileSelector";
import { canonicalSearchItemToConsumerRepairSuggestion } from "../../consumerRepair/requestEstimateScreenActions";
import { groupedConditionWork } from "../../../../tests/requestEstimate/conditionProfileFixture";

describe("condition profiles inside one public work card", () => {
  it("opens one card then chooses the exact wet child even when the representative is blocked", () => {
    const item = groupedConditionWork();
    const standard = item.conditionProfiles![0];
    const wet = item.conditionProfiles![1];
    item.conditionProfiles = [{ ...standard, estimateReady: false,
      contentAdmission: { ...standard.contentAdmission!, allowed: false }, nonselectableReasonRu: "Нужна проверка обычных условий" }, wet];
    item.estimateReady = true;
    item.contentAdmission = item.conditionProfiles[0].contentAdmission;
    const onSelect = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => { tree = TestRenderer.create(<WorkTemplateSuggestions candidateTemplates={[]}
      legacyWorkSuggestions={[canonicalSearchItemToConsumerRepairSuggestion(item)]}
      literalTotalCount={1} shownCount={1} onSelectLegacyWorkSuggestion={onSelect} />); });
    const card = tree.root.findAllByProps({ testID: "consumer-repair-work-suggestion-1" })
      .find(node => typeof node.props.onPress === "function")!;
    expect(card.props.disabled).toBe(false);
    expect(tree.root.findAllByProps({ testID: "consumer-repair-work-suggestion-2" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "consumer-repair-work-suggestion-1-conditions" })).toHaveLength(0);
    act(() => card.props.onPress());
    expect(onSelect).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: "consumer-repair-work-suggestion-1-condition-standard" }).props.disabled).toBe(true);
    const wetChoice = tree.root.findByProps({ testID: "consumer-repair-work-suggestion-1-condition-wet_zone" });
    expect(wetChoice.props.disabled).toBe(false);
    act(() => wetChoice.props.onPress());
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ workKey: wet.catalogId,
      matchedConditionCatalogId: wet.catalogId, defaultMeasureUnit: "set", estimateReady: true });
    act(() => tree.unmount());
  });

  it("uses the same selector contract in the foreman card and keeps single-profile selection exact", () => {
    const wet = groupedConditionWork().conditionProfiles![1];
    const onSelect = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => { tree = TestRenderer.create(<CanonicalWorkConditionProfileSelector profiles={[wet]}
      estimateReady={false} accessibilityLabel="Монтаж смесителя" testIDPrefix="foreman-condition-card"
      onSelect={onSelect}>Монтаж смесителя</CanonicalWorkConditionProfileSelector>); });
    const card = tree.root.findAllByProps({ testID: "foreman-condition-card" })
      .find(node => typeof node.props.onPress === "function")!;
    expect(card.props.disabled).toBe(false);
    act(() => card.props.onPress());
    expect(onSelect).toHaveBeenCalledWith(wet.catalogId);
    act(() => tree.unmount());
  });

  it("offers separate opaque IDs for same-suffix size branches with functional choices", () => {
    const item = groupedConditionWork({ canonicalNameRu: "Затирка швов плиточного пола" });
    item.conditionProfiles = item.conditionProfiles!.map((profile, index) => {
      const catalogId = `canonical-work:base:tile_joint_${index + 1}_standard`;
      return { ...profile, catalogId, conditionId: catalogId,
        titleRu: `Затирка Ceresit CE40 ${index + 1}`,
        conditionTitleRu: index === 0 ? "Плитка 100 × 100 мм, шов 2 мм" : "Плитка 300 × 300 мм, шов 3 мм",
        contentAdmission: { ...profile.contentAdmission!, catalogId } };
    });
    const selectedProfile = item.conditionProfiles[1];
    const onSelect = jest.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => { tree = TestRenderer.create(<WorkTemplateSuggestions candidateTemplates={[]}
      legacyWorkSuggestions={[canonicalSearchItemToConsumerRepairSuggestion(item)]}
      onSelectLegacyWorkSuggestion={onSelect} />); });
    act(() => tree.root.findByProps({ testID: "consumer-repair-work-suggestion-1" }).props.onPress());
    const choice = tree.root.findByProps({ testID: `consumer-repair-work-suggestion-1-condition-${selectedProfile.conditionId}` });
    expect(choice.props.accessibilityLabel).toBe("Плитка 300 × 300 мм, шов 3 мм");
    act(() => choice.props.onPress());
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ workKey: selectedProfile.catalogId,
      titleRu: "Затирка швов плиточного пола — Плитка 300 × 300 мм, шов 3 мм" });
    expect(onSelect.mock.calls[0][0].conditionProfiles[1].titleRu).toBe(selectedProfile.titleRu);
    act(() => tree.unmount());
  });
});
