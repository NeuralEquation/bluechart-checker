import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { defaultEnabledChapters } from "./config";
import type { AppSettings, Progress, Rating, ReviewHistory, StoredCatalogExample } from "./types";

interface BlueChartDB extends DBSchema {
  catalog: { key: string; value: StoredCatalogExample; indexes: { subjectCode: string; chapterCode: string; exampleNumber: number } };
  progress: { key: string; value: Progress };
  history: { key: number; value: ReviewHistory; indexes: { exampleId: string; reviewedAt: string } };
  settings: { key: string; value: AppSettings };
}

let dbPromise: Promise<IDBPDatabase<BlueChartDB>> | null = null;
export function getDb() {
  dbPromise ??= openDB<BlueChartDB>("bluechart-checker", 1, {
    upgrade(db) {
      const catalog = db.createObjectStore("catalog", { keyPath: "id" });
      catalog.createIndex("subjectCode", "subjectCode");
      catalog.createIndex("chapterCode", "chapterCode");
      catalog.createIndex("exampleNumber", "exampleNumber");
      db.createObjectStore("progress", { keyPath: "exampleId" });
      const history = db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
      history.createIndex("exampleId", "exampleId");
      history.createIndex("reviewedAt", "reviewedAt");
      db.createObjectStore("settings", { keyPath: "key" });
    }
  });
  return dbPromise;
}

export async function getAllData() {
  const db = await getDb();
  const [catalog, progress, history, stored] = await Promise.all([
    db.getAll("catalog"), db.getAll("progress"), db.getAll("history"), db.get("settings", "app")
  ]);
  const settings: AppSettings = stored ?? { key: "app", enabledChapters: defaultEnabledChapters(), theme: "system", autoAdvance: true, lastRoute: "home" };
  return { catalog, progress, history, settings };
}

export async function importCatalog(examples: StoredCatalogExample[]) {
  const db = await getDb();
  const tx = db.transaction("catalog", "readwrite");
  await Promise.all(examples.map((example) => tx.store.put(example)));
  await tx.done;
}

export async function saveSettings(settings: AppSettings) { await (await getDb()).put("settings", settings); }

export async function saveProgress(current: Progress | undefined, patch: Partial<Pick<Progress, "rating" | "needsReview" | "memo">> & { exampleId: string }, addHistory = false) {
  const now = new Date().toISOString();
  const base: Progress = current ?? { exampleId: patch.exampleId, rating: 0, needsReview: false, memo: "", reviewCount: 0, firstReviewedAt: null, lastReviewedAt: null, updatedAt: now };
  const ratingChanged = patch.rating !== undefined && patch.rating !== base.rating;
  const next: Progress = {
    ...base, ...patch, updatedAt: now,
    reviewCount: ratingChanged ? base.reviewCount + 1 : base.reviewCount,
    firstReviewedAt: ratingChanged ? (base.firstReviewedAt ?? now) : base.firstReviewedAt,
    lastReviewedAt: ratingChanged ? now : base.lastReviewedAt
  };
  const db = await getDb();
  const tx = db.transaction(["progress", "history"], "readwrite");
  await tx.objectStore("progress").put(next);
  if (ratingChanged || addHistory) await tx.objectStore("history").add({ exampleId: next.exampleId, rating: next.rating as Rating, needsReview: next.needsReview, memoSnapshot: next.memo, reviewedAt: now });
  await tx.done;
  return next;
}

export async function clearStore(name: "catalog" | "progress" | "history") { await (await getDb()).clear(name); }
export async function clearAll() {
  const db = await getDb();
  const tx = db.transaction(["catalog", "progress", "history", "settings"], "readwrite");
  await Promise.all(Array.from(tx.objectStoreNames).map((name) => tx.objectStore(name).clear()));
  await tx.done;
}

export async function restoreBackup(value: unknown, mode: "merge" | "replace") {
  if (!value || typeof value !== "object") throw new Error("バックアップ形式が不正です。");
  const data = value as { catalog?: StoredCatalogExample[]; progress?: Progress[]; history?: ReviewHistory[]; settings?: AppSettings };
  if (!Array.isArray(data.progress) && !Array.isArray(data.catalog)) throw new Error("復元できるデータがありません。");
  const db = await getDb();
  const tx = db.transaction(["catalog", "progress", "history", "settings"], "readwrite");
  if (mode === "replace") await Promise.all(Array.from(tx.objectStoreNames).map((name) => tx.objectStore(name).clear()));
  for (const item of data.catalog ?? []) await tx.objectStore("catalog").put(item);
  for (const item of data.progress ?? []) {
    const old = await tx.objectStore("progress").get(item.exampleId);
    if (!old || mode === "replace" || item.updatedAt > old.updatedAt) await tx.objectStore("progress").put(item);
  }
  for (const item of data.history ?? []) await tx.objectStore("history").put(item);
  if (data.settings) await tx.objectStore("settings").put(data.settings);
  await tx.done;
}
