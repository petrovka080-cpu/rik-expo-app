import { buildAllHvacPassports } from "./hvacR4Model";
import { semanticSha256 } from "./support";

type Json = Record<string, any>;

const groups = new Map<string, Array<{ catalogId: string; family: string }>>();
for (const passport of buildAllHvacPassports()) {
  const signature = semanticSha256(passport.resources.map((row) => ({
    component: (row.sourceMetadata as Json).component.key,
    activity: (row.sourceMetadata as Json).activity.key,
    category: row.category,
    section: row.section,
    unitId: row.unitId,
  })).sort((left, right) => semanticSha256(left).localeCompare(semanticSha256(right))));
  groups.set(signature, [...(groups.get(signature) ?? []), { catalogId: passport.catalogId, family: passport.familyKey }]);
}
const cross = [...groups].map(([signature, rows]) => ({ signature, rows, families: [...new Set(rows.map((row) => row.family))] }))
  .filter((group) => group.families.length > 1)
  .sort((left, right) => right.rows.length - left.rows.length);
process.stdout.write(`${JSON.stringify({ signatures: groups.size, crossFamilyGroups: cross.length, examples: cross.slice(0, 30) }, null, 2)}\n`);
