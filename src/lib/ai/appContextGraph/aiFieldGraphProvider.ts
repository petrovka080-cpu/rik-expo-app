import { resolveAiSourceRefForRole, type AiContextGraphRole } from "./aiPermissionAwareLinkResolver";
import {
  createAiContextGraphNode,
  createUnresolvedAiSourceRef,
  type AiContextGraphEntityFactInput,
  type AiContextGraphEntityInput,
  type AiContextGraphNode,
} from "./aiSourceRef";

export type AiFieldObjectRecord = {
  id: string;
  nameRu: string;
  addressRu?: string;
};

export type AiFieldBuildingRecord = {
  id: string;
  nameRu: string;
  objectId?: string;
};

export type AiFieldFloorRecord = {
  id: string;
  labelRu: string;
  number?: number;
  objectId?: string;
  buildingId?: string;
};

export type AiFieldZoneRecord = {
  id: string;
  nameRu: string;
  objectId?: string;
  buildingId?: string;
  floorId?: string;
};

export type AiFieldWorkRecord = {
  id: string;
  nameRu: string;
  statusRu?: string;
  objectId?: string;
  buildingId?: string;
  floorId?: string;
  zoneId?: string;
  contractorId?: string;
  materialIds?: string[];
  documentIds?: string[];
  pdfDocumentIds?: string[];
};

export type AiFieldTaskRecord = {
  id: string;
  titleRu: string;
  statusRu?: string;
  workId?: string;
  objectId?: string;
  floorId?: string;
  assigneeUserId?: string;
};

export type AiFieldUserRecord = {
  id: string;
  nameRu: string;
  roleRu?: string;
};

export type AiFieldCompanyRecord = {
  id: string;
  nameRu: string;
};

export type AiFieldGraphInput = {
  objects?: AiFieldObjectRecord[];
  buildings?: AiFieldBuildingRecord[];
  floors?: AiFieldFloorRecord[];
  zones?: AiFieldZoneRecord[];
  works?: AiFieldWorkRecord[];
  tasks?: AiFieldTaskRecord[];
  users?: AiFieldUserRecord[];
  companies?: AiFieldCompanyRecord[];
};

function buildNode(input: AiContextGraphEntityInput, role: AiContextGraphRole): AiContextGraphNode {
  const ref = resolveAiSourceRefForRole(createUnresolvedAiSourceRef(input), role, input.routeParams);
  return createAiContextGraphNode(input, ref);
}

function fact(key: string, valueRu?: string | number | null): AiContextGraphEntityFactInput[] {
  if (valueRu === undefined || valueRu === null || String(valueRu).trim().length === 0) return [];
  return [{ key, valueRu: String(valueRu) }];
}

export function buildAiFieldGraphNodes(input: AiFieldGraphInput | undefined, role: AiContextGraphRole): AiContextGraphNode[] {
  if (!input) return [];

  const objectNodes = (input.objects ?? []).map((item) =>
    buildNode({
      entityType: "object",
      entityId: item.id,
      origin: "field",
      labelRu: item.nameRu,
      facts: [...fact("object_name", item.nameRu), ...fact("address", item.addressRu)],
    }, role),
  );

  const buildingNodes = (input.buildings ?? []).map((item) =>
    buildNode({
      entityType: "building",
      entityId: item.id,
      origin: "field",
      labelRu: item.nameRu,
      facts: fact("building_name", item.nameRu),
      links: item.objectId
        ? [{ relation: "belongs_to_object", targetEntityType: "object", targetEntityId: item.objectId, labelRu: "Объект" }]
        : [],
    }, role),
  );

  const floorNodes = (input.floors ?? []).map((item) =>
    buildNode({
      entityType: "floor",
      entityId: item.id,
      origin: "field",
      labelRu: item.labelRu,
      facts: [...fact("floor", item.labelRu), ...fact("floor_number", item.number)],
      links: [
        ...(item.objectId ? [{ relation: "belongs_to_object" as const, targetEntityType: "object" as const, targetEntityId: item.objectId, labelRu: "Объект" }] : []),
        ...(item.buildingId ? [{ relation: "contains" as const, targetEntityType: "building" as const, targetEntityId: item.buildingId, labelRu: "Здание" }] : []),
      ],
    }, role),
  );

  const zoneNodes = (input.zones ?? []).map((item) =>
    buildNode({
      entityType: "zone",
      entityId: item.id,
      origin: "field",
      labelRu: item.nameRu,
      facts: fact("zone", item.nameRu),
      links: [
        ...(item.objectId ? [{ relation: "belongs_to_object" as const, targetEntityType: "object" as const, targetEntityId: item.objectId, labelRu: "Объект" }] : []),
        ...(item.floorId ? [{ relation: "belongs_to_floor" as const, targetEntityType: "floor" as const, targetEntityId: item.floorId, labelRu: "Этаж" }] : []),
        ...(item.buildingId ? [{ relation: "contains" as const, targetEntityType: "building" as const, targetEntityId: item.buildingId, labelRu: "Здание" }] : []),
      ],
    }, role),
  );

  const workNodes = (input.works ?? []).map((item) =>
    buildNode({
      entityType: "work",
      entityId: item.id,
      origin: "field",
      labelRu: item.nameRu,
      facts: [...fact("work", item.nameRu), ...fact("status", item.statusRu)],
      links: [
        ...(item.objectId ? [{ relation: "belongs_to_object" as const, targetEntityType: "object" as const, targetEntityId: item.objectId, labelRu: "Объект" }] : []),
        ...(item.floorId ? [{ relation: "belongs_to_floor" as const, targetEntityType: "floor" as const, targetEntityId: item.floorId, labelRu: "Этаж" }] : []),
        ...(item.zoneId ? [{ relation: "contains" as const, targetEntityType: "zone" as const, targetEntityId: item.zoneId, labelRu: "Зона" }] : []),
        ...(item.contractorId ? [{ relation: "created_by" as const, targetEntityType: "contractor" as const, targetEntityId: item.contractorId, labelRu: "Подрядчик" }] : []),
        ...(item.materialIds ?? []).map((materialId) => ({ relation: "uses_material" as const, targetEntityType: "material" as const, targetEntityId: materialId, labelRu: "Материал" })),
        ...(item.documentIds ?? []).map((documentId) => ({ relation: "linked_document" as const, targetEntityType: "document" as const, targetEntityId: documentId, labelRu: "Документ" })),
        ...(item.pdfDocumentIds ?? []).map((pdfId) => ({ relation: "linked_pdf" as const, targetEntityType: "pdf_document" as const, targetEntityId: pdfId, labelRu: "PDF" })),
      ],
      missingLinks: [
        ...(item.floorId ? [] : [{ expected: "floor" as const, reasonRu: "Работа не связана с этажом." }]),
      ],
    }, role),
  );

  const taskNodes = (input.tasks ?? []).map((item) =>
    buildNode({
      entityType: "task",
      entityId: item.id,
      origin: "field",
      labelRu: item.titleRu,
      facts: [...fact("task", item.titleRu), ...fact("status", item.statusRu)],
      links: [
        ...(item.workId ? [{ relation: "for_work" as const, targetEntityType: "work" as const, targetEntityId: item.workId, labelRu: "Работа" }] : []),
        ...(item.objectId ? [{ relation: "belongs_to_object" as const, targetEntityType: "object" as const, targetEntityId: item.objectId, labelRu: "Объект" }] : []),
        ...(item.floorId ? [{ relation: "belongs_to_floor" as const, targetEntityType: "floor" as const, targetEntityId: item.floorId, labelRu: "Этаж" }] : []),
        ...(item.assigneeUserId ? [{ relation: "created_by" as const, targetEntityType: "user" as const, targetEntityId: item.assigneeUserId, labelRu: "Исполнитель" }] : []),
      ],
    }, role),
  );

  const userNodes = (input.users ?? []).map((item) =>
    buildNode({
      entityType: "user",
      entityId: item.id,
      origin: "app_data",
      labelRu: item.nameRu,
      facts: [...fact("user_name", item.nameRu), ...fact("role", item.roleRu)],
    }, role),
  );

  const companyNodes = (input.companies ?? []).map((item) =>
    buildNode({
      entityType: "company",
      entityId: item.id,
      origin: "app_data",
      labelRu: item.nameRu,
      facts: fact("company", item.nameRu),
    }, role),
  );

  return [
    ...objectNodes,
    ...buildingNodes,
    ...floorNodes,
    ...zoneNodes,
    ...workNodes,
    ...taskNodes,
    ...userNodes,
    ...companyNodes,
  ];
}
