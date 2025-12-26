/**
 * Library page: lists movies from the API.
 */

import { MovieCard } from "@/components/MovieCard";
import { MovieDoc } from "@/types/media";
import { PlusCircle } from "lucide-react";

async function getMovies(): Promise<MovieDoc[]> {
  const res = await fetch(`${process.env.BASE_URL}/api/movies`, {
    cache: "no-store",
  });
  const data = await res.json();
  return (data.movies || []).map((m: any) => ({
    ...m,
    _id: m._id?.toString?.() ?? m._id,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
}

export default async function LibraryPage() {
  const movies = await getMovies();
  const movieCountLabel = `${movies.length} ${movies.length === 1 ? "movie" : "movies"}`;

  return (
    <main className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 shadow-[0_25px_70px_-40px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-fuchsia-500/10 opacity-70" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Local-first</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Library</h1>
            <p className="max-w-2xl text-sm text-zinc-400">
              Upload your own movies, split them into 20-25 minute sessions, and pick up where you
              left off.
            </p>
          </div>
          <a
            href="/movie/new"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 shadow hover:bg-white"
          >
            <PlusCircle className="h-4 w-4" /> Add Movie
          </a>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-3 text-xs text-zinc-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium">
            {movieCountLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium">
            20-25 minute sessions
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium">
            Stored locally, progress in MongoDB
          </span>
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {movies.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>

        {movies.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-zinc-950/80 p-6 text-zinc-300 shadow-inner shadow-black/40">
            No movies yet. Add your first upload to start cutting it into episodes.
          </div>
        )}
      </section>
    </main>
  );
}
