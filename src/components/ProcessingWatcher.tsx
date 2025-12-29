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

        const [progress, setProgress] = useState<number>(0);
        const [phase, setPhase] = useState<string | null>(null);

        useEffect(() => {
                if (status === "ready" || status === "failed") return;
                let cancelled = false;

                const tick = async () => {
                        try {
                                const res = await fetch(
                                        `/api/movies/${movieId}`,
                                        { cache: "no-store" }
                                );
                                if (!res.ok) return;
                                const data = await res.json();
                                const nextStatus: Status =
                                        data?.movie?.status || status;

                                if (data?.movie?.progress !== undefined) {
                                        setProgress(data.movie.progress);
                                }
                                if (data?.movie?.processingPhase) {
                                        setPhase(data.movie.processingPhase);
                                }

                                if (cancelled) return;
                                if (nextStatus !== status) {
                                        setStatus(nextStatus);
                                        if (nextStatus === "ready") {
                                                setMessage(
                                                        "Your series is ready to watch."
                                                );
                                                router.refresh();
                                        } else if (nextStatus === "failed") {
                                                setMessage(
                                                        "Processing failed. Please retry."
                                                );
                                        }
                                }
                        } catch (_) {
                                // ignore polling errors
                        }
                };

                const interval = setInterval(tick, 1000); // Poll faster for progress
                return () => {
                        cancelled = true;
                        clearInterval(interval);
                };
        }, [movieId, router, status]);

        // ... (render ready/failed states same as before) ...
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
                                <button
                                        onClick={async () => {
                                                try {
                                                        setMessage(
                                                                "Retrying..."
                                                        );
                                                        setStatus("processing");
                                                        setProgress(0);
                                                        setPhase(
                                                                "Restarting worker..."
                                                        );
                                                        await fetch(
                                                                `/api/movies/${movieId}/retry`,
                                                                {
                                                                        method: "POST",
                                                                }
                                                        );
                                                } catch (_) {
                                                        setMessage(
                                                                "Retry failed"
                                                        );
                                                        setStatus("failed");
                                                }
                                        }}
                                        className="ml-2 underline hover:text-white"
                                >
                                        Retry
                                </button>
                        </div>
                );
        }

        return (
                <div className="flex flex-col gap-2 min-w-[240px]">
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {phase ||
                                        (progress > 0
                                                ? `Processing... ${progress}%`
                                                : "Initializing worker...")}
                        </div>
                        {progress > 0 && (
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                        <div
                                                className="h-full bg-sky-500 transition-all duration-300 ease-out"
                                                style={{
                                                        width: `${progress}%`,
                                                }}
                                        />
                                </div>
                        )}
                </div>
        );
}
