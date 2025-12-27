"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Film, Trash2, Loader2 } from "lucide-react";
import { MovieDoc } from "@/types/media";
import { useState } from "react";

const statusStyles: Record<MovieDoc["status"], string> = {
    uploaded: "bg-amber-500/15 text-amber-100 border-amber-500/30",
    processing: "bg-sky-500/15 text-sky-100 border-sky-500/30",
    ready: "bg-emerald-500/15 text-emerald-100 border-emerald-500/30",
    failed: "bg-rose-500/15 text-rose-100 border-rose-500/30",
};

export function MovieCard({ movie }: { movie: MovieDoc }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const badgeClass =
        statusStyles[movie.status] ||
        "bg-zinc-800/60 text-zinc-200 border-zinc-700";

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (
            !confirm(
                "Are you sure you want to delete this movie? This cannot be undone."
            )
        )
            return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/movies/${movie._id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Failed to delete movie");
                setIsDeleting(false);
            }
        } catch {
            alert("Error deleting movie");
            setIsDeleting(false);
        }
    };

    if (isDeleting) {
        return (
            <div className="flex h-[180px] w-full animate-pulse flex-col items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/50">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                <p className="mt-2 text-xs text-zinc-500">Deleting...</p>
            </div>
        );
    }

    return (
        <div className="group relative flex overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] transition hover:-translate-y-0.5 hover:border-white/10 hover:shadow-[0_25px_70px_-32px_rgba(0,0,0,0.9)]">
            <Link
                href={`/movie/${movie._id}`}
                className="flex flex-1 p-5 outline-none"
            >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/10 opacity-0 transition duration-700 group-hover:opacity-100" />
                <div className="flex w-full items-start gap-4">
                    <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/20">
                        <Film className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-semibold uppercase tracking-wide text-zinc-200">
                                {movie.episodeLengthMin}m cuts
                            </span>
                            <span className="text-zinc-600">|</span>
                            <span className="truncate text-zinc-500">
                                {movie._id?.toString?.().slice(-6) || ""}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <div className="truncate text-lg font-semibold text-white group-hover:text-zinc-50">
                                {movie.title}
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
                                >
                                    {movie.status}
                                </span>
                                <span className="text-xs text-zinc-500">
                                    {movie.status === "ready"
                                        ? "Watch now"
                                        : "Processing..."}
                                </span>
                            </div>
                        </div>
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-zinc-300" />
                </div>
            </Link>

            {/* Delete Action - floating or absolute */}
            <button
                onClick={handleDelete}
                className="absolute bottom-3 right-3 z-10 rounded-full border border-transparent bg-white/5 p-2 text-zinc-500 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100 cursor-pointer"
                title="Delete Movie"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}
