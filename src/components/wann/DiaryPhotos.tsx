import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_DIARY_PHOTOS,
  deleteDiaryPhoto,
  fetchDiaryPhotos,
  setDiaryCoverPhoto,
  signDiaryPhotoUrl,
  uploadDiaryPhoto,
  type DiaryPhoto,
} from "@/lib/wann-extra";

export function DiaryPhotos({ userId, date }: { userId: string; date: string }) {
  const qc = useQueryClient();
  const photosQ = useQuery({ queryKey: ["diary-photos", date], queryFn: () => fetchDiaryPhotos(date) });
  const photos = photosQ.data ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = photos.filter((p) => !urls[p.storage_path]);
      if (missing.length === 0) return;
      const next: Record<string, string> = {};
      for (const p of missing) {
        try { next[p.storage_path] = await signDiaryPhotoUrl(p.storage_path); } catch { /* ignore */ }
      }
      if (!cancelled && Object.keys(next).length) setUrls((u) => ({ ...u, ...next }));
    })();
    return () => { cancelled = true; };
  }, [photosQ.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["diary-photos", date] });
    qc.invalidateQueries({ queryKey: ["diary-month-photos"] });
  };

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const room = MAX_DIARY_PHOTOS - photos.length;
      const list = files.slice(0, Math.max(0, room));
      if (files.length > list.length) toast.error(`Max ${MAX_DIARY_PHOTOS} photos per day`);
      let order = photos.length;
      for (const f of list) {
        await uploadDiaryPhoto(userId, date, f, order, order === 0 && photos.length === 0);
        order += 1;
      }
    },
    onSuccess: invalidate,
    onError: () => toast.error("Could not upload photo"),
  });

  const cover = useMutation({
    mutationFn: (id: string) => setDiaryCoverPhoto(date, id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (p: DiaryPhoto) => deleteDiaryPhoto(p),
    onSuccess: invalidate,
  });

  return (
    <div className="card-flat p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="label-caps">Photos</p>
        <span className="text-xs text-muted-foreground">{photos.length}/{MAX_DIARY_PHOTOS}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {photos.map((p) => {
          const url = urls[p.storage_path];
          return (
            <div key={p.id} className="relative aspect-square border border-border bg-muted group">
              {url ? (
                <button onClick={() => setLightbox(url)} className="h-full w-full" aria-label="View photo">
                  <img src={url} alt="Diary photo" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ) : null}
              <button
                onClick={() => cover.mutate(p.id)}
                aria-label={p.is_cover ? "Cover photo" : "Set as cover"}
                title={p.is_cover ? "Cover photo" : "Set as cover"}
                className={`absolute top-1 left-1 p-0.5 border border-border bg-background ${
                  p.is_cover ? "" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <Star size={11} className={p.is_cover ? "fill-foreground" : ""} />
              </button>
              <button
                onClick={() => remove.mutate(p)}
                aria-label="Delete photo"
                className="absolute top-1 right-1 p-0.5 border border-border bg-background opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}

        {photos.length < MAX_DIARY_PHOTOS && (
          <button
            onClick={() => fileRef.current?.click()}
            className="aspect-square border border-dashed border-border flex items-center justify-center hover:bg-muted"
            aria-label="Add photos"
          >
            <Plus size={16} />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) upload.mutate(files);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {upload.isPending && <p className="text-xs text-muted-foreground mt-3">Uploading…</p>}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-6"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-background" aria-label="Close"><X size={20} /></button>
          <img src={lightbox} alt="Diary photo" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
