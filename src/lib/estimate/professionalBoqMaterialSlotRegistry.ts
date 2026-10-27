import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";
import { normalizeProfessionalBoqText } from "./professionalNomenclatureResolver";
import type {
  FamilyMaterialSlotPolicy,
  FamilyMaterialSlotPolicySlot,
  ProfessionalBoqMaterialSlot,
  ProfessionalBoqMaterialSlotType,
} from "./professionalBoqMaterialCompletenessContract";
import {
  buildSourceBackedFamilyMaterialSlotPolicy,
  priorityFamilyMaterialSlotPoliciesFor,
} from "./professionalFamilyMaterialSlots";
import type { ProfessionalWorkPassport } from "./workPassportContract";

const GATE_OR_WICKET_RE = /ворот|калитк|gate|wicket/i;
const WATER_TOWER_OR_TANK_RE = /водонапорн|вод[аы]\s+башн|бак\s*\d|water\s+tower|tank/i;
const GABION_RE = /габион|gabion/i;

function includesAnyToken(text: string, tokens: readonly string[]): boolean {
  const normalized = normalizeProfessionalBoqText(text);
  return tokens.some((token) => normalized.includes(normalizeProfessionalBoqText(token)));
}

export function professionalBoqMaterialSlotTypeForRow(row: Pick<ProfessionalBoqRow, "rowType" | "titleRu">): ProfessionalBoqMaterialSlotType {
  const text = normalizeProfessionalBoqText(row.titleRu);
  if (/саморез|заклеп|заклёп|крепеж|крепёж|анкер|зажим|дюбел|проволок|спирал|болт|гайк|шайб/.test(text)) return "fastener";
  if (/герметик|клей|пена|мастик|праймер|грунтовк|лента/.test(text)) return "sealant_or_adhesive";
  if (/мембран|изоляц|утепл|геотекст|пароизоляц|гидроизоляц/.test(text)) return "membrane_or_insulation";
  if (/арматур|сетка|каркас/.test(text)) return "reinforcement";
  if (/опалубк|распалуб/.test(text)) return "formwork";
  if (/пес|щеб|подушк|обсыпк|засыпк|основан/.test(text)) return "bedding_or_backfill";
  if (/коронк|износ|расходн|вода|смазк|очистк|антикорроз/.test(text)) return "consumable";
  if (row.rowType === "equipment" || /оборуд|установк|экскаватор|каток|самосвал|подъемник|подъёмник|автовыш|механизм/.test(text)) return "equipment_wear";
  if (row.rowType === "transport" || /доставк|вывоз|мобилизац|упаков/.test(text)) return "transport_packaging";
  if (row.rowType === "service") return "auxiliary_material";
  return "primary_material";
}

function isSlotRequired(slot: FamilyMaterialSlotPolicySlot, prompt: string): boolean {
  if (!slot.requiredWhen) return true;
  if (slot.requiredWhen === "prompt_mentions_gate_or_wicket") return GATE_OR_WICKET_RE.test(prompt);
  if (slot.requiredWhen === "prompt_mentions_water_tower_or_tank") return WATER_TOWER_OR_TANK_RE.test(prompt);
  if (slot.requiredWhen === "prompt_mentions_gabion") return GABION_RE.test(prompt);
  return true;
}

function rowMatchesSlot(row: ProfessionalBoqRow, slot: FamilyMaterialSlotPolicySlot): boolean {
  if (!includesAnyToken(row.titleRu, slot.expectedNames)) return false;
  if (slot.expectedUnits.length === 0) return true;
  return slot.expectedUnits.some((unit) => normalizeProfessionalBoqText(unit) === normalizeProfessionalBoqText(row.unit));
}

function materialSlotFromPolicySlot(input: {
  slot: FamilyMaterialSlotPolicySlot;
  rows: readonly ProfessionalBoqRow[];
  required: boolean;
  exactTitleRows?: ReadonlyMap<string, readonly ProfessionalBoqRow[]>;
}): ProfessionalBoqMaterialSlot {
  const candidates = input.slot.slotKey.startsWith("source:")
    ? input.slot.expectedNames.flatMap(
        (name) => input.exactTitleRows?.get(normalizeProfessionalBoqText(name)) ?? [],
      )
    : input.rows;
  const matchedRows = candidates.filter((row) => rowMatchesSlot(row, input.slot));
  const representative = matchedRows[0];
  return {
    slotKey: input.slot.slotKey,
    slotType: professionalBoqMaterialSlotTypeForRow(representative ?? {
      rowType: "material",
      titleRu: input.slot.expectedNames[0] ?? input.slot.slotKey,
    }),
    required: input.required,
    expectedNames: input.slot.expectedNames,
    expectedUnits: input.slot.expectedUnits,
    matchedRowIds: matchedRows.map((row) => row.rowId),
    quantityTraceRequired: true,
    sourceCitationRequired: true,
  };
}

export function buildProfessionalBoqMaterialSlotsFromPolicies(input: {
  policies: readonly FamilyMaterialSlotPolicy[];
  rows: readonly ProfessionalBoqRow[];
  prompt: string;
}): {
  requiredSlots: ProfessionalBoqMaterialSlot[];
  optionalButExpectedSlots: ProfessionalBoqMaterialSlot[];
  missingRequiredSlots: string[];
  missingOptionalButExpectedSlots: string[];
} {
  const requiredSlots: ProfessionalBoqMaterialSlot[] = [];
  const optionalButExpectedSlots: ProfessionalBoqMaterialSlot[] = [];
  const missingRequiredSlots: string[] = [];
  const missingOptionalButExpectedSlots: string[] = [];
  const exactTitleRows = new Map<string, ProfessionalBoqRow[]>();
  for (const row of input.rows) {
    const key = normalizeProfessionalBoqText(row.titleRu);
    exactTitleRows.set(key, [...(exactTitleRows.get(key) ?? []), row]);
  }

  for (const policy of input.policies) {
    for (const slot of policy.requiredSlots) {
      const required = isSlotRequired(slot, input.prompt);
      const resolved = materialSlotFromPolicySlot({
        slot,
        rows: input.rows,
        required,
        exactTitleRows,
      });
      requiredSlots.push(resolved);
      if (required && resolved.matchedRowIds.length < slot.minMatchedRows) {
        missingRequiredSlots.push(slot.slotKey);
      }
    }
    for (const slot of policy.optionalButExpectedSlots) {
      const resolved = materialSlotFromPolicySlot({
        slot,
        rows: input.rows,
        required: false,
        exactTitleRows,
      });
      optionalButExpectedSlots.push(resolved);
      if (resolved.matchedRowIds.length < slot.minMatchedRows) {
        missingOptionalButExpectedSlots.push(slot.slotKey);
      }
    }
  }

  return {
    requiredSlots,
    optionalButExpectedSlots,
    missingRequiredSlots,
    missingOptionalButExpectedSlots,
  };
}

export function professionalBoqMaterialSlotPoliciesFor(input: {
  family: string;
  templateId?: string | null;
  passport?: ProfessionalWorkPassport | null;
}): FamilyMaterialSlotPolicy[] {
  return [
    ...(input.passport ? [buildSourceBackedFamilyMaterialSlotPolicy(input.passport)] : []),
    ...priorityFamilyMaterialSlotPoliciesFor({ family: input.family, templateId: input.templateId }),
  ];
}
