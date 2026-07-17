import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { fetchStickers, signStickerUrl, uploadStickerFromFile, type Sticker } from "@/lib/wann-extra";

export function StickerPicker({
  userId,
  onPick,
  onClose,
}: {
  userId: string;
  onPick: (url: string, path: string) => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const stickersQ = useQuery({ queryKey: ["stickers"], queryFn: fetchStickers });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = stickersQ.data ?? [];
      const missing = list.filter((s) => !urls[s.storage_path]);
      if (missing.length === 0) return;
      const next: Record<string, string> = {};
      for (const s of missing) {
        try { next[s.storage_path] = await signStickerUrl(s.storage_path); } catch {}
      }
      if (!cancelled && Object.keys(next).length) setUrls((u) => ({ ...u, ...next }));
    })();
    return () => { cancelled = true; };
  }, [stickersQ.data]);

  const upload = useMutation({
    mutationFn: async (file: File) => uploadStickerFromFile(userId, file),
    onSuccess: async (s: Sticker) => {
      const url = await signStickerUrl(s.storage_path);
      setUrls((u) => ({ ...u, [s.storage_path]: url }));
      qc.invalidateQueries({ queryKey: ["stickers"] });
      onPick(url, s.storage_path);
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20" onClick={onClose}>
      <div className="card-flat w-[420px] max-w-[90vw] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="label-caps">Stickers</p>
          <button onClick={onClose} aria-label="Close" className="hover:bg-muted p-1"><X size={14} /></button>
        </div>
        <div className="grid grid-cols-6 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border border-dashed border-border flex items-center justify-center hover:bg-muted"
            aria-label="Upload new sticker"
          >
            <Plus size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.currentTarget.value = "";
            }}
          />
          {(stickersQ.data ?? []).map((s) => {
            const url = urls[s.storage_path];
            return (
              <button
                key={s.id}
                onClick={() => url && (onPick(url, s.storage_path), onClose())}
                className="aspect-square rounded-full overflow-hidden border border-border hover:opacity-80 bg-muted"
                aria-label="Insert sticker"
              >
                {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
              </button>
            );
          })}
        </div>
        {upload.isPending && <p className="text-xs text-muted-foreground mt-3">Uploading…</p>}
      </div>
    </div>
  );
}
