import type { Dispatch, SetStateAction } from "react";
import type { RequestDetails } from "../../lib/catalog_api";
import {
  applyForemanDraftHeaderEditPlanToRequestDetails,
  type ForemanDraftHeaderEditPlan,
} from "./foreman.draftBoundaryIdentity.model";

export type ForemanDraftBoundaryHeaderSetters = {
  setForeman: (value: string) => void;
  setComment: (value: string) => void;
  setObjectType: (value: string) => void;
  setLevel: (value: string) => void;
  setSystem: (value: string) => void;
  setZone: (value: string) => void;
};

export const applyForemanDraftHeaderEditToBoundary = (params: {
  plan: ForemanDraftHeaderEditPlan;
  setHeaderState: ForemanDraftBoundaryHeaderSetters;
  setRequestDetails: Dispatch<SetStateAction<RequestDetails | null>>;
}) => {
  const patch = params.plan.headerPatch;
  if (patch.foreman !== undefined) params.setHeaderState.setForeman(patch.foreman);
  if (patch.comment !== undefined) params.setHeaderState.setComment(patch.comment);
  if (patch.objectType !== undefined) params.setHeaderState.setObjectType(patch.objectType);
  if (patch.level !== undefined) params.setHeaderState.setLevel(patch.level);
  if (patch.system !== undefined) params.setHeaderState.setSystem(patch.system);
  if (patch.zone !== undefined) params.setHeaderState.setZone(patch.zone);
  params.setRequestDetails((prev) => applyForemanDraftHeaderEditPlanToRequestDetails(prev, params.plan));
};

