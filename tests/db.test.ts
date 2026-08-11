import { beforeEach, describe, expect, it } from "vitest";
import { getAllData, getDb, saveProgress, saveSettings } from "../src/db";

describe("progress repository", () => {
  beforeEach(async () => {
    const db = await getDb();
    await db.clear("progress"); await db.clear("history"); await db.clear("settings");
  });
  it("評価と要復習を独立して保存する", async () => {
    const first = await saveProgress(undefined, { exampleId: "13010001", rating: 1 }, true);
    const second = await saveProgress(first, { exampleId: "13010001", needsReview: true });
    expect(second.rating).toBe(1); expect(second.needsReview).toBe(true); expect(second.reviewCount).toBe(1);
    expect(await (await getDb()).count("history")).toBe(1);
  });
  it("メモだけでは履歴を増やさない", async () => {
    const saved = await saveProgress(undefined, { exampleId: "13010001", memo: "架空メモ" });
    expect(saved.memo).toBe("架空メモ"); expect(await (await getDb()).count("history")).toBe(0);
  });
  it("古い設定を読み込んでも復帰情報を補完する", async () => {
    await saveSettings({ key: "app", enabledChapters: {}, theme: "system", autoAdvance: true, lastRoute: "home" });
    const { settings } = await getAllData();
    expect(settings.lastSubjectCode).toBe("1");
    expect(settings.listPreferences).toEqual({});
  });
  it("連続したメモと評価の保存で片方を失わない", async () => {
    const first = await saveProgress(undefined, { exampleId: "13010001", memo: "軸を確認" });
    await Promise.all([
      saveProgress(first, { exampleId: "13010001", memo: "定義域も確認" }),
      saveProgress(first, { exampleId: "13010001", rating: 2 }, true)
    ]);
    const saved = await (await getDb()).get("progress", "13010001");
    expect(saved?.memo).toBe("定義域も確認");
    expect(saved?.rating).toBe(2);
  });
});
