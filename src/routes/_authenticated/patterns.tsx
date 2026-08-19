import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { fetchCategories, fetchSubtags, fetchTasks } from "@/lib/wann-data";
import { fetchAllSubitems } from "@/lib/wann-subitems";

export const Route = createFileRoute("/_authenticated/patterns")({
  component: PatternsPage,
  head: () => ({
    meta: [
      { title: "Patterns · WANN Weekly OS" },
      { name: "description", content: "Browse every task sub-item by category, subcategory and keyword to spot your own routines." },
      { property: "og:title", content: "Patterns · WANN Weekly OS" },
      { property: "og:description", content: "Browse every task sub-item by category, subcategory and keyword to spot your own routines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PatternsPage() {
  const { user } = Route.useRouteContext() as { user: { id: string } };
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subtagId, setSubtagId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => { document.title = "Patterns · WANN"; }, []);

  const categories = useQuery({ queryKey: ["categories", user.id], queryFn: () => fetchCategories(user.id) });
  const subtags = useQuery({ queryKey: ["subtags", user.id], queryFn: () => fetchSubtags(user.id) });
  const tasks = useQuery({ queryKey: ["tasks", user.id], queryFn: () => fetchTasks(user.id) });
  const subitems = useQuery({ queryKey: ["all-subitems"], queryFn: fetchAllSubitems });

  const taskById = useMemo(
    () => new Map((tasks.data ?? []).map((t) => [t.id, t])),
    [tasks.data],
  );
  const catById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  );

  const catSubtags = useMemo(
    () => (subtags.data ?? []).filter((s) => s.category_id === categoryId),
    [subtags.data, categoryId],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (subitems.data ?? [])
      .map((si) => ({ si, task: taskById.get(si.task_id) }))
      .filter(({ si, task }) => {
        if (!task) return false;
        if (categoryId && task.category_id !== categoryId) return false;
        if (subtagId && task.subtag_id !== subtagId) return false;
        if (needle) {
          const hay = `${si.content} ${task.title}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = a.task!.due_date ?? "";
        const db = b.task!.due_date ?? "";
        if (da !== db) return da < db ? 1 : -1;
        if (a.si.time !== b.si.time) return (b.si.time ?? "") < (a.si.time ?? "") ? -1 : 1;
        return a.si.sort_order - b.si.sort_order;
      });
  }, [subitems.data, taskById, categoryId, subtagId, q]);

  const loading = tasks.isLoading || subitems.isLoading;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/" className="border border-border p-2 hover:bg-muted" aria-label="Back">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <p className="label-caps text-muted-foreground">WANN</p>
            <h1 className="text-lg font-light tracking-tight">Patterns</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <section className="card-flat p-4">
          <p className="label-caps mb-3">상세 항목 히스토리</p>

          {/* category filter */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => { setCategoryId(null); setSubtagId(null); }}
              className={`border border-border px-2 py-1 label-caps ${!categoryId ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              All
            </button>
            {(categories.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategoryId(c.id); setSubtagId(null); }}
                className={`border border-border px-2 py-1 label-caps flex items-center gap-1 ${categoryId === c.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
              >
                <span className="inline-block h-2 w-2" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>

          {/* subtag filter */}
          {categoryId && catSubtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                onClick={() => setSubtagId(null)}
                className={`border border-border px-2 py-1 text-xs ${!subtagId ? "bg-muted" : "hover:bg-muted"}`}
              >
                all
              </button>
              {catSubtags.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubtagId(s.id)}
                  className={`border border-border px-2 py-1 text-xs ${subtagId === s.id ? "bg-muted" : "hover:bg-muted"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {/* search */}
          <div className="flex items-center gap-2 border-b border-border mb-3 px-1">
            <Search size={12} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상세 항목 검색"
              className="flex-1 bg-transparent outline-none py-1 text-sm"
            />
            {q && (
              <button onClick={() => setQ("")} className="label-caps text-muted-foreground hover:text-foreground">
                clear
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-2">{rows.length} items</p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">해당 조건의 상세 항목이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {rows.map(({ si, task }) => {
                const cat = task!.category_id ? catById.get(task!.category_id) : null;
                return (
                  <li key={si.id}>
                    <Link
                      to="/"
                      search={{ task: task!.id } as never}
                      className="flex gap-2 items-baseline py-2 hover:bg-muted px-1"
                    >
                      <span className="text-xs text-muted-foreground w-12 shrink-0">
                        {task!.due_date ? task!.due_date.slice(5) : "--"}
                      </span>
                      {cat && <span className="inline-block h-2 w-2 shrink-0" style={{ background: cat.color }} />}
                      <span className="text-xs shrink-0 max-w-[9rem] truncate">{task!.title}</span>
                      <span className="text-sm flex-1 min-w-0">{si.content}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
