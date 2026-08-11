import type { AppSettings, Progress, ReviewHistory, StoredCatalogExample } from "./types";

export function buildBackup(data: { catalog: StoredCatalogExample[]; progress: Progress[]; history: ReviewHistory[]; settings: AppSettings }, full: boolean) {
  return {
    schemaVersion: 1, appVersion: "1.0.0", exportedAt: new Date().toISOString(),
    ...(full ? { catalog: data.catalog } : {}), progress: data.progress, history: data.history, settings: data.settings
  };
}

export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
