import {
  applyCalcAutoRules,
  buildCalcPayload,
  incrementCalcRowQty,
  normalizeCalcRows,
  removeCalcRow,
  rowKeyOf,
  setCalcRowQty,
} from "../../src/components/foreman/calcModal.model";
import type { Field } from "../../src/components/foreman/useCalcFields";

describe("calcModal.model", () => {
  it("derives film, area, and volume through auto rules without changing formula order", () => {
    const derivedArea = applyCalcAutoRules(
      {
        height_m: 3,
        length_m: 5,
        area_wall_m2: 2,
      },
      {
        height_m: "3",
        length_m: "5",
      },
      {
        workTypeCode: "ind_concrete",
        filmTouched: false,
        manualKeys: new Set<string>(),
      },
    );

    expect(derivedArea.measures.area_m2).toBe(13);
    expect(derivedArea.inputs.area_m2).toBe("13");
    expect(derivedArea.measures.film_m2).toBeUndefined();
    expect(derivedArea.measures.volume_m3).toBe(39);
    expect(derivedArea.inputs.volume_m3).toBe("39");

    const filmAutoFill = applyCalcAutoRules(
      {
        area_m2: 13,
      },
      {
        area_m2: "13",
      },
      {
        workTypeCode: "ind_concrete",
        filmTouched: false,
        manualKeys: new Set<string>(),
      },
    );

    expect(filmAutoFill.measures.film_m2).toBe(13);
    expect(filmAutoFill.inputs.film_m2).toBe("13");
  });

  it("keeps manual area and film inputs authoritative", () => {
    const result = applyCalcAutoRules(
      {
        area_m2: 20,
        height_m: 2,
        length_m: 4,
        film_m2: 11,
      },
      {
        area_m2: "20",
        film_m2: "11",
      },
      {
        workTypeCode: "ind_concrete",
        filmTouched: true,
        manualKeys: new Set<string>(["area_m2"]),
      },
    );

    expect(result.measures.area_m2).toBe(20);
    expect(result.measures.film_m2).toBe(11);
    expect(result.measures.volume_m3).toBe(40);
  });

  it("builds rpc payloads with multiplier precedence and deterministic loss fallback", () => {
    const fields: Field[] = [
      { key: "area_m2", label: "Area" },
      { key: "multiplier", label: "Multiplier" },
    ];

    expect(
      buildCalcPayload(
        fields,
        {
          area_m2: 12,
          multiplier: 1.15,
        },
        7,
      ),
    ).toEqual({
      area_m2: 12,
      multiplier: 1.15,
    });

    expect(
      buildCalcPayload(
        [{ key: "area_m2", label: "Area" }],
        {
          area_m2: 12,
          waste_pct: 5,
        },
        7,
      ),
    ).toEqual({
      area_m2: 12,
      loss: 5,
    });

    expect(
      buildCalcPayload(
        [{ key: "area_m2", label: "Area" }],
        {
          area_m2: 12,
        },
        7,
      ),
    ).toEqual({
      area_m2: 12,
      loss: 7,
    });
  });

  it("normalizes rows and keeps row editing deterministic", () => {
    const rows = normalizeCalcRows([
      {
        rik_code: "R-1",
        section: "main",
        qty: 2,
        suggested_qty: 3,
        uom_code: "шт",
      },
      {
        rik_code: "R-2",
        section: "main",
        qty: 5,
        uom_code: "м2",
      },
    ]);

    const firstKey = rowKeyOf(rows[0]);

    expect(rows[0]).toEqual(
      expect.objectContaining({
        rik_code: "R-1",
        qty: 2,
        suggested_qty: 3,
        uom_code: "шт",
      }),
    );

    expect(incrementCalcRowQty(rows, firstKey, 2)?.[0].qty).toBe(4);
    expect(setCalcRowQty(rows, firstKey, "7,5")?.[0].qty).toBe(7.5);
    expect(removeCalcRow(rows, firstKey)).toHaveLength(1);
  });
});
