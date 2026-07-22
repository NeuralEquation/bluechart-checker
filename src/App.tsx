import { useEffect, useMemo, useRef, useState } from "react";
import { buildBackup, downloadJson } from "./backup";
import { CHAPTERS, SUBJECT_ORDER, SUBJECTS, chapterLabel } from "./config";
import { clearAll, clearStore, getAllData, importCatalog, restoreBackup, saveProgress, saveSettings } from "./db";
import { readJsonFiles, validateImportFiles } from "./importer";
import type { AppSettings, ImportResult, Progress, Rating, ReviewHistory, StoredCatalogExample } from "./types";

type Route = "home" | "chapters" | "examples" | "check" | "settings";
const RATING_LABELS = ["未", "△", "○", "◎"] as const;
const today = () => new Date().toLocaleDateString("ja-JP");

interface DataState { catalog: StoredCatalogExample[]; progress: Progress[]; history: ReviewHistory[]; settings: AppSettings; }

export default function App() {
  const [data, setData] = useState<DataState | null>(null);
  const [route, setRoute] = useState<Route>("home");
  const [subject, setSubject] = useState("1");
  const [chapter, setChapter] = useState("");
  const [toast, setToast] = useState("");
  const [updateReady, setUpdateReady] = useState(false);

  const reload = async () => setData(await getAllData());
  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    const listener = () => setUpdateReady(true);
    window.addEventListener("pwa-update-ready", listener);
    return () => window.removeEventListener("pwa-update-ready", listener);
  }, []);
  useEffect(() => {
    if (!data) return;
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data?.settings.theme]);

  const go = (next: Route, nextSubject?: string, nextChapter?: string) => {
    if (nextSubject) setSubject(nextSubject);
    if (nextChapter !== undefined) setChapter(nextChapter);
    setRoute(next); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2200); };

  if (!data) return <div className="loading">読み込み中…</div>;
  if (!data.catalog.length) return <SetupPage onComplete={reload} />;

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => go("home")} aria-label="ホームへ"><span className="brand-mark">B</span><span>BlueChart Check</span></button>
      <div className="status-pills"><span className={navigator.onLine ? "online" : "offline"}>{navigator.onLine ? "オンライン" : "オフライン"}</span><span>端末内保存</span></div>
    </header>
    {updateReady && <div className="update-banner">新しいバージョンがあります <button onClick={() => window.dispatchEvent(new CustomEvent("pwa-apply-update"))}>更新する</button></div>}
    <main>
      {route === "home" && <HomePage data={data} go={go} />}
      {route === "chapters" && <ChaptersPage data={data} subjectCode={subject} go={go} />}
      {route === "examples" && <ExamplesPage data={data} subjectCode={subject} chapterCode={chapter} go={go} reload={reload} notify={notify} />}
      {route === "check" && <CheckPage data={data} subjectCode={subject} chapterCode={chapter} go={go} reload={reload} notify={notify} />}
      {route === "settings" && <SettingsPage data={data} reload={reload} notify={notify} />}
    </main>
    <nav className="bottom-nav" aria-label="メインナビゲーション">
      <button className={route === "home" ? "active" : ""} onClick={() => go("home")}><span>⌂</span>ホーム</button>
      <button className={route === "examples" ? "active" : ""} onClick={() => go("examples", subject, "")}><span>☷</span>例題</button>
      <button className={route === "check" ? "active" : ""} onClick={() => go("check", subject, chapter)}><span>✓</span>チェック</button>
      <button className={route === "settings" ? "active" : ""} onClick={() => go("settings")}><span>⚙</span>設定</button>
    </nav>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function SetupPage({ onComplete }: { onComplete: () => Promise<void> }) {
  const [pending, setPending] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const select = async (files: FileList | File[]) => {
    setError(""); setBusy(true);
    try { setPending(validateImportFiles(await readJsonFiles(files))); }
    catch (e) { setError(e instanceof Error ? e.message : "読み込みに失敗しました。"); }
    finally { setBusy(false); }
  };
  const register = async () => { if (!pending) return; setBusy(true); await importCatalog(pending.examples); await onComplete(); };
  return <main className="setup-page">
    <section className="setup-hero"><div className="hero-icon">B</div><p className="eyebrow">PRIVATE STUDY TOOL</p><h1>例題データを<br />この端末に登録</h1><p>選択したJSONは外部へ送信されません。ブラウザー内のIndexedDBにだけ保存します。</p></section>
    <section className="import-panel">
      {!pending ? <>
        <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void select(e.dataTransfer.files); }}>
          <span className="upload-icon">⇧</span><h2>JSONファイルを選択</h2><p>4ファイルをまとめて選択できます</p>
          <button className="primary" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "確認中…" : "ファイルを選ぶ"}</button>
          <input ref={inputRef} type="file" accept="application/json,.json" multiple hidden onChange={(e) => e.target.files && void select(e.target.files)} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <ul className="privacy-list"><li>アプリ本体以外の通信なし</li><li>例題・進捗・メモは端末内保存</li><li>後から設定で更新・バックアップ可能</li></ul>
      </> : <div className="import-review"><p className="eyebrow">IMPORT REVIEW</p><h2>{pending.examples.length.toLocaleString()}例題を確認</h2>
        <div className="subject-summary">{SUBJECT_ORDER.filter((code) => pending.subjects[code]).map((code) => <div key={code}><span>{SUBJECTS[code]}</span><strong>{pending.subjects[code]}</strong></div>)}</div>
        <div className="review-meta"><span>重複 {pending.duplicateIds.length}件</span><span>警告 {pending.warnings.length}件</span></div>
        {pending.warnings.length > 0 && <details><summary>警告を確認</summary><ul>{pending.warnings.slice(0, 40).map((x, i) => <li key={i}>{x.message}</li>)}</ul></details>}
        <button className="primary wide" disabled={busy} onClick={() => void register()}>{busy ? "登録中…" : "この端末に登録する"}</button>
        <button className="text-button" onClick={() => setPending(null)}>選び直す</button>
      </div>}
    </section>
  </main>;
}

const progressMap = (items: Progress[]) => new Map(items.map((x) => [x.exampleId, x]));
const enabledCatalog = (data: DataState) => data.catalog.filter((x) => data.settings.enabledChapters[x.chapterCode] ?? true);
function counts(examples: StoredCatalogExample[], map: Map<string, Progress>) {
  const ratings = [0, 0, 0, 0]; let review = 0;
  examples.forEach((x) => { const p = map.get(x.id); ratings[p?.rating ?? 0]++; if (p?.needsReview) review++; });
  return { ratings, review, done: examples.length - ratings[0], total: examples.length, percent: examples.length ? Math.round(((examples.length - ratings[0]) / examples.length) * 1000) / 10 : 0 };
}

function HomePage({ data, go }: { data: DataState; go: (r: Route, s?: string, c?: string) => void }) {
  const map = progressMap(data.progress); const all = enabledCatalog(data); const overall = counts(all, map);
  const last = data.progress.map((x) => x.lastReviewedAt).filter(Boolean).sort().at(-1);
  return <div className="page home-page"><section className="dashboard-hero"><p className="eyebrow">OVERVIEW</p><h1>今日も、ひとつずつ。</h1><div className="overall-grid"><div className="progress-ring" style={{ "--value": `${overall.percent * 3.6}deg` } as React.CSSProperties}><span><strong>{overall.percent}%</strong><small>確認済み</small></span></div><div className="hero-stats"><div><strong>{overall.total - overall.done}</strong><span>未確認</span></div><div><strong>{overall.review}</strong><span>要復習</span></div><div><strong>{last ? new Date(last).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : "—"}</strong><span>最終確認</span></div></div></div></section>
    <section><div className="section-heading"><div><p className="eyebrow">SUBJECTS</p><h2>科目別の進捗</h2></div><span>{overall.total.toLocaleString()}例題</span></div>
      <div className="subject-grid">{SUBJECT_ORDER.map((code) => { const items = all.filter((x) => x.subjectCode === code); if (!items.length) return null; const c = counts(items, map); return <article className="subject-card" key={code} onClick={() => go("chapters", code)}><div className="subject-card-top"><span className={`subject-badge s${code}`}>{SUBJECTS[code].replace("数学", "")}</span><span>{items.length}例題</span></div><h3>{SUBJECTS[code]}</h3><div className="bar"><i style={{ width: `${c.percent}%` }} /></div><div className="card-stats"><span>◎ {c.ratings[3]}</span><span>○ {c.ratings[2]}</span><span>△ {c.ratings[1]}</span><span>未 {c.ratings[0]}</span></div><div className="card-actions"><button onClick={(e) => { e.stopPropagation(); go("check", code, ""); }}>続きから</button><button onClick={(e) => { e.stopPropagation(); go("examples", code, ""); }}>一覧</button></div></article>; })}</div>
    </section></div>;
}

function ChaptersPage({ data, subjectCode, go }: { data: DataState; subjectCode: string; go: (r: Route, s?: string, c?: string) => void }) {
  const map = progressMap(data.progress); const chapters = [...new Set(data.catalog.filter((x) => x.subjectCode === subjectCode).map((x) => x.chapterCode))].sort();
  return <div className="page"><button className="back" onClick={() => go("home")}>← ホーム</button><p className="eyebrow">{SUBJECTS[subjectCode]}</p><h1>章を選ぶ</h1><div className="chapter-list">{chapters.map((code) => { const items = data.catalog.filter((x) => x.chapterCode === code); const c = counts(items, map); const enabled = data.settings.enabledChapters[code] ?? true; return <article className={`chapter-row ${enabled ? "" : "disabled"}`} key={code} onClick={() => enabled && go("examples", subjectCode, code)}><span className="chapter-number">{CHAPTERS[code]?.chapterNumber ?? code[1]}</span><div><h2>{CHAPTERS[code]?.title ?? chapterLabel(code)}</h2><p>{enabled ? `${items.length}例題 · 要復習 ${c.review}` : "対象外"}</p><div className="bar"><i style={{ width: `${c.percent}%` }} /></div></div><strong>{enabled ? `${c.percent}%` : "—"}</strong></article>; })}</div></div>;
}

function RatingButtons({ value, onChange }: { value: Rating; onChange: (rating: Rating) => void }) {
  return <div className="rating-buttons" role="group" aria-label="評価">{RATING_LABELS.map((label, rating) => <button key={label} aria-label={`評価 ${label}`} aria-pressed={value === rating} className={`rating-${rating} ${value === rating ? "selected" : ""}`} onClick={() => onChange(rating as Rating)}>{label}</button>)}</div>;
}

function ExamplesPage({ data, subjectCode, chapterCode, go, reload, notify }: { data: DataState; subjectCode: string; chapterCode: string; go: (r: Route, s?: string, c?: string) => void; reload: () => Promise<void>; notify: (s: string) => void }) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all"); const [sort, setSort] = useState("number"); const [visible, setVisible] = useState(100);
  const map = progressMap(data.progress);
  const base = enabledCatalog(data).filter((x) => (!subjectCode || x.subjectCode === subjectCode) && (!chapterCode || x.chapterCode === chapterCode));
  const filtered = useMemo(() => base.filter((x) => {
    const p = map.get(x.id); const text = `${x.exampleNumber} ${x.description} ${x.videoItems.map((v) => v.label).join(" ")}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (filter === "unseen" && (p?.rating ?? 0) !== 0) return false;
    if (filter === "triangle" && p?.rating !== 1) return false;
    if (filter === "below2" && (p?.rating ?? 0) > 2) return false;
    if (filter === "review" && !p?.needsReview) return false;
    if (filter === "stale" && p?.lastReviewedAt && Date.now() - Date.parse(p.lastReviewedAt) < 30 * 864e5) return false;
    return true;
  }).sort((a, b) => {
    const pa = map.get(a.id), pb = map.get(b.id);
    if (sort === "old") return (pa?.lastReviewedAt ?? "").localeCompare(pb?.lastReviewedAt ?? "");
    if (sort === "low") return (pa?.rating ?? 0) - (pb?.rating ?? 0) || a.exampleNumber - b.exampleNumber;
    if (sort === "count") return (pa?.reviewCount ?? 0) - (pb?.reviewCount ?? 0);
    return a.subjectCode.localeCompare(b.subjectCode) || a.exampleNumber - b.exampleNumber;
  }), [base, data.progress, query, filter, sort]);
  const update = async (example: StoredCatalogExample, patch: Partial<Progress>, history = false) => { await saveProgress(map.get(example.id), { exampleId: example.id, ...patch }, history); await reload(); notify("保存しました"); };
  return <div className="page"><button className="back" onClick={() => go(chapterCode ? "chapters" : "home", subjectCode)}>← 戻る</button><div className="list-title"><div><p className="eyebrow">EXAMPLES</p><h1>{chapterCode ? chapterLabel(chapterCode) : subjectCode ? SUBJECTS[subjectCode] : "全例題"}</h1></div><button className="primary compact" onClick={() => go("check", subjectCode, chapterCode)}>連続チェック</button></div>
    <div className="filters"><input type="search" placeholder="例題番号・内容を検索" value={query} onChange={(e) => setQuery(e.target.value)} /><div className="filter-row"><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="絞り込み"><option value="all">すべて</option><option value="unseen">未確認</option><option value="triangle">△のみ</option><option value="below2">○以下</option><option value="review">要復習</option><option value="stale">30日以上</option></select><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="並び順"><option value="number">例題番号順</option><option value="old">最終確認が古い順</option><option value="low">評価が低い順</option><option value="count">確認回数が少ない順</option></select><span>{filtered.length}件</span></div></div>
    <div className="example-list">{filtered.slice(0, visible).map((example) => { const p = map.get(example.id); return <article className="example-card" key={example.id}><div className="example-main"><div className="example-number">例題{example.exampleNumber}</div><div><h2>{example.description || example.title}</h2><p>{SUBJECTS[example.subjectCode]} · {chapterLabel(example.chapterCode)} · 第{example.sectionNumber}節</p></div></div><RatingButtons value={p?.rating ?? 0} onChange={(rating) => void update(example, { rating }, true)} /><div className="example-tools"><label className="review-toggle"><input type="checkbox" checked={p?.needsReview ?? false} onChange={(e) => void update(example, { needsReview: e.target.checked })} />要復習</label><span>確認 {p?.reviewCount ?? 0}回</span><span>{p?.lastReviewedAt ? new Date(p.lastReviewedAt).toLocaleDateString("ja-JP") : "未確認"}</span></div><details><summary>動画項目 {example.videoItems.length}件</summary><ul>{example.videoItems.map((v) => <li key={v.contentId}>{v.label}<code>{v.contentId}</code></li>)}</ul></details><label className="memo-label">メモ<textarea defaultValue={p?.memo ?? ""} onBlur={(e) => { if (e.target.value !== (p?.memo ?? "")) void update(example, { memo: e.target.value }); }} placeholder="つまずきや注意点" /></label></article>; })}</div>
    {visible < filtered.length && <button className="load-more" onClick={() => setVisible((x) => x + 100)}>さらに100件表示</button>}</div>;
}

function CheckPage({ data, subjectCode, chapterCode, go, reload, notify }: { data: DataState; subjectCode: string; chapterCode: string; go: (r: Route, s?: string, c?: string) => void; reload: () => Promise<void>; notify: (s: string) => void }) {
  const map = progressMap(data.progress);
  const [queue] = useState(() => enabledCatalog(data)
    .filter((x) => (!subjectCode || x.subjectCode === subjectCode) && (!chapterCode || x.chapterCode === chapterCode))
    .sort((a, b) => (map.get(a.id)?.rating ?? 0) - (map.get(b.id)?.rating ?? 0) || a.exampleNumber - b.exampleNumber));
  const [index, setIndex] = useState(0); const [undo, setUndo] = useState<{ example: StoredCatalogExample; previous?: Progress } | null>(null);
  const current = queue[index]; const p = current ? map.get(current.id) : undefined;
  const apply = async (patch: Partial<Progress>, advance = false) => { if (!current) return; setUndo({ example: current, previous: p }); await saveProgress(p, { exampleId: current.id, ...patch }, patch.rating !== undefined); await reload(); if (advance && data.settings.autoAdvance) setIndex((x) => Math.min(x + 1, queue.length - 1)); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => { const target = e.target as HTMLElement; if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return; if (e.key === "1") void apply({ rating: 1 }, true); if (e.key === "2") void apply({ rating: 2 }, true); if (e.key === "3") void apply({ rating: 3 }, true); if (e.key.toLowerCase() === "r") void apply({ needsReview: !p?.needsReview }); if (e.key === "ArrowRight") setIndex((x) => Math.min(x + 1, queue.length - 1)); if (e.key === "ArrowLeft") setIndex((x) => Math.max(0, x - 1)); };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });
  const undoOnce = async () => { if (!undo) return; await saveProgress(map.get(undo.example.id), { exampleId: undo.example.id, rating: undo.previous?.rating ?? 0, needsReview: undo.previous?.needsReview ?? false, memo: undo.previous?.memo ?? "" }); setUndo(null); await reload(); notify("直前の操作を戻しました"); };
  if (!current) return <div className="page"><h1>対象の例題がありません</h1></div>;
  return <div className="check-page"><div className="check-top"><button className="back" onClick={() => go("examples", subjectCode, chapterCode)}>× 終了</button><span>{index + 1} / {queue.length}</span><button className="text-button" disabled={!undo} onClick={() => void undoOnce()}>↶ 取り消す</button></div><div className="check-progress"><i style={{ width: `${((index + 1) / queue.length) * 100}%` }} /></div><article className="check-card"><p className="eyebrow">{SUBJECTS[current.subjectCode]} · {chapterLabel(current.chapterCode)}</p><div className="check-number">例題{current.exampleNumber}</div><h1>{current.description || current.title}</h1><p className="section-note">第{current.sectionNumber}節 · 動画項目 {current.videoItems.length}件</p><div className="large-ratings"><button onClick={() => void apply({ rating: 1 }, true)}><kbd>1</kbd>△<small>解説が必要</small></button><button onClick={() => void apply({ rating: 2 }, true)}><kbd>2</kbd>○<small>自力で解ける</small></button><button onClick={() => void apply({ rating: 3 }, true)}><kbd>3</kbd>◎<small>説明できる</small></button></div><button className={`review-big ${p?.needsReview ? "active" : ""}`} onClick={() => void apply({ needsReview: !p?.needsReview })}>☆ 要復習 {p?.needsReview ? "ON" : "OFF"}</button><label className="memo-label">メモ<textarea value={p?.memo ?? ""} onChange={(e) => void apply({ memo: e.target.value })} placeholder="この例題の注意点" /></label></article><div className="check-nav"><button disabled={index === 0} onClick={() => setIndex((x) => x - 1)}>← 前へ</button><button onClick={() => setIndex((x) => Math.min(x + 1, queue.length - 1))}>保留して次へ →</button></div></div>;
}

function SettingsPage({ data, reload, notify }: { data: DataState; reload: () => Promise<void>; notify: (s: string) => void }) {
  const importRef = useRef<HTMLInputElement>(null), restoreRef = useRef<HTMLInputElement>(null);
  const patchSettings = async (patch: Partial<AppSettings>) => { await saveSettings({ ...data.settings, ...patch }); await reload(); };
  const importMore = async (files: FileList) => { const result = validateImportFiles(await readJsonFiles(files)); await importCatalog(result.examples); await reload(); notify(`${result.examples.length}例題を登録しました`); };
  const restore = async (file: File, mode: "merge" | "replace") => { try { await restoreBackup(JSON.parse(await file.text()), mode); await reload(); notify("復元しました"); } catch (e) { alert(e instanceof Error ? e.message : "復元できませんでした"); } };
  const confirmAction = async (message: string, action: () => Promise<void>) => { if (!confirm(message)) return; await action(); await reload(); notify("完了しました"); };
  return <div className="page settings-page"><p className="eyebrow">SETTINGS</p><h1>設定とデータ</h1><section className="settings-section"><h2>対象範囲</h2><p>対象外の章は進捗率の分母に含まれません。進捗データは削除されません。</p><div className="scope-list">{Object.entries(CHAPTERS).filter(([code]) => data.catalog.some((x) => x.chapterCode === code)).map(([code, c]) => <label key={code}><span><strong>{c.subject}</strong>{chapterLabel(code)}</span><input type="checkbox" checked={data.settings.enabledChapters[code] ?? c.defaultEnabled} onChange={(e) => void patchSettings({ enabledChapters: { ...data.settings.enabledChapters, [code]: e.target.checked } })} /></label>)}</div></section>
    <section className="settings-section"><h2>表示と操作</h2><label className="setting-row"><span>テーマ</span><select value={data.settings.theme} onChange={(e) => void patchSettings({ theme: e.target.value as AppSettings["theme"] })}><option value="system">システム</option><option value="light">ライト</option><option value="dark">ダーク</option></select></label><label className="setting-row"><span>評価後に自動で次へ</span><input type="checkbox" checked={data.settings.autoAdvance} onChange={(e) => void patchSettings({ autoAdvance: e.target.checked })} /></label></section>
    <section className="settings-section"><h2>バックアップ</h2><div className="button-stack"><button onClick={() => downloadJson(buildBackup(data, false), `bluechart-progress-backup-${today().replaceAll("/", "-")}.json`)}>進捗のみ書き出す</button><button onClick={() => { if (confirm("完全バックアップには例題カタログが含まれます。安全な場所へ保存してください。")) downloadJson(buildBackup(data, true), `bluechart-full-backup-${today().replaceAll("/", "-")}.json`); }}>完全バックアップ</button><button onClick={() => restoreRef.current?.click()}>バックアップを復元</button><input ref={restoreRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void restore(file, confirm("OK: 既存データを置換 / キャンセル: 新しいデータをマージ") ? "replace" : "merge"); }} /></div></section>
    <section className="settings-section"><h2>カタログ</h2><p>{data.catalog.length.toLocaleString()}例題をこの端末に保存中</p><button onClick={() => importRef.current?.click()}>カタログを追加・更新</button><input ref={importRef} type="file" accept="application/json,.json" multiple hidden onChange={(e) => e.target.files && void importMore(e.target.files)} /></section>
    <section className="settings-section danger-zone"><h2>データ削除</h2><div className="button-stack"><button onClick={() => void confirmAction("進捗だけを初期化しますか？", () => clearStore("progress"))}>進捗のみ初期化</button><button onClick={() => void confirmAction("履歴だけを削除しますか？", () => clearStore("history"))}>履歴のみ削除</button><button onClick={() => void confirmAction("カタログだけを削除しますか？進捗は残ります。", () => clearStore("catalog"))}>カタログのみ削除</button><button className="danger" onClick={() => { const text = prompt("全データを削除するには「全削除」と入力してください"); if (text === "全削除") void confirmAction("本当にすべて削除しますか？", clearAll); }}>全データ削除</button></div></section>
  </div>;
}
