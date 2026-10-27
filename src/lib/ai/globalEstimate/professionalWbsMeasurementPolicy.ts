import type { GlobalUnitInput } from "./globalEstimateTypes";

export type ProfessionalWbsMeasurementUnit = GlobalUnitInput["normalizedUnit"] | "shift" | "trip";

export type ProfessionalWbsScopeInput = {
  workKey: string;
  workTitle: string;
  category: string;
  formulaOutputs?: Record<string, number>;
};

export type ProfessionalWbsMeasurementRole =
  | "planning"
  | "materials"
  | "execution"
  | "equipment"
  | "delivery"
  | "quality";

export type ProfessionalWbsMeasurement = {
  unit: ProfessionalWbsMeasurementUnit;
  quantity: number;
  quantityFormula?: string;
  formulaTrace?: string;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isMetalProfessionalWbsScope(input: ProfessionalWbsScopeInput): boolean {
  const text = `${input.category} ${input.workKey} ${input.workTitle}`.toLocaleLowerCase("ru-RU");
  return input.category === "metalworks" ||
    /metal|steel|\u043c\u0435\u0442\u0430\u043b\u043b|\u0441\u0442\u0430\u043b\u044c|\u0444\u0435\u0440\u043c|\u0431\u0430\u043b\u043a|\u043a\u0430\u0440\u043a\u0430\u0441|\u0441\u0432\u0430\u0440\u043d/u.test(text);
}

function metalScopeMassKg(input: {
  baseQuantity: number;
  measuredUnit: GlobalUnitInput["normalizedUnit"];
}): ProfessionalWbsMeasurement | null {
  if (input.measuredUnit === "kg") {
    return {
      unit: "kg",
      quantity: round2(input.baseQuantity),
      quantityFormula: "base_quantity_kg",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=kg`,
    };
  }
  if (input.measuredUnit === "ton") {
    return {
      unit: "kg",
      quantity: round2(input.baseQuantity * 1000),
      quantityFormula: "base_quantity_ton * 1000",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=ton; kg_per_ton=1000`,
    };
  }
  // A length, item count, volume or area does not determine structural-steel
  // mass without a selected section/assembly takeoff. Keep the caller's
  // measured quantity instead of inventing a universal kg allowance.
  return null;
}

function defaultProfessionalWbsMeasurement(input: {
  unit: ProfessionalWbsMeasurementUnit;
  quantity: number;
}): ProfessionalWbsMeasurement {
  return {
    unit: input.unit,
    quantity: input.quantity,
  };
}

function firstFiniteFormulaOutput(
  outputs: Record<string, number> | undefined,
  keys: readonly string[],
): { key: string; value: number } | null {
  if (!outputs) return null;
  for (const key of keys) {
    const value = outputs[key];
    if (Number.isFinite(value) && value > 0) return { key, value };
  }
  return null;
}

function isConcreteProfessionalWbsScope(input: ProfessionalWbsScopeInput): boolean {
  const text = `${input.category} ${input.workKey} ${input.workTitle}`.toLocaleLowerCase("ru-RU");
  return input.workKey === "concrete_pedestal_pour" ||
    input.category === "foundation" ||
    /concrete|\u0431\u0435\u0442\u043e\u043d|foundation_concrete|\u0436\u0435\u043b\u0435\u0437\u043e\u0431\u0435\u0442\u043e\u043d/u.test(text);
}

function concreteScopeVolumeM3(input: {
  baseQuantity: number;
  measuredUnit: GlobalUnitInput["normalizedUnit"];
  formulaOutputs?: Record<string, number>;
}): ProfessionalWbsMeasurement | null {
  const formulaVolume = firstFiniteFormulaOutput(input.formulaOutputs, [
    "concreteWithWasteM3",
    "volumeTotalM3",
    "concreteVolumeM3",
  ]);
  if (formulaVolume) {
    return {
      unit: "m3",
      quantity: round2(formulaVolume.value),
      quantityFormula: formulaVolume.key,
      formulaTrace: `${formulaVolume.key}=${formulaVolume.value}; unit=m3`,
    };
  }
  const volumeEach = firstFiniteFormulaOutput(input.formulaOutputs, ["volumeEachM3"]);
  if (volumeEach && input.measuredUnit === "pcs") {
    return {
      unit: "m3",
      quantity: round2(volumeEach.value * input.baseQuantity),
      quantityFormula: "volumeEachM3 * pcs",
      formulaTrace: `volumeEachM3=${volumeEach.value}; base_quantity=${input.baseQuantity}; unit=pcs`,
    };
  }
  if (input.measuredUnit === "m3") {
    return {
      unit: "m3",
      quantity: round2(input.baseQuantity),
      quantityFormula: "base_quantity_m3",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=m3`,
    };
  }
  return null;
}

export function professionalWbsMeasurement(input: ProfessionalWbsScopeInput & {
  baseQuantity: number;
  measuredUnit: GlobalUnitInput["normalizedUnit"];
  defaultUnit: ProfessionalWbsMeasurementUnit;
  defaultQuantity: number;
  role: ProfessionalWbsMeasurementRole;
  specKey: string;
}): ProfessionalWbsMeasurement {
  const liftingEquipmentPhase =
    /^(lifting|crane_operations|heavy_lifting_plan|equipment_mobilization)$/i.test(input.specKey);
  if (liftingEquipmentPhase && input.role === "equipment") {
    return {
      unit: "shift",
      quantity: Math.max(1, Math.ceil(input.baseQuantity)),
      quantityFormula: "ceil(base_quantity_lifting_shifts)",
      formulaTrace:
        `base_quantity=${input.baseQuantity}; wbs_role=equipment; ` +
        `wbs_phase=${input.specKey}; lifting_equipment_unit=shift`,
    };
  }
  const metalPhase = /(?:^|_)(?:steelwork|structural_steel|metalwork)(?:_|$)/i.test(input.specKey);
  if (metalPhase || isMetalProfessionalWbsScope(input)) {
    if (input.role === "materials" || input.role === "execution") {
      const mass = metalScopeMassKg(input);
      if (mass) {
        return {
          ...mass,
          formulaTrace: `${mass.formulaTrace}; wbs_role=${input.role}; wbs_phase=${input.specKey}`,
        };
      }
    }
    if (input.role === "planning" || input.role === "quality" || input.role === "equipment") {
      return {
        unit: "set",
        quantity: 1,
        quantityFormula: "1",
        formulaTrace: `wbs_role=${input.role}; wbs_phase=${input.specKey}; deliverable_or_equipment_package=set`,
      };
    }
  }
  const concretePhase = /(?:^|_)(?:concrete|foundations?)(?:_|$)/i.test(input.specKey);
  if (concretePhase || isConcreteProfessionalWbsScope(input)) {
    const concrete = concreteScopeVolumeM3(input);
    if (concrete && (input.role === "materials" || input.role === "execution")) {
      return {
        ...concrete,
        formulaTrace: `${concrete.formulaTrace}; wbs_role=${input.role}; wbs_phase=${input.specKey}`,
      };
    }
    if (input.role === "planning" || input.role === "quality" || input.role === "equipment") {
      return {
        unit: "set",
        quantity: 1,
        quantityFormula: "1",
        formulaTrace: `wbs_role=${input.role}; wbs_phase=${input.specKey}; deliverable_or_equipment_package=set`,
      };
    }
  }
  return defaultProfessionalWbsMeasurement({
    unit: input.defaultUnit,
    quantity: input.defaultQuantity,
  });
}
