import { useState } from "react";
import { Trash2, X, Pencil } from "lucide-react";
import type { Category, Subtag, Task } from "@/lib/wann-data";
import type { CategoryFilter } from "./TaskForm";

/**
 * Shared category / subcategory filter bar. Used standalone inside TasksPanel
 * and, in the combined Task workspace, once above both columns.
 */
export function CategoryFilterBar({
  categories,
  subtags,
  tasks,
  filter,
  setFilter,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubtag,
  onUpdateSubtag,
  onDeleteSubtag,
}: {
  categories: Category[];
  subtags: Subtag[];
  tasks: Task[];
  filter: CategoryFilter;
  setFilter: (f: CategoryFilter) => void;
  onAddCategory: (name: string, color: string) => void;
  onUpdateCategory: (id: string, name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddSubtag: (categoryId: string, name: string) => void;
  onUpdateSubtag: (id: string, name: string) => void;
  onDeleteSubtag: (id: string) => void;
}) {
  const [newCat, setNewCat] = useState({ open: false, name: "", color: "#1A1A18" });
  const [editCat, setEditCat] = useState<{ id: string; name: string; color: string } | null>(null);
  const [editingSubtagId, setEditingSubtagId] = useState<string | null>(null);
  const [editingSubtagName, setEditingSubtagName] = useState("");

  const activeCat = filter.categoryId ? categories.find((c) => c.id === filter.categoryId) : null;
  const catSubtags = activeCat ? subtags.filter((s) => s.category_id === activeCat.id) : [];

  return (
    <div>
      {/* categories */}

      <div className="flex flex-wrap gap-1 mb-2">
        <button
          onClick={() => setFilter({ categoryId: null, subtagId: null })}
          className={`border border-border px-2 py-1 label-caps ${!filter.categoryId ? "bg-foreground text-background" : "hover:bg-muted"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter({ categoryId: c.id, subtagId: null })}
            className={`border border-border px-2 py-1 label-caps flex items-center gap-1 ${filter.categoryId === c.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            <span className="inline-block h-2 w-2" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setNewCat({ ...newCat, open: !newCat.open })}
          className="border border-border px-2 py-1 label-caps hover:bg-muted"
        >
          + Cat
        </button>
      </div>

      {newCat.open && (
        <div className="card-flat p-2 mb-2 flex gap-2 items-center">
          <input
            type="text"
            placeholder="Name"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
            className="flex-1 bg-transparent outline-none border-b border-border px-1 py-1 text-sm"
          />
          <input
            type="color"
            value={newCat.color}
            onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
            className="h-8 w-10"
          />
          <button
            onClick={() => {
              if (newCat.name.trim()) {
                onAddCategory(newCat.name.trim(), newCat.color);
                setNewCat({ open: false, name: "", color: "#1A1A18" });
              }
            }}
            className="border border-border px-3 py-1 label-caps hover:bg-muted"
          >
            Add
          </button>
        </div>
      )}

      {editCat && (
        <div className="card-flat p-2 mb-2 flex gap-2 items-center">
          <input
            type="text"
            value={editCat.name}
            onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
            className="flex-1 bg-transparent outline-none border-b border-border px-1 py-1 text-sm"
          />
          <input
            type="color"
            value={editCat.color}
            onChange={(e) => setEditCat({ ...editCat, color: e.target.value })}
            className="h-8 w-10"
          />
          <button
            onClick={() => {
              if (editCat.name.trim()) {
                onUpdateCategory(editCat.id, editCat.name.trim(), editCat.color);
                setEditCat(null);
              }
            }}
            className="border border-border px-3 py-1 label-caps hover:bg-muted"
          >
            Save
          </button>
          <button onClick={() => setEditCat(null)} aria-label="Cancel" className="hover:text-destructive">
            <X size={12} />
          </button>
        </div>
      )}

      {activeCat && (
        <div className="flex flex-wrap gap-1 mb-3 items-center">
          <button
            onClick={() => setFilter({ ...filter, subtagId: null })}
            className={`border border-border px-2 py-1 text-xs ${!filter.subtagId ? "bg-muted" : "hover:bg-muted"}`}
          >
            all
          </button>
          {catSubtags.map((s) => (
            <span
              key={s.id}
              className={`border border-border px-2 py-1 text-xs flex items-center gap-1 group/sub ${filter.subtagId === s.id ? "bg-muted" : ""}`}
            >
              {editingSubtagId === s.id ? (
                <input
                  autoFocus
                  value={editingSubtagName}
                  onChange={(e) => setEditingSubtagName(e.target.value)}
                  onBlur={() => {
                    const v = editingSubtagName.trim();
                    if (v && v !== s.name) onUpdateSubtag(s.id, v);
                    setEditingSubtagId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingSubtagId(null);
                  }}
                  className="bg-transparent outline-none border-b border-border w-20 text-xs"
                />
              ) : (
                <>
                  <button onClick={() => setFilter({ ...filter, subtagId: s.id })} className="hover:underline">
                    {s.name}
                  </button>
                  <button
                    onClick={() => { setEditingSubtagId(s.id); setEditingSubtagName(s.name); }}
                    aria-label={`Edit subtag ${s.name}`}
                    className="opacity-0 group-hover/sub:opacity-100 hover:text-foreground"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={() => {
                      const used = tasks.filter((t) => t.subtag_id === s.id).length;
                      const msg = used > 0
                        ? `This subcategory is used by ${used} task${used === 1 ? "" : "s"}. Delete anyway?`
                        : `Delete subcategory "${s.name}"?`;
                      if (confirm(msg)) {
                        if (filter.subtagId === s.id) setFilter({ ...filter, subtagId: null });
                        onDeleteSubtag(s.id);
                      }
                    }}
                    aria-label={`Delete subtag ${s.name}`}
                    className="opacity-0 group-hover/sub:opacity-100 hover:text-destructive"
                  >
                    <X size={10} />
                  </button>
                </>
              )}
            </span>
          ))}
          <button
            onClick={() => {
              const name = prompt("Subtag name")?.trim();
              if (name && activeCat) onAddSubtag(activeCat.id, name);
            }}
            className="border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            + sub
          </button>
          <button
            onClick={() => setEditCat({ id: activeCat.id, name: activeCat.name, color: activeCat.color })}
            aria-label="Edit category"
            className="ml-auto border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete category "${activeCat.name}"?`)) {
                onDeleteCategory(activeCat.id);
                setFilter({ categoryId: null, subtagId: null });
              }
            }}
            className="border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
