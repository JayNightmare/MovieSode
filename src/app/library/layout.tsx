/**
 * App layout shell for UI routes.
 */

import Link from "next/link";
import "../globals.css";

export default function UILayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="mx-auto max-w-6xl px-4">
            <header className="sticky top-0 z-10 -mx-4 mb-8 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50">
                <div className="mx-auto max-w-6xl px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <Link
                            href="/"
                            className="group inline-flex items-center gap-2"
                        >
                            <span className="inline-block size-2 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20" />
                            <span className="text-lg font-semibold tracking-tight group-hover:underline">
                                MovieSode
                            </span>
                        </Link>
                        <nav className="flex items-center gap-2">
                            <Link href="/" className="btn btn-outline text-sm">
                                Home
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="pb-16">{children}</main>
        </div>
    );
}
