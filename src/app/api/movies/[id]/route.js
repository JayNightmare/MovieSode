/**
 * Movie Detail API
 * - GET: Get single movie
 * - DELETE: Delete movie, episodes, progress, and files
 */

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import fs from "fs";
import path from "path";
import { OUTPUT_DIR } from "@/lib/paths";

export const runtime = "nodejs";

export async function GET(req, { params }) {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = await getDb();
    // Join episodes
    const movies = await db
        .collection("movies")
        .aggregate([
            { $match: { _id: new ObjectId(id) } },
            {
                $lookup: {
                    from: "episodes",
                    localField: "_id",
                    foreignField: "movieId",
                    as: "episodes",
                },
            },
            {
                $addFields: {
                    episodes: {
                        $sortArray: {
                            input: "$episodes",
                            sortBy: { index: 1 },
                        },
                    },
                },
            },
        ])
        .toArray();

    if (!movies.length) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ movie: movies[0] });
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        const db = await getDb();
        const movie = await db
            .collection("movies")
            .findOne({ _id: new ObjectId(id) });
        if (!movie) {
            return NextResponse.json(
                { error: "Movie not found" },
                { status: 404 }
            );
        }

        // 1. Delete DB records
        await db
            .collection("episodes")
            .deleteMany({ movieId: new ObjectId(id) });
        await db.collection("progress").deleteMany({ movieId: id });
        await db.collection("movies").deleteOne({ _id: new ObjectId(id) });

        // 2. Delete Output Directory (Episodes)
        // We reconstruct the path logic from worker: sanitized title or ID
        // Since we might not have the sanitization logic here perfectly mirrored if it changes,
        // we should rely on checking if the directory exists.
        // However, the best way is if we stored the 'outputDir' in the movie doc.
        // But we didn't. So we try to find it.

        // Attempt 1: Sanitized title
        const safeTitle = (movie.title || "movie")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();

        // We check both the title-based path and the ID-based path just in case
        const possibleDirs = [safeTitle, id];

        for (const dirName of possibleDirs) {
            if (!dirName) continue;
            const dirPath = path.isAbsolute(OUTPUT_DIR)
                ? path.join(OUTPUT_DIR, dirName)
                : path.join(process.cwd(), OUTPUT_DIR, dirName);

            if (fs.existsSync(dirPath)) {
                try {
                    await fs.promises.rm(dirPath, {
                        recursive: true,
                        force: true,
                    });
                    console.log(`Deleted directory: ${dirPath}`);
                } catch (err) {
                    console.error(`Failed to delete dir ${dirPath}`, err);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Delete failed", err);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
