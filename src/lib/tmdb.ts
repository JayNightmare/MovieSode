const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w1280"; // High res for backdrops

export type TmdbMovie = {
        tmdbId: number;
        title: string;
        overview: string;
        posterUrl: string | null;
        backdropUrl: string | null;
        releaseDate: string;
};

export async function searchMovie(query: string): Promise<TmdbMovie | null> {
        if (!TMDB_API_KEY) {
                console.warn(
                        "TMDB_API_KEY is not set. Skipping metadata fetch."
                );
                return null;
        }

        try {
                const searchRes = await fetch(
                        `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
                                query
                        )}&include_adult=false&language=en-US&page=1`
                );

                if (!searchRes.ok) return null;

                const searchData = await searchRes.json();
                if (!searchData.results || searchData.results.length === 0)
                        return null;

                // Pick the most popular result or first
                const bestMatch = searchData.results[0];

                return {
                        tmdbId: bestMatch.id,
                        title: bestMatch.title,
                        overview: bestMatch.overview,
                        posterUrl: bestMatch.poster_path
                                ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}`
                                : null,
                        backdropUrl: bestMatch.backdrop_path
                                ? `${IMAGE_BASE_URL}${bestMatch.backdrop_path}`
                                : null,
                        releaseDate: bestMatch.release_date,
                };
        } catch (err) {
                console.error("TMDB fetch failed", err);
                return null;
        }
}
