/**
 * Shared types for the UI (Mongo documents will be similar).
 */

export type MovieDoc = {
        _id: string;
        title: string;
        originalFilename: string;
        status: "uploaded" | "processing" | "ready" | "failed";
        createdAt: string;
        updatedAt: string;

        uploadPath: string;
        progress?: number;
        processingPhase?: string;
        durationSec?: number;
        episodeLengthMin: number;
        episodeCount?: number;
        posterUrl?: string;
        backdropUrl?: string; // High-res background
        overview?: string;
        tmdbId?: number;
        releaseDate?: string;
};

export type EpisodeDoc = {
        _id: string;
        movieId: string;
        index: number;
        title: string;
        startSec: number;
        endSec: number;
        durationSec: number;
        hasSubtitles?: boolean;
        filePath: string;
        streamUrl: string;
};

export type ProgressDoc = {
        _id: string;
        movieId: string;
        episodeId: string;
        currentTimeSec: number;
        updatedAt: string;
};
