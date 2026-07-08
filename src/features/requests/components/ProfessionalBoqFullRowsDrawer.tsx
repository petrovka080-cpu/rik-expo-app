import React from "react";

import type { ProfessionalBoqLineItemQuality } from "../../../lib/estimate/professionalBoqLineItemQualityContract";
import {
  buildProfessionalBoqFullDetailDrawerModel,
  ProfessionalBoqFullDetailDrawer,
} from "./ProfessionalBoqFullDetailDrawer";

export function buildProfessionalBoqFullRowsDrawerModel(rows: readonly ProfessionalBoqLineItemQuality[]) {
  return buildProfessionalBoqFullDetailDrawerModel(rows);
}

export function ProfessionalBoqFullRowsDrawer({ rows }: { rows: readonly ProfessionalBoqLineItemQuality[] }) {
  return <ProfessionalBoqFullDetailDrawer rows={rows} />;
}
