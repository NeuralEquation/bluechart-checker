import { describe, expect, it } from "vitest";
import { validateImportFiles } from "../src/importer";

const example = (id: string, number: number, contentId = `${id}01`) => ({
  id, subjectCode: id[0], subject: "譫ｶ遨ｺ謨ｰ蟄ｦ", exampleNumber: number,
  title: `萓矩｡・{number}`, description: `譫ｶ遨ｺ縺ｮ隱ｬ譏・{number}`,
  videoItems: [{ contentId, label: `萓矩｡・{number}`, visited: false, played: false }], videoCount: 1
});

describe("catalog importer", () => {
  it("隍・焚繝輔ぃ繧､繝ｫ繧堤ｵｱ蜷医☆繧・, () => {
    const result = validateImportFiles([{ examples: [example("13010001", 1)] }, { examples: [example("41010001", 1)] }]);
    expect(result.examples).toHaveLength(2);
    expect(result.subjects).toEqual({ "1": 1, "4": 1 });
  });
  it("驥崎､・ｾ矩｡後→蜍慕判繧呈､懷・縺吶ｋ", () => {
    const a = example("13010001", 1);
    const result = validateImportFiles([{ examples: [a, a, example("13010002", 2, a.videoItems[0].contentId)] }]);
    expect(result.duplicateIds).toEqual(["13010001"]);
    expect(result.duplicateContentIds).toEqual(["1301000101"]);
  });
  it("谺逡ｪ縺ｯ諡貞凄縺帙★隴ｦ蜻翫☆繧・, () => {
    const result = validateImportFiles([{ examples: [example("13010001", 1), example("13010003", 3)] }]);
    expect(result.examples).toHaveLength(2);
    expect(result.warnings.some((x) => x.type === "missing")).toBe(true);
  });
  it("examples縺ｮ縺ｪ縺ЙSON繧呈拠蜷ｦ縺吶ｋ", () => {
    expect(() => validateImportFiles([{ hello: true }])).toThrow("examples驟榊・");
  });
});

