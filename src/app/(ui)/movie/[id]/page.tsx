/**
 * Movie detail page with episodes + player.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeInfo, Clock3, Folder } from "lucide-react";
import { MovieViewer } from "@/components/MovieViewer";
import { ProcessingWatcher } from "@/components/ProcessingWatcher";
import { EpisodeDoc, MovieDoc, ProgressDoc } from "@/types/media";

const statusStyles: Record<MovieDoc["status"], string> = {
        uploaded: "bg-amber-500/15 text-amber-100 border-amber-500/30",
        processing: "bg-sky-500/15 text-sky-100 border-sky-500/30",
        ready: "bg-emerald-500/15 text-emerald-100 border-emerald-500/30",
        failed: "bg-rose-500/15 text-rose-100 border-rose-500/30",
};

async function getMovie(
        id: string
): Promise<(MovieDoc & { episodes?: EpisodeDoc[] }) | null> {
        const res = await fetch(
                `${process.env.BASE_URL}/api/movies/${encodeURIComponent(id)}`,
                {
                        cache: "no-store",
                }
        );
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to load movie");
        const data = await res.json();
        const movie = data.movie;
        return movie
                ? {
                          ...movie,
                          _id: movie._id?.toString?.() ?? movie._id,
                          createdAt: movie.createdAt,
                          updatedAt: movie.updatedAt,
                          episodes: (movie.episodes || []).map((e: any) => ({
                                  ...e,
                                  _id: e._id?.toString?.() ?? e._id,
                          })),
                  }
                : null;
}

async function getProgress(movieId: string): Promise<ProgressDoc[]> {
        const res = await fetch(
                `${process.env.BASE_URL}/api/progress?movieId=${movieId}`,
                {
                        cache: "no-store",
                }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.progress || []).map((p: any) => ({
                ...p,
                _id: p._id?.toString?.() ?? p._id,
                updatedAt: p.updatedAt,
        }));
}

export default async function MoviePage({
        params,
}: {
        params: Promise<{ id: string }>;
}) {
        const { id: movieId } = await params;
        if (!movieId) return notFound();

        const [movie, progress] = await Promise.all([
                getMovie(movieId),
                getProgress(movieId),
        ]);
        if (!movie) return notFound();

        const badgeClass =
                statusStyles[movie.status] ||
                "bg-zinc-800/60 text-zinc-200 border-zinc-700";

        const progressMap = progress.reduce<Record<string, number>>(
                (acc, p) => {
                        acc[p.episodeId] = p.currentTimeSec;
                        return acc;
                },
                {}
        );

        const episodes = movie.episodes || [];

        return (
                <main className="space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
                                <Link
                                        href="/library"
                                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/30"
                                >
                                        ← Back to Library
                                </Link>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                        Movie ID: {movie._id}
                                </span>
                        </div>

                        <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 shadow-[0_25px_70px_-40px_rgba(0,0,0,0.9)]">
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-fuchsia-500/10 opacity-70" />

                                <div className="relative space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                                <span
                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeClass}`}
                                                >
                                                        {movie.status}
                                                </span>
                                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                                                        <Clock3 className="h-4 w-4" />
                                                        {movie.episodeLengthMin}{" "}
                                                        minute episodes
                                                </span>
                                                <ProcessingWatcher
                                                        movieId={movie._id}
                                                        initialStatus={
                                                                movie.status
                                                        }
                                                />
                                        </div>

                                        {movie.backdropUrl && (
                                                <div className="absolute inset-0 -z-10">
                                                        <img
                                                                src={
                                                                        movie.backdropUrl
                                                                }
                                                                alt=""
                                                                className="h-full w-full object-cover opacity-20 blur-sm"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                                </div>
                                        )}

                                        <div className="space-y-4">
                                                <div className="flex gap-6">
                                                        {movie.posterUrl && (
                                                                <img
                                                                        src={
                                                                                movie.posterUrl
                                                                        }
                                                                        alt={
                                                                                movie.title
                                                                        }
                                                                        className="hidden w-32 rounded-lg shadow-lg md:block"
                                                                />
                                                        )}
                                                        <div className="space-y-2">
                                                                <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">
                                                                        {
                                                                                movie.title
                                                                        }
                                                                </h1>
                                                                <p className="text-sm text-zinc-400">
                                                                        {movie.releaseDate
                                                                                ? movie.releaseDate.split(
                                                                                          "-"
                                                                                  )[0]
                                                                                : ""}{" "}
                                                                        •{" "}
                                                                        {
                                                                                movie.originalFilename
                                                                        }
                                                                </p>
                                                                {movie.overview && (
                                                                        <p className="max-w-2xl text-base text-zinc-300 antialiased">
                                                                                {
                                                                                        movie.overview
                                                                                }
                                                                        </p>
                                                                )}
                                                        </div>
                                                </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-3">
                                                <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 text-sm text-zinc-300">
                                                        <div className="mb-2 flex items-center gap-2 text-zinc-100">
                                                                <Folder className="h-4 w-4" />
                                                                <span className="font-semibold">
                                                                        Upload
                                                                        path
                                                                </span>
                                                        </div>
                                                        <code className="block rounded bg-zinc-900/70 px-2 py-1 text-xs text-zinc-200">
                                                                {movie.uploadPath ||
                                                                        "n/a"}
                                                        </code>
                                                </div>
                                                <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 text-sm text-zinc-300">
                                                        <div className="mb-2 flex items-center gap-2 text-zinc-100">
                                                                <Folder className="h-4 w-4" />
                                                                <span className="font-semibold">
                                                                        Episode
                                                                        Path
                                                                </span>
                                                        </div>
                                                        <code className="block rounded bg-zinc-900/70 px-2 py-1 text-xs text-zinc-200 break-all">
                                                                {/* @ts-expect-error outputDir might not exist on type yet */}
                                                                {movie.outputDir ||
                                                                        "n/a"}
                                                        </code>
                                                </div>
                                                <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 text-sm text-zinc-300 md:col-span-1">
                                                        <div className="mb-2 flex items-center gap-2 text-zinc-100">
                                                                <BadgeInfo className="h-4 w-4" />
                                                                <span className="font-semibold">
                                                                        Status
                                                                </span>
                                                        </div>
                                                        <p className="text-sm text-zinc-400">
                                                                {movie.status ===
                                                                "ready"
                                                                        ? "Episodes are ready to watch below."
                                                                        : movie.status ===
                                                                          "processing"
                                                                        ? "Processing... ffmpeg is cutting your movie into episodes."
                                                                        : movie.status ===
                                                                          "failed"
                                                                        ? "Processing failed. Re-run the worker."
                                                                        : "Uploaded. Run the worker to split into episodes."}
                                                        </p>
                                                </div>
                                        </div>
                                </div>
                        </section>

                        <MovieViewer
                                movieId={movie._id}
                                episodes={episodes}
                                progress={progressMap}
                        />
                </main>
        );
}
