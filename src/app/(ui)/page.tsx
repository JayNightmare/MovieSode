/**
 * Home route: Dashboard with Continue Watching and Recent.
 */

import Link from "next/link";
import { ArrowRight, Play, Plus } from "lucide-react";
import { getDb } from "@/lib/mongodb";
import { MovieCard } from "@/components/MovieCard";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

async function getData() {
    const db = await getDb();

    // 1. Get recent movies
    const recentMovies = await db
        .collection("movies")
        .find({}, { projection: { uploadPath: 0 } })
        .sort({ createdAt: -1 })
        .limit(4)
        .toArray();

    // 2. Get progress to find "Continue Watching"
    // We want movies where the user has watched something recently
    // This is a bit complex to do purely in one query without a robust "user" concept,
    // but for a personal tool, we can grab the most recent progress updates.
    const recentProgress = await db
        .collection("progress")
        .find({})
        .sort({ updatedAt: -1 })
        .limit(20)
        .toArray();

    const inProgressMovieIds = [
        ...new Set(recentProgress.map((p) => p.movieId)),
    ];

    let continueWatching = [];
    if (inProgressMovieIds.length > 0) {
        // preserve order of recency
        const movies = await db
            .collection("movies")
            .find({
                _id: {
                    $in: inProgressMovieIds.map((id) =>
                        typeof id === "string" ? new ObjectId(id) : id
                    ),
                },
            })
            .toArray();

        // Sort by the order they appeared in progress
        continueWatching = inProgressMovieIds
            .map((id) => movies.find((m) => m._id.toString() === id.toString()))
            .filter(Boolean);
    }

    return {
        recentMovies: recentMovies.map((m) => ({
            ...m,
            _id: m._id.toString(),
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
        })),
        continueWatching: continueWatching
            .map((m) => ({
                ...m,
                _id: m._id.toString(),
                createdAt: m.createdAt,
                updatedAt: m.updatedAt,
            }))
            .slice(0, 3), // limit to 3
    };
}

export default async function Home() {
    const { recentMovies, continueWatching } = await getData();

    const hasContent = recentMovies.length > 0;

    return (
        <main className="space-y-10 pb-10">
            {/* Hero / Welcome */}
            <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

                <div className="relative z-10 space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                        Welcome to{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                            MovieSode
                        </span>
                    </h1>
                    <p className="max-w-xl text-lg text-zinc-400">
                        Your personal cinema, bite-sized. Turn your local movie
                        collection into a serialized experience.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-2">
                        <Link
                            href="/library"
                            className="btn btn-primary bg-white text-zinc-950 hover:bg-zinc-200"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Go to Library
                        </Link>
                        <Link
                            href="/movie/new"
                            className="btn btn-outline border-white/20 text-white hover:bg-white/10"
                        >
                            <Plus className="h-4 w-4" />
                            Add Movie
                        </Link>
                    </div>
                </div>
            </section>

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            Continue Watching
                        </h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {continueWatching.map((movie) => (
                            <MovieCard key={movie._id} movie={movie} />
                        ))}
                    </div>
                </section>
            )}

            {/* Recently Added */}
            {recentMovies.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            Recently Added
                        </h2>
                        <Link
                            href="/library"
                            className="group flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
                        >
                            View All{" "}
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </Link>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {recentMovies.map((movie) => (
                            <MovieCard key={movie._id} movie={movie} />
                        ))}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {!hasContent && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
                    <div className="mb-4 rounded-full bg-zinc-800 p-4 text-zinc-500">
                        <FilmIcon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                        No movies yet
                    </h3>
                    <p className="max-w-xs text-sm text-zinc-400">
                        Get started by adding a movie from your computer.
                    </p>
                </div>
            )}
        </main>
    );
}

function FilmIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 3v18" />
            <path d="M3 7.5h4" />
            <path d="M3 12h18" />
            <path d="M3 16.5h4" />
            <path d="M17 3v18" />
            <path d="M17 7.5h4" />
            <path d="M17 16.5h4" />
        </svg>
    );
}
