/**
 * Simple HTML5 video player with progress reporting.
 */

"use client";

import { useEffect, useRef } from "react";
import { EpisodeDoc } from "@/types/media";

type Props = {
        episode: EpisodeDoc | null;
        initialTimeSec?: number;
        onProgress?: (sec: number) => void;
        onEnded?: () => void;
};

export function VideoPlayer({
        episode,
        initialTimeSec = 0,
        onProgress,
        onEnded,
}: Props) {
        const videoRef = useRef<HTMLVideoElement | null>(null);
        const lastSentRef = useRef<number>(0);

        useEffect(() => {
                const video = videoRef.current;
                if (!video || !episode) return;

                const handleLoadedMetadata = () => {
                        if (
                                initialTimeSec > 0 &&
                                video.duration > initialTimeSec
                        ) {
                                video.currentTime = initialTimeSec;
                        }
                };

                const handleTimeUpdate = () => {
                        if (!onProgress) return;
                        const current = Math.floor(video.currentTime);
                        const now = Date.now();
                        if (now - lastSentRef.current > 1500) {
                                lastSentRef.current = now;
                                onProgress(current);
                        }
                };

                const handlePause = () => {
                        if (onProgress)
                                onProgress(Math.floor(video.currentTime));
                };

                video.addEventListener("loadedmetadata", handleLoadedMetadata);
                video.addEventListener("timeupdate", handleTimeUpdate);
                video.addEventListener("pause", handlePause);
                if (onEnded) video.addEventListener("ended", onEnded);

                return () => {
                        video.removeEventListener(
                                "loadedmetadata",
                                handleLoadedMetadata
                        );
                        video.removeEventListener(
                                "timeupdate",
                                handleTimeUpdate
                        );
                        video.removeEventListener("pause", handlePause);
                        if (onEnded)
                                video.removeEventListener("ended", onEnded);
                };
        }, [episode, initialTimeSec, onProgress, onEnded]);

        if (!episode) {
                return (
                        <div className="aspect-video w-full rounded-2xl border border-white/5 bg-zinc-950/70 p-6 text-zinc-300">
                                No episode selected.
                        </div>
                );
        }

        return (
                <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                                <div>
                                        <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                                                Now playing
                                        </div>
                                        <div className="text-lg font-semibold text-white">
                                                Episode {episode.index + 1}:{" "}
                                                {episode.title}
                                        </div>
                                </div>
                                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                                        {Math.round(episode.durationSec / 60)}{" "}
                                        min
                                </div>
                        </div>

                        <video
                                key={episode._id}
                                ref={videoRef}
                                controls
                                className="aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-black"
                                src={`/api/episodes/${episode._id}`}
                        >
                                {episode.hasSubtitles && (
                                        <track
                                                kind="subtitles"
                                                src={`/api/episodes/${episode._id}/subs`}
                                                srcLang="en"
                                                label="English"
                                                default
                                        />
                                )}
                        </video>
                </div>
        );
}
