"use client";

/**
 * Add Movie page with upload form.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
        AlertCircle,
        ArrowLeft,
        CheckCircle2,
        Loader2,
        Upload,
        Video,
} from "lucide-react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function NewMoviePage() {
        const router = useRouter();
        const [status, setStatus] = useState<UploadStatus>("idle");
        const [message, setMessage] = useState<string>("");
        const [movieId, setMovieId] = useState<string | null>(null);
        const [localPath, setLocalPath] = useState<string>("");

        const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                setStatus("uploading");
                setMessage("");
                setMovieId(null);

                const form = new FormData(event.currentTarget);

                try {
                        const res = await fetch("/api/movies/upload", {
                                method: "POST",
                                body: form,
                        });

                        if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                throw new Error(data?.error || "Upload failed");
                        }

                        const data = await res.json();
                        setStatus("success");
                        setMessage("Upload saved. Redirecting to library...");
                        setMovieId(data?.movieId || null);
                        // Redirect to Library as requested
                        router.push("/library");
                } catch (err: any) {
                        setStatus("error");
                        setMessage(err?.message || "Upload failed");
                }
        };

        return (
                <main className="space-y-8">
                        <Link
                                href="/library"
                                className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
                        >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Library
                        </Link>

                        <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 shadow-[0_25px_70px_-40px_rgba(0,0,0,0.9)]">
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-fuchsia-500/10 opacity-70" />

                                <div className="relative space-y-2">
                                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                                                Upload
                                        </p>
                                        <h1 className="text-3xl font-bold tracking-tight text-white">
                                                Add a Movie
                                        </h1>
                                        <p className="max-w-2xl text-sm text-zinc-400">
                                                Drop in a movie you own or point
                                                to an existing file path.
                                                We&apos;ll keep everything on
                                                your computer, kick off
                                                processing automatically, and
                                                split it into episodes.
                                        </p>
                                </div>
                        </section>

                        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                                <form
                                        onSubmit={onSubmit}
                                        className="space-y-6 rounded-2xl border border-white/5 bg-zinc-950/80 p-6 shadow-inner shadow-black/40"
                                >
                                        <div className="space-y-2">
                                                <label
                                                        className="text-sm font-semibold text-zinc-200"
                                                        htmlFor="title"
                                                >
                                                        Title
                                                </label>
                                                <input
                                                        id="title"
                                                        name="title"
                                                        type="text"
                                                        placeholder="Movie title"
                                                        className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white outline-none ring-0 transition focus:border-white/30"
                                                />
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                        <label
                                                                className="text-sm font-semibold text-zinc-200"
                                                                htmlFor="episodeLengthMin"
                                                        >
                                                                Episode length
                                                                (minutes)
                                                        </label>
                                                        <input
                                                                id="episodeLengthMin"
                                                                name="episodeLengthMin"
                                                                type="number"
                                                                min={10}
                                                                max={60}
                                                                defaultValue={
                                                                        22
                                                                }
                                                                className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white outline-none ring-0 transition focus:border-white/30"
                                                        />
                                                </div>
                                                <div className="space-y-2">
                                                        <label className="text-sm font-semibold text-zinc-200">
                                                                Storage
                                                        </label>
                                                        <p className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                                                                Uses your
                                                                filesystem:
                                                                uploads stay
                                                                local, episodes
                                                                go to{" "}
                                                                <code className="bg-zinc-900/80 px-1">
                                                                        ~/Documents/MovieSode/Episodes
                                                                </code>
                                                                .
                                                        </p>
                                                </div>
                                        </div>

                                        <div className="space-y-3">
                                                <label className="text-sm font-semibold text-zinc-200">
                                                        Movie file
                                                </label>
                                                <input
                                                        type="hidden"
                                                        name="localFilePath"
                                                        value={localPath}
                                                />

                                                <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-white/10 bg-zinc-900/50 p-6 transition hover:bg-zinc-900/80">
                                                        <div className="flex items-center gap-4">
                                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/20">
                                                                        {localPath ? (
                                                                                <CheckCircle2 className="h-6 w-6" />
                                                                        ) : (
                                                                                <Upload className="h-6 w-6" />
                                                                        )}
                                                                </div>
                                                                <div className="flex-1">
                                                                        {localPath ? (
                                                                                <div>
                                                                                        <p className="font-semibold text-white">
                                                                                                Local
                                                                                                file
                                                                                                selected
                                                                                        </p>
                                                                                        <p className="break-all text-xs text-zinc-400">
                                                                                                {
                                                                                                        localPath
                                                                                                }
                                                                                        </p>
                                                                                </div>
                                                                        ) : (
                                                                                <div>
                                                                                        <p className="font-semibold text-white">
                                                                                                Select
                                                                                                a
                                                                                                movie
                                                                                        </p>
                                                                                        <p className="text-xs text-zinc-400">
                                                                                                {typeof window !==
                                                                                                        "undefined" &&
                                                                                                window.moviesode
                                                                                                        ? "We'll read the file directly from disk."
                                                                                                        : "Upload or select a local file."}
                                                                                        </p>
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>

                                                        {localPath ? (
                                                                <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                                setLocalPath(
                                                                                        ""
                                                                                )
                                                                        }
                                                                        className="self-start text-xs text-rose-400 hover:underline cursor-pointer"
                                                                >
                                                                        Clear
                                                                        selection
                                                                </button>
                                                        ) : (
                                                                <div className="space-y-4 w-full">
                                                                        <div className="flex flex-wrap gap-3">
                                                                                {/* Electron Picker */}
                                                                                <button
                                                                                        type="button"
                                                                                        onClick={async () => {
                                                                                                if (
                                                                                                        window
                                                                                                                ?.moviesode
                                                                                                                ?.pickVideoFile
                                                                                                ) {
                                                                                                        const picked =
                                                                                                                await window.moviesode.pickVideoFile();
                                                                                                        if (
                                                                                                                picked
                                                                                                        )
                                                                                                                setLocalPath(
                                                                                                                        picked
                                                                                                                );
                                                                                                } else {
                                                                                                        alert(
                                                                                                                "Electron picker not available in browser mode. Use the manual input below."
                                                                                                        );
                                                                                                }
                                                                                        }}
                                                                                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 cursor-pointer"
                                                                                >
                                                                                        <Video className="h-4 w-4" />
                                                                                        Select
                                                                                        File
                                                                                        (Electron)
                                                                                </button>
                                                                        </div>

                                                                        <div className="relative">
                                                                                <div className="absolute inset-0 flex items-center">
                                                                                        <span className="w-full border-t border-white/10" />
                                                                                </div>
                                                                                <div className="relative flex justify-center text-xs uppercase">
                                                                                        <span className="bg-zinc-900 px-2 text-zinc-500">
                                                                                                Or
                                                                                                enter
                                                                                                path
                                                                                                manually
                                                                                        </span>
                                                                                </div>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                                <input
                                                                                        type="text"
                                                                                        placeholder="C:\Users\You\Videos\Movie.mp4"
                                                                                        className="w-full rounded-xl border border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none ring-0 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-zinc-800"
                                                                                        onChange={(
                                                                                                e
                                                                                        ) =>
                                                                                                setLocalPath(
                                                                                                        e
                                                                                                                .target
                                                                                                                .value
                                                                                                )
                                                                                        }
                                                                                />
                                                                                <p className="text-[10px] text-zinc-500">
                                                                                        Paste
                                                                                        the
                                                                                        absolute
                                                                                        path
                                                                                        to
                                                                                        a
                                                                                        video
                                                                                        file
                                                                                        on
                                                                                        your
                                                                                        computer.
                                                                                </p>
                                                                        </div>
                                                                </div>
                                                        )}
                                                </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                                <button
                                                        type="submit"
                                                        disabled={
                                                                status ===
                                                                "uploading"
                                                        }
                                                        className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                                                >
                                                        {status ===
                                                        "uploading" ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                                <Video className="h-4 w-4" />
                                                        )}
                                                        {status === "uploading"
                                                                ? "Uploading..."
                                                                : "Save + Process"}
                                                </button>

                                                {status === "success" && (
                                                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-100">
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                Saved{" "}
                                                                {movieId
                                                                        ? `(${movieId.slice(
                                                                                  -6
                                                                          )})`
                                                                        : ""}
                                                        </span>
                                                )}
                                                {status === "error" && (
                                                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-sm text-rose-100">
                                                                <AlertCircle className="h-4 w-4" />
                                                                {message ||
                                                                        "Upload failed"}
                                                        </span>
                                                )}
                                        </div>

                                        {status !== "idle" && message && (
                                                <p className="text-sm text-zinc-400">
                                                        {message}
                                                </p>
                                        )}
                                </form>

                                <div className="space-y-4 rounded-2xl border border-white/5 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-sm text-zinc-300 shadow-inner shadow-black/40">
                                        <div className="flex items-center gap-2 text-zinc-100">
                                                <Upload className="h-4 w-4" />
                                                <span className="font-semibold">
                                                        What happens on upload
                                                </span>
                                        </div>
                                        <ul className="space-y-2 text-sm text-zinc-400">
                                                <li>
                                                        1) If you upload, the
                                                        file is written to your
                                                        machine (default:
                                                        <code className="bg-zinc-900/70 px-1">
                                                                ~/Documents/MovieSode/Uploads
                                                        </code>
                                                        ). If you provide a
                                                        path, it is used
                                                        directly (no copy).
                                                </li>
                                                <li>
                                                        2) A movie record is
                                                        created in MongoDB with
                                                        status{" "}
                                                        <code className="bg-zinc-900/70 px-1">
                                                                uploaded
                                                        </code>
                                                        , then the background
                                                        worker starts
                                                        immediately.
                                                </li>
                                                <li>
                                                        3) ffmpeg cuts it into
                                                        custom session length
                                                        episodes saved in{" "}
                                                        <code className="bg-zinc-900/70 px-1">
                                                                ~/Documents/MovieSode/Episodes
                                                        </code>
                                                        .
                                                </li>
                                        </ul>
                                        {movieId && (
                                                <Link
                                                        href="/library"
                                                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/30"
                                                >
                                                        View in Library
                                                </Link>
                                        )}
                                </div>
                        </section>
                </main>
        );
}
