import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Highlighter, Smile, ImagePlus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  fetchDiaryEntry,
  fetchDiaryMonthPreviews,
  fetchDiaryYearDates,
  fetchDiaryOnThisDay,
  upsertDiaryEntry,
  signStickerUrl,
} from "@/lib/wann-extra";
import { formatLocalDate, todayLocalStr, parseLocalDate } from "@/lib/wann-data";
import { StickerPicker } from "@/components/wann/StickerPicker";

export const Route = createFileRoute("/_authenticated/diary")({
  component: DiaryPage,
});

type ViewMode = "day" | "month" | "year";

const EMOJIS = ["😀","😍","🥰","😂","🤔","😴","😭","🙌","👏","💪","🎉","🎂","🎁","🍰","☕","🍎","🌸","🌞","🌙","⭐","❤️","🔥","✨","💛","🍀","📚","✍️","💼","🏃","🧘"];
const HIGHLIGHTS = ["#FFF3A3", "#FFD6A5", "#FFADAD", "#CAFFBF", "#A0C4FF", "#BDB2FF", "#FFC6FF"];

function DiaryPage() {
  const { user } = Route.useRouteContext() as { user: { id: string; email?: string } };
  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<string>(todayLocalStr());
  const [monthCursor, setMonthCursor] = useState<Date>(new Date());
  const [yearCursor, setYearCursor] = useState<number>(new Date().getFullYear());

  useEffect(() => { document.title = "Diary · WANN"; }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="border border-border p-2 hover:bg-muted" aria-label="Back">
              <ArrowLeft size={14} />
            </Link>
            <div>
              <p className="label-caps text-muted-foreground">WANN</p>
              <h1 className="text-lg font-light tracking-tight">Diary</h1>
            </div>
          </div>
          <div className="flex gap-1">
            {(["day","month","year"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setView(m)}
                className={`border border-border px-3 py-1 label-caps ${view === m ? "bg-muted" : "hover:bg-muted"}`}
              >{m}</button>
            ))}
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(todayLocalStr());
                setMonthCursor(today);
                setYearCursor(today.getFullYear());
                setView("day");
              }}
              className="border border-border px-3 py-1 label-caps hover:bg-muted ml-2"
            >Today</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {view === "day" && (
          <DayView
            userId={user.id}
            date={selectedDate}
            onNavigate={(d) => setSelectedDate(d)}
          />
        )}
        {view === "month" && (
          <MonthView
            cursor={monthCursor}
            onShift={(delta) => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1))}
            onSelectDate={(d) => { setSelectedDate(d); setView("day"); }}
          />
        )}
        {view === "year" && (
          <YearView
            year={yearCursor}
            onShift={(delta) => setYearCursor(yearCursor + delta)}
            onSelectMonth={(m0) => { setMonthCursor(new Date(yearCursor, m0, 1)); setView("month"); }}
          />
        )}
      </main>
    </div>
  );
}

/* ---------- DAY VIEW: editor ---------- */
function DayView({ userId, date, onNavigate }: { userId: string; date: string; onNavigate: (d: string) => void }) {
  const qc = useQueryClient();
  const entryQ = useQuery({ queryKey: ["diary", date], queryFn: () => fetchDiaryEntry(date) });
  const editorRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showHl, setShowHl] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Hydrate editor + resolve sticker signed URLs when entry changes
  useEffect(() => {
    if (!editorRef.current) return;
    const html = entryQ.data?.content_html ?? "";
    editorRef.current.innerHTML = html;
    // resolve stickers
    const imgs = editorRef.current.querySelectorAll<HTMLImageElement>("img[data-sticker-path]");
    imgs.forEach(async (img) => {
      const path = img.dataset.stickerPath!;
      try {
        const url = await signStickerUrl(path);
        img.src = url;
      } catch { /* ignore */ }
    });
  }, [entryQ.data, date]);

  const save = useMutation({
    mutationFn: async () => {
      const html = editorRef.current?.innerHTML ?? "";
      const text = editorRef.current?.innerText.trim() ?? "";
      const preview = text.slice(0, 80);
      const firstSticker = editorRef.current?.querySelector<HTMLImageElement>("img[data-sticker-path]");
      const has_sticker = !!firstSticker;
      const thumbnail_sticker_path = firstSticker?.dataset.stickerPath ?? null;
      await upsertDiaryEntry(userId, date, html, preview, has_sticker, thumbnail_sticker_path);
    },
    onSuccess: () => {
      setLastSaved(new Date().toLocaleTimeString());
      qc.invalidateQueries({ queryKey: ["diary", date] });
      qc.invalidateQueries({ queryKey: ["diary-month"] });
      qc.invalidateQueries({ queryKey: ["diary-year"] });
    },
    onError: () => toast.error("Could not save entry"),
  });

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const r = savedRangeRef.current;
    if (!r) return;
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(r); }
  };

  const applyHighlight = (color: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("hiliteColor", false, color);
    setShowHl(false);
  };
  const insertEmoji = (e: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("insertText", false, e);
    setShowEmoji(false);
  };
  const insertSticker = (url: string, path: string) => {
    editorRef.current?.focus();
    restoreSelection();
    const html = `<img data-sticker-path="${path}" src="${url}" class="wann-sticker" alt="sticker" />`;
    document.execCommand("insertHTML", false, html);
  };

  const shift = (delta: number) => {
    const d = parseLocalDate(date);
    d.setDate(d.getDate() + delta);
    onNavigate(formatLocalDate(d));
  };

  const onThisDayQ = useQuery({
    queryKey: ["diary-otd", date.slice(5)],
    queryFn: () => fetchDiaryOnThisDay(date.slice(5)),
  });
  const [otdOpen, setOtdOpen] = useState(true);
  const otdOther = (onThisDayQ.data ?? []).filter((e) => e.date !== date);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => shift(-1)} className="border border-border p-1 hover:bg-muted"><ChevronLeft size={14} /></button>
        <input
          type="date"
          value={date}
          onChange={(e) => onNavigate(e.target.value)}
          className="bg-transparent border-b border-border py-1 text-sm"
        />
        <button onClick={() => shift(1)} className="border border-border p-1 hover:bg-muted"><ChevronRight size={14} /></button>
        <span className="text-xs text-muted-foreground">
          {parseLocalDate(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {save.isPending ? "Saving…" : lastSaved ? `Saved ${lastSaved}` : ""}
        </span>
        <button onClick={() => save.mutate()} className="border border-border px-3 py-1 label-caps hover:bg-muted">Save</button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 relative">
        <div className="relative">
          <button
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => setShowHl(!showHl)}
            className="border border-border p-2 hover:bg-muted"
            aria-label="Highlight"
          ><Highlighter size={14} /></button>
          {showHl && (
            <div className="absolute top-full mt-1 left-0 card-flat p-2 flex gap-1 z-10">
              {HIGHLIGHTS.map((c) => (
                <button
                  key={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHighlight(c)}
                  className="h-6 w-6 border border-border"
                  style={{ background: c }}
                />
              ))}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyHighlight("transparent")}
                className="h-6 w-6 border border-border text-[10px]"
              >x</button>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => setShowEmoji(!showEmoji)}
            className="border border-border p-2 hover:bg-muted"
            aria-label="Emoji"
          ><Smile size={14} /></button>
          {showEmoji && (
            <div className="absolute top-full mt-1 left-0 card-flat p-2 grid grid-cols-10 gap-1 z-10 w-[280px]">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => insertEmoji(e)}
                  className="hover:bg-muted text-lg leading-none"
                >{e}</button>
              ))}
            </div>
          )}
        </div>
        <button
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => setPickerOpen(true)}
          className="border border-border p-2 hover:bg-muted"
          aria-label="Sticker"
        ><ImagePlus size={14} /></button>
      </div>

      <DaySummaryPanel date={date} />

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={() => { saveSelection(); save.mutate(); }}
        className="wann-diary-editor min-h-[400px] card-flat p-6 text-base leading-relaxed focus:outline-none"
      />


      {otdOther.length > 0 && (
        <div className="card-flat p-4">
          <button
            onClick={() => setOtdOpen(!otdOpen)}
            className="label-caps text-muted-foreground w-full text-left"
          >
            On this day ({otdOther.length})
          </button>
          {otdOpen && (
            <div className="mt-3 space-y-2">
              {otdOther.map((e) => (
                <button
                  key={e.date}
                  onClick={() => onNavigate(e.date)}
                  className="w-full text-left border-b border-border/50 py-2 hover:bg-muted px-2"
                >
                  <p className="text-xs text-muted-foreground">{e.date}</p>
                  <p className="text-sm truncate">{e.preview || "(entry)"}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pickerOpen && (
        <StickerPicker
          userId={userId}
          onPick={insertSticker}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <style>{`
        .wann-diary-editor img.wann-sticker {
          display: inline-block;
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          vertical-align: middle;
          margin: 0 4px;
          object-fit: cover;
        }
        .wann-diary-editor:empty:before {
          content: "Write about today…";
          color: var(--muted-foreground);
        }
      `}</style>
    </div>
  );
}

/* ---------- MONTH VIEW ---------- */
function MonthView({
  cursor,
  onShift,
  onSelectDate,
}: {
  cursor: Date;
  onShift: (delta: number) => void;
  onSelectDate: (d: string) => void;
}) {
  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();
  const first = new Date(year, month0, 1);
  const days = new Date(year, month0 + 1, 0).getDate();
  const startDow = first.getDay();
  const start = formatLocalDate(first);
  const end = formatLocalDate(new Date(year, month0, days));

  const previewsQ = useQuery({
    queryKey: ["diary-month", start, end],
    queryFn: () => fetchDiaryMonthPreviews(start, end),
  });
  const [stickerUrls, setStickerUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = previewsQ.data ?? [];
      const missing = list.filter((p) => p.thumbnail_sticker_path && !stickerUrls[p.thumbnail_sticker_path!]);
      const next: Record<string, string> = {};
      for (const p of missing) {
        try { next[p.thumbnail_sticker_path!] = await signStickerUrl(p.thumbnail_sticker_path!); } catch {}
      }
      if (!cancelled && Object.keys(next).length) setStickerUrls((u) => ({ ...u, ...next }));
    })();
    return () => { cancelled = true; };
  }, [previewsQ.data]);

  type Preview = NonNullable<typeof previewsQ.data>[number];
  const byDate = useMemo(() => {
    const m: Record<string, Preview> = {};
    for (const p of previewsQ.data ?? []) m[p.date] = p;
    return m;
  }, [previewsQ.data]);

  const cells: Array<{ key: string; date?: string }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ key: `pad-${i}` });
  for (let d = 1; d <= days; d++) {
    const dateStr = formatLocalDate(new Date(year, month0, d));
    cells.push({ key: dateStr, date: dateStr });
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => onShift(-1)} className="border border-border p-1 hover:bg-muted"><ChevronLeft size={14} /></button>
        <p className="text-lg font-light tracking-tight">
          {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button onClick={() => onShift(1)} className="border border-border p-1 hover:bg-muted"><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={`h${i}`} className="label-caps text-center text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((c) => {
          if (!c.date) return <div key={c.key} />;
          const entry = byDate[c.date];
          const stickerUrl = entry?.thumbnail_sticker_path ? stickerUrls[entry.thumbnail_sticker_path] : null;
          return (
            <button
              key={c.key}
              onClick={() => onSelectDate(c.date!)}
              className="aspect-square border border-border p-1 text-left hover:bg-muted flex flex-col"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs">{Number(c.date.slice(-2))}</span>
                {entry && !stickerUrl && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
                {stickerUrl && (
                  <img src={stickerUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                )}
              </div>
              {entry?.preview && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{entry.preview}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- YEAR VIEW ---------- */
function YearView({ year, onShift, onSelectMonth }: { year: number; onShift: (delta: number) => void; onSelectMonth: (m0: number) => void }) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const datesQ = useQuery({
    queryKey: ["diary-year", year],
    queryFn: () => fetchDiaryYearDates(yearStart, yearEnd),
  });
  const hasEntry = useMemo(() => {
    const s = new Set<string>();
    for (const d of datesQ.data ?? []) s.add(d.date);
    return s;
  }, [datesQ.data]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => onShift(-1)} className="border border-border p-1 hover:bg-muted"><ChevronLeft size={14} /></button>
        <p className="text-lg font-light tracking-tight">{year}</p>
        <button onClick={() => onShift(1)} className="border border-border p-1 hover:bg-muted"><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, m0) => (
          <MiniMonth
            key={m0}
            year={year}
            month0={m0}
            hasEntry={hasEntry}
            onClick={() => onSelectMonth(m0)}
          />
        ))}
      </div>
    </div>
  );
}

function MiniMonth({ year, month0, hasEntry, onClick }: { year: number; month0: number; hasEntry: Set<string>; onClick: () => void }) {
  const first = new Date(year, month0, 1);
  const days = new Date(year, month0 + 1, 0).getDate();
  const startDow = first.getDay();
  const cells: Array<{ key: string; date?: string }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ key: `p${i}` });
  for (let d = 1; d <= days; d++) {
    const dateStr = formatLocalDate(new Date(year, month0, d));
    cells.push({ key: dateStr, date: dateStr });
  }
  return (
    <button onClick={onClick} className="card-flat p-2 hover:bg-muted text-left">
      <p className="label-caps mb-1">{first.toLocaleString(undefined, { month: "short" })}</p>
      <div className="grid grid-cols-7 gap-[2px]">
        {cells.map((c) => (
          <div
            key={c.key}
            className={`aspect-square text-[8px] flex items-center justify-center ${c.date && hasEntry.has(c.date) ? "bg-foreground text-background" : c.date ? "text-muted-foreground" : ""}`}
          >
            {c.date ? Number(c.date.slice(-2)) : ""}
          </div>
        ))}
      </div>
    </button>
  );
}
