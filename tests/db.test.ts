import { beforeEach, describe, expect, it } from "vitest";
import { getAllData, getDb, saveProgress, saveSettings } from "../src/db";

describe("progress repository", () => {
  beforeEach(async () => {
    const db = await getDb();
    await db.clear("progress"); await db.clear("history"); await db.clear("settings");
  });
  it("隧穂ｾ｡縺ｨ隕∝ｾｩ鄙偵ｒ迢ｬ遶九＠縺ｦ菫晏ｭ倥☆繧・, async () => {
    const first = await saveProgress(undefined, { exampleId: "13010001", rating: 1 }, true);
    const second = await saveProgress(first, { exampleId: "13010001", needsReview: true });
    expect(second.rating).toBe(1); expect(second.needsReview).toBe(true); expect(second.reviewCount).toBe(1);
    expect(await (await getDb()).count("history")).toBe(1);
  });
  it("繝｡繝｢縺縺代〒縺ｯ螻･豁ｴ繧貞｢励ｄ縺輔↑縺・, async () => {
    const saved = await saveProgress(undefined, { exampleId: "13010001", memo: "譫ｶ遨ｺ繝｡繝｢" });
    expect(saved.memo).toBe("譫ｶ遨ｺ繝｡繝｢"); expect(await (await getDb()).count("history")).toBe(0);
  });
  it("蜿､縺・ｨｭ螳壹ｒ隱ｭ縺ｿ霎ｼ繧薙〒繧ょｾｩ蟶ｰ諠・ｱ繧定｣懷ｮ後☆繧・, async () => {
    await saveSettings({ key: "app", enabledChapters: {}, theme: "system", autoAdvance: true, lastRoute: "home" });
    const { settings } = await getAllData();
    expect(settings.lastSubjectCode).toBe("1");
    expect(settings.listPreferences).toEqual({});
  });
  it("騾｣邯壹＠縺溘Γ繝｢縺ｨ隧穂ｾ｡縺ｮ菫晏ｭ倥〒迚・婿繧貞､ｱ繧上↑縺・, async () => {
    const first = await saveProgress(undefined, { exampleId: "13010001", memo: "霆ｸ繧堤｢ｺ隱・ });
    await Promise.all([
      saveProgress(first, { exampleId: "13010001", memo: "螳夂ｾｩ蝓溘ｂ遒ｺ隱・ }),
      saveProgress(first, { exampleId: "13010001", rating: 2 }, true)
    ]);
    const saved = await (await getDb()).get("progress", "13010001");
    expect(saved?.memo).toBe("螳夂ｾｩ蝓溘ｂ遒ｺ隱・);
    expect(saved?.rating).toBe(2);
  });
});

