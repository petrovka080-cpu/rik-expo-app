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
import {
  assertElectricalDimensionSources,
  type ElectricalDimensionTarget,
} from "../../src/lib/estimate/v4/electrical/electricalDimensionalContractV1";

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

  it.each([
    "ROUTE_LENGTH",
    "CABLE_LENGTH",
    "POINT_COUNT",
    "PANEL_COUNT",
    "BREAKER_COUNT",
    "SET_COUNT",
  ] satisfies ElectricalDimensionTarget[])(
    "rejects area_m2 as the only source for %s",
    (target) => {
      expect(() =>
        assertElectricalDimensionSources({
          target,
          sourceParameterIds: ["area_m2"],
        })
      ).toThrow(
        `DIMENSION_SOURCE_INVALID:${target}:area_m2:electrical-dimensional-contract:2026-07-29.v1`,
      );
    },
  );

  it("blocks partial quantities and exposes every missing parameter without generated engineering assumptions", () => {
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
    expect(aiDraft.items).toHaveLength(0);
    expect(bundle.items).toHaveLength(0);
    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    const parameters = parameterMap(bundle);
    expect(parameters.area_m2?.value).toBe(87);
    expect(parameters.outlet_count?.value).toBe(10);
    expect(parameters.switch_count?.value).toBe(10);
    expect(parameters.route_length_m?.source).toBe("MISSING");
    expect(parameters.lighting_point_count?.source).toBe("MISSING");
    expect(parameters.wiring_method?.source).toBe("MISSING");
    expect(parameters.cable_type?.source).toBe("MISSING");
    expect(parameters.group_count?.source).toBe("MISSING");
    expect(bundle.canonicalParameterSession?.assumptionParameterIds).toEqual([]);

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
        missing: true,
        source: "schema_missing",
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

  it("keeps partial editor revisions blocked until the shared required scope is complete", () => {
    let { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-progressive-parameters",
      problemText: "электрика под ключ 100 кв метров площадь",
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

    bundle = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      operation: "update_param",
      paramKey: "route_length_m",
      rawValue: "154",
      createdAt: "2026-07-29T09:00:00.000Z",
    });

    expect(bundle.canonicalParameterSession?.status).toBe("BLOCKING_REQUIRED");
    expect(bundle.items).toHaveLength(0);
    expect(bundle.structuredEstimatePayload).toBeNull();
    expect(bundle.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(initialRevision?.boq.rows).toHaveLength(0);
    expect(initialRevision?.missingInputs.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        "route_length_m",
        "outlet_count",
        "switch_count",
        "lighting_point_count",
      ]),
    );

    const remainingInputs = [
      ["outlet_count", "10"],
      ["switch_count", "10"],
      ["lighting_point_count", "8"],
    ] as const;
    remainingInputs.forEach(([paramKey, rawValue], index) => {
      bundle = applyConsumerRepairDraftRevisionParamPatch({
        requestDraftId: bundle.draft.id,
        operation: "update_param",
        paramKey,
        rawValue,
        createdAt: `2026-07-29T09:0${index + 1}:00.000Z`,
      });
    });

    expect(bundle.canonicalParameterSession?.status).toBe(
      "PRELIMINARY_WITH_ASSUMPTIONS",
    );
    expect(bundle.items.length).toBeGreaterThan(0);
    expect(bundle.estimateDraftRevisionState?.revisions).toHaveLength(5);
    expect(parameterMap(bundle)).toEqual(
      expect.objectContaining({
        area_m2: expect.objectContaining({ value: 100 }),
        route_length_m: expect.objectContaining({ value: 154 }),
        outlet_count: expect.objectContaining({ value: 10 }),
        switch_count: expect.objectContaining({ value: 10 }),
        lighting_point_count: expect.objectContaining({ value: 8 }),
        electrical_points_total: expect.objectContaining({
          value: 28,
          source: "CALCULATED",
        }),
      }),
    );
    expect(initialRevision?.boq.rows).toHaveLength(0);
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
      decoded?.estimateDraftRevisionState?.revisions.at(-1)?.resolvedIdentity,
    ).toEqual(
      bundle.estimateDraftRevisionState?.revisions.at(-1)?.resolvedIdentity,
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

  it("recalculates the complete route dependency ledger from 500 to 650 metres", () => {
    let { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-route-dependency-ledger",
      problemText: [
        "электромонтаж 30 розеток и 20 выключателей, 25 точек освещения",
        "длина трассы 500 м, площадь 300 м²",
        "открытая прокладка в кабель-канале",
      ].join("\n"),
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const beforeRevision =
      bundle.estimateDraftRevisionState?.revisions.find(
        (revision) =>
          revision.revisionId ===
          bundle.estimateDraftRevisionState?.currentRevisionId,
      ) ?? null;

    bundle = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      operation: "update_param",
      paramKey: "route_length_m",
      rawValue: "650",
      createdAt: "2026-07-29T10:00:00.000Z",
    });

    const afterRevision =
      bundle.estimateDraftRevisionState?.revisions.find(
        (revision) =>
          revision.revisionId ===
          bundle.estimateDraftRevisionState?.currentRevisionId,
      ) ?? null;
    const diff = bundle.estimateDraftRevisionState?.diffs.at(-1);
    const changedRowIds = new Set(
      diff?.changedRows.map((row) => row.rowId) ?? [],
    );
    const requiredRouteRows = [
      "electrical_power_cable",
      "electrical_lighting_cable",
      "electrical_corrugation_channel",
      "electrical_cable_laying",
      "electrical_reference_route_fixings",
      "electrical_reference_containment_couplings",
      "electrical_reference_cable_pull_wire",
      "electrical_reference_cable_ties",
      "electrical_reference_cable_measure_cut",
      "electrical_reference_cable_dressing",
      "electrical_reference_circuit_separation",
      "electrical_reference_channel_cover",
      "electrical_reference_channel_body_install",
      "electrical_reference_channel_cover_close",
    ];

    expect(beforeRevision).not.toBeNull();
    expect(afterRevision).not.toBeNull();
    expect(diff?.changedParams).toContainEqual(
      expect.objectContaining({
        key: "route_length_m",
        before: 500,
        after: 650,
      }),
    );
    expect(diff?.changedRowsCount).toBeGreaterThan(14);
    requiredRouteRows.forEach((rowId) => {
      expect(changedRowIds).toContain(rowId);
      const rowTrace = afterRevision?.trace.rows.find(
        (row) => row.rowId === rowId,
      );
      expect(rowTrace?.sourceParamKeys).toContain("route_length_m");
      expect(rowTrace?.quantityFormula).toMatch(
        /route_length_m|total_cable_length_m|route_accessory_count/,
      );
    });
    const beforeRows = new Map(
      beforeRevision?.boq.rows.map((row) => [row.rowId, row]) ?? [],
    );
    const afterRows = new Map(
      afterRevision?.boq.rows.map((row) => [row.rowId, row]) ?? [],
    );
    expect(afterRows.get("electrical_corrugation_channel")?.quantity).toBe(650);
    expect(afterRows.get("electrical_reference_route_fixings")?.quantity).toBe(
      Math.ceil(650 / 0.6),
    );
    expect(afterRows.get("electrical_reference_cable_measure_cut")?.quantity)
      .toBeGreaterThan(
        beforeRows.get("electrical_reference_cable_measure_cut")?.quantity ??
          0,
      );
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
    expect(parameters.protective_devices_included?.source).toBe("MISSING");
    expect(
      bundle.items.find(
        (item) => item.sourceParameters?.rowCode === "electrical_breakers",
      ),
    ).toBeUndefined();
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
