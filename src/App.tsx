import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildBackup, downloadJson } from "./backup";
import { CHAPTERS, SUBJECT_ORDER, SUBJECTS, chapterLabel } from "./config";
import { clearAll, clearStore, getAllData, importCatalog, restoreBackup, saveProgress, saveSettings } from "./db";
import { readJsonFiles, validateImportFiles } from "./importer";
import type { AppSettings, ImportResult, ListPreferences, Progress, Rating, ReviewHistory, StoredCatalogExample } from "./types";

type Route = "home" | "chapters" | "examples" | "check" | "settings";
const RATING_LABELS = ["譛ｪ", "笆ｳ", "笳・, "笳・] as const;
const today = () => new Date().toLocaleDateString("ja-JP");
const RESUMABLE_ROUTES: Route[] = ["chapters", "examples", "check"];

interface DataState { catalog: StoredCatalogExample[]; progress: Progress[]; history: ReviewHistory[]; settings: AppSettings; }

export default function App() {
  const [data, setData] = useState<DataState | null>(null);
  const [route, setRoute] = useState<Route>("home");
  const [subject, setSubject] = useState("1");
  const [chapter, setChapter] = useState("");
  const [toast, setToast] = useState("");
  const [updateReady, setUpdateReady] = useState(false);
  const restoredRef = useRef(false);

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

  useEffect(() => {
    if (!data?.catalog.length || restoredRef.current) return;
    restoredRef.current = true;
    const savedRoute = data.settings.lastRoute as Route;
    if (!RESUMABLE_ROUTES.includes(savedRoute)) return;
    setSubject(data.settings.lastSubjectCode ?? "1");
    setChapter(data.settings.lastChapterCode ?? "");
    setRoute(savedRoute);
  }, [data]);

  const patchSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((current) => {
      if (!current) return current;
      const settings = { ...current.settings, ...patch };
      void saveSettings(settings);
      return { ...current, settings };
    });
  }, []);

  const go = (next: Route, nextSubject?: string, nextChapter?: string) => {
    const destinationSubject = nextSubject ?? subject;
    const destinationChapter = nextChapter !== undefined ? nextChapter : chapter;
    if (nextSubject !== undefined) setSubject(nextSubject);
    if (nextChapter !== undefined) setChapter(nextChapter);
    if (next !== "settings") patchSettings({
      lastRoute: next,
      lastSubjectCode: destinationSubject,
      lastChapterCode: destinationChapter
    });
    setRoute(next); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2200); };

  if (!data) return <div className="loading">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ窶ｦ</div>;
  if (!data.catalog.length) return <SetupPage onComplete={reload} />;

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => go("home")} aria-label="繝帙・繝縺ｸ"><span className="brand-mark">B</span><span>BlueChart Check</span></button>
      <div className="status-pills"><span className={navigator.onLine ? "online" : "offline"}>{navigator.onLine ? "繧ｪ繝ｳ繝ｩ繧､繝ｳ" : "繧ｪ繝輔Λ繧､繝ｳ"}</span><span>遶ｯ譛ｫ蜀・ｿ晏ｭ・/span></div>
    </header>
    {updateReady && <div className="update-banner">譁ｰ縺励＞繝舌・繧ｸ繝ｧ繝ｳ縺後≠繧翫∪縺・<button onClick={() => window.dispatchEvent(new CustomEvent("pwa-apply-update"))}>譖ｴ譁ｰ縺吶ｋ</button></div>}
    <main>
      {route === "home" && <HomePage data={data} go={go} />}
      {route === "chapters" && <ChaptersPage data={data} subjectCode={subject} go={go} />}
      {route === "examples" && <ExamplesPage key={`examples-${subject}-${chapter}`} data={data} subjectCode={subject} chapterCode={chapter} go={go} reload={reload} notify={notify} patchSettings={patchSettings} />}
      {route === "check" && <CheckPage key={`check-${subject}-${chapter}`} data={data} subjectCode={subject} chapterCode={chapter} go={go} reload={reload} notify={notify} patchSettings={patchSettings} />}
      {route === "settings" && <SettingsPage data={data} reload={reload} notify={notify} />}
    </main>
    <nav className="bottom-nav" aria-label="繝｡繧､繝ｳ繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ">
      <button className={route === "home" ? "active" : ""} onClick={() => go("home")}><span>竚・/span>繝帙・繝</button>
      <button className={route === "examples" ? "active" : ""} onClick={() => go("examples", subject, "")}><span>笘ｷ</span>萓矩｡・/button>
      <button className={route === "check" ? "active" : ""} onClick={() => go("check", subject, chapter)}><span>笨・/span>繝√ぉ繝・け</button>
      <button className={route === "settings" ? "active" : ""} onClick={() => go("settings")}><span>笞・/span>險ｭ螳・/button>
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
    catch (e) { setError(e instanceof Error ? e.message : "隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・); }
    finally { setBusy(false); }
  };
  const register = async () => { if (!pending) return; setBusy(true); await importCatalog(pending.examples); await onComplete(); };
  return <main className="setup-page">
    <section className="setup-hero"><div className="hero-icon">B</div><p className="eyebrow">PRIVATE STUDY TOOL</p><h1>萓矩｡後ョ繝ｼ繧ｿ繧・br />縺薙・遶ｯ譛ｫ縺ｫ逋ｻ骭ｲ</h1><p>驕ｸ謚槭＠縺櫟SON縺ｯ螟夜Κ縺ｸ騾∽ｿ｡縺輔ｌ縺ｾ縺帙ｓ縲ゅヶ繝ｩ繧ｦ繧ｶ繝ｼ蜀・・IndexedDB縺ｫ縺縺台ｿ晏ｭ倥＠縺ｾ縺吶・/p></section>
    <section className="import-panel">
      {!pending ? <>
        <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void select(e.dataTransfer.files); }}>
          <span className="upload-icon">竍ｧ</span><h2>JSON繝輔ぃ繧､繝ｫ繧帝∈謚・/h2><p>4繝輔ぃ繧､繝ｫ繧偵∪縺ｨ繧√※驕ｸ謚槭〒縺阪∪縺・/p>
          <button className="primary" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "遒ｺ隱堺ｸｭ窶ｦ" : "繝輔ぃ繧､繝ｫ繧帝∈縺ｶ"}</button>
          <input ref={inputRef} type="file" accept="application/json,.json" multiple hidden onChange={(e) => e.target.files && void select(e.target.files)} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <ul className="privacy-list"><li>繧｢繝励Μ譛ｬ菴謎ｻ･螟悶・騾壻ｿ｡縺ｪ縺・/li><li>萓矩｡後・騾ｲ謐励・繝｡繝｢縺ｯ遶ｯ譛ｫ蜀・ｿ晏ｭ・/li><li>蠕後°繧芽ｨｭ螳壹〒譖ｴ譁ｰ繝ｻ繝舌ャ繧ｯ繧｢繝・・蜿ｯ閭ｽ</li></ul>
      </> : <div className="import-review"><p className="eyebrow">IMPORT REVIEW</p><h2>{pending.examples.length.toLocaleString()}萓矩｡後ｒ遒ｺ隱・/h2>
        <div className="subject-summary">{SUBJECT_ORDER.filter((code) => pending.subjects[code]).map((code) => <div key={code}><span>{SUBJECTS[code]}</span><strong>{pending.subjects[code]}</strong></div>)}</div>
        <div className="review-meta"><span>驥崎､・{pending.duplicateIds.length}莉ｶ</span><span>隴ｦ蜻・{pending.warnings.length}莉ｶ</span></div>
        {pending.warnings.length > 0 && <details><summary>隴ｦ蜻翫ｒ遒ｺ隱・/summary><ul>{pending.warnings.slice(0, 40).map((x, i) => <li key={i}>{x.message}</li>)}</ul></details>}
        <button className="primary wide" disabled={busy} onClick={() => void register()}>{busy ? "逋ｻ骭ｲ荳ｭ窶ｦ" : "縺薙・遶ｯ譛ｫ縺ｫ逋ｻ骭ｲ縺吶ｋ"}</button>
        <button className="text-button" onClick={() => setPending(null)}>驕ｸ縺ｳ逶ｴ縺・/button>
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
  const lastExample = data.catalog.find((x) => x.id === data.settings.lastExampleId);
  const resumeSubject = lastExample?.subjectCode ?? data.settings.lastSubjectCode ?? "1";
  const resumeChapter = lastExample?.chapterCode ?? data.settings.lastChapterCode ?? "";
  const resumeRoute = lastExample ? "check" : RESUMABLE_ROUTES.includes(data.settings.lastRoute as Route)
    ? data.settings.lastRoute as Route
    : "examples";
  return <div className="page home-page"><section className="dashboard-hero"><div className="hero-copy"><p className="eyebrow">YOUR STUDY MAP</p><h1>谺｡縺ｫ繧・ｋ荳蝠上′縲・br />縺吶＄隕九▽縺九ｋ縲・/h1><p>騾ｲ謐励・縺薙・遶ｯ譛ｫ縺縺代↓菫晏ｭ倥＆繧後※縺・∪縺吶ゆｻ頑律縺ｮ遒ｺ隱阪ｒ縲∝燕蝗槭・邯壹″縺九ｉ蟋九ａ縺ｾ縺励ｇ縺・・/p></div><div className="overall-grid"><div className="progress-ring" style={{ "--value": `${overall.percent * 3.6}deg` } as React.CSSProperties}><span><strong>{overall.percent}%</strong><small>遒ｺ隱肴ｸ医∩</small></span></div><div className="hero-stats"><div><strong>{overall.total - overall.done}</strong><span>譛ｪ遒ｺ隱・/span></div><div><strong>{overall.review}</strong><span>隕∝ｾｩ鄙・/span></div><div><strong>{last ? new Date(last).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : "窶・}</strong><span>譛邨ら｢ｺ隱・/span></div></div></div></section>
    <section className="resume-panel"><div className="resume-icon">竊・/div><div className="resume-copy"><p className="eyebrow">CONTINUE</p><h2>{lastExample ? `萓矩｡・{lastExample.exampleNumber}縺九ｉ蜀埼幕` : `${SUBJECTS[resumeSubject] ?? "謨ｰ蟄ｦ"}繧帝幕縺汁}</h2><p>{lastExample ? `${SUBJECTS[lastExample.subjectCode]} ﾂｷ ${chapterLabel(lastExample.chapterCode)} ﾂｷ ${lastExample.description || lastExample.title}` : "蜑榊屓髢九＞縺ｦ縺・◆遘醍岼繝ｻ遶縺ｸ謌ｻ繧後∪縺吶・}</p></div><button className="resume-button" onClick={() => go(resumeRoute, resumeSubject, resumeChapter)}>蜑榊屓縺ｮ邯壹″縺ｸ <span>竊・/span></button></section>
    <section className="quick-actions" aria-label="繧ｯ繧､繝・け繧ｹ繧ｿ繝ｼ繝・><button onClick={() => go("examples", "", "")}><span className="quick-icon">竚・/span><strong>蜈ｨ萓矩｡後ｒ謗｢縺・/strong><small>菫晏ｭ俶ｸ医∩縺ｮ譚｡莉ｶ縺ｧ蜀崎｡ｨ遉ｺ</small></button><button onClick={() => go("check", resumeSubject, resumeChapter)}><span className="quick-icon">笆ｶ</span><strong>騾｣邯壹メ繧ｧ繝・け</strong><small>闍ｦ謇九↑蝠城｡後°繧臥｢ｺ隱・/small></button><button onClick={() => go("settings")}><span className="quick-icon">笳ｫ</span><strong>蟇ｾ雎｡遽・峇</strong><small>遶繝ｻ陦ｨ遉ｺ繧定ｪｿ謨ｴ</small></button></section>
    <section><div className="section-heading"><div><p className="eyebrow">SUBJECTS</p><h2>遘醍岼蛻･縺ｮ騾ｲ謐・/h2></div><span>{overall.total.toLocaleString()}萓矩｡・/span></div>
      <div className="subject-grid">{SUBJECT_ORDER.map((code) => { const items = all.filter((x) => x.subjectCode === code); if (!items.length) return null; const c = counts(items, map); return <article className="subject-card" key={code} onClick={() => go("chapters", code)}><div className="subject-card-top"><span className={`subject-badge s${code}`}>{SUBJECTS[code].replace("謨ｰ蟄ｦ", "")}</span><span>{items.length}萓矩｡・/span></div><h3>{SUBJECTS[code]}</h3><div className="bar"><i style={{ width: `${c.percent}%` }} /></div><div className="card-stats"><span>笳・{c.ratings[3]}</span><span>笳・{c.ratings[2]}</span><span>笆ｳ {c.ratings[1]}</span><span>譛ｪ {c.ratings[0]}</span></div><div className="card-actions"><button onClick={(e) => { e.stopPropagation(); go("check", code, ""); }}>邯壹″縺九ｉ</button><button onClick={(e) => { e.stopPropagation(); go("examples", code, ""); }}>荳隕ｧ</button></div></article>; })}</div>
    </section></div>;
}

function ChaptersPage({ data, subjectCode, go }: { data: DataState; subjectCode: string; go: (r: Route, s?: string, c?: string) => void }) {
  const map = progressMap(data.progress); const chapters = [...new Set(data.catalog.filter((x) => x.subjectCode === subjectCode).map((x) => x.chapterCode))].sort();
  return <div className="page"><button className="back" onClick={() => go("home")}>竊・繝帙・繝</button><p className="eyebrow">{SUBJECTS[subjectCode]}</p><h1>遶繧帝∈縺ｶ</h1><div className="chapter-list">{chapters.map((code) => { const items = data.catalog.filter((x) => x.chapterCode === code); const c = counts(items, map); const enabled = data.settings.enabledChapters[code] ?? true; return <article className={`chapter-row ${enabled ? "" : "disabled"}`} key={code} onClick={() => enabled && go("examples", subjectCode, code)}><span className="chapter-number">{CHAPTERS[code]?.chapterNumber ?? code[1]}</span><div><h2>{CHAPTERS[code]?.title ?? chapterLabel(code)}</h2><p>{enabled ? `${items.length}萓矩｡・ﾂｷ 隕∝ｾｩ鄙・${c.review}` : "蟇ｾ雎｡螟・}</p><div className="bar"><i style={{ width: `${c.percent}%` }} /></div></div><strong>{enabled ? `${c.percent}%` : "窶・}</strong></article>; })}</div></div>;
}

function RatingButtons({ value, onChange }: { value: Rating; onChange: (rating: Rating) => void }) {
  return <div className="rating-buttons" role="group" aria-label="隧穂ｾ｡">{RATING_LABELS.map((label, rating) => <button key={label} aria-label={`隧穂ｾ｡ ${label}`} aria-pressed={value === rating} className={`rating-${rating} ${value === rating ? "selected" : ""}`} onClick={() => onChange(rating as Rating)}>{label}</button>)}</div>;
}

const FILTER_OPTIONS = [
  ["all", "縺吶∋縺ｦ"], ["unseen", "譛ｪ遒ｺ隱・], ["triangle", "笆ｳ縺ｮ縺ｿ"],
  ["below2", "笳倶ｻ･荳・], ["review", "隕∝ｾｩ鄙・], ["stale", "30譌･莉･荳・]
] as const;

function MemoField({ value, onSave, placeholder }: { value: string; onSave: (value: string) => void; placeholder: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (draft !== value) onSave(draft); }} placeholder={placeholder} />;
}

function ExamplesPage({ data, subjectCode, chapterCode, go, reload, notify, patchSettings }: { data: DataState; subjectCode: string; chapterCode: string; go: (r: Route, s?: string, c?: string) => void; reload: () => Promise<void>; notify: (s: string) => void; patchSettings: (patch: Partial<AppSettings>) => void }) {
  const preferenceKey = `${subjectCode || "all"}:${chapterCode || "all"}`;
  const savedPreferences = data.settings.listPreferences?.[preferenceKey];
  const [query, setQuery] = useState(savedPreferences?.query ?? "");
  const [filter, setFilter] = useState(savedPreferences?.filter ?? "all");
  const [sort, setSort] = useState(savedPreferences?.sort ?? "number");
  const [visible, setVisible] = useState(100);
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
  useEffect(() => {
    const preferences: ListPreferences = { query, filter, sort };
    patchSettings({
      listPreferences: { ...(data.settings.listPreferences ?? {}), [preferenceKey]: preferences },
      lastSubjectCode: subjectCode,
      lastChapterCode: chapterCode
    });
  }, [query, filter, sort, preferenceKey]);
  useEffect(() => setVisible(100), [query, filter, sort]);
  const update = async (example: StoredCatalogExample, patch: Partial<Progress>, history = false) => {
    patchSettings({ lastExampleId: example.id, lastSubjectCode: example.subjectCode, lastChapterCode: example.chapterCode });
    await saveProgress(map.get(example.id), { exampleId: example.id, ...patch }, history); await reload(); notify("菫晏ｭ倥＠縺ｾ縺励◆");
  };
  return <div className="page"><button className="back" onClick={() => go(chapterCode ? "chapters" : "home", subjectCode)}>竊・謌ｻ繧・/button><div className="list-title"><div><p className="eyebrow">EXAMPLES</p><h1>{chapterCode ? chapterLabel(chapterCode) : subjectCode ? SUBJECTS[subjectCode] : "蜈ｨ萓矩｡・}</h1></div><button className="primary compact" onClick={() => go("check", subjectCode, chapterCode)}>騾｣邯壹メ繧ｧ繝・け</button></div>
    <div className="filters"><div className="search-wrap"><span>竚・/span><input type="search" placeholder="萓矩｡檎分蜿ｷ繝ｻ蜀・ｮｹ繧呈､懃ｴ｢" value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button aria-label="讀懃ｴ｢繧偵け繝ｪ繧｢" onClick={() => setQuery("")}>ﾃ・/button>}</div><div className="filter-chips" aria-label="邨槭ｊ霎ｼ縺ｿ譚｡莉ｶ">{FILTER_OPTIONS.map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="filter-footer"><label>荳ｦ縺ｳ鬆・select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="荳ｦ縺ｳ鬆・><option value="number">萓矩｡檎分蜿ｷ鬆・/option><option value="old">譛邨ら｢ｺ隱阪′蜿､縺・・/option><option value="low">隧穂ｾ｡縺御ｽ弱＞鬆・/option><option value="count">遒ｺ隱榊屓謨ｰ縺悟ｰ代↑縺・・/option></select></label><span><strong>{filtered.length}</strong> 莉ｶ</span><small>譚｡莉ｶ縺ｯ閾ｪ蜍穂ｿ晏ｭ・/small></div></div>
    <div className="example-list">{filtered.slice(0, visible).map((example) => { const p = map.get(example.id); return <article className={`example-card rating-state-${p?.rating ?? 0}`} key={example.id}><div className="example-main"><div className="example-number"><span>EXAMPLE</span>萓矩｡鶏example.exampleNumber}</div><div><h2>{example.description || example.title}</h2><p>{SUBJECTS[example.subjectCode]} ﾂｷ {chapterLabel(example.chapterCode)} ﾂｷ 隨ｬ{example.sectionNumber}遽</p></div></div><RatingButtons value={p?.rating ?? 0} onChange={(rating) => void update(example, { rating }, true)} /><div className="example-tools"><label className="review-toggle"><input type="checkbox" checked={p?.needsReview ?? false} onChange={(e) => void update(example, { needsReview: e.target.checked })} />笘・隕∝ｾｩ鄙・/label><span>遒ｺ隱・{p?.reviewCount ?? 0}蝗・/span><span>{p?.lastReviewedAt ? new Date(p.lastReviewedAt).toLocaleDateString("ja-JP") : "譛ｪ遒ｺ隱・}</span><button className="example-start" onClick={() => { patchSettings({ lastExampleId: example.id }); go("check", example.subjectCode, example.chapterCode); }}>縺薙％縺九ｉ遒ｺ隱・竊・/button></div><details><summary>蜍慕判鬆・岼 {example.videoItems.length}莉ｶ</summary><ul>{example.videoItems.map((v) => <li key={v.contentId}>{v.label}<code>{v.contentId}</code></li>)}</ul></details><label className="memo-label">繝｡繝｢<MemoField value={p?.memo ?? ""} onSave={(memo) => void update(example, { memo })} placeholder="縺､縺ｾ縺壹″繧・ｳｨ諢冗せ" /></label></article>; })}</div>
    {visible < filtered.length && <button className="load-more" onClick={() => setVisible((x) => x + 100)}>縺輔ｉ縺ｫ100莉ｶ陦ｨ遉ｺ</button>}</div>;
}

function CheckPage({ data, subjectCode, chapterCode, go, reload, notify, patchSettings }: { data: DataState; subjectCode: string; chapterCode: string; go: (r: Route, s?: string, c?: string) => void; reload: () => Promise<void>; notify: (s: string) => void; patchSettings: (patch: Partial<AppSettings>) => void }) {
  const map = progressMap(data.progress);
  const [queue] = useState(() => enabledCatalog(data)
    .filter((x) => (!subjectCode || x.subjectCode === subjectCode) && (!chapterCode || x.chapterCode === chapterCode))
    .sort((a, b) => (map.get(a.id)?.rating ?? 0) - (map.get(b.id)?.rating ?? 0) || a.exampleNumber - b.exampleNumber));
  const resumeIndex = queue.findIndex((x) => x.id === data.settings.lastExampleId);
  const [index, setIndex] = useState(resumeIndex >= 0 ? resumeIndex : 0); const [undo, setUndo] = useState<{ example: StoredCatalogExample; previous?: Progress } | null>(null);
  const current = queue[index]; const p = current ? map.get(current.id) : undefined;
  useEffect(() => {
    if (!current) return;
    patchSettings({ lastRoute: "check", lastSubjectCode: current.subjectCode, lastChapterCode: current.chapterCode, lastExampleId: current.id });
  }, [current?.id]);
  const apply = async (patch: Partial<Progress>, advance = false) => { if (!current) return; setUndo({ example: current, previous: p }); await saveProgress(p, { exampleId: current.id, ...patch }, patch.rating !== undefined); await reload(); if (advance && data.settings.autoAdvance) setIndex((x) => Math.min(x + 1, queue.length - 1)); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => { const target = e.target as HTMLElement; if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return; if (e.key === "1") void apply({ rating: 1 }, true); if (e.key === "2") void apply({ rating: 2 }, true); if (e.key === "3") void apply({ rating: 3 }, true); if (e.key.toLowerCase() === "r") void apply({ needsReview: !p?.needsReview }); if (e.key === "ArrowRight") setIndex((x) => Math.min(x + 1, queue.length - 1)); if (e.key === "ArrowLeft") setIndex((x) => Math.max(0, x - 1)); };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });
  const undoOnce = async () => { if (!undo) return; await saveProgress(map.get(undo.example.id), { exampleId: undo.example.id, rating: undo.previous?.rating ?? 0, needsReview: undo.previous?.needsReview ?? false, memo: undo.previous?.memo ?? "" }); setUndo(null); await reload(); notify("逶ｴ蜑阪・謫堺ｽ懊ｒ謌ｻ縺励∪縺励◆"); };
  if (!current) return <div className="page"><h1>蟇ｾ雎｡縺ｮ萓矩｡後′縺ゅｊ縺ｾ縺帙ｓ</h1></div>;
  return <div className="check-page"><div className="check-top"><button className="back" onClick={() => go("examples", subjectCode, chapterCode)}>ﾃ・邨ゆｺ・/button><span><strong>{index + 1}</strong> / {queue.length}</span><button className="text-button" disabled={!undo} onClick={() => void undoOnce()}>竊ｶ 蜿悶ｊ豸医☆</button></div><div className="check-progress"><i style={{ width: `${((index + 1) / queue.length) * 100}%` }} /></div><article className="check-card"><div className="check-context"><p className="eyebrow">{SUBJECTS[current.subjectCode]} ﾂｷ {chapterLabel(current.chapterCode)}</p><span>{p?.reviewCount ?? 0}蝗樒｢ｺ隱・/span></div><div className="check-number">萓矩｡鶏current.exampleNumber}</div><h1>{current.description || current.title}</h1><p className="section-note">隨ｬ{current.sectionNumber}遽 ﾂｷ 蜍慕判鬆・岼 {current.videoItems.length}莉ｶ</p><div className="large-ratings"><button className={p?.rating === 1 ? "active rating-one" : ""} onClick={() => void apply({ rating: 1 }, true)}><kbd>1</kbd>笆ｳ<small>隗｣隱ｬ縺悟ｿ・ｦ・/small></button><button className={p?.rating === 2 ? "active rating-two" : ""} onClick={() => void apply({ rating: 2 }, true)}><kbd>2</kbd>笳・small>閾ｪ蜉帙〒隗｣縺代ｋ</small></button><button className={p?.rating === 3 ? "active rating-three" : ""} onClick={() => void apply({ rating: 3 }, true)}><kbd>3</kbd>笳・small>隱ｬ譏弱〒縺阪ｋ</small></button></div><button className={`review-big ${p?.needsReview ? "active" : ""}`} onClick={() => void apply({ needsReview: !p?.needsReview })}>笘・隕∝ｾｩ鄙・{p?.needsReview ? "ON" : "OFF"}</button><label className="memo-label">繝｡繝｢<MemoField value={p?.memo ?? ""} onSave={(memo) => void apply({ memo })} placeholder="縺薙・萓矩｡後・豕ｨ諢冗せ" /></label></article><div className="check-nav"><button disabled={index === 0} onClick={() => setIndex((x) => x - 1)}>竊・蜑阪∈</button><button className="next-button" onClick={() => setIndex((x) => Math.min(x + 1, queue.length - 1))}>菫晉蕗縺励※谺｡縺ｸ 竊・/button></div></div>;
}

function SettingsPage({ data, reload, notify }: { data: DataState; reload: () => Promise<void>; notify: (s: string) => void }) {
  const importRef = useRef<HTMLInputElement>(null), restoreRef = useRef<HTMLInputElement>(null);
  const patchSettings = async (patch: Partial<AppSettings>) => { await saveSettings({ ...data.settings, ...patch }); await reload(); };
  const importMore = async (files: FileList) => { const result = validateImportFiles(await readJsonFiles(files)); await importCatalog(result.examples); await reload(); notify(`${result.examples.length}萓矩｡後ｒ逋ｻ骭ｲ縺励∪縺励◆`); };
  const restore = async (file: File, mode: "merge" | "replace") => { try { await restoreBackup(JSON.parse(await file.text()), mode); await reload(); notify("蠕ｩ蜈・＠縺ｾ縺励◆"); } catch (e) { alert(e instanceof Error ? e.message : "蠕ｩ蜈・〒縺阪∪縺帙ｓ縺ｧ縺励◆"); } };
  const confirmAction = async (message: string, action: () => Promise<void>) => { if (!confirm(message)) return; await action(); await reload(); notify("螳御ｺ・＠縺ｾ縺励◆"); };
  return <div className="page settings-page"><p className="eyebrow">SETTINGS</p><h1>險ｭ螳壹→繝・・繧ｿ</h1><section className="settings-section"><h2>蟇ｾ雎｡遽・峇</h2><p>蟇ｾ雎｡螟悶・遶縺ｯ騾ｲ謐礼紫縺ｮ蛻・ｯ阪↓蜷ｫ縺ｾ繧後∪縺帙ｓ縲るｲ謐励ョ繝ｼ繧ｿ縺ｯ蜑企勁縺輔ｌ縺ｾ縺帙ｓ縲・/p><div className="scope-list">{Object.entries(CHAPTERS).filter(([code]) => data.catalog.some((x) => x.chapterCode === code)).map(([code, c]) => <label key={code}><span><strong>{c.subject}</strong>{chapterLabel(code)}</span><input type="checkbox" checked={data.settings.enabledChapters[code] ?? c.defaultEnabled} onChange={(e) => void patchSettings({ enabledChapters: { ...data.settings.enabledChapters, [code]: e.target.checked } })} /></label>)}</div></section>
    <section className="settings-section"><h2>陦ｨ遉ｺ縺ｨ謫堺ｽ・/h2><label className="setting-row"><span>繝・・繝・/span><select value={data.settings.theme} onChange={(e) => void patchSettings({ theme: e.target.value as AppSettings["theme"] })}><option value="system">繧ｷ繧ｹ繝・Β</option><option value="light">繝ｩ繧､繝・/option><option value="dark">繝繝ｼ繧ｯ</option></select></label><label className="setting-row"><span>隧穂ｾ｡蠕後↓閾ｪ蜍輔〒谺｡縺ｸ</span><input type="checkbox" checked={data.settings.autoAdvance} onChange={(e) => void patchSettings({ autoAdvance: e.target.checked })} /></label></section>
    <section className="settings-section"><h2>繝舌ャ繧ｯ繧｢繝・・</h2><div className="button-stack"><button onClick={() => downloadJson(buildBackup(data, false), `bluechart-progress-backup-${today().replaceAll("/", "-")}.json`)}>騾ｲ謐励・縺ｿ譖ｸ縺榊・縺・/button><button onClick={() => { if (confirm("螳悟・繝舌ャ繧ｯ繧｢繝・・縺ｫ縺ｯ萓矩｡後き繧ｿ繝ｭ繧ｰ縺悟性縺ｾ繧後∪縺吶ょｮ牙・縺ｪ蝣ｴ謇縺ｸ菫晏ｭ倥＠縺ｦ縺上□縺輔＞縲・)) downloadJson(buildBackup(data, true), `bluechart-full-backup-${today().replaceAll("/", "-")}.json`); }}>螳悟・繝舌ャ繧ｯ繧｢繝・・</button><button onClick={() => restoreRef.current?.click()}>繝舌ャ繧ｯ繧｢繝・・繧貞ｾｩ蜈・/button><input ref={restoreRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void restore(file, confirm("OK: 譌｢蟄倥ョ繝ｼ繧ｿ繧堤ｽｮ謠・/ 繧ｭ繝｣繝ｳ繧ｻ繝ｫ: 譁ｰ縺励＞繝・・繧ｿ繧偵・繝ｼ繧ｸ") ? "replace" : "merge"); }} /></div></section>
    <section className="settings-section"><h2>繧ｫ繧ｿ繝ｭ繧ｰ</h2><p>{data.catalog.length.toLocaleString()}萓矩｡後ｒ縺薙・遶ｯ譛ｫ縺ｫ菫晏ｭ倅ｸｭ</p><button onClick={() => importRef.current?.click()}>繧ｫ繧ｿ繝ｭ繧ｰ繧定ｿｽ蜉繝ｻ譖ｴ譁ｰ</button><input ref={importRef} type="file" accept="application/json,.json" multiple hidden onChange={(e) => e.target.files && void importMore(e.target.files)} /></section>
    <section className="settings-section danger-zone"><h2>繝・・繧ｿ蜑企勁</h2><div className="button-stack"><button onClick={() => void confirmAction("騾ｲ謐励□縺代ｒ蛻晄悄蛹悶＠縺ｾ縺吶°・・, () => clearStore("progress"))}>騾ｲ謐励・縺ｿ蛻晄悄蛹・/button><button onClick={() => void confirmAction("螻･豁ｴ縺縺代ｒ蜑企勁縺励∪縺吶°・・, () => clearStore("history"))}>螻･豁ｴ縺ｮ縺ｿ蜑企勁</button><button onClick={() => void confirmAction("繧ｫ繧ｿ繝ｭ繧ｰ縺縺代ｒ蜑企勁縺励∪縺吶°・滄ｲ謐励・谿九ｊ縺ｾ縺吶・, () => clearStore("catalog"))}>繧ｫ繧ｿ繝ｭ繧ｰ縺ｮ縺ｿ蜑企勁</button><button className="danger" onClick={() => { const text = prompt("蜈ｨ繝・・繧ｿ繧貞炎髯､縺吶ｋ縺ｫ縺ｯ縲悟・蜑企勁縲阪→蜈･蜉帙＠縺ｦ縺上□縺輔＞"); if (text === "蜈ｨ蜑企勁") void confirmAction("譛ｬ蠖薙↓縺吶∋縺ｦ蜑企勁縺励∪縺吶°・・, clearAll); }}>蜈ｨ繝・・繧ｿ蜑企勁</button></div></section>
  </div>;
}

