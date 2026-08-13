import { allBatch001ContractParts, allBatch001Rows } from "./batch001R2ContractSupport";

describe("BATCH001 R2 no padding, clone or double count", () => {
  test("keeps variant resource/parameter signatures distinct and cost ownership disjoint", () => {
    const parts = allBatch001ContractParts();
    for (const group of ["FRAME", "ALIGN", "CLAD"] as const) {
      const members = parts.filter((item) => item.contract.group === group);
      const signatures = members.map((item) => JSON.stringify({
        parameters: item.schema.parameters.map((parameter) => parameter.parameter_id).sort(),
        rows: item.child_assemblies.flatMap((assembly) => assembly.rows.map((row) => row.row_id.split(":batch001:row:")[1])).sort(),
      }));
      expect(new Set(signatures).size).toBe(members.length);
    }
    const rows = allBatch001Rows();
    expect(rows.every(({ row }) => !/padding|generic|bundle_resource/iu.test(`${row.row_id} ${row.title_ru}`))).toBe(true);
    expect(rows.filter(({ parts }) => parts.contract.group === "ALIGN")
      .every(({ row }) => !/perimeter_profiles|primary_profiles|suspensions|anchors/u.test(row.row_id))).toBe(true);
    expect(rows.filter(({ parts }) => parts.contract.group === "CLAD")
      .every(({ row }) => !/profiles|suspensions|anchors|alignment_labor/u.test(row.row_id))).toBe(true);
  });
});
