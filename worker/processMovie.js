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

const logFile = path.join(process.cwd(), "worker.log");
function log(msg, ...args) {
        const ts = new Date().toISOString();
        const str = [msg, ...args]
                .map((a) =>
                        a instanceof Error
                                ? a.stack
                                : typeof a === "object"
                                ? JSON.stringify(a)
                                : String(a)
                )
                .join(" ");

        // Also print to stdout so it might show up in some console somewhere
        console.log(`[${ts}] ${str}`);
        try {
                fs.appendFileSync(logFile, `[${ts}] ${str}\n`);
        } catch (e) {}
}

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

// Use spawn for safer stream handling (prevents stderr buffer overflow)
const { spawn } = require("child_process");

function detectSilences(inputPath, startSec, endSec) {
        return new Promise((resolve, reject) => {
                log(
                        `[Worker] Detecting silences in window: ${startSec}-${endSec}s`
                );

                // Use -ss before -i for fast seek.
                // Timestamps will be reset to 0 in output, so we must add 'startSec' to result.
                const args = [
                        "-ss",
                        String(startSec),
                        "-t",
                        String(endSec - startSec),
                        "-i",
                        inputPath,
                        "-af",
                        "silencedetect=noise=-30dB:d=0.5",
                        "-f",
                        "null",
                        "-",
                ];

                const child = spawn(ffmpegPath, args);

                const silences = [];
                let currentStart = null;
                let buffer = "";

                child.stderr.on("data", (chunk) => {
                        buffer += chunk.toString();
                        // Process lines
                        let lineEnd;
                        while ((lineEnd = buffer.indexOf("\n")) !== -1) {
                                const line = buffer.slice(0, lineEnd);
                                buffer = buffer.slice(lineEnd + 1);

                                if (!line.includes("silencedetect")) continue;

                                const startMatch = line.match(
                                        /silence_start: (\d+(\.\d+)?)/
                                );
                                if (startMatch) {
                                        currentStart = parseFloat(
                                                startMatch[1]
                                        );
                                }

                                const endMatch = line.match(
                                        /silence_end: (\d+(\.\d+)?)/
                                );
                                if (endMatch && currentStart !== null) {
                                        const end = parseFloat(endMatch[1]);
                                        // Offset by startSec because we fast-seeked
                                        const absStart =
                                                currentStart + startSec;
                                        const absEnd = end + startSec;

                                        silences.push({
                                                start: absStart,
                                                end: absEnd,
                                                duration: end - currentStart, // duration is same
                                                mid: (absStart + absEnd) / 2,
                                        });
                                        currentStart = null;
                                }
                        }
                });

                child.on("close", (code) => {
                        if (code !== 0) {
                                // Warn but don't fail, maybe just no silence found or tiny error
                                log(
                                        `[Worker] Silence detection exited with code ${code}`
                                );
                        }
                        resolve(silences);
                });

                child.on("error", (err) => {
                        log("Silence detection error", err);
                        resolve([]); // Fallback to empty
                });
        });
}

async function calculateSplitPoints(totalDuration, targetMinutes, inputPath, onProgress) {
        const targetSec = targetMinutes * 60;
        const points = [];
        let currentPos = 0;

        // Safety: minimum segment length (e.g. 10 mins)
        const minSegment = 600;

        while (currentPos + targetSec < totalDuration - minSegment) {
                const progressPct = currentPos / totalDuration;
                if (onProgress) await onProgress(progressPct); // Notify progress

                const ideal = currentPos + targetSec;
                // Window: +/- 2 minutes around ideal split
                const windowStart = Math.max(currentPos + 60, ideal - 120);
                const windowEnd = Math.min(totalDuration, ideal + 120);

                // Run detection on just this window
                const silences = await detectSilences(
                        inputPath,
                        windowStart,
                        windowEnd
                );
                
                // Find best silence
                let bestCandidate = null;
                let maxDuration = -1;

                for (const s of silences) {
                        if (s.duration > maxDuration) {
                                maxDuration = s.duration;
                                bestCandidate = s.mid;
                        }
                }

                const splitPoint = bestCandidate ?? ideal;

                if (splitPoint <= currentPos + 60) {
                        currentPos += targetSec;
                } else {
                        points.push(splitPoint.toFixed(3));
                        currentPos = splitPoint;
                }
        }

        return points;
}

async function segmentMovie(inputPath, outputDir, splitPointsComma) {
        await fs.promises.mkdir(outputDir, { recursive: true });
        const outputPattern = path.join(outputDir, "episode-%03d.mp4");

        const args = [
                "-i",
                inputPath,
                "-c",
                "copy",
                "-map",
                "0",
                "-f",
                "segment",
                "-reset_timestamps",
                "1",
        ];

        if (splitPointsComma && splitPointsComma.length > 0) {
                args.push("-segment_times", splitPointsComma);
        } else {
                // Fallback for no splits (single segment? or standard chunking?)
                // If no split points determined (e.g. short movie), let's just chunk by big duration
                // to effectively copy it, or we could handle it upstream.
                // Assuming upstream handles 'no splits' by not calling this or passing empty.
                // If we get here with empty, ffmpeg segment muxer without time args splits every... forever?
                // We'll treat empty as "no split" -> single episode.
                // But the main logic expects file output.
                // Let's use a huge segment time.
                args.push("-segment_time", "999999");
        }

        args.push(outputPattern);
                .filter((f) => f.startsWith("episode-") && f.endsWith(".mp4"))
                .sort();
}

/**
 * Helper to get file duration in seconds using ffprobe.
 */
function getDurationSeconds(filePath) {
    return new Promise((resolve, reject) => {
        execFile(
            ffprobePath,
            [
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                filePath
            ],
            (err, stdout) => {
                if (err) return reject(err);
                const val = parseFloat(stdout);
                if (isNaN(val)) return reject(new Error("Invalid duration"));
                resolve(val);
            }
        );
    });
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
        log(`[Worker] Starting processing for Movie ID: ${movieIdArg}`);
        if (!movieIdArg) {
                log("Usage: node worker/processMovie.js <movieId>");
                process.exit(1);
        }

        const movieObjectId = new ObjectId(movieIdArg);
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();
        const moviesCol = db.collection("movies");

        const updateProgress = async (pct, status, phase) => {
            try {
                const set = { progress: pct, updatedAt: new Date() };
                if (status) set.status = status;
                if (phase) set.processingPhase = phase;
                await moviesCol.updateOne({ _id: movieObjectId }, { $set: set });
                log(`[Worker] Progress: ${pct}% ${status ? `(${status})` : ''} ${phase ? `[${phase}]` : ''}`);
            } catch(e) { log("Failed to update progress", e); }
        };

        try {
                // moviesCol already defined above
                const episodesCol = db.collection("episodes");

                const movie = await moviesCol.findOne({ _id: movieObjectId });
                if (!movie) {
                        throw new Error(`Movie ${movieIdArg} not found`);
                }

                const uploadAbs = movie.uploadPath
                        ? path.isAbsolute(movie.uploadPath)
                                ? movie.uploadPath
                                : path.join(UPLOAD_DIR, movie.uploadPath)
                        : path.join(UPLOAD_DIR, "");

                if (!fs.existsSync(uploadAbs)) {
                        log(`[Worker] Upload file not found at: ${uploadAbs}`);
                        throw new Error(`Upload file missing at ${uploadAbs}`);
                }
                log(`[Worker] Found input file at: ${uploadAbs}`);

                await updateProgress(5, "processing", "Analyzing file duration...");

                const durationSec = await getDurationSeconds(uploadAbs);
                log(`[Worker] Duration: ${durationSec}s`);

                // --- Smart Split Logic (Optimized) ---
                const targetEpisodeMin = movie.episodeLengthMin || 22;

                log(
                        `[Worker] Calculating split points for duration ${durationSec}s`
                );
                
                await updateProgress(10, null, "Scanning for silence & calculating splits...");
                const splitPoints = await calculateSplitPoints(
                        durationSec,
                        targetEpisodeMin,
                        uploadAbs,
                        (pct) => updateProgress(10 + Math.round(pct * 0.4)) // 10-50% range
                );

                const splitPointsString = splitPoints.join(",");

                log(
                        `[Worker] Calculated ${splitPoints.length} split points: ${splitPointsString}`
                );
                await updateProgress(50, null, `Splitting into ${splitPoints.length + 1} episodes...`);

                const movieOutputDir = path.join(OUTPUT_DIR, movieIdArg);
                await fs.promises.rm(movieOutputDir, {
                        recursive: true,
                        force: true,
                });

                // Check for subtitles
                let hasSubtitles = false;
                try {
                        const { stdout: ffprobeOut } = await execFileAsync(
                                ffprobePath,
                                [
                                        "-v",
                                        "error",
                                        "-select_streams",
                                        "s",
                                        "-show_entries",
                                        "stream=index",
                                        "-of",
                                        "csv=p=0",
                                        uploadAbs,
                                ]
                        );
                        hasSubtitles = ffprobeOut.trim().length > 0;
                        log(`[Worker] Subtitles detected: ${hasSubtitles}`);
                } catch (e) {
                        log("[Worker] Subtitle check failed", e);
                }

                const outputFiles = await segmentMovie(
                        uploadAbs,
                        movieOutputDir,
                        splitPointsString
                );

                await updateProgress(70, null, "Processing subtitles...");

                if (hasSubtitles) {
                        try {
                                log("[Worker] Segmenting subtitles...");
                                await segmentSubtitles(
                                        uploadAbs,
                                        movieOutputDir,
                                        splitPointsString
                                );
                        } catch (err) {
                                log(
                                        "[Worker] Failed to process subtitles",
                                        err
                                );
                                // Continue without crashing
                        }
                }
                
                await updateProgress(80, null, "Finalizing episodes...");

                log(
                        `[Worker] Generated ${outputFiles.length} segments in: ${movieOutputDir}`
                );

                await episodesCol.deleteMany({
                        $or: [
                                { movieId: movieIdArg },
                                { movieId: movieObjectId },
                        ],
                });

                let cursor = 0;
                const docs = [];
                for (let i = 0; i < outputFiles.length; i++) {
                        const fileName = outputFiles[i];
                        const absolutePath = path.join(
                                movieOutputDir,
                                fileName
                        );
                        const dur = (await getFileDuration(absolutePath)) ?? 0;
                        log(`[Worker] Episode ${i} duration: ${dur}s`);

                        const startSec = cursor;
                        const endSec = cursor + dur;
                        cursor = endSec;

                        docs.push({
                                movieId: movieObjectId,
                                index: i,
                                title: `${movie.title} — Episode ${i + 1}`,
                                startSec: Math.round(startSec),
                                endSec: Math.round(endSec),
                                durationSec: Math.round(dur),
                                filePath: absolutePath,
                                hasSubtitles: hasSubtitles,
                                streamUrl: `/api/episodes/placeholder`,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                        });
                }

                if (docs.length > 0) {
                        const insertRes = await episodesCol.insertMany(docs);
                        const bulk = episodesCol.initializeUnorderedBulkOp();
                        Object.values(insertRes.insertedIds).forEach((id) => {
                                bulk.find({ _id: id }).update({
                                        $set: {
                                                streamUrl: `/api/episodes/${id}`,
                                        },
                                });
                        });
                        await bulk.execute();
                }

                await moviesCol.updateOne(
                        { _id: movieObjectId },
                        {
                                $set: {
                                        status: "ready",
                                        progress: 100,
                                        updatedAt: new Date(),
                                        durationSec: Math.round(durationSec),
                                        episodeCount: docs.length,
                                        outputDir: movieOutputDir,
                                },
                        }
                );

                log(
                        `Processed movie ${movieIdArg}: duration ${Math.round(
                                durationSec
                        )}s into ${docs.length} episodes`
                );
        } catch (err) {
                log("Processing failed:", err);
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
        log("Fatal error:", err);
        process.exit(1);
});
