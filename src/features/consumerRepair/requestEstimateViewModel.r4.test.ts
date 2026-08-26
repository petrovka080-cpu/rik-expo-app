import {
  buildRequestEstimateViewModel,
  requestEstimatePublicItemTitle,
  sanitizeRequestEstimatePublicText,
} from "./requestEstimateViewModel";
import { appendCanonicalBackendRevisionProjection } from "../../lib/consumerRequests/consumerCanonicalBackendRevisionProjection";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "../../lib/consumerRequests/consumerRequestTypes";

const REVISION_ID = "a7b4d713-d7d9-4d33-a506-690051d375db";
const RELEASE_ID = "d30e2f0d-e55f-5d06-abef-c7cb80d69a73";
const CATALOG_ID = "expanded-template:HVAC_plant_room_preliminary_boq_expanded_complex_v1";

const affected = [
  ["hvac-r4:expanded_template_hvac_plant_room_preliminary_boq_expanded_complex_v1:project_basis_freeze_plan", "Планирование: заморозка project basis и revision", "5559e37b355c9f9232c226a7b48655432bab19428e0fbba85d74ed2a7770c173"],
  ["hvac-r4:expanded_template_hvac_plant_room_preliminary_boq_expanded_complex_v1:project_basis_freeze_mobilization", "Мобилизация: заморозка project basis и revision", "96e125ae902a5ea76909b33d49859ed468dbfca976f395b6210d70eed6e349a4"],
  ["hvac-r4:expanded_template_hvac_plant_room_preliminary_boq_expanded_complex_v1:project_basis_freeze_execution", "Выполнение: заморозка project basis и revision", "db9e750bcc453172edadc0dbf7128f15aa1d9c243a882a2474158b5d185f34f9"],
  ["hvac-r4:expanded_template_hvac_plant_room_preliminary_boq_expanded_complex_v1:project_basis_freeze_protection", "Защита и безопасность: заморозка project basis и revision", "19b211a29f32b6b63ef7fc6b2274a954da545c1a101973c019d53ed3ae2e94d6"],
  ["hvac-r4:expanded_template_hvac_plant_room_preliminary_boq_expanded_complex_v1:project_basis_freeze_closeout", "Закрывающая запись: заморозка project basis и revision", "07c52987d9e2158f046528d6c61b8a0bfe12651ac7247b98c804054a8b2bfb5b"],
] as const;

function canonicalItem(rowId: string, titleRu: string, rowSha256: string, index: number): ConsumerRepairRequestItem {
  return {
    id: `request-item-${index}`,
    requestDraftId: "request-draft-r53-title",
    titleRu,
    itemType: "service",
    category: "TEMPORARY_WORK",
    quantity: 1,
    unit: "service",
    unitLabel: "услуга",
    unitPrice: null,
    totalPrice: null,
    currency: "KGS",
    source: "ai_suggested",
    editableByConsumer: true,
    createdAt: "2026-08-25T00:00:00.000Z",
    sourceParameters: {
      rowCode: rowId,
      rowSha256,
      canonicalBackendRevisionId: REVISION_ID,
      canonicalBackendReleaseId: RELEASE_ID,
      canonicalBackendCatalogId: CATALOG_ID,
      canonicalBackendOwnershipStatus: "OWNED",
    },
  } as ConsumerRepairRequestItem;
}

function serverBoundBundle(items: ConsumerRepairRequestItem[]): ConsumerRepairDraftBundle {
  const base = {
    draft: { id: "request-draft-r53-title" },
    items,
  } as ConsumerRepairDraftBundle;
  return appendCanonicalBackendRevisionProjection({
    previousBundle: null,
    nextBundle: base,
    payload: {
      inputText: "Диагностика exact title",
      workKey: CATALOG_ID,
      canonicalBackend: {
        compilerOwner: "backend",
        revisionId: REVISION_ID,
        revisionNumber: 1,
        parentRevisionId: null,
        releaseId: RELEASE_ID,
        catalogId: CATALOG_ID,
        createdAt: "2026-08-25T00:00:00.000Z",
        checksumSha256: "a".repeat(64),
        parameters: {},
      },
    } as never,
  });
}

describe("R4 canonical estimate title parity", () => {
  it("preserves an accepted backend BOQ title containing the PPR abbreviation", () => {
    const title = "Оборудование доступа к рабочей зоне по проектному ППР";

    expect(sanitizeRequestEstimatePublicText(title)).toBe(title);
  });

  it("preserves the full qualified backend BOQ title before and after a colon", () => {
    const title = "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430: \u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0442\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u043e\u0439 \u0441\u0445\u0435\u043c\u044b, \u0440\u0430\u0441\u0445\u043e\u0434\u043e\u0432 \u0438 \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u0439 \u0432\u043e\u0434\u044b";

    expect(requestEstimatePublicItemTitle({
      titleRu: title,
      category: "quality_control",
      itemType: "work",
      sourceParameters: {},
    } as never)).toBe(title);
  });

  it("preserves all five affected backend titles only through the verified revision projection", () => {
    const items = affected.map(([rowId, title, rowSha], index) => canonicalItem(rowId, title, rowSha, index));
    const bundle = serverBoundBundle(items);

    expect(items.map((item) => requestEstimatePublicItemTitle(item, bundle)))
      .toEqual(affected.map(([, title]) => title));
    const visible = buildRequestEstimateViewModel(bundle)!.sections.flatMap((section) => section.items);
    expect(visible.map((item) => ({ title: item.titleRu, quantity: item.quantity, unit: item.unit, type: item.itemType })))
      .toEqual(items.map((item) => ({ title: item.titleRu, quantity: 1, unit: "service", type: "service" })));
  });

  it("does not allow a lone client revision id to bypass sanitization", () => {
    const title = "Пользовательская строка revision";
    const item = {
      ...canonicalItem("untrusted-row", title, "f".repeat(64), 9),
      sourceParameters: { canonicalBackendRevisionId: REVISION_ID },
    };

    expect(requestEstimatePublicItemTitle(item)).toBe("Пользовательская строка версия");
  });

  it("preserves Unicode and duplicate canonical titles by immutable row identity", () => {
    const title = "Контроль Ω:  revision  № 2";
    const items = [
      canonicalItem("canonical:duplicate:a", title, "1".repeat(64), 1),
      canonicalItem("canonical:duplicate:b", title, "2".repeat(64), 2),
    ];
    const bundle = serverBoundBundle(items);

    expect(items.map((item) => requestEstimatePublicItemTitle(item, bundle))).toEqual([title, title]);
  });

  it("keeps user-authored text on the sanitizer path even with spoofed backend fields", () => {
    const item = canonicalItem("spoofed-row", "Ручная строка revision", "3".repeat(64), 3);

    expect(requestEstimatePublicItemTitle(item, { draft: { id: "fake" }, items: [item] } as ConsumerRepairDraftBundle))
      .toBe("Ручная строка версия");
  });
});
