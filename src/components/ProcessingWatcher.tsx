/**
 * Polls movie status and triggers a refresh + inline notification when ready.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

type Status = "uploaded" | "processing" | "ready" | "failed";

export function ProcessingWatcher({
  movieId,
  initialStatus,
}: {
  movieId: string;
  initialStatus: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready" || status === "failed") return;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/movies/${movieId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const nextStatus: Status = data?.movie?.status || status;
        if (cancelled) return;
        if (nextStatus !== status) {
          setStatus(nextStatus);
          if (nextStatus === "ready") {
            setMessage("Your series is ready to watch.");
            router.refresh();
          } else if (nextStatus === "failed") {
            setMessage("Processing failed. Please retry.");
          }
        }
      } catch (_) {
        // ignore polling errors
      }
    };

    const interval = setInterval(tick, 3500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [movieId, router, status]);

  if (status === "ready") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
        <CheckCircle2 className="h-4 w-4" />
        {message || "Ready to watch"}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100">
        <TriangleAlert className="h-4 w-4" />
        {message || "Processing failed"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200">
      <Loader2 className="h-4 w-4 animate-spin" />
      Processing... you&apos;ll be notified when ready.
    </div>
  );
}
