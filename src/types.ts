export type Rating = 0 | 1 | 2 | 3;

export interface VideoItem {
  contentId: string;
  label: string;
  visited: boolean;
  played: boolean;
}

export interface CatalogExample {
  id: string;
  subjectCode: string;
  subject: string;
  exampleNumber: number;
  title: string;
  description: string;
  videoItems: VideoItem[];
  videoCount: number;
}

export interface StoredCatalogExample extends CatalogExample {
  chapterCode: string;
  chapterNumber: number;
  sectionNumber: number;
  importedAt: string;
}

export interface Progress {
  exampleId: string;
  rating: Rating;
  needsReview: boolean;
  memo: string;
  reviewCount: number;
  firstReviewedAt: string | null;
  lastReviewedAt: string | null;
  updatedAt: string;
}

export interface ReviewHistory {
  id?: number;
  exampleId: string;
  rating: Rating;
  needsReview: boolean;
  memoSnapshot: string;
  reviewedAt: string;
}

export interface AppSettings {
  key: "app";
  enabledChapters: Record<string, boolean>;
  theme: "system" | "light" | "dark";
  autoAdvance: boolean;
  lastRoute: string;
}

export interface ImportFile {
  exportedAt?: string;
  pageTitle?: string;
  pageUrl?: string;
  summary?: unknown[];
  examples: CatalogExample[];
}

export interface ImportWarning { type: string; message: string; }
export interface ImportResult {
  examples: StoredCatalogExample[];
  warnings: ImportWarning[];
  subjects: Record<string, number>;
  duplicateIds: string[];
  duplicateContentIds: string[];
}
