/**
 * Home route: sends user to Library.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
        return (
                <main className="space-y-6">
                        <h1 className="text-4xl font-bold tracking-tight">
                                MovieSode
                        </h1>
                        <p className="max-w-prose text-zinc-300">
                                Split your movies into 20–25 minute episodes and
                                watch them like a series. A simple personal tool
                                to turn long films into bite-sized sessions.
                        </p>
                        <div className="flex items-center gap-3">
                                <Link
                                        href="/library"
                                        className="btn btn-primary"
                                >
                                        Go to Library{" "}
                                        <ArrowRight className="size-4" />
                                </Link>
                                <a
                                        href="/movie/new"
                                        className="btn btn-outline"
                                >
                                        Add Movie
                                </a>
                        </div>
                </main>
        );
}
