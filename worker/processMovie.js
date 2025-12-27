/**
 * Movie processing worker
 * - Reads a movie doc by id
 * - Runs ffprobe to detect duration
 * - Runs ffmpeg to split into episodes of episodeLengthMin
 * - Saves episode files to OUTPUT_DIR/<movieId>/episode-XXX.mp4
 * - Stores episode docs in MongoDB and updates the movie status to "ready"
 *
 * Usage:
 *   node worker/processMovie.js <movieId>
 *
 * Requires ffmpeg/ffprobe on PATH.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { MongoClient, ObjectId } = require("mongodb");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

// Lightweight .env loader (for local runs)
function loadEnvFromFile() {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
    }
}

loadEnvFromFile();

const MONGODB_URI = process.env.MONGODB_URI;
const docsDir = path.join(os.homedir(), "Documents", "MovieSode");
// Force absolute paths to Documents folder if not already absolute
const UPLOAD_DIR =
    process.env.UPLOAD_DIR && path.isAbsolute(process.env.UPLOAD_DIR)
        ? process.env.UPLOAD_DIR
        : path.join(docsDir, "Uploads");

const OUTPUT_DIR =
    process.env.OUTPUT_DIR && path.isAbsolute(process.env.OUTPUT_DIR)
        ? process.env.OUTPUT_DIR
        : path.join(docsDir, "Episodes");

if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI in environment");
    process.exit(1);
}

function execFileAsync(cmd, args) {
    return new Promise((resolve, reject) => {
        // windowsHide: true prevents popups on Windows
        execFile(
            cmd,
            args,
            { encoding: "utf-8", windowsHide: true },
            (err, stdout, stderr) => {
                if (err) {
                    err.stderr = stderr;
                    return reject(err);
                }
                resolve({ stdout, stderr });
            }
        );
    });
}

async function getDurationSeconds(inputPath) {
    const { stdout } = await execFileAsync(ffprobePath, [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nokey=1:noprint_wrappers=1",
        inputPath,
    ]);
    const val = parseFloat(stdout.trim());
    if (!Number.isFinite(val)) throw new Error("Unable to parse duration");
    return val;
}

async function segmentMovie(inputPath, outputDir, segmentSeconds) {
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPattern = path.join(outputDir, "episode-%03d.mp4");
    await execFileAsync(ffmpegPath, [
        "-i",
        inputPath,
        "-c",
        "copy",
        "-map",
        "0",
        "-f",
        "segment",
        "-segment_time",
        String(segmentSeconds),
        "-reset_timestamps",
        "1",
        outputPattern,
    ]);
    const files = await fs.promises.readdir(outputDir);
    return files
        .filter((f) => f.startsWith("episode-") && f.endsWith(".mp4"))
        .sort();
}

async function getFileDuration(filePath) {
    try {
        return await getDurationSeconds(filePath);
    } catch {
        return null;
    }
}

async function main() {
    const movieIdArg = process.argv[2];
    console.log(`[Worker] Starting processing for Movie ID: ${movieIdArg}`);
    if (!movieIdArg) {
        console.error("Usage: node worker/processMovie.js <movieId>");
        process.exit(1);
    }

    const movieObjectId = new ObjectId(movieIdArg);
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();

    try {
        const moviesCol = db.collection("movies");
        const episodesCol = db.collection("episodes");

        const movie = await moviesCol.findOne({ _id: movieObjectId });
        if (!movie) {
            throw new Error(`Movie ${movieIdArg} not found`);
        }

        const uploadAbs = movie.uploadPath
            ? path.isAbsolute(movie.uploadPath)
                ? movie.uploadPath
                : path.join(UPLOAD_DIR, movie.uploadPath) // Use UPLOAD_DIR as base if relative
            : path.join(UPLOAD_DIR, ""); // Fallback

        if (!fs.existsSync(uploadAbs)) {
            console.error(`[Worker] Upload file not found at: ${uploadAbs}`);
            throw new Error(`Upload file missing at ${uploadAbs}`);
        }
        console.log(`[Worker] Found input file at: ${uploadAbs}`);

        // Mark processing
        await moviesCol.updateOne(
            { _id: movieObjectId },
            { $set: { status: "processing", updatedAt: new Date() } }
        );

        const durationSec = await getDurationSeconds(uploadAbs);
        const segmentSeconds = Math.max(
            60,
            Math.round((movie.episodeLengthMin || 22) * 60)
        );

        // Clean previous output/docs
        // User requested to use ID-based folder again for reliability
        const movieOutputDir = path.join(OUTPUT_DIR, movieIdArg);

        await fs.promises.rm(movieOutputDir, { recursive: true, force: true });

        const outputFiles = await segmentMovie(
            uploadAbs,
            movieOutputDir,
            segmentSeconds
        );
        console.log(
            `[Worker] Generated ${outputFiles.length} segments in: ${movieOutputDir}`
        );

        // Clear old episodes (handle both string/ObjectId to be safe during migration)
        await episodesCol.deleteMany({
            $or: [{ movieId: movieIdArg }, { movieId: movieObjectId }],
        });

        let cursor = 0;
        const docs = [];
        for (let i = 0; i < outputFiles.length; i++) {
            const fileName = outputFiles[i];
            const absolutePath = path.join(movieOutputDir, fileName);
            const dur = (await getFileDuration(absolutePath)) ?? segmentSeconds;
            const startSec = cursor;
            const endSec = cursor + dur;
            cursor = endSec;

            docs.push({
                movieId: movieObjectId, // Store as ObjectId for proper lookup
                index: i,
                title: `${movie.title} — Episode ${i + 1}`,
                startSec: Math.round(startSec),
                endSec: Math.round(endSec),
                durationSec: Math.round(dur),
                filePath: absolutePath,
                streamUrl: `/api/episodes/placeholder`,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        if (docs.length > 0) {
            const insertRes = await episodesCol.insertMany(docs);
            // Update streamUrl now that _ids are known
            const bulk = episodesCol.initializeUnorderedBulkOp();
            Object.values(insertRes.insertedIds).forEach((id) => {
                bulk.find({ _id: id }).update({
                    $set: { streamUrl: `/api/episodes/${id}` },
                });
            });
            await bulk.execute();
        }

        await moviesCol.updateOne(
            { _id: movieObjectId },
            {
                $set: {
                    status: "ready",
                    updatedAt: new Date(),
                    durationSec: Math.round(durationSec),
                    episodeCount: docs.length,
                    outputDir: movieOutputDir, // Save output directory for UI visibility
                },
            }
        );

        console.log(
            `Processed movie ${movieIdArg}: duration ${Math.round(
                durationSec
            )}s into ${docs.length} episodes`
        );
    } catch (err) {
        console.error("Processing failed:", err);
        await db
            .collection("movies")
            .updateOne(
                { _id: movieObjectId },
                {
                    $set: {
                        status: "failed",
                        error: err?.message,
                        updatedAt: new Date(),
                    },
                }
            )
            .catch(() => {});
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
