import { describe, expect, it } from "vitest";
import { validateImportFiles } from "../src/importer";

const example = (id: string, number: number, contentId = `${id}01`) => ({
  id, subjectCode: id[0], subject: "架空数学", exampleNumber: number,
  title: `例題${number}`, description: `架空の説明${number}`,
  videoItems: [{ contentId, label: `例題${number}`, visited: false, played: false }], videoCount: 1
});

describe("catalog importer", () => {
  it("複数ファイルを統合する", () => {
    const result = validateImportFiles([{ examples: [example("13010001", 1)] }, { examples: [example("41010001", 1)] }]);
    expect(result.examples).toHaveLength(2);
    expect(result.subjects).toEqual({ "1": 1, "4": 1 });
  });
  it("重複例題と動画を検出する", () => {
    const a = example("13010001", 1);
    const result = validateImportFiles([{ examples: [a, a, example("13010002", 2, a.videoItems[0].contentId)] }]);
    expect(result.duplicateIds).toEqual(["13010001"]);
    expect(result.duplicateContentIds).toEqual(["1301000101"]);
  });
  it("欠番は拒否せず警告する", () => {
    const result = validateImportFiles([{ examples: [example("13010001", 1), example("13010003", 3)] }]);
    expect(result.examples).toHaveLength(2);
    expect(result.warnings.some((x) => x.type === "missing")).toBe(true);
  });
  it("examplesのないJSONを拒否する", () => {
    expect(() => validateImportFiles([{ hello: true }])).toThrow("examples配列");
  });
});
