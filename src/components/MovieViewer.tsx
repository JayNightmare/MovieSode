/**
 * Client wrapper that wires EpisodeList and VideoPlayer together with progress updates.
 */

"use client";

import { useMemo, useState } from "react";
import { EpisodeList } from "./EpisodeList";
import { VideoPlayer } from "./VideoPlayer";
import { EpisodeDoc } from "@/types/media";

type Props = {
  movieId: string;
  episodes: EpisodeDoc[];
  progress: Record<string, number>;
};

export function MovieViewer({ movieId, episodes, progress }: Props) {
  const initialEpisode = useMemo(() => {
    return (
      episodes.find(
        (ep) => progress[ep._id] && progress[ep._id] < ep.durationSec - 10
      ) || episodes[0] ||
      null
    );
  }, [episodes, progress]);

  const [current, setCurrent] = useState<EpisodeDoc | null>(initialEpisode);

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-4">
        <VideoPlayer
          episode={current}
          initialTimeSec={current ? progress[current._id] || 0 : 0}
          onProgress={async (sec) => {
            if (!current) return;
            await fetch("/api/progress", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                movieId,
                episodeId: current._id,
                currentTimeSec: sec,
              }),
            });
          }}
        />
      </div>

      <EpisodeList
        episodes={episodes}
        currentEpisodeId={current?._id ?? null}
        onSelect={(ep) => setCurrent(ep)}
        progress={progress}
      />
    </section>
  );
}
