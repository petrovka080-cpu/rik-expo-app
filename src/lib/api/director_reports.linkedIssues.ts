import type {
  DirectorFactRow,
  DirectorObjectLinkedIssue,
  DirectorObjectLinkedIssueLinkState,
} from "./director_reports.shared";
import {
  WITHOUT_LEVEL,
  WITHOUT_OBJECT,
  WITHOUT_WORK,
  canonicalObjectName,
  normLevelName,
  normWorkName,
} from "./director_reports.shared";

type DirectorObjectLinkedIssueSummary = {
  documentsCount: number;
  positionsCount: number;
  objectsCount: number;
  worksCount: number;
  levelsCount: number;
  materialsCount: number;
  linkedCount: number;
  partialCount: number;
  unlinkedCount: number;
};

const isPresent = (value: unknown) => String(value ?? "").trim() !== "";

const isObjectLinked = (value: unknown) => canonicalObjectName(value) !== WITHOUT_OBJECT;

const isWorkLinked = (value: unknown) => normWorkName(value) !== WITHOUT_WORK;

const isLevelLinked = (value: unknown) => normLevelName(value) !== WITHOUT_LEVEL;

const chooseSingle = (values: Set<string>): string | null => {
  const list = Array.from(values).map((value) => String(value ?? "").trim()).filter(Boolean);
  return list[0] ?? null;
};

const toLinkState = (input: {
  hasRequestLink: boolean;
  hasObjectLink: boolean;
  hasWorkLink: boolean;
  hasContext: boolean;
}): DirectorObjectLinkedIssueLinkState => {
  if (input.hasRequestLink && input.hasObjectLink && input.hasWorkLink) return "linked";
  if (input.hasRequestLink || input.hasObjectLink || input.hasWorkLink || input.hasContext) return "partial";
  return "unlinked";
};

function buildDirectorObjectLinkedIssues(rows: DirectorFactRow[]): DirectorObjectLinkedIssue[] {
  const byIssueId = new Map<
    string,
    {
      requestIds: Set<string>;
      requestItemIds: Set<string>;
      objectIds: Set<string>;
      objectNames: Set<string>;
      levelNames: Set<string>;
      systemNames: Set<string>;
      zoneNames: Set<string>;
      workNames: Set<string>;
      issueItemIds: Set<string>;
      materialCodes: Set<string>;
      rowCount: number;
    }
  >();

  for (const row of rows) {
    if (row.item_kind !== "material") continue;
    const issueId = String(row.issue_id ?? "").trim();
    if (!issueId) continue;
    const entry =
      byIssueId.get(issueId) ??
      {
        requestIds: new Set<string>(),
        requestItemIds: new Set<string>(),
        objectIds: new Set<string>(),
        objectNames: new Set<string>(),
        levelNames: new Set<string>(),
        systemNames: new Set<string>(),
        zoneNames: new Set<string>(),
        workNames: new Set<string>(),
        issueItemIds: new Set<string>(),
        materialCodes: new Set<string>(),
        rowCount: 0,
      };

    const requestId = String(row.request_id ?? "").trim();
    const requestItemId = String(row.request_item_id ?? "").trim();
    const objectId = String(row.object_id_resolved ?? "").trim();
    const objectName = String(row.object_name_resolved ?? "").trim();
    const levelName = String(row.level_name_resolved ?? "").trim();
    const systemName = String(row.system_name_resolved ?? "").trim();
    const zoneName = String(row.zone_name_resolved ?? "").trim();
    const workName = String(row.work_name_resolved ?? "").trim();
    const issueItemId = String(row.issue_item_id ?? "").trim();
    const materialCode = String(row.rik_code_resolved ?? "").trim().toUpperCase();

    if (requestId) entry.requestIds.add(requestId);
    if (requestItemId) entry.requestItemIds.add(requestItemId);
    if (objectId) entry.objectIds.add(objectId);
    if (isObjectLinked(objectName)) entry.objectNames.add(canonicalObjectName(objectName));
    if (isLevelLinked(levelName)) entry.levelNames.add(normLevelName(levelName));
    if (isPresent(systemName)) entry.systemNames.add(systemName);
    if (isPresent(zoneName)) entry.zoneNames.add(zoneName);
    if (isWorkLinked(workName)) entry.workNames.add(normWorkName(workName));
    if (issueItemId) entry.issueItemIds.add(issueItemId);
    if (materialCode) entry.materialCodes.add(materialCode);
    entry.rowCount += 1;

    byIssueId.set(issueId, entry);
  }

  return Array.from(byIssueId.entries())
    .map(([issueId, entry]) => {
      const hasRequestLink = entry.requestIds.size > 0 || entry.requestItemIds.size > 0;
      const hasObjectLink = entry.objectIds.size > 0 || entry.objectNames.size > 0;
      const hasWorkLink = entry.workNames.size > 0;
      const hasContext =
        entry.levelNames.size > 0 || entry.systemNames.size > 0 || entry.zoneNames.size > 0;

      const workName = chooseSingle(entry.workNames);
      const levelName = chooseSingle(entry.levelNames);
      const systemName = chooseSingle(entry.systemNames);
      const zoneName = chooseSingle(entry.zoneNames);

      return {
        issueId,
        requestId: chooseSingle(entry.requestIds),
        requestItemId: chooseSingle(entry.requestItemIds),
        objectId: chooseSingle(entry.objectIds),
        objectName: chooseSingle(entry.objectNames),
        levelName,
        systemName,
        zoneName,
        workId: workName,
        workName,
        contractorId: null,
        materialCount: entry.materialCodes.size || entry.rowCount,
        positionCount: entry.issueItemIds.size || entry.rowCount,
        linkState: toLinkState({
          hasRequestLink,
          hasObjectLink,
          hasWorkLink,
          hasContext,
        }),
      } satisfies DirectorObjectLinkedIssue;
    })
    .sort((left, right) => left.issueId.localeCompare(right.issueId, "ru"));
}

function summarizeDirectorObjectLinkedIssues(
  issues: DirectorObjectLinkedIssue[],
): DirectorObjectLinkedIssueSummary {
  const objects = new Set<string>();
  const works = new Set<string>();
  const levels = new Set<string>();
  let positionsCount = 0;
  let materialsCount = 0;
  let linkedCount = 0;
  let partialCount = 0;
  let unlinkedCount = 0;

  for (const issue of issues) {
    positionsCount += Math.max(0, Number(issue.positionCount ?? 0));
    materialsCount += Math.max(0, Number(issue.materialCount ?? 0));
    if (issue.objectName) objects.add(issue.objectName);
    if (issue.workName) works.add(issue.workName);
    if (issue.levelName) levels.add(issue.levelName);
    if (issue.linkState === "linked") linkedCount += 1;
    else if (issue.linkState === "partial") partialCount += 1;
    else unlinkedCount += 1;
  }

  return {
    documentsCount: issues.length,
    positionsCount,
    objectsCount: objects.size,
    worksCount: works.size,
    levelsCount: levels.size,
    materialsCount,
    linkedCount,
    partialCount,
    unlinkedCount,
  };
}

export {
  buildDirectorObjectLinkedIssues,
  summarizeDirectorObjectLinkedIssues,
};

export type { DirectorObjectLinkedIssueSummary };
