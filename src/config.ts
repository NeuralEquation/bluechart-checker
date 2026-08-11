export const SUBJECTS: Record<string, string> = {
  "1": "謨ｰ蟄ｦI", "2": "謨ｰ蟄ｦII", "3": "謨ｰ蟄ｦIII",
  "4": "謨ｰ蟄ｦA", "5": "謨ｰ蟄ｦB", "6": "謨ｰ蟄ｦC"
};

export const SUBJECT_ORDER = ["1", "4", "2", "5", "3", "6"];

export const CHAPTERS: Record<string, { subject: string; chapterNumber: number; title: string; defaultEnabled: boolean }> = {
  "11": { subject: "謨ｰ蟄ｦI", chapterNumber: 1, title: "謨ｰ縺ｨ蠑・, defaultEnabled: false },
  "12": { subject: "謨ｰ蟄ｦI", chapterNumber: 2, title: "髮・粋縺ｨ蜻ｽ鬘・, defaultEnabled: false },
  "13": { subject: "謨ｰ蟄ｦI", chapterNumber: 3, title: "莠梧ｬ｡髢｢謨ｰ", defaultEnabled: true },
  "14": { subject: "謨ｰ蟄ｦI", chapterNumber: 4, title: "蝗ｳ蠖｢縺ｨ險磯㍼", defaultEnabled: true },
  "15": { subject: "謨ｰ蟄ｦI", chapterNumber: 5, title: "繝・・繧ｿ縺ｮ蛻・梵", defaultEnabled: false },
  "21": { subject: "謨ｰ蟄ｦII", chapterNumber: 1, title: "縺・ｍ縺・ｍ縺ｪ蠑・, defaultEnabled: true },
  "22": { subject: "謨ｰ蟄ｦII", chapterNumber: 2, title: "隍・ｴ謨ｰ縺ｨ譁ｹ遞句ｼ・, defaultEnabled: true },
  "23": { subject: "謨ｰ蟄ｦII", chapterNumber: 3, title: "蝗ｳ蠖｢縺ｨ譁ｹ遞句ｼ・, defaultEnabled: true },
  "24": { subject: "謨ｰ蟄ｦII", chapterNumber: 4, title: "荳芽ｧ帝未謨ｰ", defaultEnabled: true },
  "25": { subject: "謨ｰ蟄ｦII", chapterNumber: 5, title: "謖・焚髢｢謨ｰ縺ｨ蟇ｾ謨ｰ髢｢謨ｰ", defaultEnabled: true },
  "26": { subject: "謨ｰ蟄ｦII", chapterNumber: 6, title: "蠕ｮ蛻・ｳ・, defaultEnabled: true },
  "27": { subject: "謨ｰ蟄ｦII", chapterNumber: 7, title: "遨榊・豕・, defaultEnabled: true },
  "31": { subject: "謨ｰ蟄ｦIII", chapterNumber: 1, title: "髢｢謨ｰ", defaultEnabled: true },
  "32": { subject: "謨ｰ蟄ｦIII", chapterNumber: 2, title: "讌ｵ髯・, defaultEnabled: true },
  "33": { subject: "謨ｰ蟄ｦIII", chapterNumber: 3, title: "蠕ｮ蛻・ｳ・, defaultEnabled: true },
  "34": { subject: "謨ｰ蟄ｦIII", chapterNumber: 4, title: "蠕ｮ蛻・ｳ輔・蠢懃畑", defaultEnabled: true },
  "35": { subject: "謨ｰ蟄ｦIII", chapterNumber: 5, title: "遨榊・豕・, defaultEnabled: true },
  "36": { subject: "謨ｰ蟄ｦIII", chapterNumber: 6, title: "遨榊・豕輔・蠢懃畑", defaultEnabled: true },
  "41": { subject: "謨ｰ蟄ｦA", chapterNumber: 1, title: "蝣ｴ蜷医・謨ｰ", defaultEnabled: true },
  "42": { subject: "謨ｰ蟄ｦA", chapterNumber: 2, title: "遒ｺ邇・, defaultEnabled: true },
  "43": { subject: "謨ｰ蟄ｦA", chapterNumber: 3, title: "蝗ｳ蠖｢縺ｮ諤ｧ雉ｪ", defaultEnabled: true },
  "44": { subject: "謨ｰ蟄ｦA", chapterNumber: 4, title: "謨ｰ蟄ｦ縺ｨ莠ｺ髢薙・豢ｻ蜍・, defaultEnabled: false },
  "51": { subject: "謨ｰ蟄ｦB", chapterNumber: 1, title: "謨ｰ蛻・, defaultEnabled: true },
  "52": { subject: "謨ｰ蟄ｦB", chapterNumber: 2, title: "邨ｱ險育噪縺ｪ謗ｨ貂ｬ", defaultEnabled: false },
  "61": { subject: "謨ｰ蟄ｦC", chapterNumber: 1, title: "蟷ｳ髱｢荳翫・繝吶け繝医Ν", defaultEnabled: true },
  "62": { subject: "謨ｰ蟄ｦC", chapterNumber: 2, title: "遨ｺ髢薙・繝吶け繝医Ν", defaultEnabled: true },
  "63": { subject: "謨ｰ蟄ｦC", chapterNumber: 3, title: "隍・ｴ謨ｰ蟷ｳ髱｢", defaultEnabled: true },
  "64": { subject: "謨ｰ蟄ｦC", chapterNumber: 4, title: "蟷ｳ髱｢荳翫・譖ｲ邱・, defaultEnabled: true }
};

export const defaultEnabledChapters = () => Object.fromEntries(
  Object.entries(CHAPTERS).map(([code, chapter]) => [code, chapter.defaultEnabled])
);

export const chapterLabel = (code: string) => {
  const found = CHAPTERS[code];
  if (found) return `隨ｬ${found.chapterNumber}遶 ${found.title}`;
  return `${SUBJECTS[code[0]] ?? "謨ｰ蟄ｦ"}繝ｻ隨ｬ${Number(code[1]) || "?"}遶`;
};

