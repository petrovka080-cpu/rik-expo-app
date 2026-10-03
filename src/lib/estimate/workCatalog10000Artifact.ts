import { parseWorkCatalogArtifact } from "./catalogArtifactDataContract";

const artifact: unknown = require("../../../data/estimate-catalog/work-items/work-catalog-10000.json");
export const workCatalog10000Artifact = parseWorkCatalogArtifact(artifact);
