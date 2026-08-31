import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useWannDashboard } from "@/lib/use-wann-dashboard";
import type { WidgetCategory } from "@/lib/widget-registry";

type WidgetsSearch = { open?: string; scrollTo?: string };

export const Route = createFileRoute("/_authenticated/widgets")({
  component: WidgetsPage,
  // Deep-linkable so Dashboard (a Review badge, a Timeline "REVIEW" row, a
  // project item) can send the user straight into a specific widget's detail
  // view, e.g. /widgets?open=goals&scrollTo=gi-<id>.
  validateSearch: (search: Record<string, unknown>): WidgetsSearch => ({
    open: typeof search.open === "string" ? search.open : undefined,
    scrollTo: typeof search.scrollTo === "string" ? search.scrollTo : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Widgets · WANN Weekly OS" },
      { name: "description", content: "Detailed management for everything WANN tracks — Ideas & Goals, Events, Tasks, Habits, and more." },
    ],
  }),
});

const CATEGORY_LABEL: Record<WidgetCategory, string> = {
  planning: "Planning",
  life: "Life",
  insights: "Insights",
};
const CATEGORY_ORDER: WidgetCategory[] = ["planning", "life", "insights"];

/**
 * WIDGETS = "What do I want to manage?" — detailed management/configuration,
 * separate from the Dashboard's execution surface. Every widget here is the
 * same BUILT_IN_WIDGETS entry that used to render inline on the Dashboard;
 * this page just groups them into cards and opens one at a time. It shares
 * useWannDashboard() with the Dashboard, so edits made here (an Event's
 * colour, an Idea's Review Timer, a Project's items) are reflected on the
 * Timeline immediately — same underlying data/actions, no separate layer.
 */
function WidgetsPage() {
  const { user } = Route.useRouteContext() as { user: { id: string; email?: string } };
  const { open, scrollTo } = Route.useSearch();
  const navigate = useNavigate();
  const { settings, widgetCtx, visibleWidgets } = useWannDashboard(user);
  const [openId, setOpenId] = useState<string | null>(open ?? null);

  // Keep local state in sync when arriving via a fresh deep link (e.g. from
  // the Dashboard's Review badge) after the page is already mounted.
  useEffect(() => {
    setOpenId(open ?? null);
  }, [open]);

  useEffect(() => {
    if (!scrollTo) return;
    const t = setTimeout(() => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-foreground");
        setTimeout(() => el.classList.remove("ring-2", "ring-foreground"), 1500);
      }
    }, 60);
    return () => clearTimeout(t);
  }, [scrollTo, openId]);

  if (!settings) {
    return <div className="min-h-screen flex items-center justify-center label-caps text-muted-foreground">Loading</div>;
  }

  const openWidget = visibleWidgets.find((w) => w.id === openId);
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: visibleWidgets.filter((w) => (w.category ?? "planning") === cat),
  })).filter((g) => g.items.length > 0);

  const goTo = (id: string | null) => {
    setOpenId(id);
    navigate({ to: "/widgets", search: id ? { open: id } : {} });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 flex items-center gap-3">
          {openWidget ? (
            <button
              onClick={() => goTo(null)}
              className="border border-border p-2 hover:bg-muted"
              aria-label="All widgets"
            >
              <ArrowLeft size={14} />
            </button>
          ) : (
            <Link to="/" className="border border-border p-2 hover:bg-muted" aria-label="Back">
              <ArrowLeft size={14} />
            </Link>
          )}
          <div>
            <p className="label-caps text-muted-foreground">WANN</p>
            <h1 className="text-lg font-light tracking-tight">
              {openWidget ? openWidget.label : "Widgets"}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
        {openWidget ? (
          <div key={openWidget.id}>{openWidget.render(widgetCtx)}</div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.cat}>
                <p className="label-caps text-muted-foreground mb-2">{CATEGORY_LABEL[g.cat]}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {g.items.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => goTo(w.id)}
                      className="card-flat p-4 text-left flex items-center justify-between gap-3 hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm">{w.label}</span>
                        {w.description && (
                          <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                            {w.description}
                          </span>
                        )}
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
