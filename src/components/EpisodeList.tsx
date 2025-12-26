/**
 * Episode list component to select which episode to play.
 */

"use client";

import { EpisodeDoc } from "@/types/media";
import { Play, Radio } from "lucide-react";

type Props = {
  episodes: EpisodeDoc[];
  currentEpisodeId: string | null;
  onSelect: (episode: EpisodeDoc) => void;
  progress?: Record<string, number>;
};

export function EpisodeList({ episodes, currentEpisodeId, onSelect, progress = {} }: Props) {
  if (!episodes.length) {
    return (
      <div className="rounded-2xl border border-white/5 bg-zinc-950/70 p-6 text-zinc-300">
        No episodes yet. The movie is still processing.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {episodes.map((ep) => {
        const isActive = ep._id === currentEpisodeId;
        const watchedSeconds = progress[ep._id] ?? 0;
        const progressPct = Math.min(100, Math.round((watchedSeconds / ep.durationSec) * 100));

        return (
          <button
            key={ep._id}
            onClick={() => onSelect(ep)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
              isActive
                ? "border-cyan-400/50 bg-cyan-500/10"
                : "border-white/5 bg-zinc-950/60 hover:border-white/15"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isActive ? "bg-cyan-500/20 text-cyan-100" : "bg-zinc-900 text-zinc-200"
                }`}
              >
                {isActive ? <Radio className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Episode {ep.index + 1}</div>
                <div className="text-xs text-zinc-400">
                  {Math.round(ep.durationSec / 60)} min • {ep.title}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {watchedSeconds > 0 && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-200">
                  {progressPct}%
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
                {Math.round(ep.durationSec)}s
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
