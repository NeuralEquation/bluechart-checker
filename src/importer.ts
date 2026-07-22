import type { CatalogExample, ImportFile, ImportResult, ImportWarning, StoredCatalogExample } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function validateImportFiles(values: unknown[]): ImportResult {
  const warnings: ImportWarning[] = [];
  const duplicateIds: string[] = [];
  const duplicateContentIds: string[] = [];
  const seenIds = new Set<string>();
  const seenContentIds = new Set<string>();
  const examples: StoredCatalogExample[] = [];
  const subjects: Record<string, number> = {};
  const importedAt = new Date().toISOString();

  values.forEach((value, fileIndex) => {
    if (!isObject(value) || !Array.isArray((value as Partial<ImportFile>).examples)) {
      throw new Error(`ファイル${fileIndex + 1}: examples配列がありません。`);
    }
    for (const raw of (value as unknown as ImportFile).examples) {
      if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.exampleNumber !== "number" ||
          typeof raw.subjectCode !== "string" || !Array.isArray(raw.videoItems)) {
        throw new Error(`ファイル${fileIndex + 1}: 必須項目が不正な例題があります。`);
      }
      if (seenIds.has(raw.id)) {
        duplicateIds.push(raw.id);
        continue;
      }
      seenIds.add(raw.id);
      if (!/^\d{8}$/.test(raw.id)) warnings.push({ type: "id", message: `${raw.id}: 例題IDが8桁ではありません。` });

      const cleanVideos = raw.videoItems.filter((video) => {
        if (!video || typeof video.contentId !== "string") return false;
        if (seenContentIds.has(video.contentId)) {
          duplicateContentIds.push(video.contentId);
          return false;
        }
        seenContentIds.add(video.contentId);
        if (!/^\d{10}$/.test(video.contentId)) warnings.push({ type: "contentId", message: `${video.contentId}: 動画IDが10桁ではありません。` });
        return true;
      });
      if (typeof raw.videoCount === "number" && raw.videoCount !== raw.videoItems.length) {
        warnings.push({ type: "videoCount", message: `${raw.id}: videoCountと配列件数が一致しません。` });
      }
      const chapterCode = raw.id.slice(0, 2);
      examples.push({
        ...(raw as CatalogExample), videoItems: cleanVideos, videoCount: cleanVideos.length,
        chapterCode, chapterNumber: Number(raw.id.slice(1, 2)),
        sectionNumber: Number(raw.id.slice(2, 4)), importedAt
      });
      subjects[raw.subjectCode] = (subjects[raw.subjectCode] ?? 0) + 1;
    }
  });

  for (const subjectCode of Object.keys(subjects)) {
    const numbers = examples.filter((x) => x.subjectCode === subjectCode).map((x) => x.exampleNumber).sort((a, b) => a - b);
    if (!numbers.length) continue;
    const set = new Set(numbers);
    const missing: number[] = [];
    for (let n = numbers[0]; n <= numbers[numbers.length - 1]; n++) if (!set.has(n)) missing.push(n);
    if (missing.length) warnings.push({ type: "missing", message: `科目コード${subjectCode}: 欠番 ${missing.join(", ")}` });
  }
  if (duplicateIds.length) warnings.push({ type: "duplicate", message: `重複例題ID ${duplicateIds.length}件` });
  if (duplicateContentIds.length) warnings.push({ type: "duplicateContent", message: `重複動画ID ${duplicateContentIds.length}件` });
  return { examples, warnings, subjects, duplicateIds, duplicateContentIds };
}

export async function readJsonFiles(files: FileList | File[]): Promise<unknown[]> {
  const list = Array.from(files);
  if (!list.length) throw new Error("JSONファイルを選択してください。");
  for (const file of list) if (!file.name.toLowerCase().endsWith(".json")) throw new Error(`${file.name}: JSONファイルではありません。`);
  return Promise.all(list.map(async (file) => {
    try { return JSON.parse(await file.text()); }
    catch { throw new Error(`${file.name}: JSONとして読み取れません。`); }
  }));
}
