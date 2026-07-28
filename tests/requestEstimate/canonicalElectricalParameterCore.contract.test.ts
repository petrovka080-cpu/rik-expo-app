import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamPatch,
} from "../../src/lib/consumerRequests";
import { buildCanonicalParameterCards } from "../../src/lib/estimate/runtime/buildCanonicalParameterCards";
import {
  compactConsumerRepairBundleForDurableStorage,
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";

function parameterMap(
  bundle: ReturnType<typeof buildConsumerRepairSelectedWorkDraftBundle>["bundle"],
) {
  return Object.fromEntries(
    bundle.canonicalParameterSession?.parameters.map((parameter) => [
      parameter.parameterId,
      parameter,
    ]) ?? [],
  );
}

describe("canonical electrical parameter core", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("keeps partial input preliminary and exposes every missing or assumed parameter", () => {
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-partial-parameters",
      problemText: "электромонтаж: 10 розеток, 10 выключателей, площадь 87 м²",
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("electrical_area_installation");
    expect(aiDraft.items.length).toBeGreaterThan(0);
    expect(bundle.canonicalParameterSession?.status).toBe(
      "PRELIMINARY_WITH_ASSUMPTIONS",
    );
    const parameters = parameterMap(bundle);
    expect(parameters.area_m2?.value).toBe(87);
    expect(parameters.outlet_count?.value).toBe(10);
    expect(parameters.switch_count?.value).toBe(10);
    expect(parameters.route_length_m?.source).toBe("MISSING");
    expect(parameters.lighting_point_count?.source).toBe("MISSING");
    expect(parameters.wiring_method?.source).toBe("MISSING");
    expect(parameters.cable_type?.source).toBe("MISSING");
    expect(parameters.group_count?.source).toBe("ASSUMED");

    const revision = bundle.estimateDraftRevisionState?.revisions.find(
      (candidate) =>
        candidate.revisionId ===
        bundle.estimateDraftRevisionState?.currentRevisionId,
    ) ?? null;
    const cards = buildCanonicalParameterCards({
      session: bundle.canonicalParameterSession ?? null,
      revision,
    });
    expect(cards.length).toBe(
      bundle.canonicalParameterSession?.parameters.length,
    );
    expect(cards.find((card) => card.key === "route_length_m")).toEqual(
      expect.objectContaining({
        editable: true,
        missing: true,
        clickAction: "open_parameter_editor",
      }),
    );
    expect(cards.find((card) => card.key === "group_count")).toEqual(
      expect.objectContaining({
        editable: true,
        source: "catalog_default",
      }),
    );
    expect(cards.find((card) => card.key === "panel_included")?.choices).toEqual([
      { value: "true", labelRu: "Да" },
      { value: "false", labelRu: "Нет" },
    ]);
  });

  it("blocks a professional total when no quantitative basis is present", () => {
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-blocking-parameters",
      problemText: "нужен электромонтаж",
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("electrical_area_installation");
    expect(aiDraft.items).toHaveLength(0);
    expect(aiDraft.structuredEstimatePayload).toBeUndefined();
    expect(bundle.items).toHaveLength(0);
    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    expect(bundle.estimateDraftSession?.status).toBe("PARAMETERS_REQUIRED");
    expect(bundle.canonicalParameterSession?.blockingMissingParameterIds).toEqual(
      expect.arrayContaining([
        "area_m2",
        "route_length_m",
        "outlet_count",
        "switch_count",
        "lighting_point_count",
      ]),
    );
    expect(bundle.estimateDraftRevisionState).not.toBeNull();
    expect(bundle.canonicalParameterSession?.parameters.length).toBeGreaterThan(10);
  });

  it("recalculates each point type through a new audited revision", () => {
    let { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-point-revisions",
      problemText:
        "электромонтаж 10 розеток и 10 выключателей, 8 точек освещения, длина трассы 154 м, площадь 87 м²",
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const initialRevision =
      bundle.estimateDraftRevisionState?.revisions.find(
        (revision) =>
          revision.revisionId ===
          bundle.estimateDraftRevisionState?.currentRevisionId,
      ) ?? null;
    const rawFactValues = Object.fromEntries(
      initialRevision?.rawInputFacts.map((fact) => [
        fact.canonical_parameter_key,
        fact.normalized_value,
      ]) ?? [],
    );
    expect(rawFactValues).toEqual(expect.objectContaining({
      area_m2: 87,
      route_length_m: 154,
      outlet_count: 10,
      switch_count: 10,
      lighting_point_count: 8,
    }));
    expect(rawFactValues).not.toHaveProperty("electrical_points");
    const edits = [
      {
        paramKey: "outlet_count",
        rawValue: "12",
        rowCode: "electrical_outlets",
      },
      {
        paramKey: "switch_count",
        rawValue: "11",
        rowCode: "electrical_switches",
      },
      {
        paramKey: "lighting_point_count",
        rawValue: "9",
        rowCode: "electrical_lighting_points",
      },
    ] as const;

    edits.forEach((edit, index) => {
      const previousRevisionId =
        bundle.estimateDraftRevisionState?.currentRevisionId;
      bundle = applyConsumerRepairDraftRevisionParamPatch({
        requestDraftId: bundle.draft.id,
        operation: "update_param",
        paramKey: edit.paramKey,
        rawValue: edit.rawValue,
        createdAt: `2026-07-28T13:0${index}:00.000Z`,
      });
      const latestDiff = bundle.estimateDraftRevisionState?.diffs.at(-1);
      expect(bundle.estimateDraftRevisionState?.currentRevisionId).not.toBe(
        previousRevisionId,
      );
      expect(latestDiff?.changedParams).toContainEqual(
        expect.objectContaining({
          key: edit.paramKey,
          after: Number(edit.rawValue),
        }),
      );
      expect(latestDiff?.changedRows.map((row) => row.rowId)).toContain(
        edit.rowCode,
      );
      expect(
        bundle.items.find(
          (item) => item.sourceParameters?.rowCode === edit.rowCode,
        )?.quantity,
      ).toBe(Number(edit.rawValue));
    });

    expect(bundle.estimateDraftRevisionState?.revisions).toHaveLength(4);
    expect(parameterMap(bundle).electrical_points_total?.value).toBe(32);
    expect(parameterMap(bundle).electrical_points_total?.source).toBe(
      "CALCULATED",
    );
    const compacted = compactConsumerRepairBundleForDurableStorage(bundle);
    const decoded = decodeConsumerRepairBundleFromDurableStorage(
      encodeConsumerRepairBundleForDurableStorage(compacted),
    );
    expect(decoded?.canonicalParameterSession?.fingerprint).toBe(
      bundle.canonicalParameterSession?.fingerprint,
    );
    expect(decoded?.canonicalParameterSession?.revisionId).toBe(
      bundle.estimateDraftRevisionState?.currentRevisionId,
    );
    expect(
      decoded?.canonicalParameterSession?.parameters.find(
        (parameter) => parameter.parameterId === "lighting_point_count",
      ),
    ).toEqual(expect.objectContaining({
      value: 9,
      source: "USER_EXPLICIT",
    }));
  });

  it("binds engineering scope, load, containment, height and access to BOQ rows", () => {
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-engineering-parameters",
      problemText: [
        "частичная замена электропроводки, 10 розеток, 10 выключателей, 8 точек освещения",
        "длина трассы 154 м, площадь 87 м², нагрузка 21 кВт",
        "открытая прокладка в кабель-канале, высота 3 м, нужна вышка",
      ].join("\n"),
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const parameters = parameterMap(bundle);
    expect(parameters.work_scope_type?.value).toBe("partial_replacement");
    expect(parameters.estimated_load_kw?.value).toBe(21);
    expect(parameters.wiring_method?.value).toBe("open");
    expect(parameters.containment_type?.value).toBe("cable_channel");
    expect(parameters.installation_height_m?.value).toBe(3);
    expect(parameters.access_condition?.value).toBe("height_equipment");
    expect(
      bundle.items.find(
        (item) =>
          item.sourceParameters?.rowCode ===
          "electrical_corrugation_channel",
      )?.titleRu,
    ).toContain("Кабель-канал");
    expect(
      bundle.items.find(
        (item) => item.sourceParameters?.rowCode === "electrical_breakers",
      )?.quantity,
    ).toBe(7);
    expect(
      bundle.items.find(
        (item) =>
          item.sourceParameters?.rowCode === "electrical_access_equipment",
      ),
    ).toEqual(expect.objectContaining({
      quantity: expect.any(Number),
    }));
  });
});
