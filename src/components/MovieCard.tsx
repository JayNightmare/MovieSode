/**
 * Movie card component for the Library grid.
 */

import Link from "next/link";
import { ChevronRight, Film } from "lucide-react";
import { MovieDoc } from "@/types/media";

const statusStyles: Record<MovieDoc["status"], string> = {
  uploaded: "bg-amber-500/15 text-amber-100 border-amber-500/30",
  processing: "bg-sky-500/15 text-sky-100 border-sky-500/30",
  ready: "bg-emerald-500/15 text-emerald-100 border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-100 border-rose-500/30",
};

export function MovieCard({ movie }: { movie: MovieDoc }) {
  const badgeClass =
    statusStyles[movie.status] || "bg-zinc-800/60 text-zinc-200 border-zinc-700";

  return (
    <Link
      href={`/movie/${movie._id}`}
      className="group relative flex overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-5 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] transition hover:-translate-y-0.5 hover:border-white/10 hover:shadow-[0_25px_70px_-32px_rgba(0,0,0,0.9)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/10 opacity-0 transition duration-700 group-hover:opacity-100" />

      <div className="flex w-full items-start gap-4">
        <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/20">
          <Film className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-semibold uppercase tracking-wide text-zinc-200">
              {movie.episodeLengthMin}m cuts
            </span>
            <span className="text-zinc-600">|</span>
            <span className="truncate text-zinc-500">
              ID {movie._id?.toString?.().slice(-6) || ""}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="truncate text-lg font-semibold text-white group-hover:text-zinc-50">
                {movie.title}
              </div>
              <div className="text-sm text-zinc-400">
                {movie.status.toUpperCase()} / {movie.episodeLengthMin}m episodes
              </div>
              <div className="truncate text-xs text-zinc-500">
                {movie.originalFilename || "Uploaded file"}
              </div>
            </div>

            <span
              className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeClass}`}
            >
              {movie.status}
            </span>
          </div>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-zinc-300" />
      </div>
    </Link>
  );
}
