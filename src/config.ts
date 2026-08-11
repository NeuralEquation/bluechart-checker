export const SUBJECTS: Record<string, string> = {
  "1": "数学I", "2": "数学II", "3": "数学III",
  "4": "数学A", "5": "数学B", "6": "数学C"
};

export const SUBJECT_ORDER = ["1", "4", "2", "5", "3", "6"];

export const CHAPTERS: Record<string, { subject: string; chapterNumber: number; title: string; defaultEnabled: boolean }> = {
  "11": { subject: "数学I", chapterNumber: 1, title: "数と式", defaultEnabled: false },
  "12": { subject: "数学I", chapterNumber: 2, title: "集合と命題", defaultEnabled: false },
  "13": { subject: "数学I", chapterNumber: 3, title: "二次関数", defaultEnabled: true },
  "14": { subject: "数学I", chapterNumber: 4, title: "図形と計量", defaultEnabled: true },
  "15": { subject: "数学I", chapterNumber: 5, title: "データの分析", defaultEnabled: false },
  "21": { subject: "数学II", chapterNumber: 1, title: "いろいろな式", defaultEnabled: true },
  "22": { subject: "数学II", chapterNumber: 2, title: "複素数と方程式", defaultEnabled: true },
  "23": { subject: "数学II", chapterNumber: 3, title: "図形と方程式", defaultEnabled: true },
  "24": { subject: "数学II", chapterNumber: 4, title: "三角関数", defaultEnabled: true },
  "25": { subject: "数学II", chapterNumber: 5, title: "指数関数と対数関数", defaultEnabled: true },
  "26": { subject: "数学II", chapterNumber: 6, title: "微分法", defaultEnabled: true },
  "27": { subject: "数学II", chapterNumber: 7, title: "積分法", defaultEnabled: true },
  "31": { subject: "数学III", chapterNumber: 1, title: "関数", defaultEnabled: true },
  "32": { subject: "数学III", chapterNumber: 2, title: "極限", defaultEnabled: true },
  "33": { subject: "数学III", chapterNumber: 3, title: "微分法", defaultEnabled: true },
  "34": { subject: "数学III", chapterNumber: 4, title: "微分法の応用", defaultEnabled: true },
  "35": { subject: "数学III", chapterNumber: 5, title: "積分法", defaultEnabled: true },
  "36": { subject: "数学III", chapterNumber: 6, title: "積分法の応用", defaultEnabled: true },
  "41": { subject: "数学A", chapterNumber: 1, title: "場合の数", defaultEnabled: true },
  "42": { subject: "数学A", chapterNumber: 2, title: "確率", defaultEnabled: true },
  "43": { subject: "数学A", chapterNumber: 3, title: "図形の性質", defaultEnabled: true },
  "44": { subject: "数学A", chapterNumber: 4, title: "数学と人間の活動", defaultEnabled: false },
  "51": { subject: "数学B", chapterNumber: 1, title: "数列", defaultEnabled: true },
  "52": { subject: "数学B", chapterNumber: 2, title: "統計的な推測", defaultEnabled: false },
  "61": { subject: "数学C", chapterNumber: 1, title: "平面上のベクトル", defaultEnabled: true },
  "62": { subject: "数学C", chapterNumber: 2, title: "空間のベクトル", defaultEnabled: true },
  "63": { subject: "数学C", chapterNumber: 3, title: "複素数平面", defaultEnabled: true },
  "64": { subject: "数学C", chapterNumber: 4, title: "平面上の曲線", defaultEnabled: true }
};

export const defaultEnabledChapters = () => Object.fromEntries(
  Object.entries(CHAPTERS).map(([code, chapter]) => [code, chapter.defaultEnabled])
);

export const chapterLabel = (code: string) => {
  const found = CHAPTERS[code];
  if (found) return `第${found.chapterNumber}章 ${found.title}`;
  return `${SUBJECTS[code[0]] ?? "数学"}・第${Number(code[1]) || "?"}章`;
};
